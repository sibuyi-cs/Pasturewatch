import type { Animal, Packet } from '../types'
import { CENTROID, FENCE, THRESHOLDS, daylightLux } from './farm'
import { clamp } from '../lib/format'
import { haversine, offset, pointInPolygon, pullInside } from '../lib/geo'

function jitter(amount: number) {
  return (Math.random() - 0.5) * 2 * amount
}

function approach(current: number, target: number, amount: number) {
  return current + (target - current) * amount
}

function moveGraze(animal: Animal) {
  let heading = animal.heading + jitter(0.45)
  const meters = 1.5 + animal.accel * 2.4
  const next = offset(animal.lat, animal.lng, heading, meters)
  if (pointInPolygon(next.lat, next.lng, FENCE)) {
    return { ...next, heading }
  }
  const back = pullInside(animal.lat, animal.lng, FENCE)
  return {
    ...back,
    heading: Math.atan2(CENTROID.lng - animal.lng, CENTROID.lat - animal.lat),
  }
}

function pushOutside(lat: number, lng: number) {
  let nextLat = lat
  let guard = 0
  while (pointInPolygon(nextLat, lng, FENCE) && guard < 30) {
    nextLat += 0.00045
    guard += 1
  }
  return { lat: nextLat, lng }
}

function moveStray(animal: Animal) {
  const anchor = animal.anchor ?? { lat: animal.lat, lng: animal.lng }
  const dist = haversine(animal.lat, animal.lng, anchor.lat, anchor.lng)
  const toAnchor = Math.atan2(anchor.lng - animal.lng, anchor.lat - animal.lat)
  let heading = toAnchor + Math.PI / 2
  if (dist > 110) heading = toAnchor
  else if (dist < 45) heading = toAnchor + Math.PI
  heading += jitter(0.18)
  const next = offset(animal.lat, animal.lng, heading, 6)
  const fixed = pointInPolygon(next.lat, next.lng, FENCE)
    ? pushOutside(animal.lat + 0.0006, animal.lng)
    : next
  return { ...fixed, heading }
}

export function nextPacket(animal: Animal, now: number): Packet {
  let lat = animal.lat
  let lng = animal.lng
  let heading = animal.heading
  if (animal.motion === 'graze') {
    const moved = moveGraze(animal)
    lat = moved.lat
    lng = moved.lng
    heading = moved.heading
  } else if (animal.motion === 'stray') {
    const moved = moveStray(animal)
    lat = moved.lat
    lng = moved.lng
    heading = moved.heading
  }

  const temperature = clamp(approach(animal.temperature, animal.tempTarget, 0.35) + jitter(0.04), 36, 42)
  const accel = clamp(
    approach(animal.accel, animal.accelTarget, 0.45) + jitter(animal.motion === 'still' ? 0.02 : 0.1),
    0,
    8,
  )
  const lux = clamp(daylightLux(now) * animal.shade * (1 + jitter(0.06)), 0, 2000)
  const draining = animal.battery > animal.batteryFloor + 0.2
  const battery = clamp(animal.battery - (draining ? 0.01 : 0) + (animal.battery <= THRESHOLDS.battery ? jitter(0.04) : 0), 1, 100)
  const rssi = clamp(animal.rssi + jitter(0.8), animal.rssiBase - 3, animal.rssiBase + 3)
  const snr = clamp(animal.snr + jitter(0.25), -2, 14)
  const gpsAccuracy = clamp(animal.gpsAccuracy + jitter(0.25), 2.2, 9.5)

  return {
    heading,
    uplink: {
      devEui: animal.devEui,
      receivedAt: now - Math.round(450 + Math.random() * 700),
      lat,
      lng,
      gpsAccuracy,
      temperature,
      accel,
      lux,
      battery,
      rssi,
      snr,
      sf: animal.sf,
    },
  }
}
