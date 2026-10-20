import { useHerd } from '../context/HerdContext'
import { formatAgo } from '../lib/format'
import { estimateRangeKm } from '../lib/radio'
import { compareAnimals, toneFor } from '../lib/status'

function pipeline(live: boolean) {
  return [
    { name: 'Sensors', detail: 'Temperature, accelerometer, LDR, GPS', state: live ? 'Listening' : 'Simulated' },
    { name: 'TTGO LoRaWAN', detail: 'Collar controller uplink', state: live ? 'Listening' : 'Simulated' },
    { name: 'The Things Network', detail: 'LoRaWAN network server', state: live ? 'Listening' : 'Ready to connect' },
    { name: 'MQTT', detail: 'Uplink transport into the app', state: live ? 'Listening' : 'Ready to connect' },
    { name: 'Node-RED', detail: 'Flows, thresholds, and routing', state: live ? 'Listening' : 'Ready to connect' },
    { name: 'Supabase', detail: 'Stored readings and realtime', state: live ? 'Listening' : 'Ready to connect' },
    { name: 'Web dashboard', detail: 'This screen', state: 'Active' },
  ]
}

const KIT = [
  ['TTGO LoRaWAN controller', 'One collar controller per animal', 'Node'],
  ['GPS module', 'Fix for tracking and the geofence', 'Node'],
  ['Temperature sensor', 'Heat-stress reading', 'Node'],
  ['Accelerometer', 'Movement and down-animal check', 'Node'],
  ['LDR sensor', 'Light intensity at the collar', 'Node'],
  ['SIM card module', 'Cellular backhaul for the ranch gateway', 'Gateway'],
]

export function Devices() {
  const { animals, alerts, now, feedMode } = useHerd()
  const live = feedMode === 'live'
  const rows = [...animals].sort((a, b) => compareAnimals(a, b, alerts))

  return (
    <div className="stack">
      <section>
        <header className="section-head">
          <div>
            <p className="eyebrow">Software path</p>
            <h2>From collar to screen</h2>
          </div>
        </header>
        <ol className="pipeline">
          {pipeline(live).map((step) => (
            <li key={step.name}>
              <strong>{step.name}</strong>
              <span>{step.detail}</span>
              <em className={step.state === 'Active' ? 'on' : step.state === 'Simulated' ? 'sim' : 'wait'}>{step.state}</em>
            </li>
          ))}
        </ol>
      </section>

      <section className="split">
        <article className="panel">
          <header className="panel-head">
            <div>
              <p className="eyebrow">Gateway</p>
              <h2>SIM backhaul</h2>
            </div>
          </header>
          <div className="panel-body">
            <p className="gateway-name">GW-SIM-01</p>
            <p className="small">
              The SIM card module sits on the ranch gateway. TTGO collars speak LoRaWAN. The gateway forwards those
              uplinks when the pasture has no fixed internet connection.
            </p>
            <dl className="facts compact">
              <div>
                <dt>Backhaul</dt>
                <dd>SIM module · LTE</dd>
              </div>
              <div>
                <dt>Network server</dt>
                <dd>The Things Network</dd>
              </div>
              <div>
                <dt>Feed</dt>
                <dd>{live ? 'Real-time uplinks' : 'Demonstration uplinks'}</dd>
              </div>
            </dl>
          </div>
        </article>
        <article className="panel">
          <header className="panel-head">
            <div>
              <p className="eyebrow">Field kit</p>
              <h2>Hardware</h2>
            </div>
          </header>
          <ul className="kit">
            {KIT.map(([name, detail, place]) => (
              <li key={name}>
                <strong>{name}</strong>
                <span>{detail}</span>
                <em>{place}</em>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel">
        <header className="panel-head">
          <div>
            <p className="eyebrow">TTGO nodes</p>
            <h2>Collars</h2>
          </div>
        </header>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Node</th>
                <th scope="col">Animal</th>
                <th scope="col">RSSI</th>
                <th scope="col">SNR</th>
                <th scope="col">SF</th>
                <th scope="col">Battery</th>
                <th scope="col">Est. range</th>
                <th scope="col">Last uplink</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((animal) => {
                const range = estimateRangeKm(animal.rssi, animal.sf)
                const quiet = toneFor(animal, alerts) === 'off'
                return (
                  <tr key={animal.id} className={range < 3 || quiet ? 'row-watch' : undefined}>
                    <td className="mono">{animal.devEui}</td>
                    <td>
                      {animal.tag} · {animal.name}
                    </td>
                    <td>{Math.round(animal.rssi)} dBm</td>
                    <td>{animal.snr.toFixed(1)}</td>
                    <td>SF{animal.sf}</td>
                    <td>{Math.round(animal.battery)}%</td>
                    <td>{range.toFixed(1)} km</td>
                    <td>{formatAgo(animal.lastSeen, now)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="table-note">
          Estimated range uses RSSI and spreading factor as a rural planning figure. It is not a surveyed measurement.
        </p>
      </section>
    </div>
  )
}
