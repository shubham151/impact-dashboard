import { Db } from '../server/Db.js'
import { Impact } from '../server/Impact.js'

const TIMEOUT_MS = 25_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ])
}

export default async function handler(): Promise<Response> {
  try {
    const db = Db.get()
    const report = await withTimeout(Impact.compute(db), TIMEOUT_MS, 'Impact.compute')
    return Response.json(report, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'compute failed'
    console.error('[api/data] failed:', err)
    return Response.json({ error: message }, { status: 500 })
  }
}
