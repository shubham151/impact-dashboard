import type { VercelRequest, VercelResponse } from '@vercel/node'
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

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const db = Db.get()
    const report = await withTimeout(Impact.compute(db), TIMEOUT_MS, 'Impact.compute')
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    res.status(200).json(report)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'compute failed'
    console.error('[api/data] failed:', err)
    res.status(500).json({ error: message })
  }
}
