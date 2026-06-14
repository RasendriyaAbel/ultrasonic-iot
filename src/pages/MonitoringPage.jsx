import { useMemo } from 'react'
import { FlowChart } from '../components/charts/FlowChart.jsx'
import { TankVolumeChart } from '../components/charts/TankVolumeChart.jsx'
import { ForecastChart } from '../components/charts/ForecastChart.jsx'
import { useIot } from '../state/iotContext.js'
import { STATIC_FORECAST_DATA } from '../services/forecastDataset.js'
import { buildOverlappedChartSeries } from '../utils/forecastChartSeries.js'
import { isDummyDailyH7Enabled } from '../utils/dummyDailyH7.js'

const MODEL_LABEL =
  'Model ML: SmartWater_BiLSTM_57L (best_water_model 2) • input 60×27 • output total_used_liter'

export function MonitoringPage() {
  const { state } = useIot()
  const csvChart = STATIC_FORECAST_DATA

  const chartSeries = useMemo(
    () => buildOverlappedChartSeries((state.dailyConsumption ?? []).slice(-7), csvChart),
    [state.dailyConsumption, csvChart],
  )

  const actualSource = isDummyDailyH7Enabled() ? 'dummy H-7 + ThingsBoard' : 'ThingsBoard'
  const sourceDetail = csvChart
    ? `Aktual: ${actualSource} • Forecast CSV hari 1–7 • ${csvChart.sourceCsv}`
    : null

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <FlowChart history={state.history} />
        <TankVolumeChart history={state.history} />
      </div>
      <ForecastChart chartSeries={chartSeries} sourceDetail={sourceDetail} modelLabel={MODEL_LABEL} />
    </div>
  )
}
