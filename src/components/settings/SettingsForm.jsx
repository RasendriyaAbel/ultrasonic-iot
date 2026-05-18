import { useMemo, useState } from 'react'
import { Card, CardBody, CardHeader } from '../ui/Card.jsx'
import { Button } from '../ui/Button.jsx'
import { Input, Label } from '../ui/Input.jsx'
import { useIot } from '../../state/iotContext.js'
import { clamp } from '../../utils/iot.js'

function toNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function SettingsForm() {
  const { state, setSettings } = useIot()
  const initial = state.settings

  const [form, setForm] = useState(() => ({ ...initial }))

  const normalized = useMemo(() => {
    const capacityLiter = clamp(toNumber(form.capacityLiter, 60), 1, 5000)
    const tankHeightCm = clamp(toNumber(form.tankHeightCm, 50), 1, 500)
    const ultrasonicToBottomCm = clamp(toNumber(form.ultrasonicToBottomCm, 50), 1, 500)
    const lowThresholdPercent = clamp(toNumber(form.lowThresholdPercent, 30), 1, 99)
    const criticalThresholdPercent = clamp(toNumber(form.criticalThresholdPercent, 15), 0, lowThresholdPercent)
    const leakDiffThresholdLpm = clamp(toNumber(form.leakDiffThresholdLpm, 0.5), 0.01, 10)
    const leakLossThresholdPercent = clamp(toNumber(form.leakLossThresholdPercent, 15), 1, 100)

    return {
      capacityLiter,
      tankHeightCm,
      ultrasonicToBottomCm,
      lowThresholdPercent,
      criticalThresholdPercent,
      leakDiffThresholdLpm,
      leakLossThresholdPercent,
    }
  }, [form])

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSettings(normalized)
  }

  return (
    <Card>
      <CardHeader title="Pengaturan Sistem" subtitle="Kalibrasi tangki dan ambang deteksi untuk alat asli" />
      <CardBody>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Kapasitas tangki (liter)</Label>
              <Input value={form.capacityLiter} onChange={(e) => update('capacityLiter', e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <Label>Tinggi tangki (cm)</Label>
              <Input value={form.tankHeightCm} onChange={(e) => update('tankHeightCm', e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <Label>Jarak sensor ultrasonik ke dasar (cm)</Label>
              <Input value={form.ultrasonicToBottomCm} onChange={(e) => update('ultrasonicToBottomCm', e.target.value)} inputMode="decimal" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Ambang batas air rendah (%)</Label>
              <Input value={form.lowThresholdPercent} onChange={(e) => update('lowThresholdPercent', e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <Label>Ambang batas air kritis (%)</Label>
              <Input value={form.criticalThresholdPercent} onChange={(e) => update('criticalThresholdPercent', e.target.value)} inputMode="decimal" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Ambang selisih debit (L/min)</Label>
              <Input value={form.leakDiffThresholdLpm} onChange={(e) => update('leakDiffThresholdLpm', e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <Label>Ambang kehilangan (%)</Label>
              <Input value={form.leakLossThresholdPercent} onChange={(e) => update('leakLossThresholdPercent', e.target.value)} inputMode="decimal" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setForm({ ...initial })}>
              Reset
            </Button>
            <Button type="submit">Simpan</Button>
          </div>

          <div className="rounded-xl border border-cyan-400/25 bg-surface-glass p-4 text-xs text-ink-muted">
            Setelah disimpan, nilai tersimpan di browser dan dipakai untuk membaca data alat asli, termasuk
            konversi `distanceCm` ultrasonik menjadi level air, persentase tangki, dan estimasi volume.
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
