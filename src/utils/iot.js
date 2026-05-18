export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function safeNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function tankPercentage(currentVolumeLiter, capacityLiter) {
  if (!Number.isFinite(currentVolumeLiter) || !Number.isFinite(capacityLiter) || capacityLiter <= 0)
    return null
  return clamp((currentVolumeLiter / capacityLiter) * 100, 0, 100)
}

export function waterLevelCmFromPercentage(percentage, tankHeightCm) {
  if (!Number.isFinite(percentage) || !Number.isFinite(tankHeightCm)) return null
  return clamp((percentage / 100) * tankHeightCm, 0, tankHeightCm)
}

export function tankStatusFromPercentage(percentage, { lowThresholdPercent, criticalThresholdPercent }) {
  if (!Number.isFinite(percentage)) return 'Sensor Error'
  if (percentage <= criticalThresholdPercent) return 'Kritis'
  if (percentage <= lowThresholdPercent) return 'Menipis'
  return 'Aman'
}

export function lossPercentage(flow1Lpm, flow2Lpm) {
  if (!Number.isFinite(flow1Lpm) || flow1Lpm <= 0 || !Number.isFinite(flow2Lpm)) return 0
  const diff = Math.max(0, flow1Lpm - flow2Lpm)
  return (diff / flow1Lpm) * 100
}

export function leakStatus({
  pumpStatus,
  flow1Lpm,
  flow2Lpm,
  diffThresholdLpm,
  lossThresholdPercent,
}) {
  if (pumpStatus !== 'ON') return { status: 'Standby', location: null }

  if (!Number.isFinite(flow1Lpm) || !Number.isFinite(flow2Lpm)) {
    return { status: 'Sensor Error', location: 'Area pipa panjang antara Flow Sensor 1 dan Flow Sensor 2' }
  }

  const diff = flow1Lpm - flow2Lpm
  const lossPct = lossPercentage(flow1Lpm, flow2Lpm)

  if (diff > diffThresholdLpm || lossPct > lossThresholdPercent) {
    return { status: 'Bocor Terdeteksi', location: 'Area pipa panjang antara Flow Sensor 1 dan Flow Sensor 2' }
  }

  if (diff > 0.05) {
    return { status: 'Potensi Bocor', location: 'Area pipa panjang antara Flow Sensor 1 dan Flow Sensor 2' }
  }

  return { status: 'Normal', location: null }
}

export function movingAverage(values, windowSize) {
  const clean = values.filter((v) => Number.isFinite(v))
  if (clean.length === 0) return 0
  const slice = clean.slice(Math.max(0, clean.length - windowSize))
  return slice.reduce((acc, v) => acc + v, 0) / slice.length
}

export function movingAverageForecast(values, horizon, windowSize = 3) {
  const series = values.filter((v) => Number.isFinite(v))
  const out = []
  for (let i = 0; i < horizon; i += 1) {
    const avg = movingAverage(series, windowSize)
    out.push(avg)
    series.push(avg)
  }
  return out
}

export function estimatedDaysRemaining(currentVolumeLiter, dailyAverageLiter) {
  if (!Number.isFinite(currentVolumeLiter) || !Number.isFinite(dailyAverageLiter) || dailyAverageLiter <= 0)
    return null
  return currentVolumeLiter / dailyAverageLiter
}

export function buildAlerts({ telemetry, settings, pumpOnDurationMinutes }) {
  const alerts = []
  const pct = telemetry?.tank?.percentage
  const tankStatus = telemetry?.tank?.status
  const leak = telemetry?.leakage?.status
  const pumpStatus = telemetry?.pump?.status

  const sensorOk =
    Number.isFinite(telemetry?.tank?.currentVolumeLiter) &&
    Number.isFinite(telemetry?.flow?.flow1Lpm) &&
    Number.isFinite(telemetry?.flow?.flow2Lpm)

  if (!sensorOk) {
    alerts.push({
      id: 'sensor',
      type: 'danger',
      title: 'Sensor tidak terbaca',
      detail: 'Periksa koneksi ultrasonik/flow sensor dan sumber daya ESP32.',
    })
  }

  if (tankStatus === 'Menipis' || (Number.isFinite(pct) && pct <= settings.lowThresholdPercent)) {
    alerts.push({
      id: 'tank-low',
      type: 'warning',
      title: 'Air tangki hampir habis',
      detail: 'Segera isi ulang atau aktifkan strategi penghematan.',
    })
  }

  if (tankStatus === 'Kritis' || (Number.isFinite(pct) && pct <= settings.criticalThresholdPercent)) {
    alerts.push({
      id: 'tank-critical',
      type: 'danger',
      title: 'Air tangki kritis',
      detail: 'Matikan pompa untuk mencegah running dry dan isi ulang secepatnya.',
    })
  }

  if (leak === 'Potensi Bocor') {
    alerts.push({
      id: 'leak-warning',
      type: 'warning',
      title: 'Potensi kebocoran',
      detail: 'Indikasi kebocoran di area pipa panjang antara Flow Sensor 1 dan Flow Sensor 2.',
    })
  }

  if (leak === 'Bocor Terdeteksi') {
    alerts.push({
      id: 'leak-danger',
      type: 'danger',
      title: 'Kebocoran terdeteksi',
      detail: 'Periksa segera area pipa panjang antara Flow Sensor 1 dan Flow Sensor 2.',
    })
  }

  if (pumpStatus === 'ON' && pumpOnDurationMinutes != null && pumpOnDurationMinutes >= 30) {
    alerts.push({
      id: 'pump-long',
      type: 'warning',
      title: 'Pompa aktif terlalu lama',
      detail: 'Periksa kondisi suplai air, kebocoran, dan beban pompa.',
    })
  }

  return alerts
}

