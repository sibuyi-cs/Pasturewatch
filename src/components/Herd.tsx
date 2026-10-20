import { useMemo, useState } from 'react'
import { useHerd } from '../context/HerdContext'
import { activityLabel, formatAgo, lightLabel } from '../lib/format'
import { compareAnimals, statusPhrase, toneFor } from '../lib/status'
import { Meter, Pill } from './ui'

type Filter = 'all' | 'alert' | 'outside' | 'battery'

export function Herd({ onLocate }: { onLocate: (id: string) => void }) {
  const { animals, alerts, now, selectedId, select } = useHerd()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(
    () => ({
      all: animals.length,
      alert: animals.filter((animal) => toneFor(animal, alerts) === 'bad' || toneFor(animal, alerts) === 'warn').length,
      outside: animals.filter((animal) => animal.outside && animal.motion !== 'offline').length,
      battery: animals.filter((animal) => animal.battery <= 20).length,
    }),
    [animals, alerts],
  )

  const visible = animals
    .filter((animal) => {
      const hay = `${animal.name} ${animal.tag} ${animal.breed} ${animal.devEui}`.toLowerCase()
      if (query && !hay.includes(query.trim().toLowerCase())) return false
      if (filter === 'alert') return toneFor(animal, alerts) === 'bad' || toneFor(animal, alerts) === 'warn'
      if (filter === 'outside') return animal.outside && animal.motion !== 'offline'
      if (filter === 'battery') return animal.battery <= 20
      return true
    })
    .sort((a, b) => compareAnimals(a, b, alerts))

  return (
    <div className="stack">
      <div className="herd-tools">
        <label>
          <span className="sr-only">Search herd</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tag, name, or device"
          />
        </label>
        <div className="chips" role="group" aria-label="Filter herd">
          <FilterChip id="all" label="All" count={counts.all} filter={filter} setFilter={setFilter} />
          <FilterChip id="alert" label="Alerts" count={counts.alert} filter={filter} setFilter={setFilter} />
          <FilterChip id="outside" label="Outside" count={counts.outside} filter={filter} setFilter={setFilter} />
          <FilterChip id="battery" label="Low battery" count={counts.battery} filter={filter} setFilter={setFilter} />
        </div>
      </div>
      {visible.length === 0 && <p className="empty">No animals match this filter.</p>}
      <div className="herd-grid">
        {visible.map((animal) => {
          const tone = toneFor(animal, alerts)
          return (
            <article key={animal.id} className={animal.id === selectedId ? 'animal-card selected' : 'animal-card'}>
              <button type="button" className="card-hit" onClick={() => select(animal.id)}>
                <span className="card-top">
                  <span>
                    <strong>
                      {animal.tag} · {animal.name}
                    </strong>
                    <small>
                      {animal.breed} {animal.sex.toLowerCase()} · {animal.age} yrs
                    </small>
                  </span>
                  <Pill tone={tone}>{statusPhrase(animal, alerts)}</Pill>
                </span>
                <span className="readings">
                  <span>
                    <small>Temp</small>
                    <b className={animal.temperature >= 39.8 ? 'hot' : ''}>{animal.temperature.toFixed(1)}°C</b>
                  </span>
                  <span>
                    <small>Motion</small>
                    <b>{activityLabel(animal.accel)}</b>
                  </span>
                  <span>
                    <small>Light</small>
                    <b>{lightLabel(animal.lux)}</b>
                  </span>
                  <span>
                    <small>Battery</small>
                    <b>{Math.round(animal.battery)}%</b>
                    <Meter value={animal.battery} min={0} max={100} />
                  </span>
                </span>
                <small className="muted">
                  {animal.motion === 'offline'
                    ? `Last uplink ${formatAgo(animal.lastSeen, now)}`
                    : animal.outside
                      ? `${Math.round(animal.distanceOutside)} m outside · ${formatAgo(animal.lastSeen, now)}`
                      : `Inside pasture · ${formatAgo(animal.lastSeen, now)}`}
                </small>
              </button>
              <button type="button" className="ghost" onClick={() => onLocate(animal.id)}>
                Show on map
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function FilterChip({
  id,
  label,
  count,
  filter,
  setFilter,
}: {
  id: Filter
  label: string
  count: number
  filter: Filter
  setFilter: (filter: Filter) => void
}) {
  return (
    <button type="button" className="chip" aria-pressed={filter === id} onClick={() => setFilter(id)}>
      {label} <span>{count}</span>
    </button>
  )
}
