import type { Boundary, ColorName } from './types'

// ── Standard Color Hues (single source of truth) ──
// Reference: https://html-color.codes/
export const STANDARD_COLORS: Record<ColorName, number> = {
  red: 0, orange: 39, yellow: 60, green: 120, blue: 240, violet: 300, pink: 350,
}

export const COLOR_ORDER: ColorName[] = ['red', 'orange', 'yellow', 'green', 'blue', 'violet', 'pink']

// Display-quality HSL per color (S/L tuned for visual appearance)
const COLOR_DISPLAY: Record<ColorName, { s: number; l: number }> = {
  red:    { s: 100, l: 50 },
  orange: { s: 100, l: 55 },
  yellow: { s: 100, l: 50 },
  green:  { s: 70,  l: 45 },
  blue:   { s: 100, l: 55 },
  violet: { s: 80,  l: 60 },
  pink:   { s: 80,  l: 55 },
}

export function getColorHsl(color: ColorName): string {
  const hue = STANDARD_COLORS[color]
  const { s, l } = COLOR_DISPLAY[color]
  return `hsl(${hue}, ${s}%, ${l}%)`
}

// ── Standard Color Boundaries ──
// standardHue = midpoint of adjacent STANDARD_COLORS
// searchRange covers plausible human variation around each boundary
export const BOUNDARIES: Boundary[] = [
  { from: 'red',    to: 'orange', standardHue: 20,  searchRange: { low: 0,   high: 40  } },
  { from: 'orange', to: 'yellow', standardHue: 50,  searchRange: { low: 30,  high: 70  } },
  { from: 'yellow', to: 'green',  standardHue: 90,  searchRange: { low: 55,  high: 120 } },
  { from: 'green',  to: 'blue',   standardHue: 180, searchRange: { low: 120, high: 230 } },
  { from: 'blue',   to: 'violet', standardHue: 270, searchRange: { low: 220, high: 310 } },
  { from: 'violet', to: 'pink',   standardHue: 325, searchRange: { low: 280, high: 350 } },
  { from: 'pink',   to: 'red',    standardHue: 355, searchRange: { low: 330, high: 390 } },
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
 * Boundaries array: [R→O, O→Y, Y→G, G→B, B→V, V→P, P→R]
 */
export function getColorName(hue: number, boundaries: number[]): ColorName {
  const h = normalizeHue(hue)
  const [ro, oy, yg, gb, bv, vp, pr] = boundaries.map(normalizeHue)

  // Check each region in order
  if (h >= pr || h < ro) return 'red'
  if (h >= ro && h < oy) return 'orange'
  if (h >= oy && h < yg) return 'yellow'
  if (h >= yg && h < gb) return 'green'
  if (h >= gb && h < bv) return 'blue'
  if (h >= bv && h < vp) return 'violet'
  return 'pink'
}

/** Clockwise angular span from hue a to hue b, in [0, 360). */
export function clockwiseSpan(a: number, b: number): number {
  const diff = normalizeHue(b) - normalizeHue(a)
  return diff < 0 ? diff + 360 : diff
}

/**
 * Region center via standard-color proportional offset.
 * NOT the boundary midpoint — boundaries are asymmetric around
 * each standard color (e.g. Green=120° but midpoint(90°,180°)=135°).
 */
export function computeRegionCenter(
  regionIndex: number,
  userStart: number,
  userEnd: number,
): number {
  const n = BOUNDARIES.length
  const stdStart = BOUNDARIES[regionIndex].standardHue
  const stdEnd = BOUNDARIES[(regionIndex + 1) % n].standardHue
  const colorName = BOUNDARIES[regionIndex].to
  const stdCenter = STANDARD_COLORS[colorName]

  const stdSpan = clockwiseSpan(stdStart, stdEnd)
  const ratio = stdSpan > 0
    ? clockwiseSpan(stdStart, stdCenter) / stdSpan
    : 0.5

  const userSpan = clockwiseSpan(userStart, userEnd)
  return normalizeHue(userStart + ratio * userSpan)
}
