import { AlertTriangle, Bell, ShieldAlert } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card.jsx'

function toneStyles(type) {
  if (type === 'danger')
    return {
      wrap: 'border-rose-500/20 bg-rose-500/10',
      icon: 'text-rose-200',
      title: 'text-rose-100',
      detail: 'text-rose-100/70',
    }
  if (type === 'warning')
    return {
      wrap: 'border-amber-500/20 bg-amber-500/10',
      icon: 'text-amber-200',
      title: 'text-amber-100',
      detail: 'text-amber-100/70',
    }
  return {
    wrap: 'border-sky-400/25 bg-sky-500/10',
    icon: 'text-sky-200',
    title: 'text-sky-50',
    detail: 'text-sky-200/80',
  }
}

export function AlertsPanel({ alerts }) {
  const list = Array.isArray(alerts) ? alerts : []
  const hasAlerts = list.length > 0

  return (
    <Card>
      <CardHeader
        title="Alert & Notifikasi"
        subtitle={hasAlerts ? `${list.length} kondisi terdeteksi` : 'Tidak ada alert aktif'}
        right={<Bell size={18} className="text-brand-200" />}
      />
      <CardBody>
        {hasAlerts ? (
          <div className="space-y-3">
            {list.map((a) => {
              const s = toneStyles(a.type)
              const Icon = a.type === 'danger' ? ShieldAlert : AlertTriangle
              return (
                <div key={a.id} className={`rounded-xl border p-4 ${s.wrap}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${s.icon}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${s.title}`}>{a.title}</div>
                      <div className={`mt-1 text-xs ${s.detail}`}>{a.detail}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-cyan-400/25 bg-surface-glass p-4 text-sm text-ink-muted">
            Belum ada alert aktif atau data alat belum masuk.
          </div>
        )}
      </CardBody>
    </Card>
  )
}
