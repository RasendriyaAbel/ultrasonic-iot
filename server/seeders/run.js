import { closePool } from '../db/pool.js'
import { seedActualMay10_17 } from './actualMay10_17.js'

async function main() {
  const which = process.argv[2] || 'actual-may10-17'

  switch (which) {
    case 'actual-may10-17':
      await seedActualMay10_17()
      break
    default:
      console.error('Seeder tidak dikenal:', which)
      console.error('Tersedia: actual-may10-17')
      process.exit(1)
  }

  await closePool()
  console.log('[seed] Selesai.')
}

main().catch((err) => {
  console.error('[seed] Gagal:', err.message)
  process.exit(1)
})
