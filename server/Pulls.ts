import { desc } from 'drizzle-orm'
import { pulls } from '$db/schema'
import { Sync } from '$server/Sync'
import type { app, db } from '$server/types'

function init(app: app, db: db): void {
  app.post('/api/sync', async (c) => {
    try {
      const result = await Sync.syncPulls(db)
      return c.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'sync failed'
      console.error('[sync] failed:', err)
      return c.json({ error: message }, 500)
    }
  })

  app.get('/api/pulls', async (c) => {
    const limit = parseLimit(c.req.query('limit'))
    const rows = await db.select().from(pulls).orderBy(desc(pulls.updatedAt)).limit(limit).all()
    return c.json(rows)
  })
}

function parseLimit(raw: string | undefined): number {
  if (!raw) return 20
  const n = parseInt(raw, 10)
  if (Number.isNaN(n) || n <= 0) return 20
  return Math.min(n, 200)
}

export const Pulls = { init }
