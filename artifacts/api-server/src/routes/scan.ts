import { Router, type IRouter } from "express";
import multer from "multer";
import OpenAI from "openai";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

function getOpenAIClient(): OpenAI {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

const SYSTEM_PROMPT =
  "You are a wine expert sommelier assistant. The user will send you a photo of a restaurant wine list or menu. Extract every wine you can identify and return ONLY a valid JSON array. Each item should have these fields: name (string), vintage (number or null), region (string or null), grape (string or null), menuPrice (number or null), tastingNotes (string or null — a concise 1-2 sentence sommelier tasting note describing aromas, flavors and structure, or null if you are unsure about the wine). Example: [{\"name\": \"Opus One\", \"vintage\": 2019, \"region\": \"Napa Valley\", \"grape\": \"Cabernet Blend\", \"menuPrice\": 425, \"tastingNotes\": \"Lush cassis and dark cherry lead into cedar and tobacco on the finish, with exceptional structure and velvety tannins.\"}]. Return nothing except the JSON array.";

router.post(
  "/scan",
  upload.single("image"),
  async (req, res): Promise<void> => {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const base64Image = file.buffer.toString("base64");
    const mimeType = file.mimetype || "image/jpeg";

    let openai: OpenAI;
    try {
      openai = getOpenAIClient();
    } catch (err) {
      const message = err instanceof Error ? err.message : "OpenAI not configured";
      res.status(500).json({ error: message });
      return;
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? "[]";

      let wines: unknown[];
      try {
        const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
        wines = JSON.parse(cleaned);
        if (!Array.isArray(wines)) {
          wines = [];
        }
      } catch {
        wines = [];
      }

      res.json({ wines });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to scan wine list";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
