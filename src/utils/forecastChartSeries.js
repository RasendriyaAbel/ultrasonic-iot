import { formatShortDate } from './format.js'

const DAY_COUNT = 7

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** 7 slot tanggal mundur dari hari ini (jika live belum cukup). */
function defaultDateSlots(count = DAY_COUNT) {
  const today = startOfDay(new Date())
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (count - 1 - i))
    return { date: d.toISOString() }
  })
}

/**
 * CSV = urutan hari saja (abaikan tanggal di file).
 * Sumbu X = tanggal aktual (ThingsBoard / konsumsi harian live).
 * Hari CSV ke-i → tanggal aktual ke-i.
 */
export function buildOverlappedChartSeries(actualDaily = [], csvChart = null) {
  const csvFore = (csvChart?.days ?? []).slice(0, DAY_COUNT).map((d) => Number(d.liters) || 0)

  let dateSlots = (Array.isArray(actualDaily) ? actualDaily : [])
    .filter((d) => d?.date)
    .slice(-DAY_COUNT)

  if (dateSlots.length < DAY_COUNT) {
    const fallback = defaultDateSlots(DAY_COUNT)
    dateSlots = fallback.map((slot, i) => ({
      date: slot.date,
      liters: dateSlots[i]?.liters ?? null,
    }))
  }

  return dateSlots.map((slot, i) => ({
    date: slot.date,
    label: formatShortDate(slot.date),
    actual: slot.liters != null && Number.isFinite(Number(slot.liters)) ? Number(slot.liters) : null,
    forecast: csvFore[i] ?? null,
    csvDay: i + 1,
  }))
}
