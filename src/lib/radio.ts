/** Illustrative rural LoRaWAN range from RSSI and spreading factor. */
export function estimateRangeKm(rssi: number, sf: number) {
  const base = (rssi + 128) / 7.5
  const sfGain = (sf - 7) * 0.25
  return Math.max(0.2, Math.min(12, base + sfGain))
}
