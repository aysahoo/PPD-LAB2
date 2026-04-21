/** When at or above this share of capacity, show a “nearly full” warning in the UI. */
export const SEAT_WARNING_RATIO = 0.9

export function shouldWarnSeatCapacity(enrolledCount: number, capacity: number): boolean {
  if (!Number.isFinite(capacity) || capacity <= 0 || !Number.isFinite(enrolledCount)) return false
  return enrolledCount / capacity >= SEAT_WARNING_RATIO
}

export function seatFillPercent(enrolledCount: number, capacity: number): number {
  if (!Number.isFinite(capacity) || capacity <= 0) return 0
  return Math.min(100, Math.round((enrolledCount / capacity) * 100))
}
