import { useMemo, useState } from 'react'
import { Power } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card.jsx'
import { Badge } from '../ui/Badge.jsx'
import { Button } from '../ui/Button.jsx'
import { useIot } from '../../state/iotContext.js'
import { pumpControlConfig, sendPumpCommand } from '../../services/pumpCommand.js'

function toneFromPumpStatus(status) {
  return status === 'ON' ? 'good' : 'neutral'
}

export function PumpControl() {
  const { state, setPumpStatus } = useIot()
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const config = useMemo(() => pumpControlConfig(), [])
  const devicePumpStatus = state.telemetry?.pump?.deviceStatus
  const currentStatus = state.pump.status ?? 'OFF'
  const displayStatus = pending && feedback?.nextStatus ? feedback.nextStatus : currentStatus
  const controlReady = config.configured && !pending

  function showError(message, extra = {}) {
    setFeedback({ tone: 'danger', text: message, ...extra })
  }

  function showInfo(message, extra = {}) {
    setFeedback({ tone: 'info', text: message, ...extra })
  }

  async function handleToggle() {
    const next = currentStatus === 'ON' ? 'OFF' : 'ON'
    setPending(true)
    showInfo(`Mengirim perintah ${next}…`, { nextStatus: next })

    try {
      const result = await sendPumpCommand({ status: next })
      setPumpStatus(next)

      if (result.rpcPending) {
        showInfo(
          result.ok
            ? `Atribut cloud diperbarui. Menunggu alat merespons RPC...`
            : `Mengirim RPC... (Atribut dilewati: ${result.error || 'tidak ada izin'})`,
          { nextStatus: next },
        )
      } else if (result.rpcError || result.rpcSkipped) {
        showInfo(
          result.ok
            ? `Perintah terkirim ke cloud, tapi RPC gagal (alat offline?).`
            : `RPC Gagal: ${result.rpcError || 'Alat tidak merespons'}.`,
          { nextStatus: next },
        )
      } else {
        showInfo(
          result?.channels?.includes('rpc')
            ? `Perintah ${next} sukses (RPC + Atribut).`
            : `Atribut ${config.switchKey} diperbarui ke ${next}.`,
          { nextStatus: next },
        )
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Gagal mengirim perintah.'
      showError(msg, { nextStatus: currentStatus })
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Kontrol Pompa"
        subtitle={`Sinkron widget Switch TB • key: ${config.switchKey ?? 'switch'}`}
        right={<Badge tone={toneFromPumpStatus(displayStatus)}>{displayStatus}</Badge>}
      />
      <CardBody>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-400/25 bg-surface-glass p-4">
          <div>
            <p className="text-xs text-ink-muted">Status kontrol</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink">
              <Power
                size={18}
                className={displayStatus === 'ON' ? 'text-emerald-300' : 'text-ink-faint'}
              />
              {displayStatus === 'ON' ? 'Pompa Menyala' : 'Pompa Mati'}
            </p>
            {devicePumpStatus && devicePumpStatus !== displayStatus ? (
              <p className="mt-2 text-xs text-amber-400/90 italic">
                Telemetry alat: {devicePumpStatus} (sedang sinkronisasi...)
              </p>
            ) : null}
          </div>

          <Button
            variant={currentStatus === 'ON' ? 'danger' : 'primary'}
            onClick={handleToggle}
            disabled={!controlReady}
            className="min-w-[160px]"
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Mengirim...
              </span>
            ) : currentStatus === 'ON' ? (
              'Matikan (OFF)'
            ) : (
              'Nyalakan (ON)'
            )}
          </Button>
        </div>

        <p className="mt-3 text-xs text-ink-faint">
          {!config.configured
            ? 'Lengkapi env RPC ThingsBoard agar tombol dapat mengontrol alat.'
            : 'Tombol ON dan OFF selalu aktif. Tidak ada mode AUTO di dashboard.'}
        </p>

        {feedback ? (
          <div className="mt-4 rounded-xl border border-cyan-400/25 bg-surface-glass p-3 text-xs text-ink-muted">
            <div className="flex items-center gap-2">
              <Badge tone={feedback.tone}>{feedback.tone === 'danger' ? 'Error' : 'Info'}</Badge>
              <span>{feedback.text}</span>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}
