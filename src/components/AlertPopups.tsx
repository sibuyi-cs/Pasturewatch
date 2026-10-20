import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHerd } from '../context/HerdContext'
import type { UserSettings } from '../lib/accounts'
import { SEVERITY_RANK, playRingtone, subscribePreview, unlockRingtones } from '../lib/ringtone'
import type { Alert, AlertType, Severity } from '../types'

const SEEN_KEY = 'pasturewatch.notice-seen'

type Popup = {
  id: string
  severity: Severity
  title: string
  message: string
  alertId: string | null
  preview: boolean
}

function seenKey(id: string, severity: Severity) {
  return `${id}|${severity}`
}

function loadSeen() {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

function saveSeen(seen: Set<string>) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
}

function allowed(type: AlertType, settings: UserSettings | undefined) {
  if (!settings) return true
  if (type === 'geofence') return settings.notifyGeofence
  if (type === 'temperature') return settings.notifyHeat
  if (type === 'immobility') return settings.notifyStill
  if (type === 'battery') return settings.notifyBattery
  return true
}

function titleFor(severity: Severity) {
  if (severity === 'critical') return 'Critical'
  if (severity === 'warning') return 'Warning'
  return 'Information'
}

function previewCopy(severity: Severity): Popup {
  const message =
    severity === 'critical'
      ? 'Critical alarm. This is the urgent ringtone.'
      : severity === 'warning'
        ? 'Warning tone. Two notes, less urgent than critical.'
        : 'Information tone. One soft note.'
  return {
    id: `preview-${severity}`,
    severity,
    title: titleFor(severity),
    message,
    alertId: null,
    preview: true,
  }
}

export function AlertPopups({ onOpenAlerts }: { onOpenAlerts: () => void }) {
  const { alerts, acknowledge } = useHerd()
  const { user } = useAuth()
  const [popups, setPopups] = useState<Popup[]>([])

  useEffect(() => {
    const unlock = () => unlockRingtones()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  useEffect(() => {
    const seen = loadSeen()
    const fresh = alerts.filter(
      (alert) => !alert.resolvedAt && !alert.ackedAt && allowed(alert.type, user?.settings) && !seen.has(seenKey(alert.id, alert.severity)),
    )
    if (fresh.length === 0) return
    fresh.forEach((alert) => seen.add(seenKey(alert.id, alert.severity)))
    saveSeen(seen)
    const loudest = [...fresh].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0]
    playRingtone(loudest.severity)
    setPopups((current) => merge(current, fresh.map(toPopup)))
  }, [alerts, user])

  useEffect(() => {
    return subscribePreview((severity) => {
      setPopups((current) => merge(current.filter((popup) => popup.id !== `preview-${severity}`), [previewCopy(severity)]))
    })
  }, [])

  function dismiss(id: string) {
    setPopups((current) => current.filter((popup) => popup.id !== id))
  }

  function ack(popup: Popup) {
    if (popup.alertId) acknowledge(popup.alertId)
    dismiss(popup.id)
  }

  if (popups.length === 0) return null

  return (
    <div className="notice-stack" aria-live="assertive">
      {popups.map((popup) => (
        <Notice
          key={popup.id}
          popup={popup}
          onDismiss={() => dismiss(popup.id)}
          onAck={() => ack(popup)}
          onOpen={onOpenAlerts}
        />
      ))}
    </div>
  )
}

function toPopup(alert: Alert): Popup {
  return {
    id: seenKey(alert.id, alert.severity),
    severity: alert.severity,
    title: titleFor(alert.severity),
    message: alert.message,
    alertId: alert.id,
    preview: false,
  }
}

function merge(current: Popup[], incoming: Popup[]) {
  const ids = new Set(current.map((popup) => popup.id))
  const next = incoming.filter((popup) => !ids.has(popup.id))
  return [...next, ...current].slice(0, 4)
}

function Notice({
  popup,
  onDismiss,
  onAck,
  onOpen,
}: {
  popup: Popup
  onDismiss: () => void
  onAck: () => void
  onOpen: () => void
}) {
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    const timer = window.setTimeout(() => dismissRef.current(), 10000)
    return () => window.clearTimeout(timer)
  }, [popup.id])

  return (
    <article className={`notice ${popup.severity}`} role={popup.severity === 'information' ? 'status' : 'alert'}>
      <span className="stripe" />
      <div className="notice-body">
        <p className="eyebrow">{popup.title}</p>
        <h2>{popup.message}</h2>
        <div className="notice-actions">
          <button type="button" className="ghost" onClick={onDismiss}>Dismiss</button>
          {popup.alertId && (
            <button type="button" className="primary" onClick={onAck}>Acknowledge</button>
          )}
          <button type="button" className="ghost" onClick={onOpen}>Open alerts</button>
        </div>
      </div>
    </article>
  )
}
