import { NavLink, useLocation } from 'react-router-dom'
import { Activity, BarChart3, Gauge, History, Settings, Info } from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: Gauge, end: true },
  { to: '/monitoring', label: 'Monitoring', icon: Activity },
  { to: '/history', label: 'Riwayat Data', icon: History },
  { to: '/prediction', label: 'Prediksi', icon: BarChart3 },
  { to: '/settings', label: 'Pengaturan', icon: Settings },
]

export function Sidebar({ onNavigate }) {
  return (
    <aside className="flex h-full min-h-full w-full flex-col bg-surface-deep/80">
      <div className="px-5 py-5">
        <div className="bg-gradient-to-r from-cyan-200 to-sky-100 bg-clip-text text-sm font-semibold text-transparent">
          Sistem Monitoring Air
        </div>
        <div className="mt-1 text-xs text-ink-muted">Deteksi Kebocoran Pipa • ESP32</div>
      </div>
      <nav className="flex-1 px-3 pb-5">
        <div className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                    isActive
                      ? 'border border-cyan-400/40 bg-gradient-to-r from-cyan-500/25 to-sky-500/20 text-cyan-50 shadow-md shadow-cyan-500/15'
                      : 'text-sky-100 hover:bg-cyan-500/15 hover:text-white',
                  ].join(' ')
                }
              >
                <Icon size={18} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
      <div className="px-5 pb-5 text-xs text-ink-faint">Telemetri realtime dari alat • ThingsBoard</div>
    </aside>
  )
}
