export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function mean(values: number[]) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function formatCoord(lat: number, lng: number) {
  const ns = lat < 0 ? 'S' : 'N'
  const ew = lng < 0 ? 'W' : 'E'
  return `${Math.abs(lat).toFixed(5)}° ${ns}, ${Math.abs(lng).toFixed(5)}° ${ew}`
}

export function formatAgo(ts: number, now: number) {
  const seconds = Math.max(0, Math.round((now - ts) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
}

export function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatWhen(ts: number) {
  return new Date(ts).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatHour(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function activityLabel(accel: number) {
  if (accel < 0.4) return 'Resting'
  if (accel < 1.2) return 'Walking'
  if (accel < 2.4) return 'Grazing'
  return 'Running'
}

export function lightLabel(lux: number) {
  if (lux < 30) return 'Dark'
  if (lux < 180) return 'Dim'
  if (lux < 450) return 'Shade'
  return 'Bright'
}

export function tempLabel(temperature: number) {
  if (temperature < 37.5) return 'Low'
  if (temperature <= 39) return 'Normal'
  if (temperature < 39.8) return 'Warm'
  return 'Heat stress'
}
