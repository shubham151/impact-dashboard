import 'dotenv/config'
import { Db } from '$server/Db'
import { Impact } from '$server/Impact'
import { Sync } from '$server/Sync'
import { writeFileSync } from 'fs'

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

  console.log('[prebuild] computing impact…')
  const report = Impact.compute(db)
  console.log(
    `[prebuild] ${report.totalEngineers} engineers, ${report.totalPulls} PRs, ${report.totalReviews} reviews`
  )

  writeFileSync('data.json', JSON.stringify(report, null, 2))
  console.log('[prebuild] wrote data.json (served by /api/data; AI on demand via /api/ai)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
