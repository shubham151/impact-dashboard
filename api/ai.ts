import { generateNarrative, type aiRequest } from '../server/AiCore.js'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method not allowed' }, { status: 405 })
  }
  try {
    const body = (await req.json()) as aiRequest
    if (!body?.login || !body?.metrics) {
      return Response.json({ error: 'missing login or metrics' }, { status: 400 })
    }
    const result = await generateNarrative(body)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'generation failed'
    console.error('[ai] failed:', err)
    return Response.json({ error: message }, { status: 500 })
  }
}
