import {
  FORECAST_FEATURE_DIM,
  FORECAST_MODEL_URL,
  FORECAST_SCALER_PUBLIC_PATH,
  FORECAST_SEQ_LEN,
  extrapolateDailyLiters,
} from '../config/forecastConfig.js'
import {
  buildModelSequence,
  litersInWindowFromPrediction,
  rollSequenceForNextDay,
} from '../utils/forecastFeatures.js'
import {
  denormalizeTargetLiter,
  getForecastScaler,
  getForecastScalerPaths,
  validateForecastScaler,
} from '../utils/forecastScaler.js'

let modelPromise = null

async function loadModel() {
  if (modelPromise) return modelPromise
  modelPromise = (async () => {
    const tf = await import('@tensorflow/tfjs')
    const model = await tf.loadLayersModel(FORECAST_MODEL_URL)
    return { tf, model }
  })().catch((err) => {
    modelPromise = null
    throw err
  })
  return modelPromise
}

async function predictTotalUsedNormalized(sequence) {
  const { tf, model } = await loadModel()
  const flat = sequence.flat()
  const x = tf.tensor3d(flat, [1, FORECAST_SEQ_LEN, FORECAST_FEATURE_DIM])
  const outputs = model.predict(x)
  x.dispose()

  try {
    if (Array.isArray(outputs)) {
      const data = await outputs[1].data()
      outputs.forEach((t) => t.dispose())
      return Number(data[0]) || 0
    }
    const data = await outputs.data()
    outputs.dispose()
    return Number(data[0]) || 0
  } catch (err) {
    if (Array.isArray(outputs)) outputs.forEach((t) => t.dispose())
    else outputs.dispose()
    throw err
  }
}

export async function forecastDailyLiters({ history, dailyConsumption, settings }, horizon = 7) {
  const scalerRaw = await getForecastScaler()
  const { valid, reason, scaler } = await validateForecastScaler(scalerRaw)
  const paths = getForecastScalerPaths()

  if (!valid || !scaler) {
    console.warn('[Forecast] Scaler wajib dari', FORECAST_SCALER_PUBLIC_PATH, reason)
    return {
      forecast: [],
      meta: {
        hasTrainingScaler: false,
        scalerValid: false,
        scalerReason: reason,
        scalerUrl: paths.url,
        scalerFile: paths.file,
      },
    }
  }

  const built = buildModelSequence({
    history,
    dailyConsumption,
    settings,
    scaler,
  })
  if (!built?.sequence) return null

  let { sequence, rawRows } = built
  const columnOrder = built.columnOrder
  let prevTotal = built.lastRawTotalUsed ?? 0
  const out = []

  for (let i = 0; i < horizon; i += 1) {
    const rawNorm = await predictTotalUsedNormalized(sequence)
    const predictedTotal = denormalizeTargetLiter(rawNorm, scaler)
    const inWindow = litersInWindowFromPrediction(predictedTotal, prevTotal)
    const dailyLiters = extrapolateDailyLiters(inWindow, FORECAST_SEQ_LEN)

    out.push(dailyLiters)
    const nextTotal = prevTotal + dailyLiters
    prevTotal = nextTotal

    const rolled = rollSequenceForNextDay(
      sequence,
      rawRows,
      dailyLiters,
      nextTotal,
      settings,
      scaler,
      columnOrder,
    )
    sequence = rolled.sequence
    rawRows = rolled.rawRows
  }

  return {
    forecast: out,
    meta: {
      ...built.meta,
      hasTrainingScaler: true,
      scalerValid: true,
      scalerReason: null,
      targetMode: scaler.targetMode ?? 'cumulative_total_used',
      targetColumn: scaler.targetColumn ?? 'total_used_liter',
      modelUrl: FORECAST_MODEL_URL,
      scalerUrl: paths.url,
      scalerFile: paths.file,
      modelVersion: scaler.modelVersion ?? 'best_water_model (2)',
    },
  }
}

export function smartWaterModelUrl() {
  return FORECAST_MODEL_URL
}

export async function preloadSmartWaterModel() {
  const check = await validateForecastScaler(await getForecastScaler())
  if (!check.valid) {
    console.warn('[Forecast] Scaler', FORECAST_SCALER_PUBLIC_PATH, ':', check.reason)
  }
  return loadModel()
}
