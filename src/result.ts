import type { Deviation, ColorRegion, ResultSummary } from './types'
import { BOUNDARIES, circularDistance, normalizeHue } from './color'

/**
 * Compute signed deviations between user's 6 boundary values and standard values.
 * Positive = shifted clockwise, negative = shifted counter-clockwise.
 * Uses circular distance to handle the 0°/360° wrap-around correctly.
 */
export function computeDeviations(userBoundaries: number[]): Deviation[] {
  return BOUNDARIES.map((boundary, i) => {
    const userHue = normalizeHue(userBoundaries[i] ?? boundary.standardHue)
    const standardHue = boundary.standardHue
    // circularDistance(a, b) = signed distance from a to b
    // Positive = b is clockwise from a
    const difference = circularDistance(standardHue, userHue)

    return {
      boundary,
      userHue,
      standardHue,
      difference,
    }
  })
}

/**
 * Compute the hue ranges for each color based on user's perceived boundaries.
 * Returns 6 ColorRegion objects describing each color's span on the hue wheel.
 * The regions collectively span 360°.
 */
export function getColorRegions(userBoundaries: number[]): ColorRegion[] {
  const normalized = userBoundaries.map(normalizeHue)
  const regions: ColorRegion[] = []

  for (let i = 0; i < BOUNDARIES.length; i++) {
    const boundary = BOUNDARIES[i]
    const startHue = normalized[i]
    const endHue = normalized[(i + 1) % 6]

    // Compute span (handle wrap-around)
    let span = endHue - startHue
    if (span <= 0) span += 360

    regions.push({
      name: boundary.to, // The color that starts at this boundary
      startHue,
      endHue,
      spanDegrees: span,
    })
  }

  return regions
}

/**
 * Aggregate deviation statistics into a summary.
 */
export function summarizeResults(deviations: Deviation[]): ResultSummary {
  const meanAbsoluteDeviation =
    deviations.reduce((sum, d) => sum + Math.abs(d.difference), 0) / deviations.length

  const mostShiftedBoundary = deviations.reduce((max, d) =>
    Math.abs(d.difference) > Math.abs(max.difference) ? d : max
  )

  const colorRegions = getColorRegions(deviations.map(d => d.userHue))

  return {
    deviations,
    meanAbsoluteDeviation,
    mostShiftedBoundary,
    colorRegions,
  }
}
