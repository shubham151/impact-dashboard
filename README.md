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
- **Hono** local dev server (not in production)
- **SQLite** via Drizzle for ingest storage (local only — see "Why two data sources" below)
- **Vercel serverless function** (`api/ai.ts`) calling **Gemini 2.5 Flash** on demand

## Architecture

```
┌─────────────────────────┐         ┌──────────────────────────┐
│  LOCAL (build time)     │         │  VERCEL (runtime)        │
│                         │         │                          │
│  GitHub REST API        │         │  Static frontend (build/)│
│       ↓                 │ deploy  │         ↓                │
│  SQLite (data/sqlite.db)│ ──────► │  fetch /api/data         │
│       ↓                 │         │   └─► reads data.json    │
│  Impact.compute()       │         │                          │
│       ↓                 │         │  click "Generate AI"     │
│  data.json (snapshot)   │         │   └─► POST /api/ai       │
│                         │         │         ↓ Gemini 2.5     │
└─────────────────────────┘         └──────────────────────────┘
```

**Why two data sources?** SQLite is the working DB locally — sync ingests into it, `Impact.compute()` reads from it. Vercel can't access local SQLite, so we export the computed snapshot as `data.json` and ship it. Both `data.json` and the Gemini calls are served by Vercel serverless functions (`/api/data`, `/api/ai`) — the frontend never reads static data files directly.

## Reproduce locally

```bash
cp .env.empty .env   # then fill GITHUB_TOKEN and GEMINI_API_KEY
npm install
npm run data         # syncs PRs + reviews, computes report, writes data.json (~5 min first run)
npm run build        # static build → root/build/
```

Quick re-compute (no GitHub re-fetch):

```bash
npm run data:fresh
```

Local dev (Hono server + Vite middleware):

```bash
npm run dev          # http://localhost:8080
```

## Deploy

```bash
vercel --prod
```

**Don't forget**: set `GEMINI_API_KEY` in the Vercel project's env vars so the `/api/ai` function works in production. The frontend never sees the key.

`vercel.json` configures the static output (`build/`) and Vercel auto-detects `api/ai.ts` as a Node.js serverless function.

## Design philosophy

Read `arch.md` for the full design decisions. The short version:

- **No fake numbers.** Every metric is honestly computable from the data we ingest. Pillars that depend on unavailable data (files, CI) are out of scope rather than faked.
- **Top 5 with reasons.** Each top engineer gets reason bullets derived from their actual metrics, plus an optional Gemini summary on demand.
- **Methodology is in-page.** The "How is impact computed?" expander explains the weights and definitions next to the data.

Honest caveats:

- Review data is sampled to the most recent ~800 PRs in window (to keep build time bounded). Counts are proportional, may underrepresent absolute volume.
- File-level data not ingested → blast radius, bus factor, CI cleanliness out of scope for v1.
- Reverts detected by `^Revert ` title pattern, attributed to original author.
