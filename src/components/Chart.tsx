import { useId, useState, type MouseEvent } from 'react'
import { formatHour } from '../lib/format'

type Point = { t: number; v: number }

export function TrendChart({
  points,
  color,
  formatY,
  label,
}: {
  points: Point[]
  color: string
  formatY: (value: number) => string
  label: string
}) {
  const gradientId = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)
  if (points.length < 2) {
    return <p className="empty">Waiting for readings.</p>
  }

  const w = 640
  const h = 188
  const pad = { l: 46, r: 12, t: 16, b: 28 }
  const values = points.map((point) => point.v)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const yMin = min - span * 0.18
  const yMax = max + span * 0.18
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const xAt = (index: number) => pad.l + (index / (points.length - 1)) * innerW
  const yAt = (value: number) => pad.t + (1 - (value - yMin) / (yMax - yMin)) * innerH
  const line = points.map((point, index) => `${xAt(index)},${yAt(point.v)}`).join(' ')
  const area = `${line} ${xAt(points.length - 1)},${pad.t + innerH} ${xAt(0)},${pad.t + innerH}`
  const ticks = [0, 0.5, 1].map((step) => yMin + (yMax - yMin) * step)
  const active = hover == null ? null : points[hover]

  function move(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * w
    const ratio = Math.min(1, Math.max(0, (x - pad.l) / innerW))
    setHover(Math.round(ratio * (points.length - 1)))
  }

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={label}
      onMouseMove={move}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={w - pad.r} y1={yAt(tick)} y2={yAt(tick)} className="grid-line" />
          <text x={pad.l - 8} y={yAt(tick) + 4} textAnchor="end" className="axis">
            {formatY(tick)}
          </text>
        </g>
      ))}
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {active && hover != null && (
        <g>
          <line x1={xAt(hover)} x2={xAt(hover)} y1={pad.t} y2={pad.t + innerH} stroke={color} strokeDasharray="3 3" />
          <circle cx={xAt(hover)} cy={yAt(active.v)} r="4" fill="#fff" stroke={color} strokeWidth="2" />
          <text x={Math.min(xAt(hover) + 8, w - 90)} y={pad.t + 12} className="hover-label">
            {formatY(active.v)} · {formatHour(active.t)}
          </text>
        </g>
      )}
      <text x={pad.l} y={h - 8} className="axis">
        {formatHour(points[0].t)}
      </text>
      <text x={w - pad.r} y={h - 8} textAnchor="end" className="axis">
        {formatHour(points[points.length - 1].t)}
      </text>
    </svg>
  )
}
