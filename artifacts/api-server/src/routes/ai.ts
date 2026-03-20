import { Router } from "express";
import OpenAI from "openai";

const router = Router();

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
}

router.post("/ai/analyze-wine", async (req, res) => {
  try {
    const { name, vintage, region, grape, menuPrice } = req.body;

    const openai = getOpenAI();

    const prompt = `You are a master sommelier and wine critic with encyclopedic knowledge of wine.

Given this wine, provide three things:
1. An estimated consensus critic score out of 100 (based on the wine's typical critical reception, producer reputation, and vintage quality from your training data). If you truly have no knowledge of this wine, return null.
2. A concise 2-sentence tasting note (aromas, flavors, structure, finish).
3. A value label comparing the menu price to typical restaurant pricing: "Great Value" if it is priced at or below typical restaurant markup, "Fair Price" if typical, "Overpriced" if significantly above typical restaurant pricing. If no menu price is given, return null.

Wine details:
- Name: ${name}${vintage ? ` ${vintage}` : ""}
- Region: ${region ?? "Unknown"}
- Grape: ${grape ?? "Unknown"}
- Menu price: ${menuPrice != null ? `$${menuPrice}` : "Not listed"}

Respond ONLY with valid JSON in exactly this format (no markdown, no extra text):
{"consensusScore": 92, "tastingNotes": "...", "valueLabel": "Fair Price"}

consensusScore must be a number 50–100 or null.
valueLabel must be exactly "Great Value", "Fair Price", "Overpriced", or null.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content ?? "{}";
    const result = JSON.parse(content);

    res.json({
      consensusScore: result.consensusScore ?? null,
      tastingNotes: result.tastingNotes ?? null,
      valueLabel: result.valueLabel ?? null,
    });
  } catch (err) {
    console.error("AI analyze-wine error:", err);
    res.status(500).json({ consensusScore: null, tastingNotes: null, valueLabel: null });
  }
});

router.post("/ai/list-insight", async (req, res) => {
  try {
    const { wines } = req.body as {
      wines: {
        name: string;
        vintage: number | null;
        consensusScore: number | null;
        vivinoRating: number | null;
        valueLabel: string | null;
        menuPrice: number | null;
      }[];
    };

    const openai = getOpenAI();

    const wineList = wines
      .map(
        (w) =>
          `- ${w.name}${w.vintage ? ` ${w.vintage}` : ""}: AI score ${w.consensusScore ?? "?"}/100, Vivino ${w.vivinoRating != null ? `${w.vivinoRating}/5` : "N/A"}, ${w.valueLabel ?? "no value data"}, menu price ${w.menuPrice != null ? `$${w.menuPrice}` : "not listed"}`
      )
      .join("\n");

    const prompt = `You are a sommelier at a fine dining restaurant. A guest just scanned the wine list. Here are all the wines with ratings and value assessments:

${wineList}

Write exactly 2 sentences of sommelier-style insight for the guest. Be specific — name actual wines, quote scores, call out the best value and highest-rated bottle. Sound warm, knowledgeable, and genuinely helpful.

Respond ONLY with valid JSON: {"insight": "..."}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 180,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content ?? "{}";
    const result = JSON.parse(content);

    res.json({ insight: result.insight ?? null });
  } catch (err) {
    console.error("AI list-insight error:", err);
    res.status(500).json({ insight: null });
  }
});

router.post("/ai/wine-detail", async (req, res) => {
  try {
    const { name, vintage, region, grape } = req.body;
    const openai = getOpenAI();

    const prompt = `You are a master sommelier with encyclopedic wine knowledge.

For the wine below, provide a comprehensive profile:
- Wine: ${name}${vintage ? ` ${vintage}` : ""}
- Region: ${region ?? "Unknown"}
- Grape: ${grape ?? "Unknown"}

Respond ONLY with valid JSON (no markdown) in exactly this format:
{
  "consensusScore": 94,
  "tastingNotes": "Two to three sentence sommelier tasting note covering aromas, palate, structure, and finish.",
  "flavorTags": ["Dark Fruit", "Tobacco", "Vanilla Oak", "Cedar", "Graphite"],
  "foodPairings": ["Ribeye", "Lamb Chops", "Aged Cheddar"],
  "retailPriceMin": 280,
  "retailPriceMax": 350,
  "valueLabel": "Fair Price"
}

Rules:
- consensusScore: number 50–100 based on typical critical reception, or null
- tastingNotes: 2–3 sentences, specific and evocative
- flavorTags: 4–6 short flavor/aroma descriptors as strings
- foodPairings: 3–4 specific food items (no generic descriptions, just names)
- retailPriceMin / retailPriceMax: typical retail bottle price range in USD, or null if unknown
- valueLabel: "Great Value" | "Fair Price" | "Overpriced" comparing menu price to retail, or null`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 450,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content ?? "{}");
    res.json({
      consensusScore: result.consensusScore ?? null,
      tastingNotes: result.tastingNotes ?? null,
      flavorTags: Array.isArray(result.flavorTags) ? result.flavorTags : [],
      foodPairings: Array.isArray(result.foodPairings) ? result.foodPairings : [],
      retailPriceMin: result.retailPriceMin ?? null,
      retailPriceMax: result.retailPriceMax ?? null,
      valueLabel: result.valueLabel ?? null,
    });
  } catch (err) {
    console.error("AI wine-detail error:", err);
    res.status(500).json({ consensusScore: null, tastingNotes: null, flavorTags: [], foodPairings: [], retailPriceMin: null, retailPriceMax: null, valueLabel: null });
  }
});

router.post("/ai/retail-price", async (req, res) => {
  try {
    const { name, vintage } = req.body as { name: string; vintage?: number | null };
    const openai = getOpenAI();

    const wineName = vintage ? `${name} ${vintage}` : name;
    const prompt = `What is the average retail price for ${wineName}? Return ONLY a JSON object with these fields: avgRetailPrice (number in USD, no decimals), priceRange (string, e.g. '$45 - $65'), source (string, e.g. 'Wine-Searcher average'). Return nothing except the JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content ?? "{}");
    res.json({
      avgRetailPrice: typeof result.avgRetailPrice === "number" ? Math.round(result.avgRetailPrice) : null,
      priceRange: result.priceRange ?? null,
      source: result.source ?? null,
    });
  } catch (err) {
    console.error("AI retail-price error:", err);
    res.status(500).json({ avgRetailPrice: null, priceRange: null, source: null });
  }
});

export default router;
