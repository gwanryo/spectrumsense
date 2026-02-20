import type { Deviation, ColorRegion, ResultSummary } from './types'
import {
  COLOR_TRANSITIONS,
  COLOR_ORDER,
  STANDARD_COLORS,
  circularDistance,
  normalizeHue,
  getDefaultBoundaryHue,
  computeRegionCenter,
} from './color'

export function computeDeviations(userBoundaries: number[]): Deviation[] {
  const normalizedBoundaries = COLOR_TRANSITIONS.map((_, i) =>
    normalizeHue(userBoundaries[i] ?? getDefaultBoundaryHue(i))
  )
  const regions = getColorRegions(normalizedBoundaries)
  const regionByColor = new Map(regions.map((region, i) => [region.name, i]))

  return COLOR_ORDER.map((color) => {
    const regionIndex = regionByColor.get(color)
    if (regionIndex === undefined) {
      throw new Error(`Missing color region for ${color}`)
    }

    const region = regions[regionIndex]
    const userHue = computeRegionCenter(region.startHue, region.endHue)
    const referenceHue = STANDARD_COLORS[color]
    const difference = circularDistance(referenceHue, userHue)

    return {
      color,
      userHue,
      referenceHue,
      difference,
    }
  })
}

/**
 * Compute the hue ranges for each color based on user's perceived boundaries.
 * Returns ColorRegion objects describing each color's span on the hue wheel.
 * The regions collectively span 360°.
 */
export function getColorRegions(userBoundaries: number[]): ColorRegion[] {
  const normalized = COLOR_TRANSITIONS.map((_, i) =>
    normalizeHue(userBoundaries[i] ?? getDefaultBoundaryHue(i))
  )
  const regions: ColorRegion[] = []

  for (let i = 0; i < COLOR_TRANSITIONS.length; i++) {
    const transition = COLOR_TRANSITIONS[i]
    const startHue = normalized[i]
    const endHue = normalized[(i + 1) % COLOR_TRANSITIONS.length]

    // Compute span (handle wrap-around)
    let span = endHue - startHue
    if (span < 0) span += 360

    regions.push({
      name: transition.to, // The color that starts at this boundary
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
export function summarizeResults(
  deviations: Deviation[],
  userBoundaries?: number[],
): ResultSummary {
  const meanAbsoluteDeviation =
    deviations.reduce((sum, d) => sum + Math.abs(d.difference), 0) / deviations.length

  const mostShifted = deviations.reduce((max, d) =>
    Math.abs(d.difference) > Math.abs(max.difference) ? d : max
  )

  const colorRegions = getColorRegions(userBoundaries ?? deviations.map(d => d.userHue))

  return {
    deviations,
    meanAbsoluteDeviation,
    mostShifted,
    colorRegions,
  }
}
