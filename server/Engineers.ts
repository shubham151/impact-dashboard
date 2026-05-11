import { and, count, desc, eq, gte, max, min, sql, type SQL } from 'drizzle-orm'
import { authors, pulls, syncState } from '$db/schema'
import type { app, db } from '$server/types'

const WINDOW_DAYS = 90
const DEFAULT_PER_PAGE = 20
const MAX_PER_PAGE = 100

function windowCutoff(): string {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

type engineerRow = {
  login: string
  prCount: number
  mergedCount: number
  draftCount: number
  firstActivity: string | null
  lastActivity: string | null
}

function mergedCountExpr(): SQL<number> {
  return sql<number>`sum(case when ${pulls.mergedAt} is not null then 1 else 0 end)`
}

function draftCountExpr(): SQL<number> {
  return sql<number>`sum(case when ${pulls.isDraft} = 1 then 1 else 0 end)`
}

function listEngineers(db: db, page: number, perPage: number): engineerRow[] {
  const cutoff = windowCutoff()
  return db
    .select({
      login: pulls.authorLogin,
      prCount: count(),
      mergedCount: mergedCountExpr(),
      draftCount: draftCountExpr(),
      firstActivity: min(pulls.createdAt),
      lastActivity: max(pulls.updatedAt)
    })
    .from(pulls)
    .innerJoin(authors, eq(pulls.authorLogin, authors.login))
    .where(and(eq(authors.isBot, false), gte(pulls.updatedAt, cutoff)))
    .groupBy(pulls.authorLogin)
    .orderBy(desc(mergedCountExpr()), desc(count()))
    .limit(perPage)
    .offset((page - 1) * perPage)
    .all()
}

function repoSummary(db: db): { totalPulls: number; totalEngineers: number; windowDays: number } {
  const cutoff = windowCutoff()
  const row = db
    .select({
      totalPulls: count(),
      totalEngineers: sql<number>`count(distinct ${pulls.authorLogin})`
    })
    .from(pulls)
    .innerJoin(authors, eq(pulls.authorLogin, authors.login))
    .where(and(eq(authors.isBot, false), gte(pulls.updatedAt, cutoff)))
    .get()
  return {
    totalPulls: row?.totalPulls ?? 0,
    totalEngineers: row?.totalEngineers ?? 0,
    windowDays: WINDOW_DAYS
  }
}

function totalPullsAllTime(db: db): number {
  const row = db.select({ c: count() }).from(pulls).get()
  return row?.c ?? 0
}

function syncStatusFor(db: db): {
  lastSync: string | null
  cursorAt: string | null
  totalPulls: number
} {
  const cursorRow = db
    .select()
    .from(syncState)
    .where(sql`${syncState.key} like 'pulls:%'`)
    .get()
  return {
    lastSync: cursorRow?.updatedAt ?? null,
    cursorAt: cursorRow?.value ?? null,
    totalPulls: totalPullsAllTime(db)
  }
}

function parseInt1(raw: string | undefined, fallback: number, max: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n) || n < 1) return fallback
  return Math.min(n, max)
}

function init(app: app, db: db): void {
  app.get('/api/engineers', (c) => {
    const page = parseInt1(c.req.query('page'), 1, 1_000_000)
    const perPage = parseInt1(c.req.query('perPage'), DEFAULT_PER_PAGE, MAX_PER_PAGE)
    const summary = repoSummary(db)
    const totalPages = Math.max(1, Math.ceil(summary.totalEngineers / perPage))
    const engineers = listEngineers(db, page, perPage)
    return c.json({
      engineers,
      summary,
      pagination: { page, perPage, total: summary.totalEngineers, totalPages }
    })
  })

  app.get('/api/sync/status', (c) => {
    return c.json(syncStatusFor(db))
  })
}

export const Engineers = { init }
