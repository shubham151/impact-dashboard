import 'dotenv/config'
import { Db } from '$server/Db'
import { Impact } from '$server/Impact'
import { Sync } from '$server/Sync'

async function main(): Promise<void> {
  const skipSync = process.argv.includes('--skip-sync')
  const skipReviews = process.argv.includes('--skip-reviews')
  const db = Db.get()

  if (!skipSync) {
    console.log('[prebuild] syncing pulls…')
    const r1 = await Sync.syncPulls(db)
    console.log(`[prebuild] pulls added: ${r1.added}`)
  }
  if (!skipSync && !skipReviews) {
    console.log('[prebuild] syncing reviews…')
    const r2 = await Sync.syncReviews(db)
    console.log(`[prebuild] reviews added: ${r2.added}`)
  }

  // Sanity-check that the SQLite file is queryable by recomputing the report.
  // The deployed function reads data/sqlite.db directly via /api/data.
  console.log('[prebuild] verifying impact compute…')
  const report = Impact.compute(db)
  console.log(
    `[prebuild] OK: ${report.totalEngineers} engineers, ${report.totalPulls} PRs, ${report.totalReviews} reviews`
  )
  console.log('[prebuild] commit + push data/sqlite.db before deploying')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
