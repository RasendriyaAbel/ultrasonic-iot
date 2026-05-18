const RETRYABLE_STATUS = new Set([408, 502, 503, 504])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableStatus(status) {
  return RETRYABLE_STATUS.has(status)
}

function isRetryableError(err) {
  if (err?.name === 'AbortError') return false
  const code = err?.code
  return code === 'RPC_TIMEOUT' || code === 'GATEWAY_TIMEOUT'
}

/**
 * fetch dengan retry untuk 502/503/504/408 (gateway/upstream timeout).
 * Jangan dipakai untuk RPC yang menunggu device — akan memperpanjang waktu tunggu.
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const {
    retries = Number(import.meta.env.VITE_HTTP_RETRY_COUNT ?? 2),
    backoffMs = Number(import.meta.env.VITE_HTTP_RETRY_BACKOFF_MS ?? 800),
    retryOn = isRetryableStatus,
  } = retryOptions

  let lastError = null
  let lastResponse = null
  const maxAttempts = Math.max(1, retries + 1)

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url, options)
      lastResponse = res

      if (res.ok || !retryOn(res.status) || attempt === maxAttempts - 1) {
        return res
      }

      lastError = new Error(`HTTP ${res.status}`)
      lastError.status = res.status
      if (res.status === 504) lastError.code = 'GATEWAY_TIMEOUT'
    } catch (err) {
      lastError = err
      if (!isRetryableError(err) || attempt === maxAttempts - 1) {
        throw err
      }
    }

    await sleep(backoffMs * (attempt + 1))
  }

  if (lastResponse) return lastResponse
  throw lastError || new Error('Permintaan gagal setelah beberapa percobaan.')
}

export function isGatewayTimeout(status) {
  return status === 504
}
