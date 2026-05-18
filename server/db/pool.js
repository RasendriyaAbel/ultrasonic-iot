import mysql from 'mysql2/promise'
import { loadServerEnv } from '../config.js'

let pool = null

export function getPool() {
  if (pool) return pool
  const env = loadServerEnv()
  pool = mysql.createPool({
    host: env.mysql.host,
    port: env.mysql.port,
    user: env.mysql.user,
    password: env.mysql.password,
    database: env.mysql.database,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: 'Z',
    dateStrings: false,
  })
  return pool
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
