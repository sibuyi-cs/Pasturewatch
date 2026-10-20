export type Sex = 'Cow' | 'Bull' | 'Heifer' | 'Steer'
export type Motion = 'graze' | 'stray' | 'still' | 'offline'
export type Tone = 'ok' | 'warn' | 'bad' | 'off'
export type AlertType = 'geofence' | 'temperature' | 'immobility' | 'battery' | 'signal'
export type Severity = 'information' | 'warning' | 'critical'

export type Animal = {
  id: string
  name: string
  tag: string
  sex: Sex
  breed: string
  age: number
  motion: Motion
  devEui: string
  lat: number
  lng: number
  heading: number
  anchor: { lat: number; lng: number } | null
  temperature: number
  tempTarget: number
  accel: number
  accelTarget: number
  lux: number
  shade: number
  battery: number
  batteryFloor: number
  rssi: number
  rssiBase: number
  snr: number
  snrBase: number
  sf: number
  gpsAccuracy: number
  lastSeen: number
  outside: boolean
  distanceOutside: number
  lowActivityTicks: number
  trail: Array<[number, number]>
}

export type Alert = {
  id: string
  animalId: string
  type: AlertType
  severity: Severity
  message: string
  createdAt: number
  ackedAt: number | null
  resolvedAt: number | null
}

export type Reading = {
  t: number
  temp: number
  accel: number
  lux: number
}

/** Shape of one TTGO LoRaWAN uplink after it reaches the dashboard. */
export type Uplink = {
  devEui: string
  receivedAt: number
  lat: number
  lng: number
  gpsAccuracy: number
  temperature: number
  accel: number
  lux: number
  battery: number
  rssi: number
  snr: number
  sf: number
}

export type Packet = {
  uplink: Uplink
  heading?: number
}

export type HerdState = {
  animals: Animal[]
  alerts: Alert[]
  history: Reading[]
  series: Record<string, Reading[]>
  now: number
  selectedId: string | null
  feedLagMs: number
}

export type Metrics = {
  reporting: number
  total: number
  inside: number
  outside: number
  openAlerts: number
  waitingAcks: number
  avgTemp: number | null
  avgAccel: number | null
  avgLux: number | null
  rangeAvgKm: number | null
  rangeMinKm: number | null
  rangeMinName: string | null
  responseSec: number | null
  gpsAccuracyM: number | null
  dashboardLagSec: number | null
  sensorReliability: number | null
  geofenceScore: number | null
}
