export function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-border-glow bg-surface-glass shadow-lg shadow-cyan-900/20 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-ink-muted">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-5 pb-5 pt-4 ${className}`}>{children}</div>
}
