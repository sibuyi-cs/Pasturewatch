export type LatLng = [number, number]

const KEY = 'pasturewatch.grazing'

let saved = readSaved()
const listeners = new Set<() => void>()

function isPoint(value: unknown): value is LatLng {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
}

function readSaved(): LatLng[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    const points = parsed.filter(isPoint)
    return points.length >= 3 ? points : null
  } catch {
    return null
  }
}

export function getSavedGrazing() {
  return saved
}

export function saveGrazing(points: LatLng[]) {
  if (points.length < 3) return
  saved = points.map((point) => [point[0], point[1]] as LatLng)
  localStorage.setItem(KEY, JSON.stringify(saved))
  listeners.forEach((listener) => listener())
}

export function clearGrazing() {
  saved = null
  localStorage.removeItem(KEY)
  listeners.forEach((listener) => listener())
}

export function subscribeGrazing(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Area of a closed ring, in square metres. */
export function ringAreaM2(points: LatLng[]) {
  if (points.length < 3) return 0
  const lat0 = points[0][0]
  const lng0 = points[0][1]
  const xy = points.map(([lat, lng]) => ({
    x: (lng - lng0) * 111320 * Math.cos((lat0 * Math.PI) / 180),
    y: (lat - lat0) * 110540,
  }))
  let sum = 0
  for (let i = 0; i < xy.length; i++) {
    const next = xy[(i + 1) % xy.length]
    sum += xy[i].x * next.y - next.x * xy[i].y
  }
  return Math.abs(sum) / 2
}

export function formatArea(points: LatLng[]) {
  const metres = ringAreaM2(points)
  if (metres <= 0) return '—'
  const hectares = metres / 10000
  if (hectares >= 1) return `${hectares.toFixed(2)} ha`
  return `${Math.round(metres)} m²`
}
