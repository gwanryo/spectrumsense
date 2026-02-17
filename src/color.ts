import type { Boundary, ColorName } from './types'

// ── Standard Color Boundaries ──
// Based on XKCD color survey (N=222,500), Munsell, and CIE research
export const BOUNDARIES: Boundary[] = [
  { from: 'red',    to: 'orange', standardHue: 18,  searchRange: { low: 0,   high: 40  } },
  { from: 'orange', to: 'yellow', standardHue: 48,  searchRange: { low: 30,  high: 65  } },
  { from: 'yellow', to: 'green',  standardHue: 78,  searchRange: { low: 55,  high: 105 } },
  { from: 'green',  to: 'blue',   standardHue: 163, searchRange: { low: 120, high: 210 } },
  { from: 'blue',   to: 'violet', standardHue: 258, searchRange: { low: 220, high: 290 } },
  { from: 'violet', to: 'red',    standardHue: 345, searchRange: { low: 300, high: 390 } },
  // Note: 390 = 360 + 30, representing wrap-around to 30° past 0°
]

// ── Circular Math ──

/**
 * Normalize a hue value to the [0, 360) range.
 * normalizeHue(390) → 30
 * normalizeHue(-10) → 350
 */
export function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360
}

/**
 * Compute the circular midpoint between two hue angles.
 * Uses angular mean via atan2 to correctly handle the 0°/360° wrap-around.
 *
 * CRITICAL: Naive (a+b)/2 fails at the Violet→Red boundary:
 *   (345 + 18) / 2 = 181.5° (GREEN!) — WRONG
 *   circularMidpoint(345, 18) ≈ 1.5° (RED) — CORRECT
 */
export function circularMidpoint(a: number, b: number): number {
  const aRad = (a * Math.PI) / 180
  const bRad = (b * Math.PI) / 180
  const sinMean = (Math.sin(aRad) + Math.sin(bRad)) / 2
  const cosMean = (Math.cos(aRad) + Math.cos(bRad)) / 2
  const midRad = Math.atan2(sinMean, cosMean)
  return normalizeHue((midRad * 180) / Math.PI)
}

/**
 * Compute the signed circular distance from hue a to hue b.
 * Returns a value in (-180, 180].
 * Positive = b is clockwise from a.
 * Negative = b is counter-clockwise from a.
 */
export function circularDistance(a: number, b: number): number {
  const diff = normalizeHue(b - a)
  return diff > 180 ? diff - 360 : diff
}

/**
 * Convert a hue value to a CSS HSL color string.
 * All test colors use S=100%, L=50% for maximum saturation.
 */
export function hslString(hue: number): string {
  return `hsl(${normalizeHue(hue)}, 100%, 50%)`
}

/**
 * Given a hue value and a set of user boundaries, return which color region it falls in.
 * Boundaries array: [R→O, O→Y, Y→G, G→B, B→V, V→R]
 */
export function getColorName(hue: number, boundaries: number[]): ColorName {
  const h = normalizeHue(hue)
  const [ro, oy, yg, gb, bv, vr] = boundaries.map(normalizeHue)

  // Check each region in order
  if (h >= vr || h < ro) return 'red'
  if (h >= ro && h < oy) return 'orange'
  if (h >= oy && h < yg) return 'yellow'
  if (h >= yg && h < gb) return 'green'
  if (h >= gb && h < bv) return 'blue'
  return 'violet'
}
