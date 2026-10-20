import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Circle, MapContainer, Polygon, Polyline, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { useHerd } from '../context/HerdContext'
import { FENCE, RANCH } from '../data/farm'
import { activityLabel, formatAgo, formatCoord, lightLabel, tempLabel } from '../lib/format'
import { estimateRangeKm } from '../lib/radio'
import { compareAnimals, statusPhrase, toneFor, TONE_COLOR } from '../lib/status'
import { getSavedGrazing, subscribeGrazing } from '../lib/pasture'
import { Meter, Pill } from './ui'
import type { Animal, Tone } from '../types'

export function MapView() {
  const herd = useHerd()
  const { animals, alerts, selectedId, select, now } = herd
  const grazing = useSyncExternalStore(subscribeGrazing, getSavedGrazing, getSavedGrazing)
  const [trails, setTrails] = useState(false)
  const [fitToken, setFitToken] = useState(0)
  const selected = animals.find((animal) => animal.id === selectedId) ?? null
  const ordered = [...animals].sort((a, b) => compareAnimals(a, b, alerts))
  const fitPoints = useMemo(
    () => [...FENCE, ...animals.map((animal) => [animal.lat, animal.lng] as [number, number])],
    [animals],
  )

  return (
    <div className="map-layout">
      <div className="map-wrap">
        <MapContainer center={[-29.086, 26.161]} zoom={15} minZoom={13} maxZoom={18} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitOnce points={fitPoints} />
          <FitOnDemand token={fitToken} points={fitPoints} />
          {selected && <FlyTo id={selected.id} lat={selected.lat} lng={selected.lng} />}
          <Polygon
            positions={FENCE}
            pathOptions={{ color: '#1f7a4d', weight: 2, fillColor: '#1f7a4d', fillOpacity: 0.12 }}
          >
            <Tooltip sticky>{RANCH.pasture}</Tooltip>
          </Polygon>
          {grazing && (
            <Polygon
              positions={grazing}
              pathOptions={{ color: '#1d4e89', weight: 2, dashArray: '6 6', fillColor: '#1d4e89', fillOpacity: 0.08 }}
            >
              <Tooltip sticky>Mapped grazing area</Tooltip>
            </Polygon>
          )}
          {selected && selected.motion !== 'offline' && (
            <Circle
              center={[selected.lat, selected.lng]}
              radius={selected.gpsAccuracy}
              pathOptions={{ color: '#1f7a4d', weight: 1, fillColor: '#1f7a4d', fillOpacity: 0.15 }}
            />
          )}
          {animals.map((animal) => {
            const tone = toneFor(animal, alerts)
            const showTrail = (trails || animal.id === selectedId) && animal.trail.length > 1
            if (!showTrail) return null
            return (
              <Polyline
                key={`trail-${animal.id}`}
                positions={animal.trail}
                pathOptions={{ color: TONE_COLOR[tone], weight: 2, opacity: 0.75 }}
              />
            )
          })}
          {animals.map((animal) => (
            <AnimalMarker
              key={animal.id}
              animal={animal}
              tone={toneFor(animal, alerts)}
              selected={animal.id === selectedId}
              onSelect={select}
            />
          ))}
        </MapContainer>
        <div className="map-legend">
          <span><i className="swatch ok" /> Inside</span>
          <span><i className="swatch warn" /> Watch</span>
          <span><i className="swatch bad" /> Alert</span>
          <span><i className="swatch off" /> Offline</span>
        </div>
      </div>
      <aside className="panel map-panel">
        <div className="map-tools">
          <label className="check">
            <input type="checkbox" checked={trails} onChange={(event) => setTrails(event.target.checked)} />
            Trails
          </label>
          <button type="button" className="ghost" onClick={() => setFitToken((value) => value + 1)}>
            Fit pasture
          </button>
        </div>
        {selected ? <AnimalDetail animal={selected} now={now} /> : <p className="empty">Select an animal on the map or in the list.</p>}
        <div className="mini-list">
          {ordered.map((animal) => {
            const tone = toneFor(animal, alerts)
            return (
              <button
                type="button"
                key={animal.id}
                className={animal.id === selectedId ? 'mini selected' : 'mini'}
                onClick={() => select(animal.id)}
              >
                <i className={`swatch ${tone}`} />
                <span>
                  <strong>
                    {animal.tag} · {animal.name}
                  </strong>
                  <small>
                    {animal.temperature.toFixed(1)}°C · {activityLabel(animal.accel)} · {formatAgo(animal.lastSeen, now)}
                  </small>
                </span>
                <Pill tone={tone}>{statusPhrase(animal, alerts)}</Pill>
              </button>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

function AnimalDetail({ animal, now }: { animal: Animal; now: number }) {
  const { alerts } = useHerd()
  const tone = toneFor(animal, alerts)
  return (
    <div className="detail">
      <div className="detail-title">
        <div>
          <p className="eyebrow">{animal.tag}</p>
          <h2>{animal.name}</h2>
          <p className="small muted">
            {animal.breed} {animal.sex.toLowerCase()} · {animal.age} yrs
          </p>
        </div>
        <Pill tone={tone}>{statusPhrase(animal, alerts)}</Pill>
      </div>
      <dl className="facts">
        <div>
          <dt>Temperature</dt>
          <dd className={animal.temperature >= 39.8 ? 'hot' : ''}>
            {animal.temperature.toFixed(1)}°C · {tempLabel(animal.temperature)}
          </dd>
        </div>
        <div>
          <dt>Accelerometer</dt>
          <dd>
            {animal.accel.toFixed(2)} m/s² · {activityLabel(animal.accel)}
          </dd>
        </div>
        <div>
          <dt>LDR</dt>
          <dd>
            {Math.round(animal.lux)} lux · {lightLabel(animal.lux)}
          </dd>
        </div>
        <div>
          <dt>GPS</dt>
          <dd>
            ±{animal.gpsAccuracy.toFixed(1)} m
            <small>{formatCoord(animal.lat, animal.lng)}</small>
          </dd>
        </div>
        <div>
          <dt>Fence</dt>
          <dd>
            {animal.motion === 'offline'
              ? 'Last fix only'
              : animal.outside
                ? `${Math.round(animal.distanceOutside)} m outside`
                : 'Inside Home pasture'}
          </dd>
        </div>
        <div>
          <dt>Battery</dt>
          <dd>
            {Math.round(animal.battery)}%
            <Meter value={animal.battery} min={0} max={100} />
          </dd>
        </div>
        <div>
          <dt>LoRa</dt>
          <dd>
            {Math.round(animal.rssi)} dBm · SF{animal.sf}
            <small>{estimateRangeKm(animal.rssi, animal.sf).toFixed(1)} km estimated range</small>
          </dd>
        </div>
        <div>
          <dt>Uplink</dt>
          <dd>
            {formatAgo(animal.lastSeen, now)}
            <small className="mono">{animal.devEui}</small>
          </dd>
        </div>
      </dl>
    </div>
  )
}

function AnimalMarker({
  animal,
  tone,
  selected,
  onSelect,
}: {
  animal: Animal
  tone: Tone
  selected: boolean
  onSelect: (id: string) => void
}) {
  const icon = useMemo(
    () =>
      divIcon({
        className: 'pin-icon',
        html: `<div class="pin ${tone}${selected ? ' selected' : ''}">${animal.tag.replace('GV-', '')}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    [animal.tag, tone, selected],
  )
  return (
    <Marker
      position={[animal.lat, animal.lng]}
      icon={icon}
      zIndexOffset={selected ? 600 : tone === 'bad' ? 400 : 0}
      eventHandlers={{ click: () => onSelect(animal.id) }}
    />
  )
}

function FitOnce({ points }: { points: Array<[number, number]> }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current) return
    fitted.current = true
    map.fitBounds(points, { padding: [28, 28] })
  }, [map, points])
  return null
}

function FitOnDemand({ token, points }: { token: number; points: Array<[number, number]> }) {
  const map = useMap()
  const seen = useRef(0)
  useEffect(() => {
    if (token === 0 || token === seen.current) return
    seen.current = token
    map.fitBounds(points, { padding: [28, 28] })
  }, [token, points, map])
  return null
}

function FlyTo({ id, lat, lng }: { id: string; lat: number; lng: number }) {
  const map = useMap()
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (last.current === id) return
    last.current = id
    map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.6 })
  }, [id, lat, lng, map])
  return null
}
