import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateNarrative, type aiRequest } from '../server/AiCore.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' })
    return
  }
  try {
    const body = req.body as aiRequest
    if (!body?.login || !body?.metrics) {
      res.status(400).json({ error: 'missing login or metrics' })
      return
    }
    const result = await generateNarrative(body)
    res.status(200).json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'generation failed'
    console.error('[api/ai] failed:', err)
    res.status(500).json({ error: message })
  }
}
