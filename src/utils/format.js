export function formatNumber(value, { maximumFractionDigits = 2 } = {}) {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(value)
}

export function formatLiter(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${formatNumber(value, { maximumFractionDigits: digits })} L`
}

export function formatLpm(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${formatNumber(value, { maximumFractionDigits: digits })} L/min`
}

export function formatPercent(value, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${formatNumber(value, { maximumFractionDigits: digits })}%`
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

export function formatShortDate(value) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    day: '2-digit',
  }).format(date)
}

