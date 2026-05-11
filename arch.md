# Impact Dashboard — Architecture

An engineering impact dashboard for a GitHub repo. Audience: busy engineering leaders.
Goal: surface meaningful contributions beyond LOC / commit / PR counts.

## Design decisions

### Output shape

- Per-engineer card: **three horizontal bars** (Delivery / Collaboration / Quality) + small composite score (collapsed by default; not the headline).
- **Standouts** panel: 3–5 named axes (e.g. "Carried ingestion", "Highest review load"), not a single Top Contributor.
- **Concentration Risks** (bus factor) on team overview.
- No leaderboard. Per-engineer profile is the unit.

### Pillars

- **Delivery**: cycle time (PR open → merge, staged: review-wait / iteration / merge-wait, median, draft excluded, stuck-PR flag) + risk-adjusted throughput. _Consistency dropped._
- **Collaboration**: review load (PRs/active-week) + turnaround + breadth + depth ("reviews that triggered code change" + comment volume secondary). Changes-requested rate shown unscored. Self-merge as flag, not score.
- **Quality**: revert-within-2-weeks (primary) + follow-through (PRs that left draft → merged) + team-level blame attribution only + CI flags. _Per-engineer blame rejected. CI scored only at team level._

Pillar weights and sub-metric weights config-overridable with defaults.

### Risk model

- Risk = **blast radius**, not LOC.
- Components: criticality × files touched × cross-module breadth × test-ratio.
- Test-ratio component **soft-degrades** if test files aren't reliably detectable in the repo.

### Criticality

- Config-driven path globs with sensible defaults; user-overridable.
- Default high-criticality: migrations, ingestion, public API, schema, billing.

### Bus factor / knowledge gaps

- Unit: depth-2 directories with activity threshold; config-overridable.
- Metric: top-author share + author count + recency-weighted.
- Flagged when concentration is high AND module is critical.
- Surfaced as team-level "Concentration Risks" + engineer-level "Areas you carry".
- **Not** scored into composite.

### Work mix (Capability / Fix / Maintenance)

- Three buckets only.
- Waterfall classifier: Conventional Commits prefix → label → keyword regex → optional LLM fallback (cached forever per PR).
- Descriptive only, not scored. Framed as "Work mix", not "decision-making patterns".
- Classification confidence shown.

### Cohort

- Bot exclusion via config + defaults (`*[bot]`, `dependabot*`, `renovate*`, `github-actions*`).
- Min-activity threshold (default 3 PRs / 4 weeks; M=3 for monthly view).
- Rate metrics normalized on active weeks.
- Identity dedup punted to v2.
- Review-eligibility for bot vs external PRs is configurable.

### Time windows

- Default: rolling 90 days.
- Views: 30d / 90d / 365d side-by-side for standouts and trends.
- Rolling vs calendar = **global** dashboard setting (not per-panel). Toggling forces recompute.
- Calendar mode shows coverage indicator ("12 days in window").

### AI summary

- Inputs: metrics + cited evidence (top PR titles, file paths, reverts, bus-factor flags, work mix). Never raw diffs. Never the composite score.
- Structured output: Strengths / Concerns / Watch-items. Claims must cite PR# or file path.
- Cache key: `(engineer, window, inputs-hash, model-version)`.
- Refresh: weekly cron + manual regenerate button. No event-driven auto-refresh in v1.
- Manual regen rate-limited (1–3 / day).
- Evidence panel collapsible under summary.

### Detection rules (caveats)

- **"Reviews that triggered code change"**: source = PR timeline events (squash/force-push safe). New commits or head-SHA changes between `review.submitted_at` and `merge_at` count. Force-pushes count as iteration even if diff is unchanged. Reviews after the last code change are excluded from the denominator.
- **Follow-through**: numerator = merged in window; denominator = PRs that left draft state in window. Drafts that never leave draft are excluded.
- **Self-merge**: defined as "merged with zero approving reviews from another human" (not `author === merged_by`). Flag-only above threshold (default 20%). Bot approvals labeled separately when detectable.
- **CI bypass flag**: only when required-check / branch-protection context is reliably detectable. Conversation prompt, not score.

### Explicitly out of scope (v1)

AI-assisted code detection · Innovation rate · Roadmap alignment · Capitalizable · Talent density · Issue-to-merge (DORA lead time) · Per-engineer blame · Per-engineer CI scoring · Single Top Contributor leaderboard · Identity dedup.

## Structure

```
lib/core/Api.ts        — fetch wrapper (get/post)

db/schema.ts           — authors, prs, reviews, files, prFiles, summaries, syncState

server/
  Github.ts            — GitHub ingest (PRs, reviews, files, check runs)
  Sync.ts              — incremental sync with cursor in syncState
  Config.ts            — criticality globs, bots, weights, window mode
  Cohort.ts            — bot filter, activity threshold, active-weeks
  Risk.ts              — blast radius
  Cycle.ts             — staged cycle time
  Review.ts            — load, turnaround, breadth, change-triggered depth
  Quality.ts           — reverts, follow-through, team blame, CI flags
  WorkMix.ts           — waterfall classifier
  BusFactor.ts         — concentration per depth-2 dir
  Pillars.ts           — combine sub-metrics → Delivery / Collab / Quality + composite
  Standouts.ts         — multi-axis selection
  Ai.ts                — Anthropic SDK; cached summaries
  Dashboard.ts         — Hono routes
  Cron.ts              — weekly AI refresh + manual regen endpoint

client/
  dashboard/
    Dashboard.ts            — Api wrapper
    Dashboard.svelte        — page: standouts + concentration risks + engineer grid
    WindowControls.svelte   — global window mode + size
    Standouts.svelte
    ConcentrationRisks.svelte
    EngineerCard.svelte     — 3 bars + tiny composite (collapsed)
    EngineerProfile.svelte  — pillars + work mix + AI summary + evidence
    AiSummary.svelte
```

## Data flow

1. **Sync** (cron / on-demand): `Github.ts` pulls PRs / reviews / files / check runs incrementally; cursor stored in `syncState`.
2. **Compute** (per dashboard load, cached): `Cohort` filters authors → `Risk` / `Cycle` / `Review` / `Quality` / `WorkMix` produce sub-metrics → `Pillars` combines → `Standouts` / `BusFactor` derive views.
3. **AI** (weekly cron + manual): `Ai.ts` reads computed evidence per engineer; output cached by inputs-hash.
4. **Serve**: `Dashboard.ts` exposes Hono routes; `client/dashboard` consumes via `lib/core/Api.ts`.

## Conventions

- Feature modules: named-function declarations, single object export (e.g. `export const Risk = { score }`).
- No arrow-const for functions.
- Path aliases: `$client`, `$server`, `$db`, `$lib`.
- Config: file-based defaults + DB-stored user overrides (no hardcoded paths).
- Soft-degrade: any optional input (test files, CI data, labels, CC prefixes) absent → drop component, document gap in UI, never fake a number.
