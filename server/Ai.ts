import { generateNarrative, type aiRequest } from '$server/AiCore'
import type { app } from '$server/types'

function init(app: app): void {
  app.post('/api/ai', async (c) => {
    try {
      const body = await c.req.json<aiRequest>()
      if (!body?.login || !body?.metrics) {
        return c.json({ error: 'missing login or metrics' }, 400)
      }
      const result = await generateNarrative(body)
      return c.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'generation failed'
      console.error('[ai] failed:', err)
      return c.json({ error: message }, 500)
    }
  })
}

export const Ai = { init }
