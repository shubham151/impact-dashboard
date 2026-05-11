import { readFileSync } from 'fs'
import path from 'path'

export default async function handler(): Promise<Response> {
  try {
    const file = path.join(process.cwd(), 'data.json')
    const body = readFileSync(file, 'utf-8')
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'data.json missing'
    return Response.json({ error: message }, { status: 500 })
  }
}
