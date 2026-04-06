import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const RAPIDAPI_HOST = "wine-explorer-api-ratings-insights-and-search.p.rapidapi.com";

interface WineExplorerSearchItem {
  [name: string]: string;
}

interface WineExplorerSearchResponse {
  items?: WineExplorerSearchItem[];
}

interface WineExplorerVintage {
  name?: string;
  year?: string;
  statistics?: {
    ratings_average?: number;
    ratings_count?: number;
    status?: string;
  };
}

interface WineExplorerInfoResponse {
  name?: string;
  region?: string;
  vintages?: WineExplorerVintage[];
  statistics?: {
    ratings_average?: number;
    ratings_count?: number;
    status?: string;
  };
  review_status?: string;
}

function getOpenAI(): OpenAI {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
}

async function fetchWineExplorer(
  name: string,
  vintage: number | null,
  apiKey: string,
): Promise<{ score: number | null; tastingNotes: string | null; source: string }> {
  const headers = {
    "X-RapidAPI-Key": apiKey,
    "X-RapidAPI-Host": RAPIDAPI_HOST,
    Accept: "application/json",
  };

  const query = vintage ? `${name} ${vintage}` : name;

  const searchRes = await fetch(
    `https://${RAPIDAPI_HOST}/search?wine_name=${encodeURIComponent(query)}`,
    { headers },
  );

  if (!searchRes.ok) return { score: null, tastingNotes: null, source: "Wine Explorer" };

  const searchData = (await searchRes.json()) as WineExplorerSearchResponse;
  const items = searchData.items ?? [];
  if (items.length === 0) return { score: null, tastingNotes: null, source: "Wine Explorer" };

  const firstItem = items[0];
  const wineId = Object.values(firstItem)[0];
  if (!wineId) return { score: null, tastingNotes: null, source: "Wine Explorer" };

  const infoRes = await fetch(
    `https://${RAPIDAPI_HOST}/info?_id=${wineId}`,
    { headers },
  );

  if (!infoRes.ok) return { score: null, tastingNotes: null, source: "Wine Explorer" };

  const info = (await infoRes.json()) as WineExplorerInfoResponse;

  let score: number | null = null;
  const vintages = info.vintages ?? [];

  if (vintage && vintages.length > 0) {
    const match = vintages.find((v) => String(v.year) === String(vintage));
    const avg = match?.statistics?.ratings_average ?? info.statistics?.ratings_average ?? 0;
    if (avg > 0) score = Math.round((avg / 5) * 100);
  } else {
    const avg = info.statistics?.ratings_average ?? 0;
    if (avg > 0) score = Math.round((avg / 5) * 100);
  }

  return { score, tastingNotes: null, source: "Wine Explorer" };
}

async function generateTastingNotes(
  name: string,
  vintage: number | null,
  region: string | null,
  grape: string | null,
): Promise<string | null> {
  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    return null;
  }

  const wineDesc = [
    vintage ? `${name} ${vintage}` : name,
    region ? `from ${region}` : null,
    grape ? `(${grape})` : null,
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            "You are a concise sommelier. Write a 1-2 sentence tasting note for the given wine. Focus on aromas and palate characteristics. Use evocative but precise language. Do not add headers or preamble.",
        },
        { role: "user", content: wineDesc },
      ],
    });

    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

// ─── Wine-Searcher Market Prices ─────────────────────────────────────────────

const WINE_SEARCHER_HOST = "wine-searcher.p.rapidapi.com";

interface WineSearcherMerchant {
  name: string;
  price: number;
  location: string;
  url: string;
}

interface WineSearcherResult {
  merchants: WineSearcherMerchant[];
  avgPrice: number | null;
}

async function fetchMarketPrices(
  name: string,
  vintage: number | null,
  apiKey: string,
): Promise<WineSearcherResult> {
  const query = vintage ? `${name} ${vintage}` : name;
  const headers = {
    "X-RapidAPI-Key": apiKey,
    "X-RapidAPI-Host": WINE_SEARCHER_HOST,
    Accept: "application/json",
  };

  const url = `https://${WINE_SEARCHER_HOST}/natural_language_search?q=${encodeURIComponent(query)}&location=USA&currencycode=USD&Ns=price&Nrpp=24`;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return { merchants: [], avgPrice: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await res.json() as any;

  const merchants: WineSearcherMerchant[] = [];
  let priceSum = 0;

  // Handle various possible response shapes from Wine-Searcher API
  const items: unknown[] = Array.isArray(data) ? data
    : Array.isArray(data?.search_results) ? data.search_results
    : Array.isArray(data?.results) ? data.results
    : Array.isArray(data?.Wine) ? data.Wine
    : Array.isArray(data?.offers) ? data.offers
    : [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;

    // Try multiple field name patterns
    const priceCandidates = [r.price, r.Price, r.price_min, r.PriceMin, r.unit_price,
      (r.offer as Record<string,unknown>)?.price_min];
    const rawPrice = priceCandidates.find((p) => p != null && Number(p) > 0);
    const price = rawPrice != null ? Math.round(Number(rawPrice) * 100) / 100 : null;
    if (price == null || price <= 0) continue;

    const nameCandidates = [r.merchant, r.Merchant, r.store_name, r.store,
      (r.store as Record<string,unknown>)?.name, (r.offer as Record<string,unknown>)?.store,
      r.retailer, r.seller, r.shop_name, r.Shop];
    const merchantName = nameCandidates.find((n) => n && typeof n === "string") as string | undefined;
    if (!merchantName) continue;

    const locationCandidates = [r.location, r.Location, r.city,
      (r.store as Record<string,unknown>)?.location, r.region, r.state];
    const location = (locationCandidates.find((l) => l && typeof l === "string") as string | undefined) ?? "USA";

    const urlCandidates = [r.url, r.URL, r.link, r.href, r.offer_url,
      (r.offer as Record<string,unknown>)?.offer_url];
    const merchantUrl = (urlCandidates.find((u) => u && typeof u === "string") as string | undefined) ?? "";

    merchants.push({ name: merchantName, price, location, url: merchantUrl });
    priceSum += price;
  }

  merchants.sort((a, b) => a.price - b.price);

  const avgPrice = merchants.length > 0
    ? Math.round((priceSum / merchants.length) * 100) / 100
    : data?.avg_price != null ? Number(data.avg_price)
    : data?.average_price != null ? Number(data.average_price)
    : null;

  return { merchants, avgPrice };
}

router.post("/market/prices", async (req, res): Promise<void> => {
  const { name, vintage } = req.body as { name?: string; vintage?: number | null };
  if (!name) { res.status(400).json({ error: "Wine name is required" }); return; }
  const rapidApiKey = process.env["RAPIDAPI_KEY"];
  if (!rapidApiKey) { res.json({ merchants: [], avgPrice: null }); return; }
  try {
    const result = await fetchMarketPrices(name, vintage ?? null, rapidApiKey);
    res.json(result);
  } catch {
    res.json({ merchants: [], avgPrice: null });
  }
});

router.post("/ratings/critic", async (req, res): Promise<void> => {
  const { name, vintage } = req.body as { name?: string; vintage?: number | null };
  if (!name) { res.status(400).json({ error: "Wine name is required" }); return; }

  let openai: OpenAI;
  try { openai = getOpenAI(); } catch {
    res.json({ criticScore: null, criticScoreCount: 0, criticScoreLabel: null });
    return;
  }

  try {
    const wineName = vintage ? `${name} ${vintage}` : name;

    const criticPrompt = `You are a wine database expert. For the wine "${wineName}", provide known critic scores ONLY if you are highly confident they are accurate.
If you are not certain of a score, return null for that publication.

Return ONLY this JSON:
{
  "wine_spectator": null,
  "wine_enthusiast": null,
  "james_suckling": null,
  "robert_parker": null,
  "vinous": null,
  "decanter": null,
  "jancis_robinson": null,
  "confidence": "high"
}

confidence must be exactly "high", "medium", or "low":
- "high": well-known wine with widely published scores you are certain of
- "medium": wine you have some knowledge of but are less certain
- "low": obscure wine where you are guessing

Return ONLY the JSON, no other text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: criticPrompt }],
      max_tokens: 180,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

    const scores = [
      result.wine_spectator,
      result.wine_enthusiast,
      result.james_suckling,
      result.robert_parker,
      result.vinous,
      result.decanter,
      result.jancis_robinson,
    ].filter((s): s is number => typeof s === "number" && s > 0 && s <= 100);

    const confidence = typeof result.confidence === "string" ? result.confidence : "low";

    // Show critic score if confidence is medium or high (any number of sources); suppress only on low
    const meetsThreshold = confidence !== "low";

    const criticScore = meetsThreshold
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    res.json({
      criticScore,
      criticScoreCount: meetsThreshold ? scores.length : 0,
      criticScoreLabel: meetsThreshold ? `${scores.length} critics` : null,
      criticConfidence: confidence,
    });
  } catch (err) {
    console.error("Critic score error:", err);
    res.json({ criticScore: null, criticScoreCount: 0, criticScoreLabel: null, criticConfidence: "low" });
  }
});

router.post("/ratings/rapidapi", async (req, res): Promise<void> => {
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

  const rapidApiKey = process.env["RAPIDAPI_KEY"];

  try {
    const [explorerResult, tastingNotes] = await Promise.all([
      rapidApiKey
        ? fetchWineExplorer(name, vintage ?? null, rapidApiKey)
        : Promise.resolve({ score: null, tastingNotes: null, source: "Wine Explorer" }),
      generateTastingNotes(name, vintage ?? null, region ?? null, grape ?? null),
    ]);

    res.json({
      score: explorerResult.score,
      tastingNotes,
      source: "Wine Explorer",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch wine data";
    res.status(500).json({ error: message });
  }
});

export default router;
