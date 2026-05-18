import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardBody, CardHeader } from '../ui/Card.jsx'
import { formatLiter, formatShortDate } from '../../utils/format.js'
import { CHART_AXIS_STROKE, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '../../utils/chartTheme.js'

export function DailyConsumptionChart({ dailyConsumption }) {
  const data = (Array.isArray(dailyConsumption) ? dailyConsumption : []).slice(-14).map((d) => ({
    day: formatShortDate(d.date),
    liters: d.liters,
  }))

  return (
    <Card>
      <CardHeader title="Konsumsi Air Harian" subtitle="Akumulasi pemakaian per hari" />
      <CardBody className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke={CHART_AXIS_STROKE} />
            <YAxis stroke={CHART_AXIS_STROKE} />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(v) => [formatLiter(v, 1), 'Konsumsi']}
            />
            <Bar dataKey="liters" fill="rgba(34,211,238,0.8)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  )
}

