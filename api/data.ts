import { Db } from '../server/Db'
import { Impact } from '../server/Impact'

export default async function handler(): Promise<Response> {
  try {
    const db = Db.get()
    const report = await Impact.compute(db)
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
