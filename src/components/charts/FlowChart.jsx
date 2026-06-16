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
import { formatLpm, formatDateTimeLocal } from '../../utils/format.js'
import { CHART_AXIS_STROKE, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '../../utils/chartTheme.js'

function tickTime(iso) {
  if (!iso) return ''
  return formatDateTimeLocal(iso)
}

const SERIES = [
  { key: 'flowIn', name: 'Flow In', stroke: '#22d3ee' },
  { key: 'flowOut', name: 'Flow Out', stroke: '#60a5fa' },
]

export function FlowChart({ history }) {
  const data = (Array.isArray(history) ? history : []).slice(-80).map((h) => ({
    t: h.timestamp,
    flowIn: h.flow?.flowInLpm ?? h.flow?.flow1Lpm,
    flowOut: h.flow?.flowOutLpm ?? h.flow?.flow2Lpm,
  }))

  return (
    <Card>
      <CardHeader
        title="Debit Flow Sensor"
        subtitle="Flow In vs Flow Out (L/min) • Flow 1 = masuk, Flow 2 = keluar"
      />
      <CardBody className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="3 3" />
            <XAxis dataKey="t" tickFormatter={tickTime} stroke={CHART_AXIS_STROKE} />
            <YAxis stroke={CHART_AXIS_STROKE} />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelFormatter={(v) => tickTime(v)}
              formatter={(v, name) => {
                const label = SERIES.find((s) => s.key === name)?.name ?? name
                return [formatLpm(v, 2), label]
              }}
            />
            <Legend />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.stroke}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  )
}
