import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { Topbar } from './Topbar.jsx'
import { useIot } from '../../state/iotContext.js'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { state } = useIot()

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(34,211,238,0.22),transparent),radial-gradient(900px_500px_at_90%_10%,rgba(56,189,248,0.16),transparent)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-y-auto border-r border-cyan-400/25 bg-surface-deep/95 backdrop-blur-md md:block">
        <Sidebar />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-cyan-950/75 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-2xl shadow-cyan-500/20">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col md:pl-72">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          telemetry={state.telemetry}
          connection={state.connection}
        />
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-5 sm:py-5 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
