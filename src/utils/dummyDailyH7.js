/**
 * Konsumsi harian dummy H-7 (hari ini mundur 6 hari) untuk overlap grafik forecast.
 * Nilai liter mengikuti pola chartHistory dataset 57L.
 */
const LITERS_H7 = [11.06, 9.29, 6.94, 4.51, 12.67, 9.64, 5.8]

export function isDummyDailyH7Enabled() {
  return import.meta.env?.VITE_DUMMY_DAILY_H7 !== 'false'
}

function startOfDayLocal(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** 7 hari terakhir termasuk hari ini (local midnight → ISO). */
export function buildDummyDailyLast7(endDate = new Date()) {
  const today = startOfDayLocal(endDate)
  const count = LITERS_H7.length

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (count - 1 - i))
    return {
      date: d.toISOString(),
      liters: LITERS_H7[i],
      source: 'dummy',
    }
  })
}

/** Live menang untuk hari yang sama jika ada liter > 0. */
export function mergeDailyConsumption(live = [], dummy = []) {
  const byDay = new Map()

  for (const row of dummy) {
    if (!row?.date) continue
    byDay.set(row.date.slice(0, 10), row)
  }
  for (const row of live) {
    if (!row?.date) continue
    const liters = Number(row.liters)
    if (Number.isFinite(liters) && liters > 0) {
      byDay.set(row.date.slice(0, 10), { ...row, source: row.source ?? 'live' })
    }
  }

  return [...byDay.values()]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-30)
}

export function applyDummyDailyH7(dailyConsumption = []) {
  if (!isDummyDailyH7Enabled()) return dailyConsumption
  return mergeDailyConsumption(dailyConsumption, buildDummyDailyLast7())
}
