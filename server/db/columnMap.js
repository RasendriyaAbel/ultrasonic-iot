/**
 * Pemetaan key telemetri (ThingsBoard / ESP32 / dashboard) → kolom MySQL.
 * Urutan alias mengikuti telemetryNormalize.js & water_dataset CSV.
 */
export const TELEMETRY_COLUMN_MAP = {
  jarak_cm: ['jarak_cm', 'jarakCm', 'distanceCm', 'distance_cm', 'distance'],
  level_cm: ['level_cm', 'levelCm', 'waterLevelCm', 'water_level_cm', 'levelCm'],
  level_air_percent: [
    'level_air_percent',
    'levelAirPercent',
    'level_percent',
    'levelPercent',
    'percentage',
    'tank_pct',
    'tankPercentage',
  ],
  tank_volume_liter: ['tank_volume_liter', 'tankVolumeLiter', 'capacityLiter'],
  volume_liter: ['volume_liter', 'volumeLiter', 'currentVolumeLiter'],
  flow_in_lpm: ['flow_in_lpm', 'flowInLpm', 'flow1Lpm', 'flow_sensor_1_lpm', 'flow1'],
  flow_out_lpm: ['flow_out_lpm', 'flowOutLpm', 'flow2Lpm', 'flow_sensor_2_lpm', 'flow2'],
  flow_diff_lpm: ['flow_diff_lpm', 'diff_lpm', 'differenceLpm'],
  loss_percent: ['loss_percent', 'lossPercentage', 'loss_pct'],
  pump_on: ['pump_on', 'pumpOn'],
  pump_status: ['pump_status', 'pumpStatus', 'pump', 'relay', 'switch'],
  pump_mode: ['pump_mode', 'pumpMode', 'mode'],
  activity: ['activity'],
  leak_detected: ['leak_detected', 'leak_flag', 'leak_detected'],
  error_count: ['error_count', 'errorCount', 'errors'],
  total_used_liter: [
    'total_used_liter',
    'totalUsedLiter',
    'total_used',
    'totalUsed',
    'total_consumed_liter',
  ],
}

function asNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function pickFirst(flat, aliases) {
  for (const key of aliases) {
    if (flat[key] != null && flat[key] !== '') return flat[key]
  }
  return null
}

function normalizePumpOn(flat) {
  const raw = pickFirst(flat, TELEMETRY_COLUMN_MAP.pump_on)
  if (raw != null) {
    if (typeof raw === 'boolean') return raw ? 1 : 0
    if (typeof raw === 'number') return raw > 0 ? 1 : 0
    const s = String(raw).trim().toUpperCase()
    if (s === '1' || s === 'ON' || s === 'TRUE') return 1
    if (s === '0' || s === 'OFF' || s === 'FALSE') return 0
  }
  const status = pickFirst(flat, TELEMETRY_COLUMN_MAP.pump_status)
  if (status == null) return 0
  const s = String(status).trim().toUpperCase()
  return s === 'ON' || s === '1' || s === 'TRUE' ? 1 : 0
}

function normalizePumpStatus(flat) {
  const raw = pickFirst(flat, TELEMETRY_COLUMN_MAP.pump_status)
  if (raw == null) return normalizePumpOn(flat) ? 'ON' : 'OFF'
  if (typeof raw === 'boolean') return raw ? 'ON' : 'OFF'
  if (typeof raw === 'number') return raw > 0 ? 'ON' : 'OFF'
  const s = String(raw).trim().toUpperCase()
  if (s === 'ON' || s === '1' || s === 'TRUE') return 'ON'
  if (s === 'OFF' || s === '0' || s === 'FALSE') return 'OFF'
  return null
}

/**
 * @param {Record<string, unknown>} flat — payload datar (hasil flattenDeviceTelemetry)
 * @param {{ deviceId: string, recordedAt?: Date | string }} meta
 */
export function mapFlatTelemetryToRow(flat, { deviceId, recordedAt = new Date() }) {
  const flowIn = asNumber(pickFirst(flat, TELEMETRY_COLUMN_MAP.flow_in_lpm))
  const flowOut = asNumber(pickFirst(flat, TELEMETRY_COLUMN_MAP.flow_out_lpm))
  let flowDiff = asNumber(pickFirst(flat, TELEMETRY_COLUMN_MAP.flow_diff_lpm))
  if (flowDiff == null && flowIn != null && flowOut != null) {
    flowDiff = Math.max(0, flowIn - flowOut)
  }

  let lossPercent = asNumber(pickFirst(flat, TELEMETRY_COLUMN_MAP.loss_percent))
  if (lossPercent == null && flowIn != null && flowIn > 0 && flowOut != null) {
    lossPercent = Math.max(0, ((flowIn - flowOut) / flowIn) * 100)
  }

  const leakRaw = pickFirst(flat, TELEMETRY_COLUMN_MAP.leak_detected)
  const leakDetected =
    leakRaw === true || leakRaw === 1 || leakRaw === '1' || String(leakRaw).toUpperCase() === 'TRUE'
      ? 1
      : 0

  const recorded =
    recordedAt instanceof Date
      ? recordedAt
      : new Date(recordedAt)

  return {
    device_id: deviceId,
    recorded_at: recorded,
    jarak_cm: asNumber(pickFirst(flat, TELEMETRY_COLUMN_MAP.jarak_cm)),
    level_cm: asNumber(pickFirst(flat, TELEMETRY_COLUMN_MAP.level_cm)),
    level_air_percent: asNumber(pickFirst(flat, TELEMETRY_COLUMN_MAP.level_air_percent)),
    tank_volume_liter: asNumber(pickFirst(flat, TELEMETRY_COLUMN_MAP.tank_volume_liter)) ?? 57,
    volume_liter: asNumber(pickFirst(flat, TELEMETRY_COLUMN_MAP.volume_liter)),
    flow_in_lpm: flowIn,
    flow_out_lpm: flowOut,
    flow_diff_lpm: flowDiff,
    loss_percent: lossPercent,
    pump_on: normalizePumpOn(flat),
    pump_status: normalizePumpStatus(flat),
    pump_mode: pickFirst(flat, TELEMETRY_COLUMN_MAP.pump_mode) ?? 'MANUAL',
    activity: pickFirst(flat, TELEMETRY_COLUMN_MAP.activity) ?? 'idle',
    leak_detected: leakDetected,
    error_count: asNumber(pickFirst(flat, TELEMETRY_COLUMN_MAP.error_count)) ?? 0,
    total_used_liter: asNumber(pickFirst(flat, TELEMETRY_COLUMN_MAP.total_used_liter)) ?? 0,
  }
}

/** Kolom INSERT untuk water_telemetry (tanpa id). */
export const TELEMETRY_INSERT_COLUMNS = [
  'device_id',
  'recorded_at',
  'jarak_cm',
  'level_cm',
  'level_air_percent',
  'tank_volume_liter',
  'volume_liter',
  'flow_in_lpm',
  'flow_out_lpm',
  'flow_diff_lpm',
  'loss_percent',
  'pump_on',
  'pump_status',
  'pump_mode',
  'activity',
  'leak_detected',
  'error_count',
  'total_used_liter',
]

export function rowToInsertValues(row) {
  return TELEMETRY_INSERT_COLUMNS.map((col) => row[col])
}
