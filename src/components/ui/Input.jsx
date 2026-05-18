export function Input({ className = '', ...props }) {
  return (
    <input
      className={`h-10 w-full rounded-lg border border-sky-400/30 bg-surface-elevated/60 px-3 text-sm text-ink placeholder:text-ink-faint/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 ${className}`}
      {...props}
    />
  )
}

export function Label({ children, className = '' }) {
  return <label className={`mb-1 block text-xs font-medium text-ink-muted ${className}`}>{children}</label>
}
