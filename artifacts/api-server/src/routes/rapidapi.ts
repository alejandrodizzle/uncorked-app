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
