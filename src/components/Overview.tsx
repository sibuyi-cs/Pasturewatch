import { useHerd } from '../context/HerdContext'
import { TARGETS } from '../data/farm'
import { boundsOf, project } from '../lib/geo'
import { FENCE } from '../data/farm'
import { formatAgo, formatDuration } from '../lib/format'
import { statusPhrase, toneFor, TONE_COLOR } from '../lib/status'
import { TrendChart } from './Chart'
import { Pill } from './ui'

export function Overview({
  onOpenMap,
  onOpenAlerts,
}: {
  onOpenMap: (id: string) => void
  onOpenAlerts: () => void
}) {
  const { animals, alerts, history, metrics, now, selectedId } = useHerd()
  const open = alerts.filter((alert) => !alert.resolvedAt).sort((a, b) => b.createdAt - a.createdAt)
  const stray = animals.find((animal) => animal.motion !== 'offline' && animal.outside)

  return (
    <div className="stack">
      {metrics.outside > 0 && stray && (
        <div className="banner">
          <p>
            {metrics.outside === 1 ? '1 animal is' : `${metrics.outside} animals are`} outside Home pasture.
          </p>
          <button type="button" className="ghost" onClick={() => onOpenMap(stray.id)}>
            View on map
          </button>
        </div>
      )}

      <section className="kpi-grid" aria-label="Herd summary">
        <article className="kpi">
          <p className="kpi-label">Reporting</p>
          <p className="kpi-value">
            {metrics.reporting}
            <span>/{metrics.total}</span>
          </p>
          <p className="kpi-hint">TTGO collars heard on the latest uplinks</p>
        </article>
        <article className="kpi">
          <p className="kpi-label">Inside pasture</p>
          <p className="kpi-value">{metrics.inside}</p>
          <p className="kpi-hint">{metrics.outside} outside the Home pasture fence</p>
        </article>
        <article className="kpi">
          <p className="kpi-label">Active alerts</p>
          <p className="kpi-value">{metrics.openAlerts}</p>
          <p className="kpi-hint">{metrics.waitingAcks} still waiting for acknowledgement</p>
        </article>
        <article className="kpi">
          <p className="kpi-label">Herd temperature</p>
          <p className="kpi-value">
            {metrics.avgTemp?.toFixed(1) ?? '—'}
            <span>°C</span>
          </p>
          <p className="kpi-hint">Average of reporting collars</p>
        </article>
      </section>

      <section>
        <header className="section-head">
          <div>
            <p className="eyebrow">Test plan</p>
            <h2>Validation</h2>
          </div>
        </header>
        <div className="metric-grid">
          <Metric
            label="Communication range"
            value={metrics.rangeAvgKm == null ? '—' : `${metrics.rangeAvgKm.toFixed(1)} km`}
            hint={`Worst ${metrics.rangeMinName ?? 'node'} ${metrics.rangeMinKm?.toFixed(1) ?? '—'} km · target ≥ ${TARGETS.rangeKm} km`}
            pass={metrics.rangeAvgKm != null && metrics.rangeAvgKm >= TARGETS.rangeKm}
          />
          <Metric
            label="Alert response time"
            value={metrics.responseSec == null ? '—' : formatDuration(metrics.responseSec * 1000)}
            hint={`Mean time to acknowledge · target ≤ ${TARGETS.responseSec}s`}
            pass={metrics.responseSec != null && metrics.responseSec <= TARGETS.responseSec}
          />
          <Metric
            label="GPS accuracy"
            value={metrics.gpsAccuracyM == null ? '—' : `±${metrics.gpsAccuracyM.toFixed(1)} m`}
            hint={`Mean error radius · target ≤ ${TARGETS.gpsM} m`}
            pass={metrics.gpsAccuracyM != null && metrics.gpsAccuracyM <= TARGETS.gpsM}
          />
          <Metric
            label="Dashboard performance"
            value={metrics.dashboardLagSec == null ? '—' : `${metrics.dashboardLagSec.toFixed(1)} s`}
            hint={`Uplink to screen · target ≤ ${TARGETS.dashboardSec}s`}
            pass={metrics.dashboardLagSec != null && metrics.dashboardLagSec <= TARGETS.dashboardSec}
          />
          <Metric
            label="Sensor reliability"
            value={metrics.sensorReliability == null ? '—' : `${(metrics.sensorReliability * 100).toFixed(1)}%`}
            hint={`${metrics.total - metrics.reporting} node quiet · target ≥ ${TARGETS.reliabilityPct}%`}
            pass={metrics.sensorReliability != null && metrics.sensorReliability * 100 >= TARGETS.reliabilityPct}
          />
          <Metric
            label="Geofencing performance"
            value={metrics.geofenceScore == null ? '—' : `${(metrics.geofenceScore * 100).toFixed(0)}%`}
            hint={`Fence status matches alerts · target ${TARGETS.geofencePct}%`}
            pass={metrics.geofenceScore != null && metrics.geofenceScore * 100 >= TARGETS.geofencePct}
          />
        </div>
      </section>

      <section className="split">
        <article className="panel">
          <header className="panel-head">
            <div>
              <p className="eyebrow">Home pasture</p>
              <h2>Positions</h2>
            </div>
            <button type="button" className="ghost" onClick={() => onOpenMap(stray?.id ?? animals[0].id)}>
              Open map
            </button>
          </header>
          <PastureSketch
            selectedId={selectedId}
            onSelect={onOpenMap}
          />
        </article>
        <article className="panel">
          <header className="panel-head">
            <div>
              <p className="eyebrow">Needs attention</p>
              <h2>Alerts</h2>
            </div>
            <button type="button" className="ghost" onClick={onOpenAlerts}>
              All alerts
            </button>
          </header>
          <div className="panel-body stack-sm">
            {open.length === 0 && <p className="empty">No active alerts.</p>}
            {open.slice(0, 4).map((alert) => {
              const animal = animals.find((item) => item.id === alert.animalId)
              return (
                <button type="button" className="alert-row" key={alert.id} onClick={() => onOpenMap(alert.animalId)}>
                  <span className={`stripe ${alert.severity}`} />
                  <span>
                    <strong>{alert.message}</strong>
                    <small>
                      {animal?.tag} · {formatAgo(alert.createdAt, now)}
                      {alert.ackedAt ? ' · acknowledged' : ''}
                    </small>
                  </span>
                </button>
              )
            })}
          </div>
        </article>
      </section>

      <section>
        <header className="section-head">
          <div>
            <p className="eyebrow">Recent uplinks</p>
            <h2>Herd trends</h2>
          </div>
        </header>
        <div className="chart-grid">
          <article className="panel chart-card">
            <header className="chart-head">
              <p className="eyebrow">Temperature</p>
              <strong>{metrics.avgTemp?.toFixed(1) ?? '—'} °C</strong>
            </header>
            <TrendChart
              label="Herd temperature"
              color="#b6402c"
              points={history.map((point) => ({ t: point.t, v: point.temp }))}
              formatY={(value) => value.toFixed(1)}
            />
          </article>
          <article className="panel chart-card">
            <header className="chart-head">
              <p className="eyebrow">Accelerometer</p>
              <strong>{metrics.avgAccel?.toFixed(2) ?? '—'} m/s²</strong>
            </header>
            <TrendChart
              label="Herd movement"
              color="#1f7a4d"
              points={history.map((point) => ({ t: point.t, v: point.accel }))}
              formatY={(value) => value.toFixed(1)}
            />
          </article>
          <article className="panel chart-card">
            <header className="chart-head">
              <p className="eyebrow">LDR light</p>
              <strong>{metrics.avgLux == null ? '—' : Math.round(metrics.avgLux)} lux</strong>
            </header>
            <TrendChart
              label="Herd light"
              color="#a16207"
              points={history.map((point) => ({ t: point.t, v: point.lux }))}
              formatY={(value) => Math.round(value).toString()}
            />
          </article>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, hint, pass }: { label: string; value: string; hint: string; pass: boolean }) {
  return (
    <article className={pass ? 'metric pass' : 'metric watch'}>
      <div className="metric-top">
        <p className="kpi-label">{label}</p>
        <Pill tone={pass ? 'ok' : 'warn'}>{pass ? 'On target' : 'Below target'}</Pill>
      </div>
      <p className="metric-value">{value}</p>
      <p className="kpi-hint">{hint}</p>
    </article>
  )
}

function PastureSketch({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { animals, alerts } = useHerd()
  const bounds = boundsOf([...FENCE, ...animals.map((animal) => [animal.lat, animal.lng] as [number, number])], 0.12)
  const fence = FENCE.map(([lat, lng]) => {
    const point = project(lat, lng, bounds)
    return `${point.x},${point.y}`
  }).join(' ')

  return (
    <svg className="schematic" viewBox="0 0 100 100" role="img" aria-label="Schematic of animals inside Home pasture">
      <polygon points={fence} className="schematic-fence" />
      {animals.map((animal) => {
        const point = project(animal.lat, animal.lng, bounds)
        const tone = toneFor(animal, alerts)
        const selected = animal.id === selectedId
        return (
          <g
            key={animal.id}
            role="button"
            tabIndex={0}
            aria-label={`${animal.name}, ${statusPhrase(animal, alerts)}`}
            onClick={() => onSelect(animal.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(animal.id)
              }
            }}
          >
            <circle cx={point.x} cy={point.y} r="4.2" fill="transparent" />
            <circle
              cx={point.x}
              cy={point.y}
              r={selected ? 2.5 : 1.8}
              fill={TONE_COLOR[tone]}
              stroke="#fff"
              strokeWidth="0.45"
            />
            <title>{`${animal.name} · ${statusPhrase(animal, alerts)}`}</title>
          </g>
        )
      })}
    </svg>
  )
}
