import { resolveThingsBoardAuthToken } from './thingsboardAuth.js'
import { tbLog, tbStatus } from './thingsboardLog.js'

const TELEMETRY_KEYS = [
  'jarak_cm',
  'level_air_percent',
  'flow_in_lpm',
  'flow_out_lpm',
  'flow1Lpm',
  'flow2Lpm',
  'flow1',
  'flow2',
  'f1',
  'f2',
  'debit1',
  'debit2',
  'distanceCm',
  'distance',
  'distanceToWaterCm',
  'ultrasonicDistanceCm',
  'percentage',
  'tankPercentage',
  'errorCount',
  'error_count',
  'waterLevelCm',
  'waterLevel',
  'levelCm',
  'currentVolumeLiter',
  'volumeLiter',
  'volume',
  'tankVolume',
  'capacityLiter',
  'pumpStatus',
  'pumpMode',
  'pump',
  'mode',
  'relay',
]

function telemetryKeyDescriptors() {
  return TELEMETRY_KEYS.map((key) => ({ type: 'TIME_SERIES', key }))
}

function buildWsEndpoint(baseUrl, wsUrl) {
  const raw = (wsUrl || baseUrl || '').trim()
  if (!raw) {
    throw new Error('ThingsBoard base URL belum diatur')
  }

  const url = new URL(raw.includes('://') ? raw : `https://${raw}`)
  url.protocol = url.protocol === 'https:' ? 'wss:' : url.protocol === 'http:' ? 'ws:' : url.protocol
  url.pathname = '/api/ws'
  url.search = ''
  url.hash = ''
  return url.toString()
}

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

function normalizeEntityTelemetry(entity, deviceId) {
  const entityKey = entity?.entityId?.id
  if (entityKey && entityKey !== deviceId) return null

  const series = entity?.latest?.TIME_SERIES
  if (!series || typeof series !== 'object') return null

  const values = {}
  let latestTs = null

  for (const [key, entry] of Object.entries(series)) {
    if (!entry || typeof entry !== 'object') continue
    values[key] = coerceTelemetryValue(entry.value)
    if (Number.isFinite(entry.ts)) {
      latestTs = latestTs == null ? entry.ts : Math.max(latestTs, entry.ts)
    }
  }

  if (Object.keys(values).length === 0) return null

  return {
    timestamp: latestTs != null ? new Date(latestTs).toISOString() : new Date().toISOString(),
    values,
  }
}

function buildSubscribeMessage(authToken, deviceId, cmdId) {
  const keys = telemetryKeyDescriptors()

  return {
    authCmd: { cmdId: 0, token: authToken },
    cmds: [
      {
        cmdId,
        type: 'ENTITY_DATA',
        query: {
          entityFilter: {
            type: 'singleEntity',
            singleEntity: { entityType: 'DEVICE', id: deviceId },
          },
          pageLink: {
            pageSize: 1,
            page: 0,
            sortOrder: {
              key: { type: 'ENTITY_FIELD', key: 'name' },
              direction: 'ASC',
            },
          },
          entityFields: [{ type: 'ENTITY_FIELD', key: 'name' }],
          latestValues: keys,
          keyFilters: [],
        },
        latestCmd: { keys },
      },
    ],
  }
}

export function connectThingsBoardWs({
  baseUrl,
  wsUrl,
  deviceId,
  token,
  username,
  password,
  onStatus,
  onTelemetry,
}) {
  let socket = null
  let reconnectTimer = null
  let isClosed = false
  const subscriptionCmdId = 1

  function setStatus(status, detail) {
    tbStatus(status, detail)
    if (onStatus) onStatus(status)
  }

  function cleanupSocket() {
    if (!socket) return

    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    socket = null
  }

  function scheduleReconnect() {
    if (isClosed || reconnectTimer) return
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      void openSocket()
    }, 2000)
  }

  function handleMessage(message) {
    if (message?.errorCode && message.errorCode !== 0) {
      setStatus('error', message.errorMsg || `errorCode ${message.errorCode}`)
      return
    }

    const entities = []

    if (message?.cmdId === subscriptionCmdId && message?.data?.data) {
      entities.push(...message.data.data)
    }

    if (message?.cmdId === subscriptionCmdId && message?.update) {
      const update = message.update
      if (Array.isArray(update)) entities.push(...update)
      else entities.push(update)
    }

    for (const entity of entities) {
      const payload = normalizeEntityTelemetry(entity, deviceId)
      if (payload && onTelemetry) onTelemetry(payload)
    }
  }

  async function openSocket() {
    if (isClosed) return
    if (!deviceId) {
      setStatus('not_configured')
      return
    }

    try {
      setStatus(socket ? 'reconnecting' : 'connecting', { transport: 'websocket', deviceId })

      const authToken = await resolveThingsBoardAuthToken({
        baseUrl,
        wsToken: token,
        username,
        password,
      })

      const url = buildWsEndpoint(baseUrl, wsUrl)
      tbLog('Membuka WebSocket…', { url })

      cleanupSocket()
      socket = new WebSocket(url)

      socket.onopen = () => {
        setStatus('connected', { url, deviceId })
        tbLog('Subscribe telemetri device', { deviceId })
        socket?.send(JSON.stringify(buildSubscribeMessage(authToken, deviceId, subscriptionCmdId)))
      }

      socket.onmessage = (event) => {
        let message = null
        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }

        handleMessage(message)
      }

      socket.onerror = () => {
        setStatus('error', { url })
      }

      socket.onclose = (event) => {
        cleanupSocket()
        if (isClosed) {
          tbLog('WebSocket ditutup (disconnect manual)')
          return
        }
        setStatus('offline', { code: event.code, reason: event.reason || '—' })
        scheduleReconnect()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStatus('error', message)
      scheduleReconnect()
    }
  }

  void openSocket()

  return {
    disconnect: async () => {
      tbLog('Memutuskan koneksi WebSocket…')
      isClosed = true
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (socket) {
        socket.close()
        cleanupSocket()
      }
    },
  }
}
