import { Impact } from '$server/Impact'
import type { app, db } from '$server/types'

function init(app: app, db: db): void {
  app.get('/api/data', async (c) => {
    try {
      const report = await Impact.compute(db)
      return c.json(report)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'compute failed'
      return c.json({ error: message }, 500)
    }
  })
}

export const Data = { init }
