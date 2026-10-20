import type { Alert, Animal, HerdState, Motion, Sex } from '../types'
import { FENCE, daylightLux } from './farm'
import { distanceOutsideMeters, pointInPolygon, pullInside } from '../lib/geo'
import { reconcile } from './telemetry'

type RosterItem = {
  id: string
  name: string
  sex: Sex
  breed: string
  age: number
  motion: Motion
  tempTarget: number
  accelTarget: number
  shade: number
  battery: number
  batteryFloor: number
  rssiBase: number
  snrBase: number
  sf: number
  gps: number
}

const ROSTER: RosterItem[] = [
  { id: 'amara', name: 'Amara', sex: 'Cow', breed: 'Nguni', age: 6, motion: 'stray', tempTarget: 38.5, accelTarget: 1.7, shade: 0.9, battery: 74, batteryFloor: 40, rssiBase: -97, snrBase: 8, sf: 9, gps: 4.2 },
  { id: 'bheka', name: 'Bheka', sex: 'Bull', breed: 'Bonsmara', age: 4, motion: 'graze', tempTarget: 38.3, accelTarget: 1.4, shade: 1, battery: 88, batteryFloor: 40, rssiBase: -91, snrBase: 10, sf: 8, gps: 3.4 },
  { id: 'naledi', name: 'Naledi', sex: 'Cow', breed: 'Angus', age: 7, motion: 'graze', tempTarget: 40.4, accelTarget: 0.95, shade: 0.95, battery: 63, batteryFloor: 35, rssiBase: -99, snrBase: 7.5, sf: 9, gps: 5.1 },
  { id: 'thabo', name: 'Thabo', sex: 'Steer', breed: 'Bonsmara', age: 2, motion: 'graze', tempTarget: 38.6, accelTarget: 2.1, shade: 0.82, battery: 81, batteryFloor: 40, rssiBase: -94, snrBase: 9, sf: 9, gps: 3.8 },
  { id: 'zola', name: 'Zola', sex: 'Cow', breed: 'Nguni', age: 5, motion: 'graze', tempTarget: 38.2, accelTarget: 1.15, shade: 0.7, battery: 14, batteryFloor: 12, rssiBase: -102, snrBase: 6, sf: 10, gps: 6.4 },
  { id: 'kwezi', name: 'Kwezi', sex: 'Heifer', breed: 'Nguni', age: 1, motion: 'offline', tempTarget: 38.4, accelTarget: 0.2, shade: 0.62, battery: 51, batteryFloor: 20, rssiBase: -108, snrBase: 4, sf: 10, gps: 7.2 },
  { id: 'lerato', name: 'Lerato', sex: 'Cow', breed: 'Brahman', age: 8, motion: 'graze', tempTarget: 38.1, accelTarget: 1.05, shade: 0.55, battery: 69, batteryFloor: 35, rssiBase: -96, snrBase: 8, sf: 9, gps: 4.6 },
  { id: 'sipho', name: 'Sipho', sex: 'Bull', breed: 'Nguni', age: 5, motion: 'graze', tempTarget: 38.7, accelTarget: 1.85, shade: 0.92, battery: 77, batteryFloor: 40, rssiBase: -89, snrBase: 11, sf: 7, gps: 3.1 },
  { id: 'amahle', name: 'Amahle', sex: 'Heifer', breed: 'Angus', age: 2, motion: 'graze', tempTarget: 38.4, accelTarget: 1.55, shade: 1, battery: 92, batteryFloor: 45, rssiBase: -93, snrBase: 9.5, sf: 8, gps: 3.6 },
  { id: 'jabu', name: 'Jabu', sex: 'Steer', breed: 'Bonsmara', age: 3, motion: 'graze', tempTarget: 38.5, accelTarget: 2.0, shade: 0.76, battery: 58, batteryFloor: 30, rssiBase: -101, snrBase: 6.5, sf: 9, gps: 5.5 },
  { id: 'nomsa', name: 'Nomsa', sex: 'Cow', breed: 'Nguni', age: 9, motion: 'still', tempTarget: 38.0, accelTarget: 0.12, shade: 0.48, battery: 66, batteryFloor: 30, rssiBase: -98, snrBase: 7, sf: 9, gps: 4.8 },
  { id: 'themba', name: 'Themba', sex: 'Steer', breed: 'Brahman', age: 3, motion: 'graze', tempTarget: 38.6, accelTarget: 1.45, shade: 0.86, battery: 84, batteryFloor: 40, rssiBase: -95, snrBase: 8.5, sf: 9, gps: 4.0 },
  { id: 'ayanda', name: 'Ayanda', sex: 'Cow', breed: 'Angus', age: 4, motion: 'graze', tempTarget: 38.3, accelTarget: 1.25, shade: 0.64, battery: 71, batteryFloor: 35, rssiBase: -100, snrBase: 7, sf: 9, gps: 5.0 },
  { id: 'sibusiso', name: 'Sibusiso', sex: 'Bull', breed: 'Bonsmara', age: 6, motion: 'graze', tempTarget: 38.8, accelTarget: 1.9, shade: 0.94, battery: 61, batteryFloor: 30, rssiBase: -105, snrBase: 5.5, sf: 10, gps: 6.1 },
  { id: 'palesa', name: 'Palesa', sex: 'Heifer', breed: 'Nguni', age: 2, motion: 'graze', tempTarget: 38.2, accelTarget: 1.65, shade: 0.8, battery: 86, batteryFloor: 40, rssiBase: -92, snrBase: 10, sf: 8, gps: 3.3 },
  { id: 'karabo', name: 'Karabo', sex: 'Cow', breed: 'Brahman', age: 5, motion: 'graze', tempTarget: 38.4, accelTarget: 1.0, shade: 0.58, battery: 47, batteryFloor: 25, rssiBase: -122, snrBase: 1.6, sf: 9, gps: 8.1 },
]

function mulberry32(seed: number) {
  let value = seed
  return () => {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function devEui(index: number) {
  return `70B3D57ED0${(0x100000 + index).toString(16).toUpperCase()}`.slice(0, 16)
}

function seriesFor(animal: Animal, now: number, rand: () => number) {
  const points = []
  for (let i = 47; i >= 1; i--) {
    const t = now - i * 2000
    points.push({
      t,
      temp: animal.tempTarget + Math.sin(i / 5) * 0.12 + (rand() - 0.5) * 0.06,
      accel: Math.max(0, animal.accelTarget + Math.sin(i / 4) * (animal.motion === 'still' ? 0.03 : 0.18) + (rand() - 0.5) * 0.05),
      lux: Math.max(0, daylightLux(t) * animal.shade * (0.92 + rand() * 0.12)),
    })
  }
  points.push({ t: now, temp: animal.temperature, accel: animal.accel, lux: animal.lux })
  return points
}

function historicalAlerts(now: number): Alert[] {
  return [
    {
      id: 'hist-thabo',
      animalId: 'thabo',
      type: 'geofence',
      severity: 'critical',
      message: 'Thabo crossed the north line and came back',
      createdAt: now - 2 * 60 * 60 * 1000,
      ackedAt: now - 2 * 60 * 60 * 1000 + 14000,
      resolvedAt: now - 110 * 60 * 1000,
    },
    {
      id: 'hist-lerato',
      animalId: 'lerato',
      type: 'temperature',
      severity: 'warning',
      message: 'Lerato temperature rose to 39.3°C and settled',
      createdAt: now - 5 * 60 * 60 * 1000,
      ackedAt: now - 5 * 60 * 60 * 1000 + 22000,
      resolvedAt: now - 4 * 60 * 60 * 1000,
    },
    {
      id: 'hist-jabu',
      animalId: 'jabu',
      type: 'immobility',
      severity: 'critical',
      message: 'Jabu was still, then started grazing again',
      createdAt: now - 26 * 60 * 60 * 1000,
      ackedAt: now - 26 * 60 * 60 * 1000 + 18000,
      resolvedAt: now - 25 * 60 * 60 * 1000,
    },
  ]
}

export function createInitialState(): HerdState {
  const now = Date.now()
  const rand = mulberry32(0x5eed)
  const strayAnchor = { lat: -29.0746, lng: 26.1622 }
  const animals: Animal[] = ROSTER.map((item, index) => {
    let lat = -29.09 + rand() * 0.009
    let lng = 26.151 + rand() * 0.018
    if (item.motion === 'stray') {
      lat = -29.0751
      lng = 26.1614
    } else if (item.motion === 'offline') {
      lat = -29.0862
      lng = 26.1584
    } else {
      const pulled = pullInside(lat, lng, FENCE)
      lat = pulled.lat
      lng = pulled.lng
    }
    const outside = !pointInPolygon(lat, lng, FENCE)
    const animal: Animal = {
      id: item.id,
      name: item.name,
      tag: `GV-${101 + index}`,
      sex: item.sex,
      breed: item.breed,
      age: item.age,
      motion: item.motion,
      devEui: devEui(index + 1),
      lat,
      lng,
      heading: rand() * Math.PI * 2,
      anchor: item.motion === 'stray' ? strayAnchor : null,
      temperature: item.tempTarget,
      tempTarget: item.tempTarget,
      accel: item.accelTarget,
      accelTarget: item.accelTarget,
      lux: daylightLux(now) * item.shade,
      shade: item.shade,
      battery: item.battery,
      batteryFloor: item.batteryFloor,
      rssi: item.rssiBase,
      rssiBase: item.rssiBase,
      snr: item.snrBase,
      snrBase: item.snrBase,
      sf: item.sf,
      gpsAccuracy: item.gps,
      lastSeen: item.motion === 'offline' ? now - 6 * 60 * 1000 : now - 800,
      outside,
      distanceOutside: outside ? distanceOutsideMeters(lat, lng, FENCE) : 0,
      lowActivityTicks: item.motion === 'still' ? 8 : 0,
      trail: [[lat, lng]],
    }
    return animal
  })

  const series: HerdState['series'] = {}
  for (const animal of animals) series[animal.id] = seriesFor(animal, now, rand)

  const reporting = animals.filter((animal) => animal.motion !== 'offline')
  const history = series.amara.map((_, index) => ({
    t: series.amara[index].t,
    temp: reporting.reduce((sum, animal) => sum + series[animal.id][index].temp, 0) / reporting.length,
    accel: reporting.reduce((sum, animal) => sum + series[animal.id][index].accel, 0) / reporting.length,
    lux: reporting.reduce((sum, animal) => sum + series[animal.id][index].lux, 0) / reporting.length,
  }))

  const reconciled = reconcile(historicalAlerts(now), animals, now)
  let stagger = 0
  const alerts = reconciled.map((alert) => {
    if (alert.createdAt !== now || alert.ackedAt) return alert
    const createdAt = now - (14000 + stagger * 4000)
    stagger += 1
    return { ...alert, createdAt }
  })

  return {
    animals,
    alerts,
    history,
    series,
    now,
    selectedId: null,
    feedLagMs: 780,
  }
}
