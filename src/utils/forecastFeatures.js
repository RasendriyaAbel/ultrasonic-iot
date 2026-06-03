import {
  FORECAST_FEATURE_DIM,
  FORECAST_SEQ_LEN,
  MINUTES_PER_DAY,
  extrapolateDailyLiters,
} from '../config/forecastConfig.js'
import { scaleFeatureVector } from './forecastScaler.js'

export const SEQ_LEN = FORECAST_SEQ_LEN
export const FEATURE_DIM = FORECAST_FEATURE_DIM

/** Urutan sama dengan scaler.json / CSV training */
export const FEATURE_COLUMNS = [
  'is_weekend',
  'minute_of_day',
  'hour',
  'hour_sin',
  'hour_cos',
  'day_sin',
  'day_cos',
  'pump_on',
  'jarak_cm',
  'level_cm',
  'tank_pct',
  'level_percent',
  'fill_ratio',
  'tank_volume_liter',
  'flow_sensor_1_lpm',
  'flow_out_lpm',
  'flow_out_pump',
  'flow_sensor_2_lpm',
  'flow_in_lpm',
  'flow_diff_lpm',
  'diff_lpm',
  'loss_percent',
  'leak_detected',
  'leak_flag',
  'error_count',
  'total_consumed_liter',
  'total_used_liter',
]

function asNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function leakFlags(snapshot) {
  const status = snapshot?.leakage?.status
  const detected =
    status === 'Potensi Bocor' || status === 'Bocor Terdeteksi' ? 1 : 0
  return { leak_detected: detected, leak_flag: detected }
}

export function rawFeaturesFromTelemetry(snapshot, timestampIso, settings = {}) {
  const ts = timestampIso ? new Date(timestampIso) : new Date()
  const hour = ts.getHours()
  const minute = ts.getMinutes()
  const day = ts.getDay()
  const hourAngle = (2 * Math.PI * hour) / 24
  const dayAngle = (2 * Math.PI * day) / 7

  const flowIn = asNumber(snapshot?.flow?.flowInLpm ?? snapshot?.flow?.flow1Lpm)
  const flowOut = asNumber(snapshot?.flow?.flowOutLpm ?? snapshot?.flow?.flow2Lpm)
  const flow1 = asNumber(snapshot?.flow?.flow1Lpm, flowIn)
  const flow2 = asNumber(snapshot?.flow?.flow2Lpm, flowOut)
  const diff = asNumber(snapshot?.flow?.differenceLpm, flowIn - flowOut)
  const levelPct = asNumber(snapshot?.tank?.percentage)
  const levelCm = asNumber(snapshot?.tank?.waterLevelCm)
  const distance = asNumber(snapshot?.sensors?.distanceCm ?? snapshot?.tank?.distanceCm)
  const capacity = asNumber(settings.capacityLiter, 57)
  const volume = asNumber(snapshot?.tank?.currentVolumeLiter, capacity)
  const pumpOn = snapshot?.pump?.status === 'ON' ? 1 : 0
  const loss = asNumber(snapshot?.flow?.lossPercentage)
  const error = asNumber(snapshot?.sensors?.errorCount)
  const totalUsed = asNumber(snapshot?.consumption?.totalUsedLiter)
  const totalConsumed = asNumber(snapshot?.consumption?.totalConsumedLiter, totalUsed)
  const fillRatio = capacity > 0 ? volume / capacity : 0
  const leak = leakFlags(snapshot)

  return {
    is_weekend: day === 0 || day === 6 ? 1 : 0,
    minute_of_day: hour * 60 + minute,
    hour,
    hour_sin: Math.sin(hourAngle),
    hour_cos: Math.cos(hourAngle),
    day_sin: Math.sin(dayAngle),
    day_cos: Math.cos(dayAngle),
    pump_on: pumpOn,
    jarak_cm: distance,
    level_cm: levelCm,
    tank_pct: levelPct,
    level_percent: levelPct,
    fill_ratio: fillRatio,
    tank_volume_liter: volume,
    flow_sensor_1_lpm: flow1,
    flow_out_lpm: flowOut,
    flow_out_pump: flowOut * pumpOn,
    flow_sensor_2_lpm: flow2,
    flow_in_lpm: flowIn,
    flow_diff_lpm: diff,
    diff_lpm: diff,
    loss_percent: loss,
    leak_detected: leak.leak_detected,
    leak_flag: leak.leak_flag,
    error_count: error,
    total_consumed_liter: totalConsumed,
    total_used_liter: totalUsed,
  }
}

export function featureVectorFromTelemetry(snapshot, timestampIso, settings = {}, columnOrder = FEATURE_COLUMNS) {
  const raw = rawFeaturesFromTelemetry(snapshot, timestampIso, settings)
  return columnOrder.map((key) => raw[key] ?? 0)
}

/**
 * Ambil 60 sampel per menit (selaras CSV 1 baris/menit).
 */
export function resampleHistoryPerMinute(history, seqLen = SEQ_LEN) {
  const samples = (Array.isArray(history) ? history : [])
    .filter((h) => h?.timestamp)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  if (!samples.length) return []

  const endMs = new Date(samples[samples.length - 1].timestamp).getTime()
  const buckets = []

  for (let i = seqLen - 1; i >= 0; i -= 1) {
    const bucketEndMs = endMs - i * 60_000
    let pick = samples[0]
    for (const s of samples) {
      const t = new Date(s.timestamp).getTime()
      if (t <= bucketEndMs) pick = s
      else break
    }
    buckets.push({
      ...pick,
      timestamp: new Date(bucketEndMs).toISOString(),
    })
  }

  return buckets
}

function buildSyntheticMinuteRows(settings, dailyConsumption, seqLen) {
  const daily = Array.isArray(dailyConsumption) ? dailyConsumption : []
  const avg =
    daily.slice(-7).reduce((s, d) => s + asNumber(d.liters), 0) /
    Math.max(1, Math.min(7, daily.length || 1))
  const lpm = avg / MINUTES_PER_DAY
  const capacity = asNumber(settings.capacityLiter, 57)
  const now = Date.now()

  return Array.from({ length: seqLen }, (_, i) => {
    const ts = new Date(now - (seqLen - 1 - i) * 60_000).toISOString()
    const used = (avg * (i + 1)) / 7
    return {
      timestamp: ts,
      flow: {
        flow1Lpm: 0,
        flow2Lpm: lpm,
        flowInLpm: 0,
        flowOutLpm: lpm,
        differenceLpm: 0,
        lossPercentage: 0,
      },
      tank: {
        percentage: 50,
        waterLevelCm: 25,
        currentVolumeLiter: capacity * 0.5,
        distanceCm: 25,
      },
      pump: { status: 'OFF' },
      sensors: { distanceCm: 25, errorCount: 0 },
      consumption: { totalUsedLiter: used, totalConsumedLiter: used },
      leakage: { status: 'Normal' },
    }
  })
}

function scaleRows(rawRows, settings, scaler, columnOrder) {
  return rawRows.map((row) => {
    const raw = featureVectorFromTelemetry(row, row.timestamp, settings, columnOrder)
    return scaler ? scaleFeatureVector(raw, scaler) : raw
  })
}

/**
 * Jendela [60, 27] + baris mentah untuk roll prediksi multi-hari.
 */
export function buildModelSequence({
  history = [],
  dailyConsumption = [],
  settings = {},
  scaler = null,
}) {
  const columnOrder =
    scaler?.featureColumns?.length === FEATURE_DIM
      ? scaler.featureColumns
      : FEATURE_COLUMNS

  let rawRows = resampleHistoryPerMinute(history, SEQ_LEN)
  let usedSynthetic = false
  const telemetrySamples = (Array.isArray(history) ? history : []).filter((h) => h?.timestamp).length

  if (rawRows.length < SEQ_LEN) {
    if (dailyConsumption?.length || history?.length) {
      usedSynthetic = true
      rawRows = buildSyntheticMinuteRows(settings, dailyConsumption, SEQ_LEN)
    } else {
      return null
    }
  }

  const sequence = scaleRows(rawRows, settings, scaler, columnOrder)
  const lastRaw = rawFeaturesFromTelemetry(
    rawRows[rawRows.length - 1],
    rawRows[rawRows.length - 1].timestamp,
    settings,
  )

  return {
    sequence,
    rawRows,
    columnOrder,
    meta: {
      telemetrySamples,
      resampledMinutes: rawRows.length,
      usedSynthetic,
      paddedTo: SEQ_LEN,
      featureDim: FEATURE_DIM,
      hasScaler: Boolean(scaler),
      scalerVersion: scaler?.modelVersion ?? null,
    },
    lastRawTotalUsed: lastRaw.total_used_liter,
  }
}

/** Simulasi telemetri +1 hari setelah prediksi konsumsi harian. */
export function simulateNextDaySnapshot(prevSnapshot, dailyLiters, nextTotalUsed, settings = {}) {
  const prevTs = prevSnapshot?.timestamp
    ? new Date(prevSnapshot.timestamp)
    : new Date()
  const ts = new Date(prevTs)
  ts.setDate(ts.getDate() + 1)

  const capacity = asNumber(settings.capacityLiter, 57)
  const prevVol = asNumber(prevSnapshot?.tank?.currentVolumeLiter, capacity * 0.5)
  const nextVol = Math.max(0, prevVol - Math.max(0, dailyLiters))
  const pct = capacity > 0 ? (nextVol / capacity) * 100 : 0
  const lpm = dailyLiters > 0 ? dailyLiters / 1440 : 0

  return {
    ...prevSnapshot,
    timestamp: ts.toISOString(),
    flow: {
      ...prevSnapshot?.flow,
      flow1Lpm: 0,
      flow2Lpm: lpm,
      flowInLpm: 0,
      flowOutLpm: lpm,
      differenceLpm: 0,
      lossPercentage: prevSnapshot?.flow?.lossPercentage ?? 0,
    },
    tank: {
      ...prevSnapshot?.tank,
      currentVolumeLiter: nextVol,
      percentage: pct,
      waterLevelCm: asNumber(prevSnapshot?.tank?.waterLevelCm) * (pct / 100) || pct * 0.5,
    },
    consumption: {
      totalUsedLiter: nextTotalUsed,
      totalConsumedLiter: nextTotalUsed,
      dailyAverageLiter: dailyLiters,
    },
    pump: prevSnapshot?.pump ?? { status: 'OFF' },
    sensors: prevSnapshot?.sensors ?? { errorCount: 0 },
    leakage: prevSnapshot?.leakage ?? { status: 'Normal' },
  }
}

/** Geser jendela 60 menit + tambah 1 hari simulasi di ujung. */
export function rollSequenceForNextDay(
  sequence,
  rawRows,
  dailyLiters,
  nextTotalUsed,
  settings,
  scaler,
  columnOrder = FEATURE_COLUMNS,
) {
  if (!Array.isArray(sequence) || sequence.length !== SEQ_LEN || !rawRows?.length) {
    return { sequence, rawRows }
  }

  const nextRawRows = rawRows.slice(1)
  const lastSnap = rawRows[rawRows.length - 1]
  const newSnap = simulateNextDaySnapshot(lastSnap, dailyLiters, nextTotalUsed, settings)
  nextRawRows.push(newSnap)

  const newVec = featureVectorFromTelemetry(newSnap, newSnap.timestamp, settings, columnOrder)
  const scaled = scaler ? scaleFeatureVector(newVec, scaler) : newVec

  return {
    sequence: [...sequence.slice(1), scaled],
    rawRows: nextRawRows,
  }
}

export function litersInWindowFromPrediction(predictedTotalUsed, prevTotalUsed) {
  return Math.max(0, predictedTotalUsed - prevTotalUsed)
}

export { extrapolateDailyLiters }

export function buildModelSequenceMatrix(ctx) {
  return buildModelSequence(ctx)?.sequence ?? null
}
