import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { CENTROID } from '../data/farm'
import { formatCoord } from '../lib/format'
import { haversine } from '../lib/geo'
import {
  clearGrazing,
  formatArea,
  getSavedGrazing,
  saveGrazing,
  subscribeGrazing,
  type LatLng,
} from '../lib/pasture'

const DROP_METERS = 8

type Fix = {
  lat: number
  lng: number
  accuracy: number
}

export function GeofenceMapper() {
  const saved = useSyncExternalStore(subscribeGrazing, getSavedGrazing, getSavedGrazing)
  const [draft, setDraft] = useState<LatLng[]>([])
  const [fix, setFix] = useState<Fix | null>(null)
  const [tracking, setTracking] = useState(false)
  const [follow, setFollow] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const watchRef = useRef<number | null>(null)
  const trackingRef = useRef(false)
  const draftRef = useRef<LatLng[]>([])
  const fixRef = useRef<Fix | null>(null)

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

  function remember(next: LatLng[]) {
    draftRef.current = next
    setDraft(next)
  }

  function applyFix(next: Fix, drop: boolean) {
    fixRef.current = next
    setFix(next)
    setError('')
    if (!drop || next.accuracy > 40) return
    const current = draftRef.current
    const last = current[current.length - 1]
    if (last && haversine(last[0], last[1], next.lat, next.lng) < DROP_METERS) return
    remember([...current, [next.lat, next.lng]])
  }

  function startWalk() {
    if (!navigator.geolocation) {
      setError('This browser cannot read a GPS location.')
      return
    }
    setError('')
    setNotice('')
    trackingRef.current = true
    setTracking(true)
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        applyFix(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          trackingRef.current,
        )
      },
      (failure) => {
        if (failure.code === failure.PERMISSION_DENIED) {
          setError('Location is blocked. Allow location for this site, then start the walk again.')
          return
        }
        if (fixRef.current) return
        if (failure.code === failure.TIMEOUT) {
          setError('The GPS fix timed out. Move into open sky and keep walking.')
        } else {
          setError('The current location could not be read.')
        }
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    )
  }

  function stopWalk() {
    trackingRef.current = false
    setTracking(false)
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
  }

  function markSpot() {
    if (!fix) {
      setError('Wait for a GPS fix, then mark the corner.')
      return
    }
    setError('')
    const last = draftRef.current[draftRef.current.length - 1]
    if (last && haversine(last[0], last[1], fix.lat, fix.lng) < 2) return
    remember([...draftRef.current, [fix.lat, fix.lng]])
  }

  function undo() {
    remember(draftRef.current.slice(0, -1))
  }

  function clearWalk() {
    remember([])
    setNotice('')
  }

  function saveArea() {
    if (draft.length < 3) {
      setError('Walk at least three corners before saving the grazing area.')
      return
    }
    saveGrazing(draft)
    setError('')
    setNotice('Grazing area saved on this browser.')
  }

  function restore() {
    clearGrazing()
    setNotice('Saved grazing area removed.')
  }

  const walked = draft.reduce((total, point, index) => {
    if (index === 0) return 0
    const previous = draft[index - 1]
    return total + haversine(previous[0], previous[1], point[0], point[1])
  }, 0)

  const frame = draft.length ? draft : saved ?? []

  return (
    <div className="map-layout">
      <div className="map-wrap">
        <MapContainer center={[CENTROID.lat, CENTROID.lng]} zoom={16} minZoom={3} maxZoom={19} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Frame points={frame} />
          {follow && fix && <Follow lat={fix.lat} lng={fix.lng} />}
          {saved && saved.length >= 3 && (
            <Polygon
              positions={saved}
              pathOptions={{ color: '#1f7a4d', weight: 2, dashArray: '6 6', fillColor: '#1f7a4d', fillOpacity: 0.08 }}
            >
              <Tooltip sticky>Saved grazing area</Tooltip>
            </Polygon>
          )}
          {draft.length >= 3 && (
            <Polygon
              positions={draft}
              pathOptions={{ color: '#1d4e89', weight: 2, fillColor: '#1d4e89', fillOpacity: 0.16 }}
            >
              <Tooltip sticky>Walk in progress</Tooltip>
            </Polygon>
          )}
          {draft.length >= 2 && (
            <Polyline positions={draft} pathOptions={{ color: '#1d4e89', weight: 3 }} />
          )}
          {draft.map((point, index) => (
            <CornerMarker key={`${point[0]}-${point[1]}-${index}`} index={index} point={point} />
          ))}
          {fix && (
            <>
              <Circle
                center={[fix.lat, fix.lng]}
                radius={Math.max(fix.accuracy, 3)}
                pathOptions={{ color: '#1d4e89', weight: 1, fillColor: '#1d4e89', fillOpacity: 0.08 }}
              />
              <CircleMarker
                center={[fix.lat, fix.lng]}
                radius={7}
                pathOptions={{ color: 'white', weight: 2, fillColor: '#1d4e89', fillOpacity: 1 }}
              >
                <Tooltip>You are here</Tooltip>
              </CircleMarker>
            </>
          )}
        </MapContainer>
      </div>
      <aside className="panel map-panel">
        <div>
          <p className="eyebrow">Hidden from the menu</p>
          <h2>Walk the boundary</h2>
          <p className="small muted">
            Start at one corner and walk the edge. A new coordinate is kept each time you move about {DROP_METERS} metres.
          </p>
        </div>
        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-ok">{notice}</p>}
        <p className={tracking ? 'live live-real' : 'live'}>
          <i /> {tracking ? 'Recording the walk' : fix ? 'GPS ready' : 'Waiting for GPS'}
        </p>
        <dl className="facts compact">
          <div>
            <dt>Current location</dt>
            <dd>{fix ? formatCoord(fix.lat, fix.lng) : 'No fix yet'}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{fix ? `±${Math.round(fix.accuracy)} m` : '—'}</dd>
          </div>
          <div>
            <dt>Corners</dt>
            <dd>{draft.length}</dd>
          </div>
          <div>
            <dt>Walked</dt>
            <dd>{walked < 1000 ? `${Math.round(walked)} m` : `${(walked / 1000).toFixed(2)} km`}</dd>
          </div>
          <div>
            <dt>Draft area</dt>
            <dd>{formatArea(draft)}</dd>
          </div>
        </dl>
        <div className="mapper-actions">
          {tracking ? (
            <button type="button" className="ghost" onClick={stopWalk}>Pause walk</button>
          ) : (
            <button type="button" className="primary" onClick={startWalk}>Start walk</button>
          )}
          <button type="button" className="ghost" onClick={markSpot} disabled={!fix}>Mark this spot</button>
          <button type="button" className="ghost" onClick={undo} disabled={draft.length === 0}>Undo corner</button>
        </div>
        <label className="check">
          <input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} />
          Follow my location
        </label>
        <div className="coord-list" aria-label="Walk coordinates">
          {draft.length === 0 && <p className="empty">No corners yet. Start the walk and move along the fence.</p>}
          {draft.map((point, index) => (
            <p key={`${point[0]}-${point[1]}-${index}`}>
              <strong>{index + 1}</strong>
              <span>{formatCoord(point[0], point[1])}</span>
            </p>
          ))}
        </div>
        <div className="mapper-actions">
          <button type="button" className="primary" onClick={saveArea} disabled={draft.length < 3}>
            Save grazing area
          </button>
          <button type="button" className="ghost" onClick={clearWalk} disabled={draft.length === 0}>
            Clear walk
          </button>
        </div>
        {saved && (
          <p className="small">
            Saved boundary: {saved.length} corners · {formatArea(saved)}. The live map draws this ring beside Home pasture.
          </p>
        )}
        <div className="mapper-actions">
          {saved && (
            <button type="button" className="ghost" onClick={restore}>Remove saved area</button>
          )}
          <button type="button" className="ghost" onClick={() => { window.location.hash = 'settings' }}>
            Back to settings
          </button>
        </div>
      </aside>
    </div>
  )
}

function CornerMarker({ index, point }: { index: number; point: LatLng }) {
  const icon = useMemo(
    () =>
      divIcon({
        className: 'pin-icon',
        html: `<div class="pin corner">${index + 1}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
    [index],
  )
  return <Marker position={point} icon={icon} />
}

function Frame({ points }: { points: LatLng[] }) {
  const map = useMap()
  const key = points.map((point) => point.join(',')).join('|')
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 17)
      return
    }
    map.fitBounds(points, { padding: [32, 32], maxZoom: 18 })
  }, [map, key, points])
  return null
}

function Follow({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.panTo([lat, lng])
  }, [map, lat, lng])
  return null
}
