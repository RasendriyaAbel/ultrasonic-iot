import { tbError, tbLog } from './thingsboardLog.js'
import { buildTbApiUrl } from './thingsboardApi.js'

async function readErrorDetail(response) {
  const text = await response.text()
  if (!text) return null
  try {
    const data = JSON.parse(text)
    return data?.message || data?.error || data?.status || text
  } catch {
    return text
  }
}

export async function resolveThingsBoardAuthToken({ baseUrl: _baseUrl, wsToken, username, password }) {
  if (wsToken) {
    tbLog('Autentikasi WebSocket: memakai VITE_TB_WS_TOKEN (JWT)')
    return wsToken
  }

  if (!username || !password) {
    throw new Error(
      'WebSocket butuh JWT. Isi VITE_TB_WS_TOKEN, atau VITE_TB_USERNAME + VITE_TB_PASSWORD. Untuk hanya API key, telemetri memakai REST polling otomatis.',
    )
  }

  const loginUrl = buildTbApiUrl('/api/auth/login')
  tbLog('Autentikasi: login username/password…', { url: loginUrl, username })

  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    const detail = await readErrorDetail(response)
    const hint =
      response.status === 401
        ? ' Periksa email/password di halaman login ThingsBoard.'
        : ''
    const message = `Login ThingsBoard gagal (${response.status})${detail ? `: ${detail}` : ''}${hint}`
    tbError(message)
    throw new Error(message)
  }

  const body = await response.json()
  if (!body?.token) {
    const message = 'JWT ThingsBoard tidak ditemukan di response login'
    tbError(message)
    throw new Error(message)
  }

  tbLog('Autentikasi: login berhasil')
  return body.token
}
