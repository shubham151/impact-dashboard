import { and, eq, gte } from 'drizzle-orm'
import { authors, pulls, reviews } from '$db/schema'
import type { db } from '$server/types'

const WINDOW_DAYS = 90
const MIN_MERGED = 3
const WEIGHTS = { delivery: 0.35, collaboration: 0.35, quality: 0.3 }

// ──────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────

export type impactBreakdown = {
  mergedCount: number
  openedCount: number
  abandonedCount: number
  medianCycleHrs: number
  activeWeeks: number
  followThrough: number
  reviewsGiven: number
  authorsReviewed: number
  revertedCount: number
}

export type pillarScores = {
  delivery: number
  collaboration: number
  quality: number
  composite: number
}

export type rankedEngineer = {
  login: string
  rank: number
  scores: pillarScores
  metrics: impactBreakdown
  reasons: string[]
  topPrTitles: string[]
}

export type engineerSlim = {
  login: string
  rank: number
  composite: number
  mergedCount: number
  reviewsGiven: number
  activeWeeks: number
}

export type impactReport = {
  windowDays: number
  windowStart: string
  windowEnd: string
  generatedAt: string
  totalPulls: number
  totalEngineers: number
  totalReviews: number
  weights: typeof WEIGHTS
  top5: rankedEngineer[]
  rest: engineerSlim[]
}

// ──────────────────────────────────────────────────────────
// Internal row types
// ──────────────────────────────────────────────────────────

type pullRow = {
  id: string
  number: number
  title: string
  authorLogin: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
  mergedAt: string | null
}

type reviewRow = { reviewerLogin: string; prId: string; submittedAt: string }

type candidate = { login: string; metrics: impactBreakdown }

type cohort = {
  merged: number[]
  activeWeeks: number[]
  cycle: number[]
  reviews: number[]
  authors: number[]
  followThrough: number[]
  reverts: number[]
}

// ──────────────────────────────────────────────────────────
// Small utilities
// ──────────────────────────────────────────────────────────

function windowCutoff(): string {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].toSorted((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function isoWeek(iso: string): string {
  const d = new Date(iso)
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7)
  return `${d.getUTCFullYear()}-${String(week).padStart(2, '0')}`
}

function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000
}

function normalize(value: number, all: number[], invert = false): number {
  if (all.length === 0) return 0.5
  const max = Math.max(...all)
  const min = Math.min(...all)
  if (max === min) return 0.5
  const n = (value - min) / (max - min)
  return invert ? 1 - n : n
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  return items.reduce<Map<K, T[]>>((acc, item) => {
    const k = keyFn(item)
    acc.set(k, [...(acc.get(k) ?? []), item])
    return acc
  }, new Map())
}

// ──────────────────────────────────────────────────────────
// Data loading
// ──────────────────────────────────────────────────────────

function loadPulls(db: db, cutoff: string): pullRow[] {
  return db
    .select({
      id: pulls.id,
      number: pulls.number,
      title: pulls.title,
      authorLogin: pulls.authorLogin,
      createdAt: pulls.createdAt,
      updatedAt: pulls.updatedAt,
      closedAt: pulls.closedAt,
      mergedAt: pulls.mergedAt
    })
    .from(pulls)
    .innerJoin(authors, eq(pulls.authorLogin, authors.login))
    .where(and(eq(authors.isBot, false), gte(pulls.createdAt, cutoff)))
    .all() as pullRow[]
}

function loadReviews(db: db, cutoff: string): reviewRow[] {
  return db
    .select({
      reviewerLogin: reviews.reviewerLogin,
      prId: reviews.prId,
      submittedAt: reviews.submittedAt
    })
    .from(reviews)
    .innerJoin(authors, eq(reviews.reviewerLogin, authors.login))
    .where(and(eq(authors.isBot, false), gte(reviews.submittedAt, cutoff)))
    .all() as reviewRow[]
}

// ──────────────────────────────────────────────────────────
// Reverts: PRs whose title starts with "Revert ..." imply the
// original author shipped a regression. We attribute the revert
// to the original author by matching the revert title.
// ──────────────────────────────────────────────────────────

function unwrapRevertTitle(title: string): string {
  return title.replace(/^Revert\s+"?(.*?)"?$/, '$1').trim()
}

function detectReverts(allPulls: pullRow[]): Map<string, number> {
  const titleToAuthor = new Map(allPulls.map((p) => [p.title, p.authorLogin]))
  const revertingPulls = allPulls.filter((p) => p.mergedAt && p.title.startsWith('Revert '))
  return revertingPulls.reduce<Map<string, number>>((acc, p) => {
    const original = titleToAuthor.get(unwrapRevertTitle(p.title))
    if (original) acc.set(original, (acc.get(original) ?? 0) + 1)
    return acc
  }, new Map())
}

// ──────────────────────────────────────────────────────────
// Per-engineer metric extraction
// ──────────────────────────────────────────────────────────

function distinctAuthorsReviewed(
  reviews: reviewRow[],
  prIdToAuthor: Map<string, string>,
  selfLogin: string
): Set<string> {
  const others = reviews
    .map((r) => prIdToAuthor.get(r.prId))
    .filter((a): a is string => !!a && a !== selfLogin)
  return new Set(others)
}

function computeMetrics(
  login: string,
  ownPulls: pullRow[],
  reviewsByReviewer: Map<string, reviewRow[]>,
  reverts: Map<string, number>,
  prIdToAuthor: Map<string, string>
): impactBreakdown {
  const merged = ownPulls.filter((p) => p.mergedAt)
  const abandoned = ownPulls.filter((p) => !p.mergedAt && p.closedAt)
  const cycleHrs = merged.map((p) => hoursBetween(p.createdAt, p.mergedAt!))
  const weeks = new Set(merged.map((p) => isoWeek(p.mergedAt!)))
  const given = reviewsByReviewer.get(login) ?? []
  const opened = ownPulls.length
  return {
    mergedCount: merged.length,
    openedCount: opened,
    abandonedCount: abandoned.length,
    medianCycleHrs: median(cycleHrs),
    activeWeeks: weeks.size,
    followThrough: opened === 0 ? 0 : merged.length / opened,
    reviewsGiven: given.length,
    authorsReviewed: distinctAuthorsReviewed(given, prIdToAuthor, login).size,
    revertedCount: reverts.get(login) ?? 0
  }
}

// ──────────────────────────────────────────────────────────
// Cohort + pillar scoring
// ──────────────────────────────────────────────────────────

function buildCohort(all: impactBreakdown[]): cohort {
  return {
    merged: all.map((m) => m.mergedCount),
    activeWeeks: all.map((m) => m.activeWeeks),
    cycle: all.map((m) => m.medianCycleHrs).filter((v) => v > 0),
    reviews: all.map((m) => m.reviewsGiven),
    authors: all.map((m) => m.authorsReviewed),
    followThrough: all.map((m) => m.followThrough),
    reverts: all.map((m) => m.revertedCount)
  }
}

function deliveryScore(m: impactBreakdown, c: cohort): number {
  const cycleScore = m.medianCycleHrs > 0 ? normalize(m.medianCycleHrs, c.cycle, true) : 0.5
  return (
    0.4 * normalize(m.mergedCount, c.merged) +
    0.3 * normalize(m.activeWeeks, c.activeWeeks) +
    0.3 * cycleScore
  )
}

function collaborationScore(m: impactBreakdown, c: cohort): number {
  return 0.5 * normalize(m.reviewsGiven, c.reviews) + 0.5 * normalize(m.authorsReviewed, c.authors)
}

function qualityScore(m: impactBreakdown, c: cohort): number {
  return (
    0.6 * normalize(m.followThrough, c.followThrough) +
    0.4 * normalize(m.revertedCount, c.reverts, true)
  )
}

function scoreEngineer(m: impactBreakdown, c: cohort): pillarScores {
  const delivery = deliveryScore(m, c)
  const collaboration = collaborationScore(m, c)
  const quality = qualityScore(m, c)
  return {
    delivery,
    collaboration,
    quality,
    composite:
      WEIGHTS.delivery * delivery +
      WEIGHTS.collaboration * collaboration +
      WEIGHTS.quality * quality
  }
}

// ──────────────────────────────────────────────────────────
// Per-engineer narrative bits
// ──────────────────────────────────────────────────────────

function buildReasons(m: impactBreakdown, scores: pillarScores, rank: number): string[] {
  const candidates = [
    {
      ok: scores.delivery >= 0.7,
      text: `Strong shipper: ${m.mergedCount} PRs merged across ${m.activeWeeks} weeks`
    },
    {
      ok: scores.collaboration >= 0.7,
      text: `Heavy reviewer: ${m.reviewsGiven} reviews across ${m.authorsReviewed} distinct authors`
    },
    {
      ok: scores.quality >= 0.7,
      text: `High follow-through (${Math.round(m.followThrough * 100)}%) and low revert rate`
    },
    {
      ok: m.medianCycleHrs > 0 && m.medianCycleHrs < 48,
      text: `Fast cycle time (median ${m.medianCycleHrs.toFixed(1)}h open → merge)`
    },
    {
      ok: m.activeWeeks >= 10,
      text: `Consistent: active in ${m.activeWeeks} of the last 13 weeks`
    }
  ]
  const picked = candidates.filter((c) => c.ok).map((c) => c.text)
  return (picked.length > 0 ? picked : [`Ranked #${rank} on composite impact score`]).slice(0, 3)
}

function pickTopPrTitles(ownPulls: pullRow[]): string[] {
  return ownPulls
    .filter((p) => p.mergedAt)
    .toSorted((a, b) => (a.mergedAt! > b.mergedAt! ? -1 : 1))
    .slice(0, 5)
    .map((p) => `#${p.number} ${p.title}`)
}

// ──────────────────────────────────────────────────────────
// Candidate building and ranking
// ──────────────────────────────────────────────────────────

function buildCandidates(
  pullsByAuthor: Map<string, pullRow[]>,
  reviewsByReviewer: Map<string, reviewRow[]>,
  reverts: Map<string, number>,
  prIdToAuthor: Map<string, string>
): candidate[] {
  return [...pullsByAuthor.entries()]
    .map(([login, list]) => ({
      login,
      metrics: computeMetrics(login, list, reviewsByReviewer, reverts, prIdToAuthor)
    }))
    .filter((c) => c.metrics.mergedCount >= MIN_MERGED)
}

function rankCandidates(
  candidates: candidate[],
  pullsByAuthor: Map<string, pullRow[]>
): rankedEngineer[] {
  const cohort = buildCohort(candidates.map((c) => c.metrics))
  return candidates
    .map((c) => ({ ...c, scores: scoreEngineer(c.metrics, cohort) }))
    .toSorted((a, b) => b.scores.composite - a.scores.composite)
    .map((c, i) => ({
      login: c.login,
      rank: i + 1,
      scores: c.scores,
      metrics: c.metrics,
      reasons: buildReasons(c.metrics, c.scores, i + 1),
      topPrTitles: pickTopPrTitles(pullsByAuthor.get(c.login) ?? [])
    }))
}

function slimify(ranked: rankedEngineer[]): engineerSlim[] {
  return ranked.map((e) => ({
    login: e.login,
    rank: e.rank,
    composite: e.scores.composite,
    mergedCount: e.metrics.mergedCount,
    reviewsGiven: e.metrics.reviewsGiven,
    activeWeeks: e.metrics.activeWeeks
  }))
}

// ──────────────────────────────────────────────────────────
// Top-level orchestrator
// ──────────────────────────────────────────────────────────

function compute(db: db): impactReport {
  const cutoff = windowCutoff()
  const allPulls = loadPulls(db, cutoff)
  const allReviews = loadReviews(db, cutoff)

  const prIdToAuthor = new Map(allPulls.map((p) => [p.id, p.authorLogin]))
  const pullsByAuthor = groupBy(allPulls, (p) => p.authorLogin)
  const reviewsByReviewer = groupBy(allReviews, (r) => r.reviewerLogin)
  const reverts = detectReverts(allPulls)

  const candidates = buildCandidates(pullsByAuthor, reviewsByReviewer, reverts, prIdToAuthor)
  const ranked = rankCandidates(candidates, pullsByAuthor)

  const now = new Date().toISOString()
  return {
    windowDays: WINDOW_DAYS,
    windowStart: cutoff,
    windowEnd: now,
    generatedAt: now,
    totalPulls: allPulls.length,
    totalEngineers: ranked.length,
    totalReviews: allReviews.length,
    weights: WEIGHTS,
    top5: ranked.slice(0, 5),
    rest: slimify(ranked.slice(5))
  }
}

export const Impact = { compute }
