import { Router, type IRouter } from "express";
import OpenAI from "openai";

const RAPIDAPI_WINE_EXPLORER_HOST = "wine-explorer-api-ratings-insights-and-search.p.rapidapi.com";

interface WESearchItem { [name: string]: string; }
interface WESearchResponse { items?: WESearchItem[]; }
interface WEVintage { year?: string; statistics?: { ratings_average?: number; ratings_count?: number; }; }
interface WEInfoResponse { vintages?: WEVintage[]; statistics?: { ratings_average?: number; ratings_count?: number; }; }

function getOpenAI(): OpenAI {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
}

const router: IRouter = Router();

const VIVINO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

interface VintageData {
  id?: number;
  name?: string;
  seo_name?: string;
  statistics?: {
    ratings_average?: number;
    ratings_count?: number;
  };
  wine?: {
    id?: number;
    name?: string;
  };
}

const STOPWORDS = new Set([
  "de", "la", "le", "les", "du", "des", "del", "di", "von", "van",
  "of", "the", "and", "et", "en", "at", "a", "al",
  "chateau", "domaine", "estate", "winery", "vineyard", "vineyards",
  "grand", "reserve", "reserva", "reservado", "special", "blanc", "rouge",
  "red", "white", "rose", "brut", "sec", "demi", "nature", "select",
]);

function normalizeWineName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fuzzyScore(
  query: string,
  target: string,
  vintage?: number | null,
): number {
  const qNorm = normalizeWineName(query);
  const tNorm = normalizeWineName(target);

  if (tNorm.includes(qNorm) || qNorm.includes(tNorm)) return 0.95;

  const isYear = (w: string) => /^\d{4}$/.test(w);
  const qWords = qNorm
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !isYear(w));
  const tWords = tNorm
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !isYear(w));

  if (qWords.length === 0) return 0;

  let matches = 0;
  for (const qw of qWords) {
    if (
      tWords.some(
        (tw) =>
          tw === qw ||
          (tw.length > 4 && tw.startsWith(qw)) ||
          (qw.length > 4 && qw.startsWith(tw)),
      )
    ) {
      matches++;
    }
  }

  let score = matches / qWords.length;

  if (vintage && tNorm.includes(String(vintage))) {
    score = Math.min(1, score + 0.1);
  }

  return score;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseVintageFromJson(json: string): VintageData | null {
  try {
    return JSON.parse(json) as VintageData;
  } catch {
    return null;
  }
}

function extractJsonObject(str: string, startIdx: number): string | null {
  let depth = 0;
  let start = -1;
  for (let i = startIdx; i < str.length && i < startIdx + 50000; i++) {
    if (str[i] === "{") {
      if (start === -1) start = i;
      depth++;
    } else if (str[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return str.slice(start, i + 1);
      }
    }
  }
  return null;
}

async function searchVivinoPage(
  name: string,
  vintage: number | null,
): Promise<{
  rating: number | null;
  ratingsCount: number | null;
  wineId: number | null;
  matchedName: string | null;
}> {
  const query = vintage ? `${name} ${vintage}` : name;
  const url = `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: VIVINO_HEADERS,
    redirect: "follow",
  });

  if (!response.ok) {
    return { rating: null, ratingsCount: null, wineId: null, matchedName: null };
  }

  const html = await response.text();
  const decoded = decodeHtmlEntities(html);

  const recordsIdx = decoded.indexOf('"records_matched"');
  if (recordsIdx === -1) {
    return { rating: null, ratingsCount: null, wineId: null, matchedName: null };
  }

  const matchesIdx = decoded.indexOf('"matches":[', recordsIdx - 200);
  if (matchesIdx === -1) {
    return { rating: null, ratingsCount: null, wineId: null, matchedName: null };
  }

  const arrayStart = decoded.indexOf("[", matchesIdx + '"matches":'.length);
  if (arrayStart === -1) {
    return { rating: null, ratingsCount: null, wineId: null, matchedName: null };
  }

  let bestVintage: VintageData | null = null;
  let bestScore = 0;

  let searchFrom = arrayStart;
  let resultCount = 0;

  while (resultCount < 10) {
    const vintageKeyIdx = decoded.indexOf('"vintage":{', searchFrom);
    if (vintageKeyIdx === -1 || vintageKeyIdx > arrayStart + 200000) break;

    const objStart = decoded.indexOf("{", vintageKeyIdx + '"vintage":'.length);
    if (objStart === -1) break;

    const objJson = extractJsonObject(decoded, objStart);
    if (!objJson) break;

    const vintageData = parseVintageFromJson(objJson);
    if (vintageData) {
      const vintageName = vintageData.name ?? "";
      const score = fuzzyScore(query, vintageName, vintage);
      if (score > bestScore) {
        bestScore = score;
        bestVintage = vintageData;
      }
      if (bestScore >= 0.9) break;
    }

    searchFrom = objStart + 1;
    resultCount++;
  }

  if (!bestVintage || bestScore < 0.55) {
    return { rating: null, ratingsCount: null, wineId: null, matchedName: null };
  }

  const stats = bestVintage?.statistics;
  return {
    rating: stats?.ratings_average
      ? Math.round(stats.ratings_average * 10) / 10
      : null,
    ratingsCount: stats?.ratings_count ?? null,
    wineId: bestVintage?.wine?.id ?? null,
    matchedName: bestVintage?.name ?? null,
  };
}

// ─── Fallback helpers for Vivino rating ───────────────────────────────────────

function cleanWineNameForSearch(name: string): string {
  return name
    .replace(/\b(vineyard|vineyards|winery|estate|estates|cellars|cellar)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchVivinoWithVariants(
  name: string,
  vintage: number | null,
): Promise<{ rating: number | null; ratingsCount: number | null; wineId: number | null; matchedName: string | null }> {
  const cleaned = cleanWineNameForSearch(name);
  const queries: Array<[string, number | null]> = [
    [name, vintage],
    [name, null],
  ];
  if (cleaned !== name) {
    queries.push([cleaned, vintage]);
    queries.push([cleaned, null]);
  }
  for (const [n, v] of queries) {
    try {
      const result = await searchVivinoPage(n, v);
      if (result.rating !== null) return result;
    } catch { /* try next variant */ }
  }
  return { rating: null, ratingsCount: null, wineId: null, matchedName: null };
}

async function fetchVivinoViaWineExplorer(
  name: string,
  vintage: number | null,
  apiKey: string,
): Promise<{ rating: number | null; ratingsCount: number | null }> {
  try {
    const headers = {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": RAPIDAPI_WINE_EXPLORER_HOST,
      Accept: "application/json",
    };
    const query = vintage ? `${name} ${vintage}` : name;
    const searchRes = await fetch(
      `https://${RAPIDAPI_WINE_EXPLORER_HOST}/search?wine_name=${encodeURIComponent(query)}`,
      { headers, signal: AbortSignal.timeout(10000) },
    );
    if (!searchRes.ok) return { rating: null, ratingsCount: null };
    const searchData = await searchRes.json() as WESearchResponse;
    const items = searchData.items ?? [];
    if (items.length === 0) return { rating: null, ratingsCount: null };
    const wineId = Object.values(items[0])[0];
    if (!wineId) return { rating: null, ratingsCount: null };
    const infoRes = await fetch(
      `https://${RAPIDAPI_WINE_EXPLORER_HOST}/info?_id=${wineId}`,
      { headers, signal: AbortSignal.timeout(10000) },
    );
    if (!infoRes.ok) return { rating: null, ratingsCount: null };
    const info = await infoRes.json() as WEInfoResponse;
    let avg = 0;
    let count: number | null = null;
    if (vintage && info.vintages?.length) {
      const match = info.vintages.find((v) => String(v.year) === String(vintage));
      avg = match?.statistics?.ratings_average ?? info.statistics?.ratings_average ?? 0;
      count = match?.statistics?.ratings_count ?? info.statistics?.ratings_count ?? null;
    } else {
      avg = info.statistics?.ratings_average ?? 0;
      count = info.statistics?.ratings_count ?? null;
    }
    if (avg <= 0) return { rating: null, ratingsCount: null };
    return { rating: Math.round(avg * 10) / 10, ratingsCount: count };
  } catch {
    return { rating: null, ratingsCount: null };
  }
}

async function estimateVivinoViaGPT(
  name: string,
  vintage: number | null,
  region: string | null,
  grape: string | null,
): Promise<number | null> {
  let openai: OpenAI;
  try { openai = getOpenAI(); } catch { return null; }
  const wineDesc = [
    vintage ? `${name} ${vintage}` : name,
    region ? `from ${region}` : null,
    grape ? `(${grape})` : null,
  ].filter(Boolean).join(" ");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 10,
      messages: [
        {
          role: "system",
          content: "You are a wine expert. Estimate this wine's likely Vivino community score on a 1.0–5.0 scale based on the producer's reputation and typical scores for this style and region. Reply with ONLY a decimal number between 1.0 and 5.0. If unknown, reply 3.7.",
        },
        { role: "user", content: wineDesc },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim() ?? "";
    const num = parseFloat(text);
    if (!isNaN(num) && num >= 1.0 && num <= 5.0) return Math.round(num * 10) / 10;
    return null;
  } catch {
    return null;
  }
}

router.post("/ratings/cellartracker", async (req, res): Promise<void> => {
  const { name, vintage } = req.body as { name?: string; vintage?: number | null };
  if (!name) { res.status(400).json({ error: "Wine name is required" }); return; }
  try {
    const query = vintage ? `${name} ${vintage}` : name;
    const url = `https://www.cellartracker.com/api.asp?q=wines&wine=${encodeURIComponent(query)}&fmt=json`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PocketSomm/1.0)", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) { res.json({ communityScore: null, reviewCount: null }); return; }
    const data = await response.json() as Record<string, unknown>[];
    if (!Array.isArray(data) || data.length === 0) { res.json({ communityScore: null, reviewCount: null }); return; }
    const first = data[0];
    const rawScore = first?.CT != null ? Number(first.CT) : null;
    const rawCount = first?.Notes != null ? Number(first.Notes) : null;
    res.json({
      communityScore: rawScore != null && rawScore > 0 ? rawScore : null,
      reviewCount: rawCount != null && rawCount > 0 ? rawCount : null,
    });
  } catch {
    res.json({ communityScore: null, reviewCount: null });
  }
});

router.post("/ratings/vivino", async (req, res): Promise<void> => {
  const { name, vintage, region, grape } = req.body as {
    name?: string;
    vintage?: number | null;
    region?: string | null;
    grape?: string | null;
  };

  if (!name) {
    res.status(400).json({ error: "Wine name is required" });
    return;
  }

  try {
    // Attempt 1: Vivino web scrape with multiple query variants
    const scrapeResult = await searchVivinoWithVariants(name, vintage ?? null);
    if (scrapeResult.rating !== null) {
      res.json(scrapeResult);
      return;
    }

    // Attempt 2: Wine Explorer RapidAPI (Vivino community data via proper API)
    const rapidApiKey = process.env["RAPIDAPI_KEY"];
    if (rapidApiKey) {
      const explorerResult = await fetchVivinoViaWineExplorer(name, vintage ?? null, rapidApiKey);
      if (explorerResult.rating !== null) {
        res.json({ ...explorerResult, wineId: null, matchedName: null });
        return;
      }
    }

    // Attempt 3: GPT-4o estimate (labeled "EST." on the frontend)
    const estimatedRating = await estimateVivinoViaGPT(name, vintage ?? null, region ?? null, grape ?? null);
    if (estimatedRating !== null) {
      res.json({ rating: estimatedRating, ratingsCount: null, wineId: null, matchedName: null, isEstimated: true });
      return;
    }

    // No rating found — frontend shows "—"
    res.json({ rating: null, ratingsCount: null, wineId: null, matchedName: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Vivino data";
    res.status(500).json({ error: message });
  }
});

export default router;
