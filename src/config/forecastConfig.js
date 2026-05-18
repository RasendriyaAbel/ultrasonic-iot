/** Konfigurasi forecasting — selaras scaler.json & best_water_model (2) */

export const FORECAST_SEQ_LEN = 60
export const FORECAST_FEATURE_DIM = 27

export const FORECAST_MODEL_URL =
  import.meta.env?.VITE_FORECAST_MODEL_URL || '/models/best-water/model.json'

/**
 * File scaler training (Vite serve dari folder public/).
 * Path fisik: public/models/best-water/scaler.json
 */
export const FORECAST_SCALER_PUBLIC_PATH = '/models/best-water/scaler.json'

export const FORECAST_SCALER_URL =
  import.meta.env?.VITE_FORECAST_SCALER_URL || FORECAST_SCALER_PUBLIC_PATH

export const FORECAST_SCALER_FILE = 'public/models/best-water/scaler.json'

export const FORECAST_ENGINE = (import.meta.env.VITE_FORECAST_ENGINE || 'KERAS').toUpperCase()

export const FORECAST_MINUTES_PER_STEP = 1
export const MINUTES_PER_DAY = 1440

export function extrapolateDailyLiters(litersInWindow, windowMinutes = FORECAST_SEQ_LEN) {
  if (!Number.isFinite(litersInWindow) || litersInWindow <= 0) return 0
  return litersInWindow * (MINUTES_PER_DAY / windowMinutes)
}
