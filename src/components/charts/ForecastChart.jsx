import { useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardBody, CardHeader } from '../ui/Card.jsx'
import { formatLiter } from '../../utils/format.js'
import { buildOverlappedChartSeries } from '../../utils/forecastChartSeries.js'
import { CHART_AXIS_STROKE, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '../../utils/chartTheme.js'

const DEFAULT_MODEL_LABEL =
  'Model ML: SmartWater_BiLSTM_57L (best_water_model 2) • input 60×27 • output total_used_liter • scaler MinMax'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div
      className="rounded-xl border border-cyan-400/35 px-3 py-2 text-xs"
      style={CHART_TOOLTIP_STYLE}
    >
      <div className="font-medium text-ink">{row.label}</div>
      {row.forecast != null ? (
        <div className="text-ink-muted">Forecast CSV hari {row.csvDay}</div>
      ) : null}
      {row.actual != null ? (
        <div className="mt-1 text-sky-200">Aktual (live): {formatLiter(row.actual, 1)}</div>
      ) : null}
      {row.forecast != null ? (
        <div className="mt-1 text-cyan-200">
          Forecast (CSV hari {row.csvDay}): {formatLiter(row.forecast, 1)}
        </div>
      ) : null}
    </div>
  )
}

const ACTIVITY_DETAILS = [
  { label: 'Mandi Pagi/Sore', desc: 'Konsumsi tinggi, durasi 10-20 menit' },
  { label: 'Siram Tanaman', desc: 'Debit stabil, waktu pagi/sore' },
  { label: 'Cuci Baju/Piring', desc: 'Debit tinggi intermittent' },
  { label: 'Cuci Sayur/Tangan', desc: 'Debit rendah, durasi singkat' },
  { label: 'Idle', desc: 'Tidak ada aliran (baseline)' },
]

export function ForecastChart({
  actualDaily,
  csvChart,
  chartSeries,
  sourceDetail,
  modelLabel = DEFAULT_MODEL_LABEL,
}) {
  const data = useMemo(() => {
    if (Array.isArray(chartSeries) && chartSeries.length) return chartSeries
    return buildOverlappedChartSeries(actualDaily, csvChart)
  }, [actualDaily, csvChart, chartSeries])

  return (
    <Card>
      <CardHeader
        title="Konsumsi & Forecasting Air"
        subtitle="Aktual dari ThingsBoard • Forecast dari CSV (hari 1–7)"
      />
      <CardBody>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                stroke={CHART_AXIS_STROKE}
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-32}
                textAnchor="end"
                height={56}
              />
              <YAxis stroke={CHART_AXIS_STROKE} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                name="Aktual (live)"
                stroke="#60a5fa"
                dot={{ r: 3, fill: '#60a5fa' }}
                strokeWidth={2}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast (CSV)"
                stroke="#22d3ee"
                dot={{ r: 3, fill: '#22d3ee' }}
                strokeWidth={2}
                strokeDasharray="6 4"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 border-t border-cyan-500/10 pt-6">
          <div className="mb-4 text-xs font-bold uppercase tracking-wider text-cyan-400/80">
            Detail Aktivitas Berdasarkan Dataset
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIVITY_DETAILS.map((act) => (
              <div
                key={act.label}
                className="rounded-xl border border-cyan-400/10 bg-cyan-500/5 p-3 transition hover:border-cyan-400/30"
              >
                <div className="text-[11px] font-bold text-cyan-100">{act.label}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-ink-muted">{act.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
      <div className="space-y-1 px-5 pb-5">
        {sourceDetail ? <p className="text-[10px] text-ink-muted">{sourceDetail}</p> : null}
        {modelLabel ? <p className="text-[10px] text-ink-faint">{modelLabel}</p> : null}
      </div>
    </Card>
  )
}
