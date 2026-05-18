/**
 * Data aktual rekayasa: 10–17 Mei 2026
 * — 8 hari konsumsi harian (water_daily_consumption)
 * — sampel telemetri per jam (water_telemetry) dengan pola pompa realistis
 */
import { getPool, closePool } from '../db/pool.js'
import { loadServerEnv } from '../config.js'
import { mapFlatTelemetryToRow, rowToInsertValues, TELEMETRY_INSERT_COLUMNS } from '../db/columnMap.js'

const TANK_L = 57
const ULTRASONIC_TO_BOTTOM_CM = 50

/** Konsumsi harian (L) — pola mirip dataset 57L */
const DAILY_LITERS = [
  { date: '2026-05-10', liters: 10.24 },
  { date: '2026-05-11', liters: 8.71 },
  { date: '2026-05-12', liters: 11.08 },
  { date: '2026-05-13', liters: 9.43 },
  { date: '2026-05-14', liters: 7.86 },
  { date: '2026-05-15', liters: 10.52 },
  { date: '2026-05-16', liters: 9.91 },
  { date: '2026-05-17', liters: 11.27 },
]

function levelFromVolume(volumeL) {
  const pct = Math.max(15, Math.min(100, (volumeL / TANK_L) * 100))
  const levelCm = (pct / 100) * ULTRASONIC_TO_BOTTOM_CM
  const jarakCm = Math.max(3, ULTRASONIC_TO_BOTTOM_CM - levelCm)
  return { pct, levelCm, jarakCm, volumeL }
}

/** Jam aktif pompa (lokal WIB ≈ UTC+7, disimpan UTC) */
const PUMP_HOURS = [6, 7, 8, 12, 18, 19, 20]

function buildHourlyFlat({ dayIndex, hour, cumulativeUsed }) {
  const volumeStart = TANK_L - DAILY_LITERS.slice(0, dayIndex).reduce((s, d) => s + d.liters, 0)
  const dayFraction = hour / 24
  const usedToday = DAILY_LITERS[dayIndex].liters * dayFraction
  const volumeL = Math.max(8, volumeStart - usedToday)
  const { pct, levelCm, jarakCm } = levelFromVolume(volumeL)

  const pumpOn = PUMP_HOURS.includes(hour)
  const flowOut = pumpOn ? 2.4 + (hour % 3) * 0.15 : 0
  const flowIn = pumpOn ? flowOut + 0.08 : 0
  const activity = pumpOn ? 'shower' : hour >= 22 || hour < 5 ? 'idle' : 'low_use'

  return {
    jarak_cm: Number(jarakCm.toFixed(2)),
    level_cm: Number(levelCm.toFixed(2)),
    level_air_percent: Number(pct.toFixed(2)),
    tank_volume_liter: TANK_L,
    volume_liter: Number(volumeL.toFixed(2)),
    flow_in_lpm: flowIn,
    flow_out_lpm: flowOut,
    pump_on: pumpOn ? 1 : 0,
    pump_status: pumpOn ? 'ON' : 'OFF',
    pump_mode: 'MANUAL',
    activity,
    leak_detected: 0,
    error_count: 0,
    total_used_liter: Number(cumulativeUsed.toFixed(4)),
  }
}

export async function seedActualMay10_17() {
  const env = loadServerEnv()
  const pool = getPool()
  const deviceId = env.deviceId

  await pool.execute(
    'DELETE FROM water_daily_consumption WHERE device_id = ? AND consumption_date BETWEEN ? AND ?',
    [deviceId, '2026-05-10', '2026-05-17'],
  )
  await pool.execute(
    'DELETE FROM water_telemetry WHERE device_id = ? AND recorded_at >= ? AND recorded_at < ?',
    [deviceId, '2026-05-10 00:00:00', '2026-05-18 00:00:00'],
  )

  for (const day of DAILY_LITERS) {
    await pool.execute(
      `INSERT INTO water_daily_consumption (device_id, consumption_date, liters, source)
       VALUES (?, ?, ?, 'seed')`,
      [deviceId, day.date, day.liters],
    )
  }

  const placeholders = TELEMETRY_INSERT_COLUMNS.map(() => '?').join(', ')
  const insertSql = `INSERT INTO water_telemetry (${TELEMETRY_INSERT_COLUMNS.join(', ')}) VALUES (${placeholders})`

  let runningTotal = 0
  const telemetryRows = []

  for (let dayIndex = 0; dayIndex < DAILY_LITERS.length; dayIndex++) {
    const dayDate = DAILY_LITERS[dayIndex].date
    const dayLiters = DAILY_LITERS[dayIndex].liters

    for (let hour = 0; hour < 24; hour++) {
      runningTotal += dayLiters / 24
      const recordedAt = new Date(`${dayDate}T${String(hour).padStart(2, '0')}:00:00.000Z`)
      const flat = buildHourlyFlat({ dayIndex, hour, cumulativeUsed: runningTotal })
      const row = mapFlatTelemetryToRow(flat, { deviceId, recordedAt })
      telemetryRows.push(rowToInsertValues(row))
    }
  }

  const chunkSize = 50
  for (let i = 0; i < telemetryRows.length; i += chunkSize) {
    const chunk = telemetryRows.slice(i, i + chunkSize)
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      for (const values of chunk) {
        await conn.execute(insertSql, values)
      }
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  }

  console.log('[seed] device_id:', deviceId)
  console.log('[seed] water_daily_consumption:', DAILY_LITERS.length, 'baris (10–17 Mei 2026)')
  console.log('[seed] water_telemetry:', telemetryRows.length, 'baris (per jam)')
  console.log('[seed] total_used_liter akhir ≈', runningTotal.toFixed(2), 'L')
}
