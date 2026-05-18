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
  const status =
    pending && feedback?.nextStatus ? feedback.nextStatus : (state.pump.status ?? 'OFF')
  const controlReady = config.configured && !pending

  function showError(message, extra = {}) {
    setFeedback({ tone: 'danger', text: message, ...extra })
  }

  function showInfo(message, extra = {}) {
    setFeedback({ tone: 'info', text: message, ...extra })
  }

  async function handleToggle() {
    const next = status === 'ON' ? 'OFF' : 'ON'
    setPending(true)
    showInfo(`Mengirim perintah ${next}…`, { nextStatus: next })

    try {
      const result = await sendPumpCommand({ status: next })
      setPumpStatus(next)
      showInfo(
        result?.channels?.includes('rpc')
          ? `Pompa ${next} — switch TB + RPC (${config.method}).`
          : `Pompa ${next} — switch ThingsBoard diperbarui (atribut ${config.switchKey}).`,
        { nextStatus: next },
      )
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Gagal mengirim perintah pompa.'
      showError(msg, {
        nextStatus: state.pump.status ?? 'OFF',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Kontrol Pompa"
        subtitle={`Sinkron widget Switch TB • key: ${config.switchKey ?? 'switch'}`}
        right={<Badge tone={toneFromPumpStatus(status)}>{status}</Badge>}
      />
      <CardBody>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-400/25 bg-surface-glass p-4">
          <div>
            <p className="text-xs text-ink-muted">Status kontrol</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink">
              <Power size={18} className={status === 'ON' ? 'text-emerald-300' : 'text-ink-faint'} />
              {status === 'ON' ? 'Pompa Menyala' : 'Pompa Mati'}
            </p>
            {devicePumpStatus && devicePumpStatus !== status ? (
              <p className="mt-2 text-xs text-amber-400/90">
                Telemetry alat: {devicePumpStatus} (konfirmasi fisik/rele)
              </p>
            ) : null}
          </div>

          <Button
            variant={status === 'ON' ? 'danger' : 'primary'}
            onClick={handleToggle}
            disabled={!controlReady}
            className="min-w-[160px]"
          >
            {pending ? 'Mengirim...' : status === 'ON' ? 'Matikan (OFF)' : 'Nyalakan (ON)'}
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
