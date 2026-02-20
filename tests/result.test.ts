import { describe, it, expect } from 'vitest'
import { computeDeviations, getColorRegions, summarizeResults } from '../src/result'
import { COLOR_ORDER, COLOR_TRANSITIONS, STANDARD_COLORS, getDefaultBoundaryHue } from '../src/color'

const defaultBoundaries = COLOR_TRANSITIONS.map((_, i) => getDefaultBoundaryHue(i))

function deviationMap(boundaries: number[]) {
  return new Map(computeDeviations(boundaries).map(d => [d.color, d]))
}

describe('computeDeviations', () => {
  it('returns 7 deviations in COLOR_ORDER', () => {
    const deviations = computeDeviations(defaultBoundaries)
    expect(deviations).toHaveLength(7)
    expect(deviations.map(d => d.color)).toEqual(COLOR_ORDER)
  })

  it('uses STANDARD_COLORS as the reference hue for each color', () => {
    const deviations = computeDeviations(defaultBoundaries)
    for (const d of deviations) {
      expect(d.referenceHue).toBe(STANDARD_COLORS[d.color])
    }
  })

  it('reflects clockwise shift on adjacent color centers', () => {
    const shifted = [...defaultBoundaries]
    shifted[0] += 8

    const base = deviationMap(defaultBoundaries)
    const next = deviationMap(shifted)

    expect(next.get('red')!.difference).toBeGreaterThan(base.get('red')!.difference)
    expect(next.get('orange')!.difference).toBeGreaterThan(base.get('orange')!.difference)
    expect(Math.abs(next.get('blue')!.difference - base.get('blue')!.difference)).toBeLessThan(1)
  })

  it('reflects counter-clockwise shift on adjacent color centers', () => {
    const shifted = [...defaultBoundaries]
    shifted[1] -= 10

    const base = deviationMap(defaultBoundaries)
    const next = deviationMap(shifted)

    expect(next.get('orange')!.difference).toBeLessThan(base.get('orange')!.difference)
    expect(next.get('yellow')!.difference).toBeLessThan(base.get('yellow')!.difference)
    expect(Math.abs(next.get('violet')!.difference - base.get('violet')!.difference)).toBeLessThan(1)
  })

  it('handles Pink→Red wrap-around as a small circular shift', () => {
    const shifted = [...defaultBoundaries]
    shifted[6] = 5
    const byColor = deviationMap(shifted)

    const redDiff = byColor.get('red')!.difference
    const pinkDiff = byColor.get('pink')!.difference

    expect(Math.abs(redDiff)).toBeLessThan(180)
    expect(Math.abs(pinkDiff)).toBeLessThan(180)
  })

  it('falls back to default boundary hues when input has fewer than 7 boundaries', () => {
    const partial = [10, 60]
    const filled = COLOR_TRANSITIONS.map((_, i) => partial[i] ?? getDefaultBoundaryHue(i))
    expect(computeDeviations(partial)).toEqual(computeDeviations(filled))
  })
})

describe('getColorRegions', () => {
  it('returns 7 regions', () => {
    const regions = getColorRegions(defaultBoundaries)
    expect(regions).toHaveLength(7)
  })

  it('regions span approximately 360° total', () => {
    const regions = getColorRegions(defaultBoundaries)
    const totalSpan = regions.reduce((sum, r) => sum + r.spanDegrees, 0)
    expect(totalSpan).toBeCloseTo(360, 0)
  })

  it('all spans are non-negative', () => {
    const regions = getColorRegions(defaultBoundaries)
    for (const region of regions) {
      expect(region.spanDegrees).toBeGreaterThanOrEqual(0)
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
    const deviations = computeDeviations(defaultBoundaries)
    const summary = summarizeResults(deviations, defaultBoundaries)
    const expected = deviations.reduce((sum, d) => sum + Math.abs(d.difference), 0) / deviations.length
    expect(summary.meanAbsoluteDeviation).toBeCloseTo(expected, 8)
  })

  it('identifies most shifted color by absolute difference', () => {
    const shifted = [...defaultBoundaries]
    shifted[2] = 110
    const deviations = computeDeviations(shifted)
    const summary = summarizeResults(deviations, shifted)
    const maxAbs = Math.max(...deviations.map((d) => Math.abs(d.difference)))
    expect(Math.abs(summary.mostShifted.difference)).toBeCloseTo(maxAbs, 8)
  })

  it('includes color regions', () => {
    const deviations = computeDeviations(defaultBoundaries)
    const summary = summarizeResults(deviations, defaultBoundaries)
    expect(summary.colorRegions).toHaveLength(7)
    const totalSpan = summary.colorRegions.reduce((sum, r) => sum + r.spanDegrees, 0)
    expect(totalSpan).toBeCloseTo(360, 0)
  })
})
