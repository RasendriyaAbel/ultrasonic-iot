/**
 * Data harian dari CSV training untuk grafik prediksi.
 * File: public/data/water-57L-daily.json (generate: npm run build:chart-data)
 */
const DATASET_URL =
  import.meta.env?.VITE_FORECAST_DATASET_URL || '/data/water-57L-daily.json'

let datasetPromise = null

async function loadDataset() {
  if (datasetPromise) return datasetPromise
  datasetPromise = (async () => {
    try {
      const url =
        import.meta.env.DEV && !import.meta.env.VITE_FORECAST_DATASET_URL
          ? `${DATASET_URL}?t=${Date.now()}`
          : DATASET_URL
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  })()
  return datasetPromise
}

export async function getForecastChartData() {
  const data = await loadDataset()
  if (!data) return null

  const historyDays = Array.isArray(data.chartHistory) ? data.chartHistory : []
  const forecastDays = Array.isArray(data.chartForecast) ? data.chartForecast : []

  return {
    historyDays,
    forecastDays,
    sourceCsv: data.sourceCsv ?? 'water_dataset_57L_90days_v2(2).csv',
    totalDays: data.totalDays ?? data.days?.length ?? 0,
    rangeStart: data.rangeStart,
    rangeEnd: data.rangeEnd,
  }
}

export async function getDatasetDailySeries(limit = 14) {
  const data = await loadDataset()
  if (!data?.days?.length) return []
  return data.days.slice(-limit)
}

export function invalidateForecastDatasetCache() {
  datasetPromise = null
}
