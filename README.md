# PostHog Impact Dashboard

Identifies the most impactful engineers on the [PostHog](https://github.com/PostHog/posthog) repo over the last 90 days.

## What "impact" means here

A transparent composite of three pillars — never lines of code, commits, or raw PR counts:

- **Delivery (35%)** — Merged count (40%) · Active weeks of 13 (30%) · Median cycle time, inverse (30%)
- **Collaboration (35%)** — Reviews given (50%) · Distinct authors reviewed (50%)
- **Quality (30%)** — Follow-through merged/opened (60%) · Reverts of own PRs, inverse (40%)

Each metric is min-max normalized within the cohort (non-bot authors with ≥3 merged PRs).

## Stack

- **Svelte 5** + **Vite** frontend, static build (~50KB JS gzipped)
- **Turso** (libSQL — hosted SQLite over HTTP) as the single source of truth
- **Drizzle ORM** for queries (libsql client, async everywhere)
- **Hono** local dev server (only used for `npm run dev`)
- **Vercel serverless functions** for `/api/data` (impact compute) and `/api/ai` (Gemini)
- **Gemini 2.5 Flash** via `@google/genai` SDK with structured `responseSchema`

## Architecture

```
┌─────────────────────────┐         ┌────────────────────────────────┐
│  LOCAL (operator-side)  │         │  VERCEL (runtime)              │
│                         │         │                                │
│  GitHub REST API        │         │  Static frontend (build/)      │
│       ↓                 │         │         ↓ fetch                │
│  npm run data           │         │  /api/data  ──┐                │
│   (sync into Turso)     │         │               ▼                │
│         ↓               │         │       Impact.compute()         │
│         ▼               │         │               │                │
│   ┌──────────────┐      │ queries │               ▼                │
│   │    Turso     │◄─────┼─────────┤      libSQL HTTP query         │
│   │ (libSQL DB)  │      │         │                                │
│   └──────────────┘      │         │  /api/ai  ──► Gemini 2.5 Flash │
│                         │         │     (on-demand button click)   │
└─────────────────────────┘         └────────────────────────────────┘
```

**Single source of truth: Turso.** The GitHub sync (run from your laptop) writes PR and review rows into the hosted libSQL database. Both local dev and production Vercel functions read from the same Turso DB — no `data.json` snapshot, no SQLite file in the deploy bundle. The Vercel function bundle stays small (~5MB vs the 76MB it would be with a bundled `.db`), and refreshing data just means running `npm run data` again — no redeploy needed.

**Why not local SQLite?** Vercel's serverless functions can't persist a `.db` file across cold starts, and bundling the `.db` with the function balloons the deploy. Turso solves both — HTTP-based access from any environment, single DB instance, sub-100ms queries.

**Why two endpoints?** `/api/data` is read-only and cacheable (5-min edge cache). `/api/ai` is per-engineer on-click — it never auto-fires, so Gemini cost is bounded by user interaction, not page loads.

## Reproduce locally

```bash
cp .env.empty .env   # fill GITHUB_TOKEN, GEMINI_API_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
npm install
npx drizzle-kit push # create schema in Turso
npm run data         # syncs PRs + reviews into Turso (~5–10 min first run)
npm run dev          # http://localhost:8080
```

Build the static frontend:

```bash
npm run build        # → build/
```

## Deploy

```bash
vercel --prod
```

**Required Vercel env vars** (Project Settings → Environment Variables, Production scope):

- `TURSO_DATABASE_URL` — `libsql://<your-db>.aws-us-east-2.turso.io`
- `TURSO_AUTH_TOKEN` — from `turso db tokens create <db-name>`
- `GEMINI_API_KEY` — Google AI Studio key (for the on-demand `/api/ai` narrative)

## Refreshing data

Data is **live** — just re-run `npm run data` locally whenever you want fresh metrics. The dashboard will reflect the new numbers on the next request (subject to the 5-min edge cache). No redeploy needed.

## Design philosophy

Read `arch.md` for the full design decisions. The short version:

- **No fake numbers.** Every metric is honestly computable from the data we ingest. Pillars that depend on unavailable data (files, CI) are out of scope rather than faked.
- **Top 5 with reasons.** Each top engineer gets reason bullets derived from their actual metrics, plus an optional Gemini summary on demand.
- **Methodology is in-page.** The "How is impact computed?" expander explains the weights and definitions next to the data.

Honest caveats:

- Review data is sampled to the most recent ~800 PRs in window (to keep build time bounded). Counts are proportional, may underrepresent absolute volume.
- File-level data not ingested → blast radius, bus factor, CI cleanliness out of scope for v1.
- Reverts detected by `^Revert ` title pattern, attributed to original author.
