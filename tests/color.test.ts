import { describe, it, expect } from 'vitest'
import {
  circularMidpoint,
  normalizeHue,
  circularDistance,
  hslString,
  BOUNDARIES,
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
    // Should be ~1.5°, NOT 181.5° (the naive average)
    // Accept range: 359° to 3° (wrapping around 0°)
    const isNearZero = mid >= 359 || mid <= 3
    expect(isNearZero).toBe(true)
    // Definitely NOT in the green/blue range
    expect(mid).not.toBeGreaterThan(90)
  })

  it('handles normal case (0° and 60°)', () => {
    expect(circularMidpoint(0, 60)).toBeCloseTo(30, 0)
  })

  it('handles near-boundary case (350° and 10°)', () => {
    const mid = circularMidpoint(350, 10)
    // Should be ~0°, wrapping around
    const isNearZero = mid >= 355 || mid <= 5
    expect(isNearZero).toBe(true)
  })

  it('handles symmetric case (90° and 270°)', () => {
    // 90° and 270° are opposite — midpoint could be 0° or 180°
    // Both are valid circular midpoints; just verify it's one of them
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
    // From 355° to 5° = +10° (clockwise), not -350°
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

describe('BOUNDARIES', () => {
  it('has exactly 7 boundaries', () => {
    expect(BOUNDARIES).toHaveLength(7)
  })

  it('has correct standard hues', () => {
    const hues = BOUNDARIES.map(b => b.standardHue)
    expect(hues).toEqual([18, 48, 78, 163, 258, 300, 345])
  })

  it('has correct color name pairs', () => {
    expect(BOUNDARIES[0]).toMatchObject({ from: 'red', to: 'orange' })
    expect(BOUNDARIES[5]).toMatchObject({ from: 'violet', to: 'pink' })
    expect(BOUNDARIES[6]).toMatchObject({ from: 'pink', to: 'red' })
  })

  it('Violet→Pink boundary has expected range', () => {
    const vp = BOUNDARIES[5]
    expect(vp.searchRange.low).toBe(280)
    expect(vp.searchRange.high).toBe(325)
  })

  it('Pink→Red boundary has wrap-around range', () => {
    const pr = BOUNDARIES[6]
    expect(pr.searchRange.low).toBe(320)
    expect(pr.searchRange.high).toBe(390)
  })

  it('all non-wrap boundaries have low < high', () => {
    BOUNDARIES.slice(0, 6).forEach(b => {
      expect(b.searchRange.low).toBeLessThan(b.searchRange.high)
    })
  })
})

describe('getColorName with 7 boundaries', () => {
  const boundaries = BOUNDARIES.map(b => b.standardHue)

  it('classifies all 7 color regions correctly', () => {
    expect(getColorName(350, boundaries)).toBe('red')
    expect(getColorName(10, boundaries)).toBe('red')
    expect(getColorName(30, boundaries)).toBe('orange')
    expect(getColorName(60, boundaries)).toBe('yellow')
    expect(getColorName(120, boundaries)).toBe('green')
    expect(getColorName(200, boundaries)).toBe('blue')
    expect(getColorName(280, boundaries)).toBe('violet')
    expect(getColorName(320, boundaries)).toBe('pink')
  })

  it('classifies hues exactly at boundary values as the "to" color', () => {
    expect(getColorName(18, boundaries)).toBe('orange')
    expect(getColorName(48, boundaries)).toBe('yellow')
    expect(getColorName(78, boundaries)).toBe('green')
    expect(getColorName(163, boundaries)).toBe('blue')
    expect(getColorName(258, boundaries)).toBe('violet')
    expect(getColorName(300, boundaries)).toBe('pink')
    expect(getColorName(345, boundaries)).toBe('red')
  })
})
