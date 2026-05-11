import { readFileSync } from 'fs'
import path from 'path'
import type { app } from '$server/types'

function dataPath(): string {
  return path.join(process.cwd(), 'data.json')
}

function init(app: app): void {
  app.get('/api/data', (c) => {
    try {
      const body = readFileSync(dataPath(), 'utf-8')
      return c.body(body, 200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'data.json missing'
      return c.json({ error: message }, 500)
    }
  })
}

export const Data = { init }
