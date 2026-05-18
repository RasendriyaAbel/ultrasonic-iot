import { buildTbApiUrl, getTbApiBaseUrl, tbApiKeyAuthHeaders } from './thingsboardApi.js'
import { fetchWithRetry, isGatewayTimeout } from '../utils/httpFetch.js'
import {
  attributeScopePath,
  buildSwitchAttributeBody,
  buildSwitchRpcParams,
  thingsboardSwitchConfig,
} from './thingsboardSwitch.js'

const TB_BASE_URL = getTbApiBaseUrl() || (import.meta.env.VITE_TB_BASE_URL || '').trim().replace(/\/+$/, '')
const TB_DEVICE_ID = (import.meta.env.VITE_TB_DEVICE_ID || '').trim()
const TB_API_KEY = (import.meta.env.VITE_TB_API_KEY || '').trim()
const TB_USERNAME = (import.meta.env.VITE_TB_USERNAME || '').trim()
const TB_PASSWORD = import.meta.env.VITE_TB_PASSWORD || ''
const TB_RPC_METHOD = (import.meta.env.VITE_TB_RPC_METHOD || 'setPump').trim()
const TB_RPC_CALL_TYPE = (import.meta.env.VITE_TB_RPC_CALL_TYPE || 'oneway').trim().toLowerCase() === 'twoway' ? 'twoway' : 'oneway'
const TB_RPC_TIMEOUT_MS = Number(import.meta.env.VITE_TB_RPC_TIMEOUT_MS || 5_000)
const TB_RPC_PERSISTENT = import.meta.env.VITE_TB_RPC_PERSISTENT === 'true'
const TB_RPC_RETRIES = Number(import.meta.env.VITE_TB_RPC_RETRIES || 0)
const TB_PUMP_TRANSPORT = (import.meta.env.VITE_TB_PUMP_TRANSPORT || 'both').trim().toLowerCase()
const TB_PUMP_TRY_RPC = import.meta.env.VITE_TB_PUMP_TRY_RPC !== 'false'

const switchCfg = thingsboardSwitchConfig()

let cachedJwt = null

function hasJwtCredentials() {
  return Boolean(TB_USERNAME && TB_PASSWORD)
}

export function pumpControlConfig() {
  const authMode = TB_API_KEY ? 'apiKey' : hasJwtCredentials() ? 'jwt' : null

  return {
    configured: Boolean(TB_BASE_URL && TB_DEVICE_ID && authMode),
    baseUrl: TB_BASE_URL,
    deviceId: TB_DEVICE_ID,
    authMode,
    method: TB_RPC_METHOD,
    callType: TB_RPC_CALL_TYPE,
    transport: TB_PUMP_TRANSPORT,
    switchKey: switchCfg.attributeKey,
    switchScope: switchCfg.attributeScope,
    rpcStyle: switchCfg.rpcStyle,
  }
}

function readErrorMessage(text) {
  if (!text) return null
  try {
    const data = JSON.parse(text)
    return data?.message || data?.error || data?.status
  } catch {
    return text
  }
}

function requireControlConfig() {
  const cfg = pumpControlConfig()
  if (!cfg.baseUrl) throw new Error('VITE_TB_BASE_URL belum diisi untuk kontrol pompa.')
  if (!cfg.deviceId) throw new Error('VITE_TB_DEVICE_ID belum diisi untuk kontrol pompa.')
  if (!cfg.authMode) {
    throw new Error('Isi VITE_TB_API_KEY atau pasangan VITE_TB_USERNAME dan VITE_TB_PASSWORD.')
  }
  return cfg
}

async function getAuthorizationHeader() {
  if (TB_API_KEY) return `ApiKey ${TB_API_KEY}`

  if (cachedJwt && cachedJwt.expiresAt > Date.now() + 30_000) {
    return `Bearer ${cachedJwt.token}`
  }

  const res = await fetchWithRetry(
    buildTbApiUrl('/api/auth/login'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: TB_USERNAME, password: TB_PASSWORD }),
    },
    { retries: 1 },
  )

  const text = await res.text()
  if (!res.ok) throw new Error(readErrorMessage(text) || 'Login ThingsBoard gagal.')

  const data = JSON.parse(text)
  if (!data?.token) throw new Error('Token login ThingsBoard tidak valid.')

  cachedJwt = { token: data.token, expiresAt: Date.now() + 2 * 60 * 60 * 1000 }
  return `Bearer ${data.token}`
}

function authHeaders(authHeader) {
  if (authHeader.startsWith('ApiKey ')) {
    return tbApiKeyAuthHeaders(authHeader.slice(7))
  }
  return {
    Accept: 'application/json',
    'X-Authorization': authHeader,
    Authorization: authHeader,
  }
}

function buildRpcBody({ status }) {
  return {
    method: TB_RPC_METHOD,
    params: buildSwitchRpcParams({ status }),
    timeout: Number.isFinite(TB_RPC_TIMEOUT_MS) ? Math.max(2000, Math.min(TB_RPC_TIMEOUT_MS, 15_000)) : 5000,
    persistent: TB_RPC_PERSISTENT,
    retries: Number.isFinite(TB_RPC_RETRIES) ? Math.max(0, TB_RPC_RETRIES) : 0,
  }
}

function gatewayTimeoutMessage(status) {
  return (
    `Gateway timeout (HTTP ${status}). ThingsBoard menunggu device — ` +
    `gunakan atribut switch atau pastikan ESP32 online.`
  )
}

async function postAttributes({ status, cfg, authHeader, scope }) {
  const scopePath = attributeScopePath(scope)
  const url = buildTbApiUrl(
    `/api/plugins/telemetry/DEVICE/${cfg.deviceId}/attributes/${scopePath}`,
  )
  const res = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(authHeader) },
      body: JSON.stringify(buildSwitchAttributeBody({ status })),
    },
    { retries: 2 },
  )

  const text = await res.text()
  if (!res.ok) {
    const msg = readErrorMessage(text) || `Atribut gagal (HTTP ${res.status}).`
    if (isGatewayTimeout(res.status)) throw new Error(gatewayTimeoutMessage(res.status))
    throw new Error(msg)
  }

  return { scope: scopePath, ok: true }
}

async function sendPumpViaAttributes({ status, cfg, authHeader }) {
  const scope = switchCfg.attributeScope
  const results = []

  if (scope === 'BOTH') {
    results.push(await postAttributes({ status, cfg, authHeader, scope: 'SERVER_SCOPE' }))
    results.push(await postAttributes({ status, cfg, authHeader, scope: 'SHARED_SCOPE' }))
  } else {
    results.push(await postAttributes({ status, cfg, authHeader, scope }))
  }

  return {
    ok: true,
    channel: 'attribute',
    switchKey: switchCfg.attributeKey,
    scopes: results.map((r) => r.scope),
  }
}

async function sendPumpViaRpc({ status, cfg, authHeader }) {
  const url = buildTbApiUrl(`/api/rpc/${cfg.callType}/${cfg.deviceId}`)
  const rpcTimeout = buildRpcBody({ status }).timeout || 5000
  const clientTimeoutMs = Math.max(3000, rpcTimeout + 1500)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), clientTimeoutMs)

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(authHeader) },
      body: JSON.stringify(buildRpcBody({ status })),
      signal: controller.signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      const e = new Error(`RPC timeout — widget Switch TB mungkin memakai atribut, bukan RPC.`)
      e.code = 'RPC_TIMEOUT'
      throw e
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  const text = await res.text()
  if (!res.ok) {
    const msg =
      readErrorMessage(text) ||
      (isGatewayTimeout(res.status) ? gatewayTimeoutMessage(res.status) : `RPC gagal (HTTP ${res.status}).`)
    const err = new Error(msg)
    err.status = res.status
    if (isGatewayTimeout(res.status)) err.code = 'RPC_TIMEOUT'
    throw err
  }

  return {
    ok: true,
    channel: 'rpc',
    method: cfg.method,
    rpcParams: buildSwitchRpcParams({ status }),
  }
}

/**
 * Kirim ON/OFF — sinkron dengan widget Switch ThingsBoard (atribut + RPC boolean).
 */
export async function sendPumpCommand({ status }) {
  if (status !== 'ON' && status !== 'OFF') throw new Error('Status pompa tidak valid.')

  const cfg = requireControlConfig()
  const authHeader = await getAuthorizationHeader()
  const transport = TB_PUMP_TRANSPORT

  if (transport === 'attribute') {
    return sendPumpViaAttributes({ status, cfg, authHeader })
  }

  if (transport === 'rpc') {
    return sendPumpViaRpc({ status, cfg, authHeader })
  }

  // both | auto: atribut dulu (update switch TB), RPC opsional
  const attr = await sendPumpViaAttributes({ status, cfg, authHeader })

  if (!TB_PUMP_TRY_RPC) {
    return attr
  }

  try {
    const rpc = await sendPumpViaRpc({ status, cfg, authHeader })
    return { ...attr, ...rpc, channels: ['attribute', 'rpc'] }
  } catch (err) {
    return {
      ...attr,
      rpcSkipped: true,
      rpcError: err.message,
      channels: ['attribute'],
    }
  }
}
