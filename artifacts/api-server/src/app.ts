import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";
import { getUncachableStripeClient } from "./stripeClient";

const app: Express = express();

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

// ── Content Security Policy ───────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https://wine-scan-ai.replit.app; " +
    "script-src 'self'; " +
    "connect-src 'self' https://api.revenuecat.com https://api.openai.com; " +
    "img-src 'self' data: blob:; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "frame-ancestors 'none';",
  );
  next();
});

// ─────────────────────────────────────────────────────────────────────────────

// CORS allowlist: includes every origin a Capacitor WebView can produce.
// - https://wine-scan-ai.replit.app — Android prod (server.url loads page from there)
// - capacitor://localhost — iOS native bundled assets
// - https://localhost — Android native bundled assets when androidScheme: 'https'
// - http://localhost — older Android scheme + dev
// - http://localhost:5173 — Vite dev
// - null — file:// or sandboxed iframes occasionally produce "Origin: null"
app.use(
  cors({
    origin: [
      "https://wine-scan-ai.replit.app",
      "capacitor://localhost",
      "https://localhost",
      "http://localhost",
      "http://localhost:5173",
      "null",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
  }),
);

// ── Rate limiting ─────────────────────────────────────────────────────────────

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests, please try again later." },
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Scan limit reached. Please wait before scanning again." },
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Search limit reached. Please wait before searching again." },
});

// AI routes each call OpenAI — cap tighter to protect cost + abuse
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "AI request limit reached. Please wait before trying again." },
});

// Promo code redemption — tight cap to prevent brute-force
const promoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many redemption attempts. Please try again later." },
});

app.use("/api/", generalLimiter);
app.use("/api/scan", scanLimiter);
app.use("/api/search", searchLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api/stripe/redeem-code", promoLimiter);

// ── X-User-ID validation middleware ──────────────────────────────────────────
// Requires the header to be present AND well-formed (8–100 chars, alphanumeric + hyphens).
const validateUserId = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const userId = (req.headers["x-user-id"] as string | undefined) ?? (req.body as Record<string, unknown>)?.userId;
  if (!userId || typeof userId !== "string" || userId.length < 8 || userId.length > 100) {
    res.status(401).json({ error: "Missing or invalid user ID" });
    return;
  }
  next();
};

app.use("/api/scan", validateUserId);
app.use("/api/search", validateUserId);
app.use("/api/ai", validateUserId);

// ─────────────────────────────────────────────────────────────────────────────

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── Stripe webhook — MUST be before express.json() ───────────────────────────
// Uses express.raw() so the raw body is preserved for HMAC signature verification.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];

    if (!signature || !webhookSecret) {
      res.status(400).json({ error: "Missing signature or webhook secret" });
      return;
    }

    const sig = Array.isArray(signature) ? signature[0] : signature;

    try {
      // Explicit signature verification — rejects tampered or replayed events
      const stripe = await getUncachableStripeClient();
      stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } catch (err: any) {
      logger.error({ err }, "Webhook signature verification failed");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error({ err: error }, "Webhook processing error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use("/api", router);

export default app;
