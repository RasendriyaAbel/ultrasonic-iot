/**
 * Konfigurasi sinkron dengan widget Switch ThingsBoard.
 * Widget TB umumnya: RPC params = boolean, atribut = key switch (true/false).
 */
const SWITCH_KEY = (import.meta.env.VITE_TB_SWITCH_ATTRIBUTE_KEY || 'switch').trim()
const SWITCH_SCOPE = (import.meta.env.VITE_TB_SWITCH_ATTRIBUTE_SCOPE || 'SERVER_SCOPE')
  .trim()
  .toUpperCase()
const RPC_STYLE = (import.meta.env.VITE_TB_SWITCH_RPC_STYLE || 'boolean').trim().toLowerCase()

export function thingsboardSwitchConfig() {
  return {
    attributeKey: SWITCH_KEY,
    attributeScope: SWITCH_SCOPE,
    rpcStyle: RPC_STYLE,
    attributeKeysPoll: [
      SWITCH_KEY,
      'switch',
      'Switch',
      'relay',
      'pump_on',
      'pumpStatus',
      'pump_status',
    ],
  }
}

export function switchValueFromStatus(status) {
  return status === 'ON'
}

export function buildSwitchAttributeBody({ status }) {
  const on = switchValueFromStatus(status)
  const key = SWITCH_KEY

  return {
    [key]: on,
    switch: on,
    relay: on,
    pump_on: on,
    pumpStatus: status,
    pumpCommand: status,
    status,
    mode: 'MANUAL',
    manual: true,
    auto: false,
    pumpOn: on,
    enabled: on,
    source: 'ultrasonic-iot-dashboard',
    ts: Date.now(),
  }
}

export function buildSwitchRpcParams({ status }) {
  if (RPC_STYLE === 'payload') {
    return buildSwitchAttributeBody({ status })
  }
  // Default: sama seperti widget Switch ThingsBoard (boolean)
  return switchValueFromStatus(status)
}

export function attributeScopePath(scope) {
  const s = scope.toUpperCase()
  if (s === 'SHARED_SCOPE' || s === 'SHARED') return 'SHARED_SCOPE'
  if (s === 'CLIENT_SCOPE' || s === 'CLIENT') return 'CLIENT_SCOPE'
  return 'SERVER_SCOPE'
}

/** Parse respons GET attributes ThingsBoard → nilai datar. */
export function flattenAttributesResponse(data) {
  if (!data || typeof data !== 'object') return {}

  const flat = {}

  const assign = (key, raw) => {
    if (key == null || raw == null) return
    const val =
      raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw
    flat[key] = val
  }

  if (data.server || data.shared || data.client) {
    for (const bucket of [data.server, data.shared, data.client]) {
      if (!bucket || typeof bucket !== 'object') continue
      for (const [key, raw] of Object.entries(bucket)) assign(key, raw)
    }
    return flat
  }

  if (data.SERVER_SCOPE || data.SHARED_SCOPE || data.CLIENT_SCOPE) {
    for (const bucket of [data.SERVER_SCOPE, data.SHARED_SCOPE, data.CLIENT_SCOPE]) {
      if (!bucket || typeof bucket !== 'object') continue
      for (const [key, raw] of Object.entries(bucket)) assign(key, raw)
    }
    return flat
  }

  for (const [key, raw] of Object.entries(data)) assign(key, raw)
  return flat
}
