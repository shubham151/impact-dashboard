import { and, eq, gte, sql } from 'drizzle-orm'
import { authors, pulls, reviews, syncState } from '$db/schema'
import { Config } from '$server/Config'
import { Github } from '$server/Github'
import type { config, db, rawPull, rawReview } from '$server/types'

const PER_PAGE = 100

function globToRegex(glob: string): RegExp {
  const esc = glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${esc}$`, 'i')
}

function isBot(login: string, type: string, botGlobs: string[]): boolean {
  if (type === 'Bot') return true
  return botGlobs.map(globToRegex).some((r) => r.test(login))
}

async function readCursor(db: db, key: string): Promise<string | null> {
  const row = await db.select().from(syncState).where(eq(syncState.key, key)).get()
  return row?.value ?? null
}

async function writeCursor(db: db, key: string, value: string): Promise<void> {
  await db
    .insert(syncState)
    .values({ key, value })
    .onConflictDoUpdate({ target: syncState.key, set: { value } })
    .run()
}

async function upsertAuthor(
  db: db,
  login: string,
  type: string,
  botGlobs: string[]
): Promise<void> {
  await db
    .insert(authors)
    .values({ login, isBot: isBot(login, type, botGlobs) })
    .onConflictDoNothing()
    .run()
}

async function upsertPull(db: db, repo: string, p: rawPull): Promise<void> {
  const row = {
    id: p.node_id,
    number: p.number,
    repo,
    title: p.title,
    state: p.state,
    authorLogin: p.user?.login ?? 'unknown',
    body: p.body,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    closedAt: p.closed_at,
    mergedAt: p.merged_at,
    isDraft: p.draft,
    mergedBy: p.merged_by?.login ?? null,
    baseRef: p.base.ref,
    headRef: p.head.ref,
    labels: p.labels.map((l) => l.name)
  }
  await db
    .insert(pulls)
    .values(row)
    .onConflictDoUpdate({
      target: pulls.id,
      set: {
        title: row.title,
        state: row.state,
        body: row.body,
        updatedAt: row.updatedAt,
        closedAt: row.closedAt,
        mergedAt: row.mergedAt,
        isDraft: row.isDraft,
        mergedBy: row.mergedBy,
        labels: row.labels
      }
    })
    .run()
}

function batchNewest(batch: rawPull[]): string | null {
  return batch.reduce<string | null>(
    (max, p) => (!max || p.updated_at > max ? p.updated_at : max),
    null
  )
}

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

function ingestableSlice(batch: rawPull[], cursor: string | null): rawPull[] {
  if (!cursor) return batch
  const cutoff = batch.findIndex((p) => p.updated_at <= cursor)
  return cutoff === -1 ? batch : batch.slice(0, cutoff)
}

async function ingestBatch(db: db, cfg: config, batch: rawPull[]): Promise<void> {
  await batch.reduce(async (prev, p) => {
    await prev
    const login = p.user?.login ?? 'unknown'
    const type = p.user?.type ?? 'User'
    await upsertAuthor(db, login, type, cfg.bots)
    await upsertPull(db, cfg.repo, p)
  }, Promise.resolve())
}

type pageState = { added: number; newestSeen: string | null }

async function syncPage(
  db: db,
  cfg: config,
  cursor: string | null,
  page: number,
  state: pageState
): Promise<pageState> {
  const batch = await Github.fetchPullsPage(cfg.repo, page, PER_PAGE)
  if (batch.length === 0) return state

  const toIngest = ingestableSlice(batch, cursor)
  await ingestBatch(db, cfg, toIngest)

  const nextState: pageState = {
    added: state.added + toIngest.length,
    newestSeen: maxIso(state.newestSeen, batchNewest(toIngest))
  }

  console.log(`[sync] page ${page}: fetched ${batch.length}, ingested ${nextState.added} so far`)

  const reachedCursor = toIngest.length < batch.length
  const endOfList = batch.length < PER_PAGE
  if (reachedCursor || endOfList) return nextState
  return syncPage(db, cfg, cursor, page + 1, nextState)
}

async function syncPulls(db: db): Promise<{ added: number }> {
  const cfg = Config.load()
  const cursorKey = `pulls:${cfg.repo}`
  const cursor = await readCursor(db, cursorKey)
  const result = await syncPage(db, cfg, cursor, 1, { added: 0, newestSeen: null })
  if (result.newestSeen) await writeCursor(db, cursorKey, result.newestSeen)
  return { added: result.added }
}

async function upsertReviews(
  db: db,
  prId: string,
  prNumber: number,
  raws: rawReview[]
): Promise<number> {
  const valid = raws.filter((r) => r.user && r.submitted_at)
  await valid.reduce(async (prev, r) => {
    await prev
    await db
      .insert(reviews)
      .values({
        id: r.node_id,
        prId,
        prNumber,
        reviewerLogin: r.user!.login,
        state: r.state,
        submittedAt: r.submitted_at!
      })
      .onConflictDoNothing()
      .run()
  }, Promise.resolve())
  return valid.length
}

async function pullsNeedingReviews(
  db: db,
  cfg: config,
  cutoff: string,
  limit: number
): Promise<{ id: string; number: number }[]> {
  return db
    .select({ id: pulls.id, number: pulls.number })
    .from(pulls)
    .where(
      and(
        eq(pulls.repo, cfg.repo),
        gte(pulls.createdAt, cutoff),
        sql`${pulls.id} not in (select distinct ${reviews.prId} from ${reviews})`
      )
    )
    .orderBy(sql`${pulls.createdAt} desc`)
    .limit(limit)
    .all()
}

async function syncReviewsBatch(
  db: db,
  cfg: config,
  todo: { id: string; number: number }[],
  i: number,
  total: number
): Promise<number> {
  if (i >= todo.length) return total
  const item = todo[i]
  const raws = await Github.fetchReviewsForPull(cfg.repo, item.number)
  const n = await upsertReviews(db, item.id, item.number, raws)
  if (i % 25 === 0) console.log(`[sync] reviews: ${i}/${todo.length}, ${total + n} so far`)
  return syncReviewsBatch(db, cfg, todo, i + 1, total + n)
}

async function syncReviews(
  db: db,
  windowDays: number = 90,
  maxPulls: number = 800
): Promise<{ added: number }> {
  const cfg = Config.load()
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()
  const todo = await pullsNeedingReviews(db, cfg, cutoff, maxPulls)
  console.log(`[sync] reviews: ${todo.length} PRs to check (cap ${maxPulls})`)
  const added = await syncReviewsBatch(db, cfg, todo, 0, 0)
  return { added }
}

export const Sync = { syncPulls, syncReviews }
