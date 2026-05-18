import {
  FORECAST_ENGINE,
  FORECAST_MODEL_URL,
  FORECAST_SCALER_URL,
} from '../config/forecastConfig.js'
import { movingAverageForecast } from '../utils/iot.js'
import { getForecastScaler, validateForecastScaler } from '../utils/forecastScaler.js'
import { forecastDailyLiters, preloadSmartWaterModel } from './smartWaterForecast.js'

const ENGINE = FORECAST_ENGINE

let initPromise = null

/** Muat model TFJS + scaler sekali (halaman prediksi / app). */
export function initForecastPipeline() {
  if (initPromise) return initPromise
  if (ENGINE !== 'KERAS' && ENGINE !== 'TFJS') {
    initPromise = Promise.resolve({ engine: ENGINE })
    return initPromise
  }
  initPromise = Promise.all([
    getForecastScaler(),
    preloadSmartWaterModel().catch((err) => {
      console.warn('[Forecast] preload model:', err?.message || err)
      return null
    }),
  ]).then(async ([scaler]) => {
    const check = await validateForecastScaler(scaler)
    return { engine: ENGINE, scalerOk: check.valid, scalerReason: check.reason }
  })
  return initPromise
}

export async function forecastNextDays(
  values,
  horizon = 7,
  { history = [], dailyConsumption = [], settings = {} } = {},
) {
  await initForecastPipeline()

  const cleanDaily = values.filter((v) => Number.isFinite(v))
  const dailyAvg =
    cleanDaily.length > 0 ? cleanDaily.reduce((a, b) => a + b, 0) / cleanDaily.length : null

  const baseMeta = {
    engine: ENGINE,
    dailyConsumptionDays: cleanDaily.length,
    dailyAverageLiter: dailyAvg,
    inputDailyLiters: cleanDaily,
    modelUrl: FORECAST_MODEL_URL,
    scalerUrl: FORECAST_SCALER_URL,
  }

  if (ENGINE === 'MA') {
    const forecast = movingAverageForecast(values, horizon, 3)
    return {
      forecast,
      source: 'moving_average',
      detail: `Rata-rata bergerak (jendela 3) dari ${cleanDaily.length} hari konsumsi`,
      ...baseMeta,
    }
  }

  if (ENGINE !== 'KERAS' && ENGINE !== 'TFJS') {
    const forecast = movingAverageForecast(values, horizon, 3)
    return {
      forecast,
      source: 'moving_average',
      detail: 'Engine tidak dikenal — fallback MA',
      ...baseMeta,
    }
  }

  try {
    const fromModel = await forecastDailyLiters(
      { history, dailyConsumption, settings },
      horizon,
    )
    const forecastVals = fromModel?.forecast ?? fromModel
    if (forecastVals?.length) {
      const mm = fromModel?.meta ?? {}
      return {
        forecast: forecastVals,
        source: 'bilstm',
        detail: mm.hasTrainingScaler
          ? `${mm.modelVersion ?? 'BiLSTM'} • 60×27 • scaler OK • liter/hari (ekstrapolasi 60 menit)`
          : `Scaler belum valid (${mm.scalerReason ?? '—'}) — jalankan npm run build:scaler`,
        modelMeta: mm,
        ...baseMeta,
      }
    }
  } catch (err) {
    console.warn('[Forecast] Model gagal, fallback MA:', err?.message || err)
  }

  const forecast = movingAverageForecast(values, horizon, 3)
  return {
    forecast,
    source: 'moving_average_fallback',
    detail: 'BiLSTM gagal/kosong — pakai rata-rata konsumsi harian',
    ...baseMeta,
  }
}

export function forecastEngine() {
  return ENGINE
}
