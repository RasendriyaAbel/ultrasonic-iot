export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`h-10 w-full rounded-lg border border-sky-400/30 bg-surface-elevated/60 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-cyan-300/40 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
