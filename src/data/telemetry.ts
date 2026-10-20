import type { Alert, Animal, HerdState } from '../types'
import { FENCE, THRESHOLDS } from './farm'
import { distanceOutsideMeters, pointInPolygon } from '../lib/geo'
import { mean } from '../lib/format'
import { estimateRangeKm } from '../lib/radio'
import type { Metrics, Packet } from '../types'

type Condition = Pick<Alert, 'type' | 'severity' | 'message'>

function evaluate(animal: Animal): Condition[] {
  if (animal.motion === 'offline') return []
  const conditions: Condition[] = []
  if (animal.outside) {
    conditions.push({
      type: 'geofence',
      severity: 'critical',
      message: `${animal.name} is ${Math.round(animal.distanceOutside)} m outside Home pasture`,
    })
  }
  if (animal.temperature >= THRESHOLDS.heatCritical) {
    conditions.push({
      type: 'temperature',
      severity: 'critical',
      message: `${animal.name} temperature is ${animal.temperature.toFixed(1)}°C, heat stress`,
    })
  } else if (animal.temperature >= THRESHOLDS.heatWarn) {
    conditions.push({
      type: 'temperature',
      severity: 'warning',
      message: `${animal.name} temperature is ${animal.temperature.toFixed(1)}°C`,
    })
  }
  if (animal.lowActivityTicks >= THRESHOLDS.stillTicks) {
    conditions.push({
      type: 'immobility',
      severity: 'critical',
      message: `${animal.name} has barely moved. Check for a down animal`,
    })
  }
  if (animal.battery <= THRESHOLDS.battery) {
    conditions.push({
      type: 'battery',
      severity: 'warning',
      message: `${animal.name} collar battery is ${Math.round(animal.battery)}%`,
    })
  }
  if (animal.rssi <= THRESHOLDS.rssi) {
    conditions.push({
      type: 'signal',
      severity: 'information',
      message: `${animal.name} LoRa signal is weak at ${Math.round(animal.rssi)} dBm`,
    })
  }
  return conditions
}

export function reconcile(alerts: Alert[], animals: Animal[], now: number) {
  const next = alerts.map((alert) => ({ ...alert }))
  for (const animal of animals) {
    const conditions = evaluate(animal)
    for (const condition of conditions) {
      const existing = next.find(
        (alert) => alert.animalId === animal.id && alert.type === condition.type && !alert.resolvedAt,
      )
      if (existing) {
        existing.severity = condition.severity
        existing.message = condition.message
      } else {
        next.unshift({
          id: `${animal.id}-${condition.type}-${now}`,
          animalId: animal.id,
          type: condition.type,
          severity: condition.severity,
          message: condition.message,
          createdAt: now,
          ackedAt: null,
          resolvedAt: null,
        })
      }
    }
    for (const alert of next) {
      if (alert.animalId !== animal.id || alert.resolvedAt) continue
      if (!conditions.some((condition) => condition.type === alert.type)) {
        alert.resolvedAt = now
      }
    }
  }
  return next.slice(0, 80)
}

export function applyPackets(state: HerdState, packets: Packet[], now: number): HerdState {
  const byEui = new Map(packets.map((packet) => [packet.uplink.devEui, packet]))
  const animals = state.animals.map((animal) => {
    const packet = byEui.get(animal.devEui)
    if (!packet) return animal
    const { uplink } = packet
    const outside = !pointInPolygon(uplink.lat, uplink.lng, FENCE)
    const still = uplink.accel < THRESHOLDS.stillAccel
    return {
      ...animal,
      lat: uplink.lat,
      lng: uplink.lng,
      heading: packet.heading ?? animal.heading,
      temperature: uplink.temperature,
      accel: uplink.accel,
      lux: uplink.lux,
      battery: uplink.battery,
      rssi: uplink.rssi,
      snr: uplink.snr,
      sf: uplink.sf,
      gpsAccuracy: uplink.gpsAccuracy,
      lastSeen: uplink.receivedAt,
      outside,
      distanceOutside: outside ? distanceOutsideMeters(uplink.lat, uplink.lng, FENCE) : 0,
      lowActivityTicks: still ? animal.lowActivityTicks + 1 : 0,
      trail: [...animal.trail, [uplink.lat, uplink.lng] as [number, number]].slice(-24),
    }
  })

  const alerts = reconcile(state.alerts, animals, now)
  const series = { ...state.series }
  for (const animal of animals) {
    const packet = byEui.get(animal.devEui)
    if (!packet) continue
    const prev = series[animal.id] ?? []
    series[animal.id] = [
      ...prev,
      {
        t: packet.uplink.receivedAt,
        temp: packet.uplink.temperature,
        accel: packet.uplink.accel,
        lux: packet.uplink.lux,
      },
    ].slice(-48)
  }

  const reporting = animals.filter((animal) => animal.motion !== 'offline')
  const history = [
    ...state.history,
    {
      t: now,
      temp: mean(reporting.map((animal) => animal.temperature)) ?? 0,
      accel: mean(reporting.map((animal) => animal.accel)) ?? 0,
      lux: mean(reporting.map((animal) => animal.lux)) ?? 0,
    },
  ].slice(-48)

  const feedLagMs = packets.length
    ? mean(packets.map((packet) => Math.max(0, now - packet.uplink.receivedAt))) ?? state.feedLagMs
    : state.feedLagMs

  return { ...state, animals, alerts, series, history, now, feedLagMs }
}

/**
 * Adapter for a real TTGO uplink once Node-RED forwards MQTT from The Things Network.
 * The demo feed calls the same path.
 */
export function ingestUplink(state: HerdState, uplink: Packet['uplink'], now = Date.now()) {
  return applyPackets(state, [{ uplink }], now)
}

export function deriveMetrics(state: HerdState): Metrics {
  const { animals, alerts, now } = state
  const reporting = animals.filter((animal) => animal.motion !== 'offline')
  const ranges = reporting.map((animal) => ({
    name: animal.name,
    km: estimateRangeKm(animal.rssi, animal.sf),
  }))
  const weakest = ranges.reduce<{ name: string; km: number } | null>((best, item) => {
    if (!best || item.km < best.km) return item
    return best
  }, null)
  const acked = alerts.filter((alert) => alert.ackedAt != null)
  const response = mean(acked.map((alert) => ((alert.ackedAt ?? alert.createdAt) - alert.createdAt) / 1000))

  const reliable = animals.filter((animal) => {
    if (animal.motion === 'offline') return false
    if (now - animal.lastSeen > 15000) return false
    if (animal.temperature < 34 || animal.temperature > 43) return false
    if (animal.accel < 0 || animal.accel > 12) return false
    if (animal.lux < 0 || animal.lux > 5000) return false
    if (animal.gpsAccuracy > 20) return false
    return true
  }).length

  const judged = reporting.filter((animal) => {
    const flagged = alerts.some(
      (alert) => alert.animalId === animal.id && alert.type === 'geofence' && !alert.resolvedAt,
    )
    return flagged === animal.outside
  }).length

  return {
    reporting: reporting.length,
    total: animals.length,
    inside: reporting.filter((animal) => !animal.outside).length,
    outside: reporting.filter((animal) => animal.outside).length,
    openAlerts: alerts.filter((alert) => !alert.resolvedAt).length,
    waitingAcks: alerts.filter((alert) => !alert.ackedAt && !alert.resolvedAt).length,
    avgTemp: mean(reporting.map((animal) => animal.temperature)),
    avgAccel: mean(reporting.map((animal) => animal.accel)),
    avgLux: mean(reporting.map((animal) => animal.lux)),
    rangeAvgKm: mean(ranges.map((item) => item.km)),
    rangeMinKm: weakest?.km ?? null,
    rangeMinName: weakest?.name ?? null,
    responseSec: response,
    gpsAccuracyM: mean(reporting.map((animal) => animal.gpsAccuracy)),
    dashboardLagSec: state.feedLagMs / 1000,
    sensorReliability: animals.length ? reliable / animals.length : null,
    geofenceScore: reporting.length ? judged / reporting.length : null,
  }
}
