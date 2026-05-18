import mqtt from 'mqtt'
import { tbLog, tbStatus } from './thingsboardLog.js'

export function connectThingsBoardMqtt({ url, token, topic, onStatus, onTelemetry }) {
  tbLog('Memulai koneksi MQTT…', { url, topic })

  const client = mqtt.connect(url, {
    username: token,
    password: '',
    clean: true,
    reconnectPeriod: 2000,
    connectTimeout: 10_000,
  })

  function setStatus(status, detail) {
    tbStatus(status, detail)
    if (onStatus) onStatus(status)
  }

  client.on('connect', () => {
    setStatus('connected', { url, topic })
    client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) setStatus('error', err.message || 'subscribe gagal')
      else tbLog('Subscribe MQTT berhasil', { topic })
    })
  })

  client.on('reconnect', () => setStatus('reconnecting', { url }))
  client.on('offline', () => setStatus('offline', { url }))
  client.on('close', () => setStatus('offline', { url }))
  client.on('error', (err) => setStatus('error', err?.message || 'MQTT error'))

  client.on('message', (_topic, payload) => {
    const text = payload?.toString?.() ?? ''
    let values = null
    try {
      values = JSON.parse(text)
    } catch {
      void 0
    }
    if (!values) return

    if (onTelemetry) onTelemetry({ timestamp: new Date().toISOString(), values })
  })

  return {
    disconnect: () =>
      new Promise((resolve) => {
        tbLog('Memutuskan koneksi MQTT…')
        try {
          client.end(true, {}, resolve)
        } catch {
          resolve()
        }
      }),
  }
}
