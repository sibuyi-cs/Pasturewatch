import { useState } from 'react'
import { useHerd } from '../context/HerdContext'
import { activityLabel, lightLabel, tempLabel } from '../lib/format'
import { TrendChart } from './Chart'

export function Sensors() {
  const { animals, series, history } = useHerd()
  const [animalId, setAnimalId] = useState('herd')
  const animal = animals.find((item) => item.id === animalId) ?? null
  const points = animal ? series[animal.id] ?? [] : history
  const latest = points[points.length - 1]

  return (
    <div className="stack">
      <div className="herd-tools">
        <label className="field">
          <span>Show</span>
          <select value={animalId} onChange={(event) => setAnimalId(event.target.value)}>
            <option value="herd">Herd average</option>
            {animals.map((item) => (
              <option key={item.id} value={item.id}>
                {item.tag} · {item.name}
              </option>
            ))}
          </select>
        </label>
        {latest && (
          <div className="reading-row">
            <span>
              <small>Temperature</small>
              <strong>{latest.temp.toFixed(1)}°C</strong>
              <small>{tempLabel(latest.temp)}</small>
            </span>
            <span>
              <small>Accelerometer</small>
              <strong>{latest.accel.toFixed(2)} m/s²</strong>
              <small>{activityLabel(latest.accel)}</small>
            </span>
            <span>
              <small>LDR</small>
              <strong>{Math.round(latest.lux)} lux</strong>
              <small>{lightLabel(latest.lux)}</small>
            </span>
          </div>
        )}
      </div>
      <div className="chart-grid">
        <article className="panel chart-card">
          <header className="chart-head">
            <p className="eyebrow">Temperature sensor</p>
            <strong>{latest ? `${latest.temp.toFixed(1)} °C` : '—'}</strong>
          </header>
          <TrendChart
            label="Temperature"
            color="#b6402c"
            points={points.map((point) => ({ t: point.t, v: point.temp }))}
            formatY={(value) => value.toFixed(1)}
          />
        </article>
        <article className="panel chart-card">
          <header className="chart-head">
            <p className="eyebrow">Accelerometer</p>
            <strong>{latest ? `${latest.accel.toFixed(2)} m/s²` : '—'}</strong>
          </header>
          <TrendChart
            label="Accelerometer"
            color="#1f7a4d"
            points={points.map((point) => ({ t: point.t, v: point.accel }))}
            formatY={(value) => value.toFixed(1)}
          />
        </article>
        <article className="panel chart-card">
          <header className="chart-head">
            <p className="eyebrow">LDR sensor</p>
            <strong>{latest ? `${Math.round(latest.lux)} lux` : '—'}</strong>
          </header>
          <TrendChart
            label="Light intensity"
            color="#a16207"
            points={points.map((point) => ({ t: point.t, v: point.lux }))}
            formatY={(value) => Math.round(value).toString()}
          />
        </article>
      </div>
    </div>
  )
}
