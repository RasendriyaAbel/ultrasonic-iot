export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50'
  const variants = {
    primary:
      'bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-400 text-white shadow-lg shadow-cyan-500/35 hover:from-cyan-300 hover:via-sky-300 hover:to-teal-300 hover:shadow-cyan-400/45',
    secondary:
      'border border-sky-400/45 bg-sky-500/15 text-sky-50 hover:border-cyan-300/70 hover:bg-sky-400/25',
    danger:
      'bg-gradient-to-r from-rose-400 via-pink-400 to-orange-400 text-white shadow-lg shadow-rose-400/35 hover:from-rose-300 hover:via-pink-300 hover:to-orange-300',
    ghost: 'bg-transparent text-sky-100 hover:bg-cyan-400/15 hover:text-white',
  }
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-base',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
