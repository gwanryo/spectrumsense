import { describe, it, expect } from 'vitest'
import {
  circularMidpoint,
  normalizeHue,
  circularDistance,
  hslString,
  COLOR_TRANSITIONS,
  SEARCH_RANGES,
  getDefaultBoundaryHue,
  computeRegionCenter,
  sampleHueRange,
  getColorName,
} from '../src/color'

describe('normalizeHue', () => {
  it('normalizes values above 360', () => {
    expect(normalizeHue(390)).toBe(30)
    expect(normalizeHue(360)).toBe(0)
    expect(normalizeHue(720)).toBe(0)
  })

  it('normalizes negative values', () => {
    expect(normalizeHue(-10)).toBe(350)
    expect(normalizeHue(-360)).toBe(0)
    expect(normalizeHue(-1)).toBe(359)
  })

  it('passes through values in range', () => {
    expect(normalizeHue(0)).toBe(0)
    expect(normalizeHue(180)).toBe(180)
    expect(normalizeHue(359)).toBe(359)
  })
})

describe('circularMidpoint', () => {
  it('CRITICAL: handles Violet→Red wrap-around (345° and 18°)', () => {
    const mid = circularMidpoint(345, 18)
    const isNearZero = mid >= 359 || mid <= 3
    expect(isNearZero).toBe(true)
    expect(mid).not.toBeGreaterThan(90)
  })

  it('handles normal case (0° and 60°)', () => {
    expect(circularMidpoint(0, 60)).toBeCloseTo(30, 0)
  })

  it('handles near-boundary case (350° and 10°)', () => {
    const mid = circularMidpoint(350, 10)
    const isNearZero = mid >= 355 || mid <= 5
    expect(isNearZero).toBe(true)
  })

  it('handles symmetric case (90° and 270°)', () => {
    const mid = circularMidpoint(90, 270)
    const isValid = Math.abs(mid - 0) < 5 || Math.abs(mid - 180) < 5 || mid > 355 || mid < 5
    expect(isValid).toBe(true)
  })

  it('handles same angle', () => {
    expect(circularMidpoint(45, 45)).toBeCloseTo(45, 0)
  })
})

describe('circularDistance', () => {
  it('computes positive clockwise distance', () => {
    expect(circularDistance(0, 90)).toBeCloseTo(90, 0)
    expect(circularDistance(350, 10)).toBeCloseTo(20, 0)
  })

  it('computes negative counter-clockwise distance', () => {
    expect(circularDistance(90, 0)).toBeCloseTo(-90, 0)
    expect(circularDistance(10, 350)).toBeCloseTo(-20, 0)
  })

  it('handles wrap-around correctly', () => {
    expect(circularDistance(355, 5)).toBeCloseTo(10, 0)
  })

  it('returns zero for identical angles', () => {
    expect(circularDistance(0, 0)).toBeCloseTo(0, 5)
    expect(circularDistance(180, 180)).toBeCloseTo(0, 5)
    expect(circularDistance(359, 359)).toBeCloseTo(0, 5)
  })
})

describe('hslString', () => {
  it('produces valid CSS HSL string', () => {
    expect(hslString(0)).toBe('hsl(0, 100%, 50%)')
    expect(hslString(120)).toBe('hsl(120, 100%, 50%)')
    expect(hslString(360)).toBe('hsl(0, 100%, 50%)')
  })

  it('normalizes hue before formatting', () => {
    expect(hslString(390)).toBe('hsl(30, 100%, 50%)')
    expect(hslString(-10)).toBe('hsl(350, 100%, 50%)')
  })
})

describe('COLOR_TRANSITIONS and SEARCH_RANGES', () => {
  it('has exactly 8 transitions and 8 ranges', () => {
    expect(COLOR_TRANSITIONS).toHaveLength(8)
    expect(SEARCH_RANGES).toHaveLength(8)
  })

  it('has correct color name pairs', () => {
    expect(COLOR_TRANSITIONS[0]).toEqual({ from: 'red', to: 'orange' })
    expect(COLOR_TRANSITIONS[3]).toEqual({ from: 'green', to: 'cyan' })
    expect(COLOR_TRANSITIONS[4]).toEqual({ from: 'cyan', to: 'blue' })
    expect(COLOR_TRANSITIONS[6]).toEqual({ from: 'violet', to: 'pink' })
    expect(COLOR_TRANSITIONS[7]).toEqual({ from: 'pink', to: 'red' })
  })

  it('Violet→Pink range has expected bounds', () => {
    expect(SEARCH_RANGES[6]).toEqual({ low: 280, high: 350 })
  })

  it('Pink→Red range has wrap-around high bound', () => {
    expect(SEARCH_RANGES[7]).toEqual({ low: 330, high: 390 })
  })

  it('all non-wrap ranges have low < high', () => {
    SEARCH_RANGES.slice(0, 7).forEach((r) => {
      expect(r.low).toBeLessThan(r.high)
    })
  })

  it('default boundary hue is midpoint of range with wrap normalization', () => {
    expect(getDefaultBoundaryHue(0)).toBeCloseTo(20, 5)
    expect(getDefaultBoundaryHue(7)).toBeCloseTo(0, 5)
  })
})

describe('computeRegionCenter', () => {
  it('returns arithmetic midpoint for non-wrap span', () => {
    expect(computeRegionCenter(100, 140)).toBeCloseTo(120, 5)
  })

  it('returns wrapped midpoint for cross-zero span', () => {
    expect(computeRegionCenter(350, 10)).toBeCloseTo(0, 5)
  })
})

describe('sampleHueRange', () => {
  it('returns evenly spaced stops for non-wrap ranges', () => {
    expect(sampleHueRange(100, 140, 5)).toEqual([100, 110, 120, 130, 140])
  })

  it('handles wrap-around ranges in clockwise direction', () => {
    expect(sampleHueRange(350, 10, 5)).toEqual([350, 355, 0, 5, 10])
  })

  it('returns duplicated stop for zero-span ranges', () => {
    expect(sampleHueRange(120, 120, 5)).toEqual([120, 120])
  })
})

describe('getColorName with 8 boundaries', () => {
  const boundaries = [20, 50, 90, 150, 210, 270, 325, 355]

  it('classifies all 8 color regions correctly', () => {
    expect(getColorName(358, boundaries)).toBe('red')
    expect(getColorName(10, boundaries)).toBe('red')
    expect(getColorName(30, boundaries)).toBe('orange')
    expect(getColorName(60, boundaries)).toBe('yellow')
    expect(getColorName(120, boundaries)).toBe('green')
    expect(getColorName(170, boundaries)).toBe('cyan')
    expect(getColorName(230, boundaries)).toBe('blue')
    expect(getColorName(280, boundaries)).toBe('violet')
    expect(getColorName(340, boundaries)).toBe('pink')
  })

  it('classifies hues exactly at boundary values as the "to" color', () => {
    expect(getColorName(20, boundaries)).toBe('orange')
    expect(getColorName(50, boundaries)).toBe('yellow')
    expect(getColorName(90, boundaries)).toBe('green')
    expect(getColorName(150, boundaries)).toBe('cyan')
    expect(getColorName(210, boundaries)).toBe('blue')
    expect(getColorName(270, boundaries)).toBe('violet')
    expect(getColorName(325, boundaries)).toBe('pink')
    expect(getColorName(355, boundaries)).toBe('red')
  })
})
