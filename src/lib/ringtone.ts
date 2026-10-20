import type { Severity } from '../types'

type PreviewListener = (level: Severity) => void

const listeners = new Set<PreviewListener>()
let audio: AudioContext | null = null
let queued: Severity | null = null

function context() {
  if (!audio) audio = new AudioContext()
  return audio
}

function beep(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number, shape: OscillatorType) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = shape
  osc.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

function pattern(level: Severity, ctx: AudioContext) {
  const start = ctx.currentTime + 0.03
  if (level === 'information') {
    beep(ctx, 523, start, 0.22, 0.06, 'sine')
    return
  }
  if (level === 'warning') {
    beep(ctx, 440, start, 0.16, 0.09, 'triangle')
    beep(ctx, 587, start + 0.2, 0.2, 0.09, 'triangle')
    return
  }
  beep(ctx, 880, start, 0.12, 0.12, 'square')
  beep(ctx, 660, start + 0.16, 0.12, 0.12, 'square')
  beep(ctx, 880, start + 0.32, 0.18, 0.14, 'square')
}

export function playRingtone(level: Severity) {
  const ctx = context()
  if (ctx.state === 'suspended') {
    queued = level
    void ctx.resume().then(() => {
      if (ctx.state !== 'running' || queued !== level) return
      queued = null
      pattern(level, ctx)
    })
    return
  }
  queued = null
  pattern(level, ctx)
}

export function unlockRingtones() {
  const ctx = context()
  if (ctx.state === 'suspended') void ctx.resume()
  if (queued && ctx.state === 'running') {
    const level = queued
    queued = null
    pattern(level, ctx)
  }
}

export function previewNotice(level: Severity) {
  playRingtone(level)
  listeners.forEach((listener) => listener(level))
}

export function subscribePreview(listener: PreviewListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const SEVERITY_RANK: Record<Severity, number> = {
  information: 1,
  warning: 2,
  critical: 3,
}
