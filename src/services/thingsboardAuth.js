import { tbError, tbLog } from './thingsboardLog.js'

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

export async function resolveThingsBoardAuthToken({ baseUrl, wsToken, username, password }) {
  if (wsToken) {
    tbLog('Autentikasi WebSocket: memakai VITE_TB_WS_TOKEN (JWT)')
    return wsToken
  }

  if (!baseUrl) {
    throw new Error('VITE_TB_BASE_URL belum diatur untuk ThingsBoard')
  }

  if (!username || !password) {
    throw new Error(
      'WebSocket butuh JWT. Isi VITE_TB_WS_TOKEN, atau VITE_TB_USERNAME + VITE_TB_PASSWORD. Untuk hanya API key, telemetri memakai REST polling otomatis.',
    )
  }

  tbLog('Autentikasi: login username/password…', { baseUrl, username })

  const response = await fetch(new URL('/api/auth/login', baseUrl).toString(), {
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
