import { defaultSettings } from '../data/defaultSettings.js'
import {
  clamp,
  estimatedDaysRemaining,
  leakStatus,
  lossPercentage,
  movingAverage,
  tankPercentage,
  tankStatusFromPercentage,
  waterLevelCmFromPercentage,
} from './iot.js'

function asNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function firstNumber(candidates) {
  for (const v of candidates) {
    const n = asNumber(v)
    if (n != null) return n
  }
  return null
}

function normalizePumpStatus(v) {
  if (v == null) return null
  if (typeof v === 'string') {
    const s = v.trim().toUpperCase()
    if (s === 'ON' || s === '1' || s === 'TRUE') return 'ON'
    if (s === 'OFF' || s === '0' || s === 'FALSE') return 'OFF'
    return null
  }
  if (typeof v === 'boolean') return v ? 'ON' : 'OFF'
  if (typeof v === 'number') return v > 0 ? 'ON' : 'OFF'
  return null
}

function percentageFromWaterLevel(waterLevelCm, tankHeightCm) {
  if (!Number.isFinite(waterLevelCm) || !Number.isFinite(tankHeightCm) || tankHeightCm <= 0) return null
  return clamp((waterLevelCm / tankHeightCm) * 100, 0, 100)
}

/** Pastikan pengaturan tangki lengkap (localStorage lama bisa tanpa field kalibrasi). */
export function mergeSettings(partial) {
  return { ...defaultSettings(), ...(partial || {}) }
}

/** Key kanonik dashboard → key telemetry dari ESP32/ThingsBoard */
const DEVICE_KEY_ALIASES = {
  distanceCm: [
    'jarak_cm',
    'jarakCm',
    'distanceCm',
    'distance_cm',
    'distance',
    'ultrasonicDistanceCm',
  ],
  waterLevelCm: ['waterLevelCm', 'water_level_cm', 'level_air_cm', 'levelCm', 'waterLevel'],
  /** Flow 1 = masuk (setelah pompa) */
  flow1Lpm: [
    'flow_in_lpm',
    'flowInLpm',
    'flow1Lpm',
    'flow1',
    'f1',
    'debit1',
    'flowSensor1',
  ],
  /** Flow 2 = keluar (ujung pipa / konsumsi) */
  flow2Lpm: [
    'flow_out_lpm',
    'flowOutLpm',
    'flow2Lpm',
    'flow2',
    'f2',
    'debit2',
    'flowSensor2',
  ],
  percentage: [
    'level_air_percent',
    'levelAirPercent',
    'level_air_percentage',
    'percentage',
    'tankPercentage',
    'tank_percentage',
  ],
  currentVolumeLiter: ['volume_air_liter', 'currentVolumeLiter', 'volumeLiter', 'volume'],
  pumpStatus: [
    'pump_status',
    'pumpStatus',
    'pump_on',
    'relay',
    'pump',
    'switch',
    'Switch',
  ],
  pumpMode: ['pumpMode', 'pump_mode', 'mode'],
  errorCount: ['error_count', 'errorCount', 'errors'],
  pressureBar: ['pressure_bar', 'pressureBar', 'pressure'],
}

function pickFirst(flat, keys) {
  for (const key of keys) {
    if (flat[key] != null && flat[key] !== '') return flat[key]
  }
  return null
}

/**
 * Petakan key telemetri ThingsBoard (device) ke field standar dashboard.
 */
export function flattenDeviceTelemetry(values) {
  if (!values || typeof values !== 'object') return {}

  const tank = values.tank && typeof values.tank === 'object' ? values.tank : {}
  const flow = values.flow && typeof values.flow === 'object' ? values.flow : {}

  const merged = {
    ...values,
    ...tank,
    ...flow,
    ...(values.pump && typeof values.pump === 'object' ? values.pump : {}),
  }

  const flat = { ...merged }

  for (const [canonical, aliases] of Object.entries(DEVICE_KEY_ALIASES)) {
    const picked = pickFirst(merged, aliases)
    if (picked != null) flat[canonical] = picked
  }

  if (flow.flow1Lpm != null) flat.flow1Lpm = flow.flow1Lpm
  if (flow.flow2Lpm != null) flat.flow2Lpm = flow.flow2Lpm

  return flat
}

/** Snapshot semua key skalar dari device untuk panel telemetry. */
export function buildDeviceSnapshot(values) {
  const flat = flattenDeviceTelemetry(values)
  const snapshot = {}

  const mergeScalar = (src) => {
    if (!src || typeof src !== 'object') return
    for (const [key, val] of Object.entries(src)) {
      if (val == null || typeof val === 'object') continue
      snapshot[key] = val
    }
  }

  mergeScalar(values)
  mergeScalar(flat)

  for (const [canonical, aliases] of Object.entries(DEVICE_KEY_ALIASES)) {
    if (flat[canonical] != null) snapshot[canonical] = flat[canonical]
    for (const alias of aliases) {
      if (values?.[alias] != null) snapshot[alias] = values[alias]
    }
  }

  return snapshot
}

export function resolveTankMetrics(flat, settings) {
  const tankHeightCm = asNumber(settings.tankHeightCm) ?? defaultSettings().tankHeightCm
  const ultrasonicToBottomCm =
    asNumber(settings.ultrasonicToBottomCm) ?? asNumber(settings.tankHeightCm) ?? tankHeightCm
  const capacityLiter = asNumber(settings.capacityLiter) ?? defaultSettings().capacityLiter

  const distanceCm = asNumber(flat.distanceCm)

  // Persentase dari device (level_air_percent) diprioritaskan
  let percentage = asNumber(flat.percentage)
  let waterLevelCm = asNumber(flat.waterLevelCm)

  if (percentage != null) {
    if (waterLevelCm == null && tankHeightCm > 0) {
      waterLevelCm = (percentage / 100) * tankHeightCm
    }
  } else if (waterLevelCm != null && tankHeightCm > 0) {
    percentage = (waterLevelCm / tankHeightCm) * 100
  } else if (distanceCm != null) {
    // jarak_cm / distanceCm = jarak sensor ke permukaan air (bukan tinggi air langsung)
    waterLevelCm = Math.max(0, Math.min(ultrasonicToBottomCm - distanceCm, tankHeightCm))
    if (tankHeightCm > 0) {
      percentage = (waterLevelCm / tankHeightCm) * 100
    }
  }

  if (percentage != null) percentage = clamp(percentage, 0, 100)

  let currentVolumeLiter = asNumber(flat.currentVolumeLiter ?? flat.volumeLiter ?? flat.volume)
  if (currentVolumeLiter == null && percentage != null && capacityLiter > 0) {
    currentVolumeLiter = (percentage / 100) * capacityLiter
  }

  return {
    capacityLiter,
    waterLevelCm,
    percentage,
    currentVolumeLiter,
    distanceCm,
  }
}

function startOfDayIso(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return d.toISOString()
}

function sameDay(isoA, isoB) {
  if (!isoA || !isoB) return false
  return isoA.slice(0, 10) === isoB.slice(0, 10)
}

/**
 * Sinkronkan payload ThingsBoard → struktur telemetry dashboard lengkap.
 */
export function mapTelemetryToDashboard({
  values,
  settings: partialSettings,
  prevTelemetry,
  prevPump,
  prevDailyConsumption = [],
  prevIngest,
  defaultPump = { status: 'OFF', mode: 'MANUAL' },
}) {
  const settings = mergeSettings(partialSettings)
  const flat = flattenDeviceTelemetry(values)
  const tankMetrics = resolveTankMetrics(flat, settings)
  const device = buildDeviceSnapshot(values)

  const devicePumpStatus =
    normalizePumpStatus(flat.pumpStatus) ?? normalizePumpStatus(pickFirst(flat, ['pump', 'relay']))

  // Kontrol pompa: hanya MANUAL dari dashboard — jangan timpa dengan AUTO/telemetry device.
  const pumpStatus = prevPump?.status ?? devicePumpStatus ?? defaultPump.status
  const pumpMode = 'MANUAL'

  const flowInLpm =
    firstNumber([flat.flow1Lpm, values?.flow_in_lpm, values?.flow1Lpm, values?.flowInLpm]) ??
    prevTelemetry?.flow?.flowInLpm ??
    prevTelemetry?.flow?.flow1Lpm ??
    null
  const flowOutLpm =
    firstNumber([flat.flow2Lpm, values?.flow_out_lpm, values?.flow2Lpm, values?.flowOutLpm]) ??
    prevTelemetry?.flow?.flowOutLpm ??
    prevTelemetry?.flow?.flow2Lpm ??
    null
  const flow1Lpm = flowInLpm
  const flow2Lpm = flowOutLpm

  const capacityLiter = tankMetrics.capacityLiter ?? settings.capacityLiter
  let waterLevelCm = tankMetrics.waterLevelCm
  let percentage = tankMetrics.percentage
  let currentVolumeLiter = tankMetrics.currentVolumeLiter

  const prevVolume = prevTelemetry?.tank?.currentVolumeLiter
  if (currentVolumeLiter == null && Number.isFinite(prevVolume)) currentVolumeLiter = prevVolume
  if (currentVolumeLiter != null) currentVolumeLiter = clamp(currentVolumeLiter, 0, capacityLiter)
  if (percentage == null) percentage = tankPercentage(currentVolumeLiter, capacityLiter)
  if (waterLevelCm == null) waterLevelCm = waterLevelCmFromPercentage(percentage, settings.tankHeightCm)
  if (percentage == null) percentage = percentageFromWaterLevel(waterLevelCm, settings.tankHeightCm)

  const tankStatus = Number.isFinite(percentage)
    ? tankStatusFromPercentage(percentage, settings)
    : 'Menunggu Data'

  const differenceLpm =
    Number.isFinite(flow1Lpm) && Number.isFinite(flow2Lpm) ? Math.max(0, flow1Lpm - flow2Lpm) : null
  const lossPct =
    Number.isFinite(flow1Lpm) && Number.isFinite(flow2Lpm) ? lossPercentage(flow1Lpm, flow2Lpm) : null

  const leakage = leakStatus({
    pumpStatus,
    flow1Lpm,
    flow2Lpm,
    diffThresholdLpm: settings.leakDiffThresholdLpm,
    lossThresholdPercent: settings.leakLossThresholdPercent,
  })

  const nowIso = new Date().toISOString()
  const nowMs = Date.now()
  const prevMs = prevIngest?.lastMs ?? nowMs
  const dtMinutes = clamp((nowMs - prevMs) / 60000, 0, 5)

  const totalUsedIncoming = firstNumber([flat.totalUsedLiter, flat.totalUsed])
  let totalUsedLiter = totalUsedIncoming ?? prevTelemetry?.consumption?.totalUsedLiter ?? 0
  let dailyConsumption = prevDailyConsumption

  if (pumpStatus === 'ON' && Number.isFinite(flow2Lpm) && dtMinutes > 0 && totalUsedIncoming == null) {
    const usedLiter = flow2Lpm * dtMinutes
    totalUsedLiter = totalUsedLiter + usedLiter
    const todayIso = startOfDayIso(new Date(nowIso))
    if (dailyConsumption.length === 0) {
      dailyConsumption = [{ date: todayIso, liters: usedLiter }]
    } else if (sameDay(dailyConsumption[dailyConsumption.length - 1].date, todayIso)) {
      const last = dailyConsumption[dailyConsumption.length - 1]
      dailyConsumption = [...dailyConsumption.slice(0, -1), { ...last, liters: last.liters + usedLiter }]
    } else {
      dailyConsumption = [...dailyConsumption, { date: todayIso, liters: usedLiter }].slice(-30)
    }
  }

  const last7 = dailyConsumption.slice(-7).map((d) => d.liters)
  const dailyAverageLiter = movingAverage(last7, 7)
  const estDays = estimatedDaysRemaining(currentVolumeLiter, dailyAverageLiter)

  const errorCount = firstNumber([flat.error_count, flat.errorCount, device.error_count, device.errorCount])

  const telemetry = {
    timestamp: nowIso,
    tank: {
      capacityLiter,
      currentVolumeLiter,
      percentage,
      waterLevelCm,
      distanceCm: tankMetrics.distanceCm,
      status: tankStatus,
    },
    flow: {
      flow1Lpm,
      flow2Lpm,
      flowInLpm,
      flowOutLpm,
      differenceLpm,
      lossPercentage: lossPct,
    },
    leakage,
    consumption: {
      totalUsedLiter,
      dailyAverageLiter,
      estimatedDaysRemaining: estDays,
    },
    pressure: {
      bar: firstNumber([flat.pressureBar, values?.pressure_bar, values?.pressureBar]) ?? 0,
    },
    pump: {
      status: pumpStatus,
      mode: pumpMode,
      deviceStatus: devicePumpStatus,
    },
    sensors: {
      distanceCm: tankMetrics.distanceCm,
      levelAirPercent: tankMetrics.percentage,
      flowInLpm,
      flowOutLpm,
      errorCount,
    },
    device,
  }

  return {
    settings,
    telemetry,
    dailyConsumption,
    ingest: { lastMs: nowMs, lastValues: values },
    flat,
  }
}

export function formatDeviceValue(value) {
  if (value == null) return '—'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '')
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export const DEVICE_LABELS = {
  jarak_cm: 'Jarak sensor ke air (cm)',
  jarakCm: 'Jarak sensor ke air (cm)',
  distanceCm: 'Jarak sensor ke air (cm)',
  distance_cm: 'Jarak sensor ke air (cm)',
  level_air_percent: 'Level air (%)',
  levelAirPercent: 'Level air (%)',
  volume_air_liter: 'Volume air (Liter)',
  flow_in_lpm: 'Flow masuk (L/min)',
  flow_out_lpm: 'Flow keluar (L/min)',
  pressure_bar: 'Tekanan (Bar)',
  pump_status: 'Status Pompa (Alat)',
  sensor_valid: 'Sensor Valid',
  error_count: 'Jumlah Error',
  errorCount: 'Jumlah error',
  flow1Lpm: 'Flow 1 (L/min)',
  flow2Lpm: 'Flow 2 (L/min)',
  percentage: 'Persentase tangki (%)',
  waterLevelCm: 'Tinggi air (cm)',
  pumpStatus: 'Status pompa',
  pumpMode: 'Mode pompa',
}
