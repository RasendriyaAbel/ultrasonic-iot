export function createTelemetryClient({ source }) {
  return {
    source,
    async connect() {
      return { ok: true }
    },
    async disconnect() {
      return { ok: true }
    },
    async subscribe() {
      return { ok: true }
    },
  }
}

