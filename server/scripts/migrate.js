import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { loadServerEnv } from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = path.resolve(__dirname, '../../database/schema.sql')

async function main() {
  const env = loadServerEnv()
  const sql = await fs.readFile(SCHEMA_PATH, 'utf8')

  const conn = await mysql.createConnection({
    host: env.mysql.host,
    port: env.mysql.port,
    user: env.mysql.user,
    password: env.mysql.password,
    multipleStatements: true,
  })

  try {
    await conn.query(sql)
    console.log('[migrate] Skema berhasil diterapkan →', env.mysql.database)
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('[migrate] Gagal:', err.message)
  process.exit(1)
})
