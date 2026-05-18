import { buildTbApiUrl, getTbApiBaseUrl, tbApiKeyAuthHeaders } from './thingsboardApi.js'
import { tbError, tbLog, tbStatus, tbWarn } from './thingsboardLog.js'
import {
  flattenAttributesResponse,
  thingsboardSwitchConfig,
} from './thingsboardSwitch.js'

const DEFAULT_INTERVAL_MS = Number(import.meta.env.VITE_TB_POLL_INTERVAL_MS || 3000)

const FALLBACK_KEYS = [
  'jarak_cm',
  'level_air_percent',
  'flow_in_lpm',
  'flow_out_lpm',
  'flow1Lpm',
  'flow2Lpm',
  'distanceCm',
  'percentage',
  'waterLevelCm',
  'switch',
  'relay',
  'pump_on',
  'pumpStatus',
  'pumpMode',
  'error_count',
  'errorCount',
]

function coerceTelemetryValue(value) {
  if (typeof value !== 'string') return value

  const trimmed = value.trim()
  if (trimmed === '') return value
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false

  const numeric = Number(trimmed)
  if (Number.isFinite(numeric)) return numeric

  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function normalizeTimeseriesPayload(data) {
  if (!data || typeof data !== 'object') return null

  const values = {}
  let latestTs = null

  for (const [key, raw] of Object.entries(data)) {
    if (!Array.isArray(raw) || raw.length === 0) continue

    const latest = raw[raw.length - 1]
    if (!latest || typeof latest !== 'object') continue

    values[key] = coerceTelemetryValue(latest.value)
    if (Number.isFinite(latest.ts)) {
      latestTs = latestTs == null ? latest.ts : Math.max(latestTs, latest.ts)
    }
  }

  if (Object.keys(values).length === 0) return null

  return {
    timestamp: latestTs != null ? new Date(latestTs).toISOString() : new Date().toISOString(),
    values,
  }
}

async function readErrorDetail(response) {
  const text = await response.text()
  if (!text) return null
  try {
    const data = JSON.parse(text)
    return data?.message || data?.error || text
  } catch {
    return text
  }
}

export function connectThingsBoardRestPoll({
  baseUrl,
  deviceId,
  apiKey,
  intervalMs = DEFAULT_INTERVAL_MS,
  onStatus,
  onTelemetry,
}) {
  let timer = null
  let isClosed = false
  let inFlight = false
  let cachedKeys = null
  let lastKeysFetchMs = 0

  const base = getTbApiBaseUrl() || baseUrl.replace(/\/+$/, '')
  const headers = tbApiKeyAuthHeaders(apiKey)

  function setStatus(status, detail) {
    tbStatus(status, detail)
    if (onStatus) onStatus(status)
  }

  async function fetchTelemetryKeys() {
    const now = Date.now()
    if (cachedKeys && now - lastKeysFetchMs < 60_000) return cachedKeys

    const url = buildTbApiUrl(
      `/api/plugins/telemetry/DEVICE/${deviceId}/keys/timeseries`,
      base,
    )

    const response = await fetch(url, { headers })
    if (!response.ok) {
      cachedKeys = FALLBACK_KEYS
      return cachedKeys
    }

    const keys = await response.json()
    cachedKeys = Array.isArray(keys) && keys.length > 0 ? keys : FALLBACK_KEYS
    lastKeysFetchMs = now
    return cachedKeys
  }

  async function fetchSwitchAttributes() {
    const { attributeKeysPoll } = thingsboardSwitchConfig()
    const uniqueKeys = [...new Set(attributeKeysPoll)]
    const query = new URLSearchParams({ keys: uniqueKeys.join(',') })
    const url = buildTbApiUrl(
      `/api/plugins/telemetry/DEVICE/${deviceId}/values/attributes?${query}`,
      base,
    )

    try {
      const response = await fetch(url, { headers })
      if (!response.ok) return {}
      const data = await response.json()
      return flattenAttributesResponse(data)
    } catch {
      return {}
    }
  }

  async function poll() {
    if (isClosed || inFlight) return
    inFlight = true

    try {
      const keys = await fetchTelemetryKeys()
      const query = new URLSearchParams({ keys: keys.join(',') })
      const url = buildTbApiUrl(
        `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?${query}`,
        base,
      )

      const [response, attrs] = await Promise.all([
        fetch(url, { headers }),
        fetchSwitchAttributes(),
      ])

      if (!response.ok) {
        const detail = await readErrorDetail(response)
        throw new Error(detail || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const payload = normalizeTimeseriesPayload(data)
      if (payload && Object.keys(attrs).length > 0) {
        payload.values = { ...payload.values, ...attrs }
      }

      if (!payload) {
        tbWarn('Polling OK tetapi tidak ada nilai telemetri', { keys: keys.slice(0, 8) })
      } else {
        tbLog('Telemetri diterima', {
          keys: Object.keys(payload.values),
          ts: payload.timestamp,
        })
      }

      setStatus('connected', { transport: 'rest', deviceId, intervalMs })

      if (payload && onTelemetry) onTelemetry(payload)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      tbError('Polling telemetri gagal', message)
      setStatus('error', message)
    } finally {
      inFlight = false
    }
  }

  tbLog('Memulai REST polling telemetri (API key)', {
    baseUrl: base,
    deviceId,
    intervalMs,
    proxy: base.startsWith('/tb-api'),
  })

  setStatus('connecting', { transport: 'rest', deviceId })
  void poll()
  timer = window.setInterval(() => {
    void poll()
  }, intervalMs)

  return {
    disconnect: async () => {
      tbLog('Menghentikan REST polling…')
      isClosed = true
      if (timer) {
        window.clearInterval(timer)
        timer = null
      }
    },
  }
}
