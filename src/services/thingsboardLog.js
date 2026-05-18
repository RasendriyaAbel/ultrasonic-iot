const PREFIX = '[ThingsBoard]'

function formatMeta(meta) {
  if (meta == null) return ''
  if (typeof meta === 'string') return meta
  try {
    return JSON.stringify(meta)
  } catch {
    return String(meta)
  }
}

export function tbLog(message, meta) {
  if (meta !== undefined) {
    console.info(PREFIX, message, meta)
    return
  }
  console.info(PREFIX, message)
}

export function tbWarn(message, meta) {
  if (meta !== undefined) {
    console.warn(PREFIX, message, meta)
    return
  }
  console.warn(PREFIX, message)
}

export function tbError(message, meta) {
  if (meta !== undefined) {
    console.error(PREFIX, message, meta)
    return
  }
  console.error(PREFIX, message)
}

export function tbStatus(status, detail) {
  const suffix = detail ? ` — ${formatMeta(detail)}` : ''

  switch (status) {
    case 'connecting':
      tbLog(`Menghubungkan…${suffix}`)
      break
    case 'reconnecting':
      tbWarn(`Menyambung ulang…${suffix}`)
      break
    case 'connected':
      tbLog(`Terhubung${suffix}`)
      break
    case 'offline':
      tbWarn(`Terputus${suffix}`)
      break
    case 'error':
      tbError(`Gagal terhubung${suffix}`)
      break
    case 'not_configured':
      tbWarn(`Belum dikonfigurasi${suffix}`)
      break
    default:
      tbLog(`Status: ${status}${suffix}`)
  }
}
