import type { HerdState, Metrics } from '../types'
import type { FeedMode } from './feed'
import { RANCH, TARGETS } from '../data/farm'
import { activityLabel, formatAgo, formatCoord, formatDuration, lightLabel, tempLabel } from './format'
import { estimateRangeKm } from './radio'
import { statusPhrase } from './status'

function list(names: string[]) {
  if (!names.length) return 'none'
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function answerQuestion(question: string, state: HerdState, metrics: Metrics, feedMode: FeedMode = 'demo') {
  const q = question.trim().toLowerCase()
  if (!q) return 'Ask about the herd, the fence, heat, stillness, batteries, or a named animal.'

  const animal = state.animals.find(
    (item) => q.includes(item.name.toLowerCase()) || q.includes(item.tag.toLowerCase()),
  )
  if (animal) return describeAnimal(animal.id, state)

  if (/help|what can you|how do i/.test(q)) {
    return [
      'I can read the current herd feed.',
      'Try: How is the herd?',
      'Who is outside the fence?',
      'Any heat stress?',
      'Which animals are still?',
      'How are the batteries?',
      'How is Naledi?',
    ].join('\n')
  }

  if (/validat|response time|dashboard performance|test plan/.test(q)) return validation(metrics)
  if (/outside|geofence|fence|escaped|paddock/.test(q)) return fenceReport(state)
  if (/heat|temp|fever|hot/.test(q)) return heatReport(state)
  if (/still|immobil|down|not moving|accel/.test(q)) return stillReport(state)
  if (/battery|power/.test(q)) return batteryReport(state)
  if (/signal|rssi|lora|range|coverage|ttn/.test(q)) return signalReport(state, metrics)
  if (/light|ldr|dark|lux/.test(q)) return lightReport(state)
  if (/gps|accur/.test(q)) return gpsReport(metrics)
  if (/alert/.test(q)) return alertReport(state)
  if (/offline|reliab|reporting/.test(q)) return reliabilityReport(state, metrics)
  if (/node-red|supabase|mqtt|hardware|ttgo|sim|system|pipeline/.test(q)) return systemText(feedMode)
  if (/status|herd|overview|how is|how's|summary/.test(q)) return summary(state, metrics)

  return 'I can answer about herd status, geofence breaches, temperature, stillness, batteries, radio range, GPS, and individual animals. Try “Who is outside the fence?”'
}

function describeAnimal(id: string, state: HerdState) {
  const animal = state.animals.find((item) => item.id === id)
  if (!animal) return 'I cannot find that animal.'
  const place =
    animal.motion === 'offline'
      ? `is not reporting. Last known fix is ${animal.outside ? 'outside' : 'inside'} ${RANCH.pasture}.`
      : animal.outside
        ? `is ${Math.round(animal.distanceOutside)} m outside ${RANCH.pasture}.`
        : `is inside ${RANCH.pasture}.`
  const alerts = state.alerts.filter((alert) => alert.animalId === animal.id && !alert.resolvedAt && !alert.ackedAt)
  const lines = [
    `${animal.name} (${animal.tag}, ${animal.sex.toLowerCase()}, ${animal.breed}) ${place}`,
    `Temperature ${animal.temperature.toFixed(1)}°C (${tempLabel(animal.temperature)}). Accelerometer ${animal.accel.toFixed(2)} m/s² (${activityLabel(animal.accel)}). Light ${Math.round(animal.lux)} lux (${lightLabel(animal.lux)}).`,
    `Battery ${Math.round(animal.battery)}%. RSSI ${Math.round(animal.rssi)} dBm. Estimated range ${estimateRangeKm(animal.rssi, animal.sf).toFixed(1)} km. GPS ±${animal.gpsAccuracy.toFixed(1)} m.`,
    `Position ${formatCoord(animal.lat, animal.lng)}. Last uplink ${formatAgo(animal.lastSeen, state.now)}. Status: ${statusPhrase(animal, state.alerts)}.`,
  ]
  if (alerts.length) lines.push(`Open alert: ${alerts.map((alert) => alert.message).join('; ')}`)
  return lines.join('\n')
}

function summary(state: HerdState, metrics: Metrics) {
  return [
    `${RANCH.name} has ${metrics.reporting} of ${metrics.total} collars reporting.`,
    fenceReport(state),
    `Average temperature is ${metrics.avgTemp?.toFixed(1) ?? '—'}°C. Open alerts: ${metrics.openAlerts}.`,
  ].join('\n')
}

function fenceReport(state: HerdState) {
  const outside = state.animals.filter((animal) => animal.motion !== 'offline' && animal.outside)
  if (!outside.length) return `Every reporting animal is inside ${RANCH.pasture}.`
  const detail = outside
    .map((animal) => `${animal.name} (${Math.round(animal.distanceOutside)} m)`)
    .join(', ')
  return `${outside.length === 1 ? 'One animal is' : `${outside.length} animals are`} outside ${RANCH.pasture}: ${detail}.`
}

function heatReport(state: HerdState) {
  const hot = state.animals
    .filter((animal) => animal.motion !== 'offline' && animal.temperature >= 39.2)
    .sort((a, b) => b.temperature - a.temperature)
  if (!hot.length) {
    const avg = state.animals.filter((animal) => animal.motion !== 'offline')
    const value = avg.reduce((sum, animal) => sum + animal.temperature, 0) / avg.length
    return `No heat stress. Herd temperature is averaging ${value.toFixed(1)}°C.`
  }
  return `Heat watch: ${hot.map((animal) => `${animal.name} ${animal.temperature.toFixed(1)}°C`).join(', ')}.`
}

function stillReport(state: HerdState) {
  const still = state.animals.filter(
    (animal) => animal.motion !== 'offline' && (animal.motion === 'still' || animal.accel < 0.4),
  )
  if (!still.length) return 'Every reporting animal is moving.'
  return `Low movement: ${list(still.map((animal) => animal.name))}. Treat a long rest as a possible down animal.`
}

function batteryReport(state: HerdState) {
  const low = state.animals
    .filter((animal) => animal.battery <= 20)
    .sort((a, b) => a.battery - b.battery)
  if (!low.length) return 'Every collar is above 20% battery.'
  return `Low batteries: ${low.map((animal) => `${animal.name} ${Math.round(animal.battery)}%`).join(', ')}.`
}

function signalReport(state: HerdState, metrics: Metrics) {
  const worst = [...state.animals].sort((a, b) => a.rssi - b.rssi)[0]
  return [
    `Average estimated range is ${metrics.rangeAvgKm?.toFixed(1) ?? '—'} km.`,
    `Weakest node is ${worst.name} at ${Math.round(worst.rssi)} dBm, about ${estimateRangeKm(worst.rssi, worst.sf).toFixed(1)} km.`,
    'Range is estimated from RSSI and spreading factor.',
  ].join('\n')
}

function lightReport(state: HerdState) {
  const reporting = state.animals.filter((animal) => animal.motion !== 'offline')
  const avg = reporting.reduce((sum, animal) => sum + animal.lux, 0) / reporting.length
  const dim = reporting.filter((animal) => animal.lux < 180)
  const dimText = dim.length ? ` Dimmer collars: ${list(dim.map((animal) => animal.name))}.` : ''
  return `Average LDR reading is ${Math.round(avg)} lux (${lightLabel(avg)}).${dimText}`
}

function gpsReport(metrics: Metrics) {
  return `Mean GPS error is ±${metrics.gpsAccuracyM?.toFixed(1) ?? '—'} m. The test target is ${TARGETS.gpsM} m or better.`
}

function alertReport(state: HerdState) {
  const open = state.alerts.filter((alert) => !alert.ackedAt && !alert.resolvedAt)
  if (!open.length) return 'There are no open alerts.'
  return ['Open alerts:', ...open.map((alert) => `• ${alert.message}`)].join('\n')
}

function reliabilityReport(state: HerdState, metrics: Metrics) {
  const offline = state.animals.filter((animal) => animal.motion === 'offline')
  const pct = metrics.sensorReliability == null ? '—' : `${(metrics.sensorReliability * 100).toFixed(1)}%`
  const who = offline.length ? ` Not reporting: ${list(offline.map((animal) => animal.name))}.` : ''
  return `Sensor reliability is ${pct}.${who}`
}

function validation(metrics: Metrics) {
  const pct = (value: number | null) => (value == null ? '—' : `${(value * 100).toFixed(1)}%`)
  return [
    `Communication range: ${metrics.rangeAvgKm?.toFixed(1) ?? '—'} km average (target ≥ ${TARGETS.rangeKm} km).`,
    `Alert response: ${metrics.responseSec == null ? '—' : formatDuration(metrics.responseSec * 1000)} mean acknowledgement (target ≤ ${TARGETS.responseSec}s).`,
    `GPS accuracy: ±${metrics.gpsAccuracyM?.toFixed(1) ?? '—'} m (target ≤ ${TARGETS.gpsM} m).`,
    `Dashboard performance: ${metrics.dashboardLagSec?.toFixed(1) ?? '—'} s uplink-to-screen (target ≤ ${TARGETS.dashboardSec}s).`,
    `Sensor reliability: ${pct(metrics.sensorReliability)} (target ≥ ${TARGETS.reliabilityPct}%).`,
    `Geofencing: ${pct(metrics.geofenceScore)} of reporting animals match the fence alert.`,
  ].join('\n')
}

function systemText(feedMode: FeedMode) {
  const source =
    feedMode === 'live'
      ? 'Settings is on the real-time feed. The screen keeps the last fix until a collar uplink arrives.'
      : 'Settings is on the demonstration feed. Switch to real-time feed when the collars are connected.'
  return [
    'Each collar is a TTGO LoRaWAN controller with GPS, a temperature sensor, an accelerometer, and an LDR.',
    'Collars uplink over LoRaWAN to The Things Network. A SIM card module is the gateway backhaul.',
    'MQTT carries uplinks into Node-RED, which stores them in Supabase and feeds this dashboard.',
    source,
  ].join('\n')
}
