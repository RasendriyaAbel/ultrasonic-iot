import { Droplets } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card.jsx'
import { Badge } from '../ui/Badge.jsx'
import { formatLiter, formatPercent } from '../../utils/format.js'

function toneFromTankStatus(status) {
  if (status === 'Aman') return { badge: 'good', water: 'from-emerald-400 to-brand-400' }
  if (status === 'Menipis') return { badge: 'warn', water: 'from-amber-400 to-brand-400' }
  if (status === 'Kritis') return { badge: 'danger', water: 'from-rose-400 to-amber-400' }
  return { badge: 'neutral', water: 'from-sky-400 to-cyan-500' }
}

export function TankVisual({ tank }) {
  const percentage = tank?.percentage ?? 0
  const status = tank?.status ?? '—'
  const tone = toneFromTankStatus(status)

  const fill = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0))

  return (
    <Card>
      <CardHeader
        title="Visualisasi Tangki"
        subtitle="Level air mengikuti persentase volume"
        right={<Badge tone={tone.badge}>{status}</Badge>}
      />
      <CardBody>
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          <div className="flex items-center justify-center">
            <div className="relative h-64 w-40 rounded-2xl border border-cyan-400/30 bg-surface-elevated/50 p-3">
              <div className="absolute inset-x-3 top-3 flex items-center justify-between text-xs text-ink-muted">
                <span>0%</span>
                <span>100%</span>
              </div>
              <div className="relative mt-6 h-[calc(100%-2.5rem)] overflow-hidden rounded-xl border border-cyan-400/25 bg-surface-deep/80">
                <div
                  className="absolute bottom-0 left-0 right-0 transition-[height] duration-500"
                  style={{ height: `${fill}%` }}
                >
                  <div className={`h-full w-full bg-gradient-to-t ${tone.water}`} />
                  <div className="absolute inset-x-0 top-0 h-6 bg-white/10 blur-sm" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-xl bg-surface-elevated/70 px-3 py-2 text-center backdrop-blur">
                    <div className="text-xs text-ink-muted">Level</div>
                    <div className="text-lg font-semibold text-ink">{formatPercent(tank?.percentage, 0)}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                <div className="flex items-center gap-2">
                  <Droplets size={14} className="text-brand-300" />
                  <span>Volume</span>
                </div>
                <span className="text-sky-100">{formatLiter(tank?.currentVolumeLiter, 1)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-cyan-400/25 bg-surface-glass p-4">
              <div className="text-xs text-ink-muted">Kapasitas</div>
              <div className="mt-1 text-lg font-semibold text-ink">{formatLiter(tank?.capacityLiter, 0)}</div>
            </div>
            <div className="rounded-xl border border-cyan-400/25 bg-surface-glass p-4">
              <div className="text-xs text-ink-muted">Status Tangki</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-semibold text-ink">{status}</span>
                <Badge tone={tone.badge}>{formatPercent(tank?.percentage, 0)}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-cyan-400/25 bg-surface-glass p-4">
              <div className="text-xs text-ink-muted">Level Air (cm)</div>
              <div className="mt-1 text-lg font-semibold text-ink">
                {tank?.waterLevelCm == null ? '—' : `${tank.waterLevelCm.toFixed(1)} cm`}
              </div>
            </div>
            <div className="rounded-xl border border-cyan-400/25 bg-surface-glass p-4">
              <div className="text-xs text-ink-muted">Sisa Volume</div>
              <div className="mt-1 text-lg font-semibold text-ink">{formatLiter(tank?.currentVolumeLiter, 1)}</div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

