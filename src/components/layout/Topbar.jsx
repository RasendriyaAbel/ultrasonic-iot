import { Menu } from 'lucide-react'
import { Badge } from '../ui/Badge.jsx'
import { formatDateTime } from '../../utils/format.js'

function connectionLabel(status) {
  if (status === 'connected') return 'Tersambung'
  if (status === 'connecting') return 'Menghubungkan'
  if (status === 'reconnecting') return 'Menyambung Ulang'
  if (status === 'error') return 'Error'
  if (status === 'not_configured') return 'Belum Dikonfigurasi'
  return 'Offline'
}

function sourceLabel(source) {
  if (source === 'thingsboard') return 'ThingsBoard'
  return 'Perangkat'
}

export function Topbar({ onMenuClick, telemetry, connection }) {
  const now = telemetry?.timestamp ? new Date(telemetry.timestamp) : new Date()
  const connTone = connection?.status === 'connected' ? 'good' : connection?.status === 'connecting' ? 'info' : 'warn'

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-2 border-b border-cyan-400/25 bg-surface-deep/85 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/15 text-cyan-50 hover:bg-cyan-400/25 md:hidden"
          aria-label="Buka menu"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">
            Dashboard Monitoring Air & Kebocoran
          </div>
          <div className="mt-0.5 truncate text-xs text-ink-muted">{formatDateTime(now)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <Badge tone={connTone}>{connectionLabel(connection?.status)}</Badge>
        <Badge tone="info">{sourceLabel(connection?.source)}</Badge>
      </div>
    </header>
  )
}
