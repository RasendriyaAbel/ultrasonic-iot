/** Base URL REST ThingsBoard — di dev memakai proxy Vite untuk menghindari CORS. */
export function getTbApiBaseUrl() {
  const url = (import.meta.env.VITE_TB_BASE_URL || '').trim().replace(/\/+$/, '')
  if (!url) return ''

  if (import.meta.env.DEV && import.meta.env.VITE_TB_DEV_PROXY !== 'false') {
    try {
      const { hostname } = new URL(url)
      if (hostname === 'thingsboard.cloud' || hostname.endsWith('.thingsboard.cloud')) {
        return '/tb-api'
      }
    } catch {
      void 0
    }
  }

  return url
}

export function tbApiKeyAuthHeaders(apiKey) {
  const value = `ApiKey ${apiKey}`
  return {
    Accept: 'application/json',
    'X-Authorization': value,
    Authorization: value,
  }
}

/** Gabungkan base API (https://… atau /tb-api proxy) dengan path REST ThingsBoard. */
export function buildTbApiUrl(path, baseOverride) {
  const base = (baseOverride || getTbApiBaseUrl() || '').trim().replace(/\/+$/, '')
  if (!base) {
    throw new Error('VITE_TB_BASE_URL belum diatur untuk ThingsBoard')
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (/^https?:\/\//i.test(base)) {
    return new URL(normalizedPath, `${base}/`).toString()
  }

  const proxyBase = base.startsWith('/') ? base : `/${base}`
  return `${proxyBase}${normalizedPath}`
}
