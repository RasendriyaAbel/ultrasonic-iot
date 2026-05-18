import { Router } from 'express'
import { getPool } from '../db/pool.js'
import { loadServerEnv } from '../config.js'

export const dailyRouter = Router()

/** Format dashboard: [{ date: ISO start-of-day, liters }] */
dailyRouter.get('/', async (req, res) => {
  try {
    const env = loadServerEnv()
    const deviceId = req.query.deviceId?.trim() || env.deviceId
    const days = Math.min(Number(req.query.days) || 30, 90)
    const from = req.query.from
    const to = req.query.to

    let sql = `
      SELECT consumption_date, liters, source
      FROM water_daily_consumption
      WHERE device_id = ?
    `
    const params = [deviceId]

    if (from) {
      sql += ' AND consumption_date >= ?'
      params.push(from.slice(0, 10))
    }
    if (to) {
      sql += ' AND consumption_date <= ?'
      params.push(to.slice(0, 10))
    }

    sql += ' ORDER BY consumption_date DESC'
    if (!from && !to) {
      sql += ' LIMIT ?'
      params.push(days)
    }

    const pool = getPool()
    const [rows] = await pool.execute(sql, params)

    const daily = rows
      .slice()
      .reverse()
      .map((r) => {
        const d = r.consumption_date instanceof Date ? r.consumption_date : new Date(r.consumption_date)
        const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        return {
          date: start.toISOString(),
          liters: Number(r.liters),
          source: r.source,
        }
      })

    res.json({ ok: true, deviceId, daily })
  } catch (err) {
    console.error('[daily] list failed', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

dailyRouter.post('/', async (req, res) => {
  try {
    const env = loadServerEnv()
    const deviceId = req.body?.deviceId?.trim() || env.deviceId
    const date = req.body?.date?.slice(0, 10)
    const liters = Number(req.body?.liters)
    const source = req.body?.source || 'computed'

    if (!date || !Number.isFinite(liters)) {
      return res.status(400).json({ ok: false, error: 'date dan liters wajib' })
    }

    const pool = getPool()
    await pool.execute(
      `INSERT INTO water_daily_consumption (device_id, consumption_date, liters, source)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE liters = VALUES(liters), source = VALUES(source)`,
      [deviceId, date, liters, source],
    )

    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('[daily] upsert failed', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})
