import { describe, it, expect } from 'vitest'
import { computeDeviations, getColorRegions, summarizeResults } from '../src/result'
import { BOUNDARIES, COLOR_ORDER, STANDARD_COLORS } from '../src/color'

const standardBoundaries = BOUNDARIES.map(b => b.standardHue)
// [20, 50, 90, 180, 270, 325, 355]

function deviationMap(boundaries: number[]) {
  return new Map(computeDeviations(boundaries).map(d => [d.color, d]))
}

describe('computeDeviations', () => {
  it('returns zero deviation for exact standard boundaries', () => {
    const deviations = computeDeviations(standardBoundaries)
    expect(deviations).toHaveLength(7)
    for (const d of deviations) {
      expect(d.difference).toBeCloseTo(0, 5)
    }
  })

  it('uses STANDARD_COLORS as the reference hue for each color', () => {
    const deviations = computeDeviations(standardBoundaries)
    for (const d of deviations) {
      expect(d.standardHue).toBe(STANDARD_COLORS[d.color])
    }
  })

  it('reflects clockwise shift on adjacent color centers', () => {
    const shifted = [...standardBoundaries]
    shifted[0] = 28
    const byColor = deviationMap(shifted)

    expect(byColor.get('red')!.difference).toBeGreaterThan(0)
    expect(byColor.get('orange')!.difference).toBeGreaterThan(0)
    expect(Math.abs(byColor.get('blue')!.difference)).toBeCloseTo(0, 5)
  })

  it('reflects counter-clockwise shift on adjacent color centers', () => {
    const shifted = [...standardBoundaries]
    shifted[1] = 38
    const byColor = deviationMap(shifted)

    expect(byColor.get('orange')!.difference).toBeLessThan(0)
    expect(byColor.get('yellow')!.difference).toBeLessThan(0)
    expect(Math.abs(byColor.get('violet')!.difference)).toBeCloseTo(0, 5)
  })

  it('handles Pink→Red wrap-around as a small circular shift', () => {
    const shifted = [...standardBoundaries]
    shifted[6] = 5
    const byColor = deviationMap(shifted)

    const redDiff = byColor.get('red')!.difference
    const pinkDiff = byColor.get('pink')!.difference

    expect(redDiff).toBeGreaterThan(0)
    expect(pinkDiff).toBeGreaterThan(0)
    expect(Math.abs(redDiff)).toBeLessThan(180)
    expect(Math.abs(pinkDiff)).toBeLessThan(180)
  })

  it('returns 7 deviations in COLOR_ORDER', () => {
    const deviations = computeDeviations(standardBoundaries)
    expect(deviations).toHaveLength(7)
    expect(deviations.map(d => d.color)).toEqual(COLOR_ORDER)
  })

  it('falls back to standard hues when input has fewer than 7 boundaries', () => {
    const partial = [20, 50]
    const deviations = computeDeviations(partial)
    expect(deviations).toHaveLength(7)
    for (const d of deviations) {
      expect(d.standardHue).toBe(STANDARD_COLORS[d.color])
      expect(d.difference).toBeCloseTo(0, 5)
    }
  })
})

describe('getColorRegions', () => {
  it('returns 7 regions', () => {
    const regions = getColorRegions(standardBoundaries)
    expect(regions).toHaveLength(7)
  })

  it('regions span approximately 360° total', () => {
    const regions = getColorRegions(standardBoundaries)
    const totalSpan = regions.reduce((sum, r) => sum + r.spanDegrees, 0)
    expect(totalSpan).toBeCloseTo(360, 0)
  })

  it('all spans are positive', () => {
    const regions = getColorRegions(standardBoundaries)
    for (const region of regions) {
      expect(region.spanDegrees).toBeGreaterThan(0)
    }
  })

  it('handles shifted boundaries correctly', () => {
    const shifted = [20, 50, 80, 165, 260, 305, 340]
    const regions = getColorRegions(shifted)
    const totalSpan = regions.reduce((sum, r) => sum + r.spanDegrees, 0)
    expect(totalSpan).toBeCloseTo(360, 0)
  })

  it('keeps zero-width region when adjacent boundaries are equal', () => {
    const withDuplicate = [18, 18, 78, 163, 258, 300, 345]
    const regions = getColorRegions(withDuplicate)
    expect(regions[0].spanDegrees).toBeCloseTo(0, 5)
    const totalSpan = regions.reduce((sum, r) => sum + r.spanDegrees, 0)
    expect(totalSpan).toBeCloseTo(360, 5)
  })
})

describe('summarizeResults', () => {
  it('computes mean absolute deviation', () => {
    const deviations = computeDeviations(standardBoundaries)
    const summary = summarizeResults(deviations, standardBoundaries)
    expect(summary.meanAbsoluteDeviation).toBeCloseTo(0, 5)
  })

  it('identifies most shifted color', () => {
    const shifted = [...standardBoundaries]
    shifted[2] = 110 // Yellow→Green shifted by +20°
    const deviations = computeDeviations(shifted)
    const summary = summarizeResults(deviations, shifted)
    expect(summary.mostShifted.color).toBe('green')
  })

  it('includes color regions', () => {
    const deviations = computeDeviations(standardBoundaries)
    const summary = summarizeResults(deviations, standardBoundaries)
    expect(summary.colorRegions).toHaveLength(7)
    const totalSpan = summary.colorRegions.reduce((sum, r) => sum + r.spanDegrees, 0)
    expect(totalSpan).toBeCloseTo(360, 0)
  })
})

