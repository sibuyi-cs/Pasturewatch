import { centroid } from '../lib/geo'

export const RANCH = {
  name: 'Greenveld Ranch',
  pasture: 'Home pasture',
}

/** Home pasture boundary around the Greenveld grazing block. */
export const FENCE: Array<[number, number]> = [
  [-29.0784, 26.1492],
  [-29.0778, 26.1635],
  [-29.0796, 26.1748],
  [-29.0872, 26.1764],
  [-29.0936, 26.1688],
  [-29.0948, 26.1555],
  [-29.0912, 26.1466],
  [-29.0842, 26.1462],
]

export const CENTROID = centroid(FENCE)

export const THRESHOLDS = {
  heatWarn: 39.2,
  heatCritical: 39.8,
  stillAccel: 0.4,
  stillTicks: 4,
  battery: 15,
  rssi: -126,
}

export const TARGETS = {
  rangeKm: 3,
  responseSec: 30,
  gpsM: 10,
  dashboardSec: 2,
  reliabilityPct: 95,
  geofencePct: 100,
}

/** Daylight model for the LDR trace. Peak is early afternoon. */
export function daylightLux(ts: number) {
  const date = new Date(ts)
  const hour = date.getHours() + date.getMinutes() / 60
  const rise = 6
  const set = 18.5
  if (hour <= rise || hour >= set) return 8
  const x = Math.sin(((hour - rise) / (set - rise)) * Math.PI)
  return 40 + x * 860
}
