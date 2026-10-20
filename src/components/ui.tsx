import type { ReactNode } from 'react'
import type { Tone } from '../types'

export function Pill({ tone, children }: { tone: Tone | 'neutral'; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

export function Meter({ value, min, max }: { value: number; min: number; max: number }) {
  const span = max - min || 1
  const width = Math.min(100, Math.max(0, ((value - min) / span) * 100))
  return (
    <span className="meter" aria-hidden="true">
      <span style={{ width: `${width}%` }} />
    </span>
  )
}
