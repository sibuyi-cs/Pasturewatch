import { useState } from 'react'
import { useHerd } from '../context/HerdContext'
import { formatAgo, formatDuration } from '../lib/format'
import type { Alert } from '../types'

type Tab = 'open' | 'acked' | 'resolved'

export function Alerts({ onLocate }: { onLocate: (id: string) => void }) {
  const { alerts, animals, now, acknowledge, acknowledgeAll } = useHerd()
  const [tab, setTab] = useState<Tab>('open')
  const waiting = alerts.filter((alert) => !alert.ackedAt && !alert.resolvedAt)
  const acked = alerts.filter((alert) => alert.ackedAt && !alert.resolvedAt)
  const resolved = alerts.filter((alert) => alert.resolvedAt)
  const rows = (tab === 'open' ? waiting : tab === 'acked' ? acked : resolved).sort(
    (a, b) => b.createdAt - a.createdAt,
  )

  return (
    <div className="stack">
      <div className="herd-tools">
        <div className="chips" role="group" aria-label="Alert status">
          <button type="button" className="chip" aria-pressed={tab === 'open'} onClick={() => setTab('open')}>
            Needs ack <span>{waiting.length}</span>
          </button>
          <button type="button" className="chip" aria-pressed={tab === 'acked'} onClick={() => setTab('acked')}>
            Acknowledged <span>{acked.length}</span>
          </button>
          <button type="button" className="chip" aria-pressed={tab === 'resolved'} onClick={() => setTab('resolved')}>
            Resolved <span>{resolved.length}</span>
          </button>
        </div>
        <button type="button" className="primary" onClick={acknowledgeAll} disabled={waiting.length === 0}>
          Acknowledge all
        </button>
      </div>
      {rows.length === 0 && <p className="empty">Nothing in this list.</p>}
      <div className="stack-sm">
        {rows.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            now={now}
            tag={animals.find((animal) => animal.id === alert.animalId)?.tag ?? ''}
            onAck={() => acknowledge(alert.id)}
            onLocate={() => onLocate(alert.animalId)}
          />
        ))}
      </div>
    </div>
  )
}

function AlertCard({
  alert,
  now,
  tag,
  onAck,
  onLocate,
}: {
  alert: Alert
  now: number
  tag: string
  onAck: () => void
  onLocate: () => void
}) {
  return (
    <article className={`alert ${alert.severity}`}>
      <span className="stripe" />
      <div>
        <p className="eyebrow">
          {severityLabel(alert.severity)} · {labelFor(alert.type)}
        </p>
        <h2>{alert.message}</h2>
        <p className="small muted">
          {tag} · raised {formatAgo(alert.createdAt, now)}
          {alert.ackedAt ? ` · answered in ${formatDuration(alert.ackedAt - alert.createdAt)}` : ''}
          {alert.resolvedAt ? ` · cleared ${formatAgo(alert.resolvedAt, now)}` : ''}
        </p>
      </div>
      <div className="alert-actions">
        <button type="button" className="ghost" onClick={onLocate}>
          Locate
        </button>
        {!alert.ackedAt && !alert.resolvedAt && (
          <button type="button" className="primary" onClick={onAck}>
            Acknowledge
          </button>
        )}
      </div>
    </article>
  )
}

function severityLabel(severity: Alert['severity']) {
  if (severity === 'critical') return 'Critical'
  if (severity === 'warning') return 'Warning'
  return 'Information'
}

function labelFor(type: Alert['type']) {
  if (type === 'geofence') return 'Geofence'
  if (type === 'temperature') return 'Temperature'
  if (type === 'immobility') return 'Stillness'
  if (type === 'battery') return 'Battery'
  return 'Signal'
}
