import express from 'express'
import cors from 'cors'
import { loadServerEnv } from './config.js'
import { closePool, getPool } from './db/pool.js'
import { telemetryRouter } from './routes/telemetry.js'
import { dailyRouter } from './routes/daily.js'

const env = loadServerEnv()
const app = express()

app.use(cors())
app.use(express.json({ limit: '256kb' }))

app.get('/api/health', async (_req, res) => {
  try {
    const pool = getPool()
    await pool.query('SELECT 1')
    res.json({ ok: true, database: env.mysql.database })
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message })
  }
})

app.use('/api/telemetry', telemetryRouter)
app.use('/api/daily-consumption', dailyRouter)

const server = app.listen(env.port, () => {
  console.log(`[api] http://localhost:${env.port} (MySQL: ${env.mysql.host}/${env.mysql.database})`)
})

async function shutdown() {
  server.close()
  await closePool()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
