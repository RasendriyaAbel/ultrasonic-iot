import { Router } from 'express'
import { getPool } from '../db/pool.js'
import {
  mapFlatTelemetryToRow,
  rowToInsertValues,
  TELEMETRY_INSERT_COLUMNS,
} from '../db/columnMap.js'
import { loadServerEnv } from '../config.js'

export const telemetryRouter = Router()

telemetryRouter.post('/', async (req, res) => {
  try {
    const env = loadServerEnv()
    const flat = req.body?.values ?? req.body ?? {}
    const deviceId = req.body?.deviceId?.trim() || env.deviceId
    const recordedAt = req.body?.recordedAt || req.body?.timestamp || new Date()

    const row = mapFlatTelemetryToRow(flat, { deviceId, recordedAt })
    const pool = getPool()
    const placeholders = TELEMETRY_INSERT_COLUMNS.map(() => '?').join(', ')
    const sql = `INSERT INTO water_telemetry (${TELEMETRY_INSERT_COLUMNS.join(', ')}) VALUES (${placeholders})`

    const [result] = await pool.execute(sql, rowToInsertValues(row))
    res.status(201).json({ ok: true, id: result.insertId, row })
  } catch (err) {
    console.error('[telemetry] insert failed', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

telemetryRouter.get('/', async (req, res) => {
  try {
    const env = loadServerEnv()
    const deviceId = req.query.deviceId?.trim() || env.deviceId
    const limit = Math.min(Number(req.query.limit) || 100, 500)
    const from = req.query.from
    const to = req.query.to

    let sql = `SELECT * FROM water_telemetry WHERE device_id = ?`
    const params = [deviceId]

    if (from) {
      sql += ' AND recorded_at >= ?'
      params.push(new Date(from))
    }
    if (to) {
      sql += ' AND recorded_at <= ?'
      params.push(new Date(to))
    }

    sql += ' ORDER BY recorded_at DESC LIMIT ?'
    params.push(limit)

    const pool = getPool()
    const [rows] = await pool.execute(sql, params)
    res.json({ ok: true, rows })
  } catch (err) {
    console.error('[telemetry] list failed', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})
