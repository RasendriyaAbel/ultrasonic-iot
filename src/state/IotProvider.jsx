import { useEffect, useMemo, useReducer } from 'react'
import { useLocalStorageState } from '../hooks/useLocalStorageState.js'
import { defaultSettings } from '../data/defaultSettings.js'
import { mapTelemetryToDashboard, mergeSettings } from '../utils/telemetryNormalize.js'
import { IotContext } from './iotContext.js'
import { connectThingsBoardMqtt } from '../services/thingsboardMqtt.js'
import { tbLog, tbWarn } from '../services/thingsboardLog.js'
import { connectThingsBoardRestPoll } from '../services/thingsboardRestPoll.js'
import { connectThingsBoardWs } from '../services/thingsboardWs.js'
import { buildAlerts } from '../utils/iot.js'

const TB_ENABLED = import.meta.env.VITE_TB_ENABLED === 'true' || Boolean(import.meta.env.VITE_TB_TOKEN)
const TB_BASE_URL = (import.meta.env.VITE_TB_BASE_URL || '').trim()
const TB_DEVICE_ID = (import.meta.env.VITE_TB_DEVICE_ID || '').trim()
const TB_WS_URL = import.meta.env.VITE_TB_WS_URL || 'wss://mqtt.thingsboard.cloud:443/mqtt'
const TB_TOPIC = import.meta.env.VITE_TB_TOPIC || 'v1/devices/me/telemetry'
const TB_TOKEN = import.meta.env.VITE_TB_TOKEN || ''
const TB_WS_TOKEN = (import.meta.env.VITE_TB_WS_TOKEN || '').trim()
const TB_API_KEY = (import.meta.env.VITE_TB_API_KEY || '').trim()
const TB_USERNAME = (import.meta.env.VITE_TB_USERNAME || '').trim()
const TB_PASSWORD = import.meta.env.VITE_TB_PASSWORD || ''

function isTbTelemetryWsUrl(url) {
  return typeof url === 'string' && /\/api\/ws\b/i.test(url)
}

function canConnectTbWsJwt() {
  return Boolean(
    TB_BASE_URL && TB_DEVICE_ID && (TB_WS_TOKEN || (TB_USERNAME && TB_PASSWORD)),
  )
}

function canConnectTbRestPoll() {
  return Boolean(TB_BASE_URL && TB_DEVICE_ID && TB_API_KEY)
}

function canConnectTbRealtime() {
  return canConnectTbWsJwt() || canConnectTbRestPoll()
}

/**
 * Telemetri: REST (API key) atau MQTT (token device).
 * API key bukan JWT — WebSocket tenant butuh login/JWT.
 */
function resolveTbTransport() {
  const preferMqtt = import.meta.env.VITE_TB_TELEMETRY_TRANSPORT === 'mqtt'

  if (preferMqtt && canConnectTbMqtt()) return 'mqtt'
  if (!isTbTelemetryWsUrl(TB_WS_URL)) {
    return canConnectTbMqtt() ? 'mqtt' : null
  }
  if (TB_WS_TOKEN && canConnectTbWsJwt()) return 'ws'
  if (canConnectTbRestPoll()) return 'rest'
  if (canConnectTbWsJwt()) return 'ws'
  if (canConnectTbMqtt()) return 'mqtt'
  return null
}

function canConnectTbMqtt() {
  return Boolean(TB_TOKEN)
}

const DEFAULT_PUMP = {
  status: 'OFF',
  mode: 'MANUAL',
}

function buildEmptyTelemetry(settings, pump = DEFAULT_PUMP) {
  return {
    timestamp: null,
    tank: {
      capacityLiter: settings.capacityLiter,
      currentVolumeLiter: null,
      percentage: null,
      waterLevelCm: null,
      status: 'Menunggu Data',
    },
    flow: {
      flow1Lpm: null,
      flow2Lpm: null,
      flowInLpm: null,
      flowOutLpm: null,
      differenceLpm: null,
      lossPercentage: null,
    },
    leakage: {
      status: 'Menunggu Data',
      location: null,
    },
    consumption: {
      totalUsedLiter: 0,
      dailyAverageLiter: null,
      estimatedDaysRemaining: null,
    },
    pump: {
      status: pump.status,
      mode: pump.mode,
    },
    sensors: {
      distanceCm: null,
      flowInLpm: null,
      flowOutLpm: null,
      errorCount: null,
    },
    device: {},
  }
}

function initialState(settings) {
  const telemetry = buildEmptyTelemetry(settings)

  return {
    settings,
    connection: {
      source: 'thingsboard',
      status: TB_ENABLED ? 'connecting' : 'not_configured',
    },
    pump: {
      ...DEFAULT_PUMP,
      onSinceMs: null,
      lastChangedMs: null,
    },
    telemetry,
    history: [],
    dailyConsumption: [],
    alerts: [],
    ingest: { lastMs: null },
  }
}

function ingestExternalTelemetry(state, { timestamp, values }) {
  const mapped = mapTelemetryToDashboard({
    values,
    settings: state.settings,
    prevTelemetry: state.telemetry,
    prevPump: state.pump,
    prevDailyConsumption: state.dailyConsumption,
    prevIngest: state.ingest,
    defaultPump: DEFAULT_PUMP,
  })

  const nowMs = Date.now()
  const cloudPumpStatus = mapped.telemetry?.pump?.deviceStatus
  const recentlyChanged =
    state.pump.lastChangedMs != null && nowMs - state.pump.lastChangedMs < 8000
  const syncedStatus =
    cloudPumpStatus && !recentlyChanged ? cloudPumpStatus : state.pump.status

  const nextTelemetry = {
    ...mapped.telemetry,
    timestamp: timestamp || mapped.telemetry.timestamp,
    pump: {
      ...mapped.telemetry.pump,
      status: syncedStatus,
      mode: 'MANUAL',
    },
  }

  const history = [...state.history, nextTelemetry].slice(-300)
  const nextPump = {
    ...state.pump,
    status: syncedStatus,
    mode: 'MANUAL',
    onSinceMs:
      syncedStatus === 'ON'
        ? state.pump.onSinceMs ?? (cloudPumpStatus === 'ON' ? nowMs : null)
        : null,
  }

  const pumpOnDurationMinutes =
    nextPump.status === 'ON' && nextPump.onSinceMs ? (nowMs - nextPump.onSinceMs) / 60000 : null
  const alerts = buildAlerts({
    telemetry: nextTelemetry,
    settings: mapped.settings,
    pumpOnDurationMinutes,
  })

  return {
    ...state,
    settings: mapped.settings,
    telemetry: nextTelemetry,
    history,
    dailyConsumption: mapped.dailyConsumption,
    pump: nextPump,
    alerts,
    ingest: mapped.ingest,
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CONNECTION':
      return { ...state, connection: action.connection }
    case 'INGEST':
      return ingestExternalTelemetry(state, action.payload)
    case 'SET_SETTINGS': {
      const settings = mergeSettings(action.settings)
      if (state.ingest?.lastValues) {
        return ingestExternalTelemetry(
          { ...state, settings },
          { timestamp: state.telemetry?.timestamp, values: state.ingest.lastValues },
        )
      }
      return {
        ...state,
        settings,
        telemetry: {
          ...state.telemetry,
          tank: {
            ...state.telemetry.tank,
            capacityLiter: settings.capacityLiter,
          },
        },
      }
    }
    case 'SET_PUMP_MODE': {
      const nowMs = Date.now()
      return {
        ...state,
        pump: {
          ...state.pump,
          mode: 'MANUAL',
          lastChangedMs: nowMs,
        },
      }
    }
    case 'SET_PUMP_STATUS': {
      const desired = action.status
      const nowMs = Date.now()
      return {
        ...state,
        pump: {
          ...state.pump,
          status: desired,
          mode: 'MANUAL',
          lastChangedMs: nowMs,
          onSinceMs: desired === 'ON' ? nowMs : null,
        },
      }
    }
    default:
      return state
  }
}

export function IotProvider({ children }) {
  const [persistedSettings, setPersistedSettings] = useLocalStorageState(
    'iot-dashboard-settings-v1',
    defaultSettings(),
  )
  const mergedSettings = useMemo(() => mergeSettings(persistedSettings), [persistedSettings])
  const [state, dispatch] = useReducer(reducer, mergedSettings, initialState)

  useEffect(() => {
    if (!TB_ENABLED) return

    const transport = resolveTbTransport()
    const useTbRealtime = transport === 'ws' || transport === 'rest'
    const useWsJwt = transport === 'ws'
    const useRestPoll = transport === 'rest'
    const configured =
      transport === 'mqtt'
        ? canConnectTbMqtt()
        : transport === 'ws'
          ? canConnectTbWsJwt()
          : transport === 'rest'
            ? canConnectTbRestPoll()
            : false

    if (!configured) {
      tbWarn('Konfigurasi ThingsBoard belum lengkap', {
        mode: useTbRealtime ? 'realtime (ws/rest)' : 'mqtt',
        baseUrl: TB_BASE_URL || '(kosong)',
        deviceId: TB_DEVICE_ID || '(kosong)',
        hasApiKey: Boolean(TB_API_KEY),
        hasWsToken: Boolean(TB_WS_TOKEN),
        hasCredentials: Boolean(TB_USERNAME && TB_PASSWORD),
        hasDeviceToken: Boolean(TB_TOKEN),
      })
      dispatch({
        type: 'SET_CONNECTION',
        connection: { source: 'thingsboard', status: 'not_configured' },
      })
      return
    }

    tbLog('Memulai koneksi ThingsBoard', {
      transport: transport ?? 'none',
      url: useTbRealtime ? TB_WS_URL || TB_BASE_URL : TB_WS_URL,
      deviceId: useTbRealtime ? TB_DEVICE_ID : undefined,
    })

    dispatch({
      type: 'SET_CONNECTION',
      connection: { source: 'thingsboard', status: 'connecting' },
    })

    const onStatus = (status) => {
      dispatch({
        type: 'SET_CONNECTION',
        connection: { source: 'thingsboard', status },
      })
    }

    const onTelemetry = (payload) => {
      dispatch({ type: 'INGEST', payload })
    }

    const conn = useWsJwt
      ? connectThingsBoardWs({
          baseUrl: TB_BASE_URL,
          wsUrl: TB_WS_URL,
          deviceId: TB_DEVICE_ID,
          token: TB_WS_TOKEN || undefined,
          username: TB_USERNAME,
          password: TB_PASSWORD,
          onStatus,
          onTelemetry,
        })
      : useRestPoll
        ? connectThingsBoardRestPoll({
            baseUrl: TB_BASE_URL,
            deviceId: TB_DEVICE_ID,
            apiKey: TB_API_KEY,
            onStatus,
            onTelemetry,
          })
        : connectThingsBoardMqtt({
          url:
            import.meta.env.VITE_TB_MQTT_URL?.trim() ||
            'wss://mqtt.thingsboard.cloud:443/mqtt',
          token: TB_TOKEN,
          topic: TB_TOPIC,
          onStatus,
          onTelemetry,
        })

    return () => {
      conn.disconnect()
    }
  }, [])

  const api = useMemo(() => {
    return {
      state,
      setSettings: (nextSettings) => {
        const settings = mergeSettings(nextSettings)
        setPersistedSettings(settings)
        dispatch({ type: 'SET_SETTINGS', settings })
      },
      setPumpMode: (mode) => dispatch({ type: 'SET_PUMP_MODE', mode }),
      setPumpStatus: (status) => dispatch({ type: 'SET_PUMP_STATUS', status }),
    }
  }, [state, setPersistedSettings])

  return <IotContext.Provider value={api}>{children}</IotContext.Provider>
}
