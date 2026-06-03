import {
  Activity,
  AlertTriangle,
  Bug,
  Droplets,
  Gauge,
  LineChart,
  Power,
  Ruler,
  Sigma,
  Timer,
} from 'lucide-react'
import { StatCard } from '../components/dashboard/StatCard.jsx'
import { TankVisual } from '../components/dashboard/TankVisual.jsx'
import { PumpControl } from '../components/dashboard/PumpControl.jsx'
import { AlertsPanel } from '../components/dashboard/AlertsPanel.jsx'
import { FlowChart } from '../components/charts/FlowChart.jsx'
import { useIot } from '../state/iotContext.js'
import { formatLiter, formatLpm, formatPercent, formatNumber } from '../utils/format.js'

function tankTone(status) {
  if (status === 'Aman') return 'good'
  if (status === 'Menipis') return 'warn'
  if (status === 'Kritis') return 'danger'
  if (status === 'Sensor Error') return 'danger'
  return 'neutral'
}

function leakTone(status) {
  if (status === 'Normal') return 'good'
  if (status === 'Potensi Bocor') return 'warn'
  if (status === 'Bocor Terdeteksi') return 'danger'
  if (status === 'Sensor Error') return 'danger'
  return 'neutral'
}

function pumpTone(status) {
  return status === 'ON' ? 'good' : 'neutral'
}

export function DashboardPage() {
  const { state } = useIot()
  const t = state.telemetry
  const sensors = t?.sensors

  const estimatedDays =
    t?.consumption?.estimatedDaysRemaining == null
      ? '—'
      : `${formatNumber(t.consumption.estimatedDaysRemaining, { maximumFractionDigits: 1 })} hari`

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Kolom Summary (Grid 2 Kolom) */}
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              title="Volume Air Tersisa"
              value={formatLiter(t?.tank?.currentVolumeLiter, 1)}
              subtitle={`Kapasitas ${formatLiter(t?.tank?.capacityLiter, 0)}`}
              icon={Droplets}
              tone="info"
            />
            <StatCard
              title="Debit Flow In"
              value={formatLpm(t?.flow?.flowInLpm ?? t?.flow?.flow1Lpm, 2)}
              subtitle="Flow 1 • flow_in_lpm"
              icon={Activity}
              tone="info"
            />
            <StatCard
              title="Persentase Tangki"
              value={formatPercent(t?.tank?.percentage, 1)}
              subtitle={
                sensors?.levelAirPercent != null
                  ? `level_air_percent • level ${t?.tank?.waterLevelCm == null ? '—' : `${t.tank.waterLevelCm.toFixed(1)} cm`}`
                  : `Level ${t?.tank?.waterLevelCm == null ? '—' : `${t.tank.waterLevelCm.toFixed(1)} cm`}`
              }
              icon={Gauge}
              tone={tankTone(t?.tank?.status)}
            />
            <StatCard
              title="Debit Flow Out"
              value={formatLpm(t?.flow?.flowOutLpm ?? t?.flow?.flow2Lpm, 2)}
              subtitle="Flow 2 • flow_out_lpm"
              icon={Activity}
              tone="info"
            />
            <StatCard
              title="Status Tangki"
              value={t?.tank?.status ?? '—'}
              subtitle="Aman • Menipis • Kritis"
              icon={Ruler}
              tone={tankTone(t?.tank?.status)}
            />
            <StatCard
              title="Selisih Debit"
              value={formatLpm(t?.flow?.differenceLpm, 2)}
              subtitle={
                t?.flow?.lossPercentage == null
                  ? '—'
                  : `Kehilangan ${formatNumber(t.flow.lossPercentage, { maximumFractionDigits: 1 })}%`
              }
              icon={Sigma}
              tone={
                t?.flow?.differenceLpm != null &&
                t.flow.differenceLpm > state.settings.leakDiffThresholdLpm
                  ? 'warn'
                  : 'neutral'
              }
            />
            <StatCard
              title="Status Kebocoran"
              value={t?.leakage?.status ?? '—'}
              subtitle={t?.leakage?.location ?? 'Monitoring kebocoran'}
              icon={AlertTriangle}
              tone={leakTone(t?.leakage?.status)}
            />
            <StatCard
              title="Total Air Terpakai"
              value={formatLiter(t?.consumption?.totalUsedLiter, 1)}
              subtitle="Akumulasi konsumsi"
              icon={LineChart}
              tone="neutral"
            />
            <StatCard
              title="Estimasi Sisa Hari"
              value={estimatedDays}
              subtitle={
                t?.consumption?.dailyAverageLiter == null
                  ? '—'
                  : `Rata-rata ${formatLiter(t.consumption.dailyAverageLiter, 1)}/hari`
              }
              icon={Timer}
              tone="neutral"
            />
            <StatCard
              title="Status Alat"
              value={sensors?.errorCount > 0 ? 'Bermasalah' : 'Normal'}
              subtitle={`Error: ${sensors?.errorCount ?? 0} • Jarak: ${formatNumber(sensors?.distanceCm, { maximumFractionDigits: 1 })} cm`}
              icon={Bug}
              tone={sensors?.errorCount > 0 ? 'warn' : 'good'}
            />
          </div>
        </div>

        {/* Kolom Kontrol Pompa di Sebelah Kanan Summary */}
        <div className="w-full lg:w-[380px] xl:w-[420px]">
          <PumpControl />
        </div>
      </div>

      {/* Baris Visualisasi & Riwayat */}
      <div className="grid gap-5 xl:grid-cols-2">
        <FlowChart history={state.history} />
        <TankVisual tank={t?.tank} />
      </div>

      <div className="grid gap-5">
        <AlertsPanel alerts={state.alerts} />
      </div>
    </div>
  )
}
