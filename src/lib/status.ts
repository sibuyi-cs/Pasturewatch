import type { Alert, Animal, Tone } from '../types'

export const TONE_COLOR: Record<Tone, string> = {
  ok: '#1f7a4d',
  warn: '#a16207',
  bad: '#b6402c',
  off: '#6b6560',
}

export function openAlertsFor(animalId: string, alerts: Alert[]) {
  return alerts.filter((alert) => alert.animalId === animalId && !alert.resolvedAt)
}

export function toneFor(animal: Animal, alerts: Alert[]): Tone {
  if (animal.motion === 'offline') return 'off'
  const open = openAlertsFor(animal.id, alerts)
  if (open.some((alert) => alert.severity === 'critical')) return 'bad'
  if (open.length > 0 || animal.outside) return 'warn'
  return 'ok'
}

export function statusPhrase(animal: Animal, alerts: Alert[]) {
  if (animal.motion === 'offline') return 'Offline'
  const open = openAlertsFor(animal.id, alerts)
  if (open.some((alert) => alert.type === 'geofence')) return 'Outside'
  if (open.some((alert) => alert.type === 'temperature')) return 'Heat'
  if (open.some((alert) => alert.type === 'immobility')) return 'Still'
  if (open.some((alert) => alert.type === 'battery')) return 'Battery'
  if (open.some((alert) => alert.type === 'signal')) return 'Weak signal'
  return 'Inside'
}

const RANK: Record<Tone, number> = { bad: 0, warn: 1, off: 2, ok: 3 }

export function compareAnimals(a: Animal, b: Animal, alerts: Alert[]) {
  const byTone = RANK[toneFor(a, alerts)] - RANK[toneFor(b, alerts)]
  if (byTone !== 0) return byTone
  return a.tag.localeCompare(b.tag)
}
