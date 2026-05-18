import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card.jsx'
import { Input } from '../ui/Input.jsx'
import { Select } from '../ui/Select.jsx'
import { Badge } from '../ui/Badge.jsx'
import { formatDateTime, formatLiter, formatLpm, formatPercent } from '../../utils/format.js'

function leakTone(status) {
  if (status === 'Normal') return 'good'
  if (status === 'Potensi Bocor') return 'warn'
  if (status === 'Bocor Terdeteksi') return 'danger'
  if (status === 'Standby') return 'neutral'
  return 'neutral'
}

function pumpTone(status) {
  return status === 'ON' ? 'good' : 'neutral'
}

export function HistoryTable({ history }) {
  const [query, setQuery] = useState('')
  const [leakFilter, setLeakFilter] = useState('ALL')
  const [pumpFilter, setPumpFilter] = useState('ALL')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (Array.isArray(history) ? history : [])
      .slice()
      .reverse()
      .filter((r) => {
        if (pumpFilter !== 'ALL' && r.pump?.status !== pumpFilter) return false
        if (leakFilter !== 'ALL' && r.leakage?.status !== leakFilter) return false
        if (!q) return true

        const blob = [
          r.timestamp,
          r.tank?.status,
          r.leakage?.status,
          r.pump?.status,
          r.pump?.mode,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return blob.includes(q)
      })
  }, [history, query, leakFilter, pumpFilter])

  return (
    <Card>
      <CardHeader title="Riwayat Monitoring" subtitle={`${filtered.length} baris`} />
      <CardBody>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search timestamp / status..." className="pl-10" />
          </div>
          <Select value={leakFilter} onChange={(e) => setLeakFilter(e.target.value)}>
            <option value="ALL">Filter Kebocoran: Semua</option>
            <option value="Normal">Normal</option>
            <option value="Potensi Bocor">Potensi Bocor</option>
            <option value="Bocor Terdeteksi">Bocor Terdeteksi</option>
            <option value="Standby">Standby</option>
            <option value="Sensor Error">Sensor Error</option>
          </Select>
          <Select value={pumpFilter} onChange={(e) => setPumpFilter(e.target.value)}>
            <option value="ALL">Filter Pompa: Semua</option>
            <option value="ON">ON</option>
            <option value="OFF">OFF</option>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-cyan-400/25">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-surface-elevated/70 text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">%</th>
                <th className="px-4 py-3">Flow In</th>
                <th className="px-4 py-3">Flow Out</th>
                <th className="px-4 py-3">Selisih</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Kebocoran</th>
                <th className="px-4 py-3">Pompa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-400/20 bg-surface-glass">
              {filtered.slice(0, 250).map((r, idx) => (
                <tr key={`${r.timestamp}-${idx}`} className="hover:bg-cyan-500/10">
                  <td className="px-4 py-3 text-sky-100">{formatDateTime(r.timestamp)}</td>
                  <td className="px-4 py-3 text-sky-100">{formatLiter(r.tank?.currentVolumeLiter, 1)}</td>
                  <td className="px-4 py-3 text-sky-100">{formatPercent(r.tank?.percentage, 0)}</td>
                  <td className="px-4 py-3 text-sky-100">
                    {formatLpm(r.flow?.flowInLpm ?? r.flow?.flow1Lpm, 2)}
                  </td>
                  <td className="px-4 py-3 text-sky-100">
                    {formatLpm(r.flow?.flowOutLpm ?? r.flow?.flow2Lpm, 2)}
                  </td>
                  <td className="px-4 py-3 text-sky-100">{formatLpm(r.flow?.differenceLpm, 2)}</td>
                  <td className="px-4 py-3 text-sky-100">{formatLiter(r.consumption?.totalUsedLiter, 1)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={leakTone(r.leakage?.status)}>{r.leakage?.status ?? '—'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={pumpTone(r.pump?.status)}>{r.pump?.status ?? '—'}</Badge>
                      <span className="text-xs text-ink-faint">{r.pump?.mode ?? ''}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-ink-muted">
                    Tidak ada data yang sesuai filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-ink-faint">
          Menampilkan maksimal 250 baris terbaru dari hasil filter.
        </div>
      </CardBody>
    </Card>
  )
}

