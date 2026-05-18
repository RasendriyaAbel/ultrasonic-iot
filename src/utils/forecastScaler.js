import {
  FORECAST_FEATURE_DIM,
  FORECAST_SCALER_FILE,
  FORECAST_SCALER_PUBLIC_PATH,
  FORECAST_SCALER_URL,
  FORECAST_SEQ_LEN,
} from '../config/forecastConfig.js'
import bundledScaler from '../../public/models/best-water/scaler.json'

let scalerPromise = null

async function fetchScalerFromPublic() {
  const url =
    import.meta.env.DEV && !import.meta.env.VITE_FORECAST_SCALER_URL
      ? `${FORECAST_SCALER_URL}?t=${Date.now()}`
      : FORECAST_SCALER_URL

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} saat memuat ${FORECAST_SCALER_PUBLIC_PATH}`)
  }
  return res.json()
}

async function loadScalerJson() {
  if (scalerPromise) return scalerPromise

  scalerPromise = (async () => {
    try {
      return await fetchScalerFromPublic()
    } catch (err) {
      console.warn(
        `[Forecast] Fetch ${FORECAST_SCALER_PUBLIC_PATH} gagal, pakai bundle ${FORECAST_SCALER_FILE}:`,
        err?.message || err,
      )
      return bundledScaler
    }
  })()

  return scalerPromise
}

export async function getForecastScaler() {
  return loadScalerJson()
}

export function invalidateForecastScalerCache() {
  scalerPromise = null
}

export function getForecastScalerPaths() {
  return {
    url: FORECAST_SCALER_URL,
    publicPath: FORECAST_SCALER_PUBLIC_PATH,
    file: FORECAST_SCALER_FILE,
  }
}

export async function hasTrainingScaler() {
  const check = await validateForecastScaler(await loadScalerJson())
  return check.valid
}

export async function validateForecastScaler(scaler) {
  if (!scaler?.featureMin?.length || !scaler?.featureMax?.length) {
    return {
      valid: false,
      reason: `scaler tidak valid — pastikan ${FORECAST_SCALER_FILE} ada`,
    }
  }
  const dim = scaler.featureDim ?? scaler.featureMin.length
  if (dim !== FORECAST_FEATURE_DIM) {
    return {
      valid: false,
      reason: `featureDim scaler (${dim}) ≠ model (${FORECAST_FEATURE_DIM})`,
    }
  }
  if (scaler.seqLen && scaler.seqLen !== FORECAST_SEQ_LEN) {
    return {
      valid: false,
      reason: `seqLen scaler (${scaler.seqLen}) ≠ ${FORECAST_SEQ_LEN}`,
    }
  }
  return { valid: true, scaler }
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n))
}

export function scaleFeatureVector(values, scaler) {
  if (!scaler?.featureMin || !scaler?.featureMax) return values
  const cols = scaler.featureColumns?.length
    ? scaler.featureColumns.length
    : scaler.featureMin.length
  return values.slice(0, cols).map((v, i) => {
    const min = scaler.featureMin[i] ?? 0
    const max = scaler.featureMax[i] ?? 1
    const range = max - min
    if (!Number.isFinite(range) || range === 0) return 0
    return clamp01((Number(v) - min) / range)
  })
}

export function normalizeFeatureValue(value, scaler, featureIndex) {
  const n = Number(value)
  if (!Number.isFinite(n) || !scaler?.featureMin) return 0
  const min = scaler.featureMin[featureIndex] ?? 0
  const max = scaler.featureMax[featureIndex] ?? 1
  const range = max - min
  return range ? clamp01((n - min) / range) : 0
}

export function normalizeTargetValue(value, scaler) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const min = scaler?.targetMin ?? 0
  const max = scaler?.targetMax ?? 1
  const range = max - min
  return range ? clamp01((n - min) / range) : 0
}

export function denormalizeTargetLiter(value, scaler) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  if (scaler?.targetMin == null || scaler?.targetMax == null) return Math.max(0, n)
  const min = scaler.targetMin
  const max = scaler.targetMax
  const liters = n * (max - min) + min
  return Math.max(0, liters)
}
