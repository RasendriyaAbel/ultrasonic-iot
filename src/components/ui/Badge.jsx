export function Badge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'border-sky-400/35 bg-sky-500/20 text-sky-100',
    good: 'border-emerald-400/40 bg-emerald-400/20 text-emerald-100',
    warn: 'border-amber-400/40 bg-amber-400/20 text-amber-100',
    danger: 'border-rose-400/40 bg-rose-400/20 text-rose-100',
    info: 'border-cyan-400/40 bg-cyan-400/20 text-cyan-100',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
