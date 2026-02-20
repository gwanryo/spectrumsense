import type { ColorTransition, ColorName, SearchRange } from './types'

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

// Adjacent color-pair transitions on the hue wheel.
export const COLOR_TRANSITIONS: ColorTransition[] = COLOR_ORDER.map((from, i) => ({
  from,
  to: COLOR_ORDER[(i + 1) % COLOR_ORDER.length],
}))

// Per-transition binary-search ranges.
// Length MUST equal COLOR_TRANSITIONS.length — see assertion below.
export const SEARCH_RANGES: SearchRange[] = [
  { low: 0, high: 40 },
  { low: 30, high: 70 },
  { low: 55, high: 120 },
  { low: 120, high: 230 },
  { low: 220, high: 310 },
  { low: 280, high: 350 },
  { low: 330, high: 390 },
  // Note: 390 = 360 + 30, representing wrap-around to 30° past 0°
]

if (COLOR_TRANSITIONS.length !== SEARCH_RANGES.length) {
  throw new Error(
    `COLOR_TRANSITIONS (${COLOR_TRANSITIONS.length}) and SEARCH_RANGES (${SEARCH_RANGES.length}) must have the same length`
  )
}

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

/** Region center as the circular midpoint of a user color span. */
export function computeRegionCenter(userStart: number, userEnd: number): number {
  const userSpan = clockwiseSpan(userStart, userEnd)
  return normalizeHue(userStart + userSpan / 2)
}

/**
 * Sample evenly spaced hue stops over a clockwise span.
 * Useful for rendering user-region gradients (start → end).
 */
export function sampleHueRange(userStart: number, userEnd: number, steps: number = 7): number[] {
  const safeSteps = Math.max(2, Math.floor(steps))
  const span = clockwiseSpan(userStart, userEnd)
  if (span === 0) { const h = normalizeHue(userStart); return [h, h] }

  return Array.from({ length: safeSteps }, (_, i) =>
    normalizeHue(userStart + (span * i) / (safeSteps - 1))
  )
}

/** Default boundary hue used when boundary data is missing. */
export function getDefaultBoundaryHue(boundaryIndex: number): number {
  const range = SEARCH_RANGES[boundaryIndex]
  if (!range) return 0
  return normalizeHue((range.low + range.high) / 2)
}

export function huePositionInRange(targetHue: number, startHue: number, endHue: number): number | null {
  const span = clockwiseSpan(startHue, endHue)
  if (span <= 0) return null
  const offset = clockwiseSpan(startHue, targetHue)
  return offset < span ? offset / span : null
}
