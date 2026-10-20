import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { HerdState, Metrics, Uplink } from '../types'
import { createInitialState } from '../data/seed'
import { applyPackets, deriveMetrics, ingestUplink } from '../data/telemetry'
import { nextPacket } from '../data/simulate'
import { loadFeedMode, saveFeedMode, type FeedMode } from '../lib/feed'

type Action =
  | { type: 'clock' }
  | { type: 'feed' }
  | { type: 'uplink'; uplink: Uplink }
  | { type: 'select'; id: string | null }
  | { type: 'ack'; id: string }
  | { type: 'ack-all' }

function reducer(state: HerdState, action: Action): HerdState {
  if (action.type === 'clock') return { ...state, now: Date.now() }
  if (action.type === 'uplink') return ingestUplink(state, action.uplink)
  if (action.type === 'select') return { ...state, selectedId: action.id }
  if (action.type === 'ack') {
    const now = Date.now()
    return {
      ...state,
      now,
      alerts: state.alerts.map((alert) =>
        alert.id === action.id && !alert.ackedAt ? { ...alert, ackedAt: now } : alert,
      ),
    }
  }
  if (action.type === 'ack-all') {
    const now = Date.now()
    return {
      ...state,
      now,
      alerts: state.alerts.map((alert) =>
        !alert.ackedAt && !alert.resolvedAt ? { ...alert, ackedAt: now } : alert,
      ),
    }
  }
  const now = Date.now()
  const packets = state.animals
    .filter((animal) => animal.motion !== 'offline')
    .map((animal) => nextPacket(animal, now))
  return applyPackets(state, packets, now)
}

export type HerdApi = HerdState & {
  metrics: Metrics
  feedMode: FeedMode
  setFeedMode: (mode: FeedMode) => void
  select: (id: string | null) => void
  acknowledge: (id: string) => void
  acknowledgeAll: () => void
}

const HerdContext = createContext<HerdApi | null>(null)

export function HerdProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const [feedMode, setFeedModeState] = useState<FeedMode>(loadFeedMode)

  function setFeedMode(mode: FeedMode) {
    setFeedModeState(mode)
    saveFeedMode(mode)
  }

  useEffect(() => {
    const clock = window.setInterval(() => dispatch({ type: 'clock' }), 1000)
    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    if (feedMode !== 'demo') return
    const feed = window.setInterval(() => dispatch({ type: 'feed' }), 2000)
    return () => window.clearInterval(feed)
  }, [feedMode])

  useEffect(() => {
    if (feedMode !== 'live') return
    function onUplink(event: Event) {
      const uplink = (event as CustomEvent<Uplink>).detail
      if (!uplink || typeof uplink.devEui !== 'string') return
      dispatch({ type: 'uplink', uplink })
    }
    window.addEventListener('pasturewatch-uplink', onUplink)
    return () => window.removeEventListener('pasturewatch-uplink', onUplink)
  }, [feedMode])

  const metrics = useMemo(() => deriveMetrics(state), [state])
  const api = useMemo<HerdApi>(
    () => ({
      ...state,
      metrics,
      feedMode,
      setFeedMode,
      select: (id) => dispatch({ type: 'select', id }),
      acknowledge: (id) => dispatch({ type: 'ack', id }),
      acknowledgeAll: () => dispatch({ type: 'ack-all' }),
    }),
    [state, metrics, feedMode],
  )

  return <HerdContext.Provider value={api}>{children}</HerdContext.Provider>
}

export function useHerd() {
  const value = useContext(HerdContext)
  if (!value) throw new Error('useHerd must be used within HerdProvider')
  return value
}
