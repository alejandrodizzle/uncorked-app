# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Uncorked App

A mobile-first React + Express wine app. Key features:
- GPT-4o Vision scan of restaurant wine lists
- Vivino community ratings via HTML scraping
- Manual wine search with dropdown suggestions
- Wine Detail Screen with AI tasting notes, flavor tags, food pairings
- Save to Cellar bookmarks + "I've tried this" rating modal
- Bottom navigation: Scan / Results / Saved / History
- Capacitor configured for iOS App Store submission
- **Stripe subscription paywall**: 7-day free trial → $3.99/month or $39.99/year

**Payment flow** (in `artifacts/api-server/src/`):
- `stripeClient.ts` — Stripe SDK client (populated after OAuth connection)
- `webhookHandlers.ts` — Stripe webhook processor (BEFORE express.json)
- `storage.ts` — User + stripe schema queries via `@workspace/db` pool
- `stripeService.ts` — Checkout session, customer portal, customer creation
- `routes/stripe.ts` — REST endpoints: subscription status, checkout, portal, products
- `src/index.ts` — Stripe init: runMigrations → getStripeSync → webhook → syncBackfill

**Paywall UI** (in `artifacts/uncorked/src/`):
- `pages/paywall.tsx` — Full-screen paywall with plan cards and email checkout
- `pages/home.tsx` — Trial badge, expired paywall gate, payment success toast

**Database**: `users` table in public schema (id TEXT, stripe_customer_id, stripe_subscription_id, created_at)
**Seed script**: `pnpm --filter @workspace/scripts run seed-products` — creates Uncorked Premium product

**User identification**: Anonymous UUID in `localStorage.uncorked_user_id`, sent as `x-user-id` header
**Trial logic**: Server tracks `created_at` in users table; 7 days from first use

**Capacitor setup** (in `artifacts/uncorked/`):
- `capacitor.config.ts` — appId: `com.uncorked.app`, webDir: `dist/public`
- `assets/icon.png` — 1024×1024 app icon source
- `assets/splash.png` — 2732×2732 splash source
- `public/apple-touch-icon.png` — 180×180 home screen icon
- `src/lib/api.ts` — unified API URL helper; set `VITE_API_URL` for native builds
- `IOS_SUBMISSION.md` — full step-by-step guide for Mac / Xcode / App Store

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/uncorked` (`@workspace/uncorked`)

React + Vite mobile-first web app (max-width 430px). State machine in `src/pages/home.tsx` drives three screens:

- **Home** — wine glass SVG logo, animated camera/upload CTA
- **Loading** — gold scan-line animation with corner brackets
- **Results** — wine cards with Vivino ratings, stars, region/grape tags, menu price

Design tokens: burgundy `#7b1c34`, cream `#faf7f2`, gold `#c9a84c`; Cormorant Garamond headings; Inter body.

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes:
  - `GET /api/healthz` — health check
  - `POST /api/scan` — multer image upload → GPT-4o Vision extracts wines as JSON array (`name`, `vintage`, `region`, `grape`, `menuPrice`)
  - `POST /api/ratings/vivino` — fetches Vivino rating for a wine by scraping `vivino.com/search/wines?q=...`, decoding embedded HTML-entity JSON, and fuzzy-matching the result against the searched wine name
- **Vivino approach**: The `/api/explore` endpoint ignores `q` (text search is non-functional). Instead, we fetch the Vivino search page HTML (which embeds the search results as HTML-entity-encoded JSON) and parse it with fuzzy name matching (word-overlap score, stopwords for generic wine terms, year numbers excluded).
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
