import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Droplets, Timer } from 'lucide-react'
import { StatCard } from '../components/dashboard/StatCard.jsx'
import { ForecastChart } from '../components/charts/ForecastChart.jsx'
import { useIot } from '../state/iotContext.js'
import { formatLiter, formatNumber } from '../utils/format.js'
import { getForecastChartData } from '../services/forecastDataset.js'
import { buildOverlappedChartSeries } from '../utils/forecastChartSeries.js'

const MODEL_LABEL =
  'Model ML: SmartWater_BiLSTM_57L (best_water_model 2) • input 60×27 • output total_used_liter • scaler public/models/best-water/scaler.json'

export function PredictionPage() {
  const { state } = useIot()
  const t = state.telemetry

  const actualDaily = state.dailyConsumption ?? []
  const [csvChart, setCsvChart] = useState(null)
  const [csvLoading, setCsvLoading] = useState(true)

  const chartSeries = useMemo(
    () => buildOverlappedChartSeries(actualDaily.slice(-7), csvChart),
    [actualDaily, csvChart],
  )

  useEffect(() => {
    let cancelled = false
    setCsvLoading(true)
    getForecastChartData()
      .then((chart) => {
        if (!cancelled) setCsvChart(chart)
      })
      .finally(() => {
        if (!cancelled) setCsvLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const liveLast7 = actualDaily.slice(-7)
  const liveAvg =
    liveLast7.length > 0
      ? liveLast7.reduce((s, d) => s + (Number(d.liters) || 0), 0) / liveLast7.length
      : t?.consumption?.dailyAverageLiter ?? null

  const est =
    t?.consumption?.estimatedDaysRemaining == null
      ? '—'
      : `${formatNumber(t.consumption.estimatedDaysRemaining, { maximumFractionDigits: 1 })} hari`

  const sourceDetail = csvChart
    ? `Aktual: konsumsi harian ThingsBoard • Forecast: CSV hari 1–7 (${csvChart.sourceCsv}) pada tanggal yang sama`
    : 'Jalankan npm run build:chart-data untuk garis forecast'

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Rata-rata Konsumsi Harian"
          value={formatLiter(liveAvg, 1) + '/hari'}
          subtitle={
            liveLast7.length
              ? `Data aktual ${liveLast7.length} hari • ThingsBoard`
              : 'Menunggu data konsumsi harian'
          }
          icon={BarChart3}
          tone="info"
        />
        <StatCard
          title="Estimasi Tangki Kosong"
          value={est}
          subtitle="volume_tersisa / rata-rata (live)"
          icon={Timer}
          tone="neutral"
        />
        <StatCard
          title="Volume Saat Ini"
          value={formatLiter(t?.tank?.currentVolumeLiter, 1)}
          subtitle="ThingsBoard"
          icon={Droplets}
          tone="info"
        />
      </div>

      <div className="grid gap-2">
        {csvLoading ? (
          <p className="px-1 text-sm text-ink-muted">Memuat data CSV…</p>
        ) : null}
        <ForecastChart
          chartSeries={chartSeries}
          sourceDetail={sourceDetail}
          modelLabel={MODEL_LABEL}
        />
      </div>
    </div>
  )
}
