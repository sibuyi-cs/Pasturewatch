export type Bounds = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export function pointInPolygon(lat: number, lng: number, poly: Array<[number, number]>) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const latI = poly[i][0]
    const lngI = poly[i][1]
    const latJ = poly[j][0]
    const lngJ = poly[j][1]
    const crosses = latI > lat !== latJ > lat
    if (!crosses) continue
    const x = ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI
    if (lng < x) inside = !inside
  }
  return inside
}

export function centroid(poly: Array<[number, number]>) {
  let lat = 0
  let lng = 0
  for (const point of poly) {
    lat += point[0]
    lng += point[1]
  }
  return { lat: lat / poly.length, lng: lng / poly.length }
}

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371000
  const p1 = (lat1 * Math.PI) / 180
  const p2 = (lat2 * Math.PI) / 180
  const dp = ((lat2 - lat1) * Math.PI) / 180
  const dl = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(a)))
}

function toLocal(lat: number, lng: number, lat0: number, lng0: number) {
  return {
    x: ((lng - lng0) * 111320 * Math.cos((lat0 * Math.PI) / 180)),
    y: (lat - lat0) * 110540,
  }
}

function distancePointToSegment(lat: number, lng: number, a: [number, number], b: [number, number]) {
  const A = toLocal(a[0], a[1], lat, lng)
  const B = toLocal(b[0], b[1], lat, lng)
  const abx = B.x - A.x
  const aby = B.y - A.y
  const lengthSq = abx * abx + aby * aby
  const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, (-A.x * abx + -A.y * aby) / lengthSq))
  return Math.hypot(A.x + abx * t, A.y + aby * t)
}

export function distanceOutsideMeters(lat: number, lng: number, poly: Array<[number, number]>) {
  if (pointInPolygon(lat, lng, poly)) return 0
  let nearest = Infinity
  for (let i = 0; i < poly.length; i++) {
    const start = poly[i]
    const end = poly[(i + 1) % poly.length]
    nearest = Math.min(nearest, distancePointToSegment(lat, lng, start, end))
  }
  return nearest
}

export function pullInside(lat: number, lng: number, poly: Array<[number, number]>) {
  const center = centroid(poly)
  let nextLat = lat
  let nextLng = lng
  for (let i = 0; i < 16 && !pointInPolygon(nextLat, nextLng, poly); i++) {
    nextLat += (center.lat - nextLat) * 0.35
    nextLng += (center.lng - nextLng) * 0.35
  }
  return { lat: nextLat, lng: nextLng }
}

export function offset(lat: number, lng: number, heading: number, meters: number) {
  const dLat = (meters * Math.cos(heading)) / 110540
  const dLng = (meters * Math.sin(heading)) / (111320 * Math.cos((lat * Math.PI) / 180))
  return { lat: lat + dLat, lng: lng + dLng }
}

export function boundsOf(points: Array<[number, number]>, padFraction = 0): Bounds {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
  }
  if (maxLat - minLat < 1e-6) {
    minLat -= 0.001
    maxLat += 0.001
  }
  if (maxLng - minLng < 1e-6) {
    minLng -= 0.001
    maxLng += 0.001
  }
  const latPad = (maxLat - minLat) * padFraction
  const lngPad = (maxLng - minLng) * padFraction
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  }
}

export function project(lat: number, lng: number, bounds: Bounds) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100
  return { x, y }
}
