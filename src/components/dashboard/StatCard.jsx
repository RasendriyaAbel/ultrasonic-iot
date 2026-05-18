import { Card } from '../ui/Card.jsx'

export function StatCard({ title, value, subtitle, icon: Icon, tone = 'neutral', right }) {
  const tones = {
    neutral: 'text-sky-100',
    good: 'text-emerald-200',
    warn: 'text-amber-200',
    danger: 'text-rose-200',
    info: 'text-cyan-200',
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-ink-muted">{title}</div>
          <div className={`mt-1 truncate text-2xl font-semibold ${tones[tone]}`}>{value}</div>
          {subtitle ? <div className="mt-1 text-xs text-ink-faint">{subtitle}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          {right ? <div className="shrink-0">{right}</div> : null}
          {Icon ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/15 text-cyan-100">
              <Icon size={18} />
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
