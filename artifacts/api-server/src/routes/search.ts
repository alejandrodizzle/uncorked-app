import { Router } from "express";

const router = Router();

const VIVINO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

export interface SearchResult {
  name: string;
  vintage: number | null;
  region: string | null;
  grape: string | null;
  vivinoRating: number | null;
  vivinoRatingsCount: number | null;
  vivinoWineId: number | null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractJsonObject(str: string, startIdx: number): string | null {
  let depth = 0, start = -1;
  for (let i = startIdx; i < str.length && i < startIdx + 60000; i++) {
    if (str[i] === "{") { if (start === -1) start = i; depth++; }
    else if (str[i] === "}") { depth--; if (depth === 0 && start !== -1) return str.slice(start, i + 1); }
  }
  return null;
}

async function searchVivino(query: string): Promise<SearchResult[]> {
  const url = `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: VIVINO_HEADERS, redirect: "follow", signal: AbortSignal.timeout(10000) });
  if (!response.ok) return [];

  const html = await response.text();
  const decoded = decodeHtmlEntities(html);

  const recordsIdx = decoded.indexOf('"records_matched"');
  if (recordsIdx === -1) return [];

  const matchesIdx = decoded.indexOf('"matches":[', recordsIdx - 300);
  if (matchesIdx === -1) return [];

  const arrayStart = decoded.indexOf("[", matchesIdx + '"matches":'.length);
  if (arrayStart === -1) return [];

  const results: SearchResult[] = [];
  const seen = new Set<string>();
  let searchFrom = arrayStart;

  while (results.length < 8) {
    const vintageKeyIdx = decoded.indexOf('"vintage":{', searchFrom);
    if (vintageKeyIdx === -1 || vintageKeyIdx > arrayStart + 400000) break;

    const objStart = decoded.indexOf("{", vintageKeyIdx + '"vintage":'.length);
    if (objStart === -1) break;

    const objJson = extractJsonObject(decoded, objStart);
    if (!objJson) { searchFrom = objStart + 1; continue; }

    try {
      const v = JSON.parse(objJson);
      const wineName: string = v.wine?.name ?? v.name ?? "";
      if (!wineName) { searchFrom = objStart + 1; continue; }

      const fullName: string = v.name ?? wineName;
      const yearMatch = fullName.match(/\b(19|20)\d{2}\b/);
      const vintage = yearMatch ? parseInt(yearMatch[0]) : null;

      const dedupKey = `${wineName}||${vintage}`;
      if (seen.has(dedupKey)) { searchFrom = objStart + 1; continue; }
      seen.add(dedupKey);

      const rating = v.statistics?.ratings_average
        ? Math.round(v.statistics.ratings_average * 10) / 10
        : null;
      const count: number | null = v.statistics?.ratings_count ?? null;
      const wineId: number | null = v.wine?.id ?? null;
      const region: string | null =
        v.wine?.style?.regional_name ??
        v.wine?.region?.name ??
        v.wine?.appellations?.[0]?.name ??
        null;
      const grape: string | null =
        v.wine?.style?.primary_grapes?.[0] ??
        v.wine?.grapes?.[0]?.name ??
        null;

      results.push({ name: wineName, vintage, region, grape, vivinoRating: rating, vivinoRatingsCount: count, vivinoWineId: wineId });
    } catch { /* skip malformed */ }

    searchFrom = objStart + 1;
  }

  return results;
}

async function searchRapidAPI(query: string): Promise<SearchResult[]> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return [];
  const HOST = "wine-explorer-api-ratings-insights-and-search.p.rapidapi.com";
  try {
    const res = await fetch(
      `https://${HOST}/search?wine_name=${encodeURIComponent(query)}`,
      {
        headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": HOST },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      console.error(`Wine Explorer search failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json() as { items?: Record<string, string>[] };
    const items = data.items ?? [];
    return items.slice(0, 6).flatMap((item): SearchResult[] => {
      const rawName = Object.keys(item)[0] ?? "";
      if (!rawName) return [];
      const yearMatch = rawName.match(/\b(19|20)\d{2}\b/);
      const vintage = yearMatch ? parseInt(yearMatch[0]) : null;
      const name = rawName.replace(/\b(19|20)\d{2}\b/, "").replace(/\s+/g, " ").trim();
      return [{ name: name || rawName, vintage, region: null, grape: null, vivinoRating: null, vivinoRatingsCount: null, vivinoWineId: null }];
    }).filter((w) => w.name.length > 0);
  } catch (err) {
    console.error("searchRapidAPI error:", err);
    return [];
  }
}

router.post("/search", async (req, res): Promise<void> => {
  const rawQuery: string = req.body?.query || req.query?.q || "";
  const sanitizedQuery = rawQuery
    .replace(/[<>{}[\]\\/]/g, "")
    .substring(0, 100)
    .trim();

  if (!sanitizedQuery || sanitizedQuery.length < 3) {
    res.json({ results: [] });
    return;
  }

  try {
    const [vivinoResults, rapidResults] = await Promise.allSettled([
      searchVivino(sanitizedQuery),
      searchRapidAPI(sanitizedQuery),
    ]);

    const vivino = vivinoResults.status === "fulfilled" ? vivinoResults.value : [];
    const rapid = rapidResults.status === "fulfilled" ? rapidResults.value : [];

    if (vivinoResults.status === "rejected") console.error("Vivino search rejected:", vivinoResults.reason);
    if (rapidResults.status === "rejected") console.error("RapidAPI search rejected:", rapidResults.reason);

    // Merge: prefer Vivino, add RapidAPI results not already covered
    const vivinoNames = new Set(vivino.map((r) => r.name.toLowerCase()));
    const extra = rapid.filter((r) => !vivinoNames.has(r.name.toLowerCase()));
    const combined = [...vivino, ...extra].slice(0, 8);

    const searchError = vivino.length === 0 && rapid.length === 0
      ? (vivinoResults.status === "rejected" ? String(vivinoResults.reason) : null)
      : null;

    res.json({ results: combined, searchError });
  } catch (err) {
    console.error("Search error:", err);
    const message = err instanceof Error ? err.message : "Search failed";
    res.json({ results: [], searchError: message });
  }
});

export default router;
