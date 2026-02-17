import { describe, it, expect } from 'vitest'
import {
  circularMidpoint,
  normalizeHue,
  circularDistance,
  hslString,
  BOUNDARIES,
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
  it('has exactly 6 boundaries', () => {
    expect(BOUNDARIES).toHaveLength(6)
  })

  it('has correct standard hues', () => {
    const hues = BOUNDARIES.map(b => b.standardHue)
    expect(hues).toEqual([18, 48, 78, 163, 258, 345])
  })

  it('has correct color name pairs', () => {
    expect(BOUNDARIES[0]).toMatchObject({ from: 'red', to: 'orange' })
    expect(BOUNDARIES[5]).toMatchObject({ from: 'violet', to: 'red' })
  })

  it('Violet→Red boundary has wrap-around range', () => {
    const vr = BOUNDARIES[5]
    expect(vr.searchRange.low).toBe(300)
    expect(vr.searchRange.high).toBe(390)
  })

  it('all non-wrap boundaries have low < high', () => {
    BOUNDARIES.slice(0, 5).forEach(b => {
      expect(b.searchRange.low).toBeLessThan(b.searchRange.high)
    })
  })
})
