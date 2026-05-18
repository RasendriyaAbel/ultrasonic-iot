const MYSQL_ENABLED = import.meta.env.VITE_MYSQL_ENABLED === 'true'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return API_BASE ? `${API_BASE}${p}` : p
}

/**
 * Ambil konsumsi harian dari MySQL (tabel water_daily_consumption).
 * @returns {Promise<Array<{ date: string, liters: number }> | null>}
 */
export async function fetchDailyConsumptionFromMysql({ days = 30, from, to } = {}) {
  if (!MYSQL_ENABLED) return null

  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (!from && !to) params.set('days', String(days))

  const url = apiUrl(`/api/daily-consumption?${params}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`MySQL API ${response.status}`)
  }

  const data = await response.json()
  if (!data?.ok || !Array.isArray(data.daily)) return null
  return data.daily.map((d) => ({
    date: d.date,
    liters: Number(d.liters) || 0,
  }))
}

export function isMysqlDailyEnabled() {
  return MYSQL_ENABLED
}
