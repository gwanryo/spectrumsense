import { describe, it, expect } from 'vitest'
import { computeMarkerOffsets } from '../src/canvas/spectrum-bar'
import { BOUNDARIES } from '../src/color'

describe('computeMarkerOffsets', () => {
  it('returns one marker entry per boundary', () => {
    const boundaries = BOUNDARIES.map((b) => b.standardHue)
    const offsets = computeMarkerOffsets(boundaries, 700)
    expect(offsets).toHaveLength(7)
  })

  it('has zero degreeDiff when user boundaries match standard', () => {
    const boundaries = BOUNDARIES.map((b) => b.standardHue)
    const offsets = computeMarkerOffsets(boundaries, 700)
    for (const offset of offsets) {
      expect(offset.degreeDiff).toBeCloseTo(0, 5)
      expect(offset.userX).toBeCloseTo(offset.standardX, 5)
    }
  })

  it('normalizes differences into (-180, 180] for wrap-around values', () => {
    const boundaries = [350, 48, 78, 163, 258, 300, 5]
    const offsets = computeMarkerOffsets(boundaries, 700)
    expect(offsets[0].degreeDiff).toBeCloseTo(-28, 0)
    expect(offsets[6].degreeDiff).toBeCloseTo(20, 0)
    for (const offset of offsets) {
      expect(offset.degreeDiff).toBeGreaterThanOrEqual(-180)
      expect(offset.degreeDiff).toBeLessThanOrEqual(180)
    }
  })

  it('falls back to standard hue when boundary value is missing', () => {
    const partial = [18, 48]
    const offsets = computeMarkerOffsets(partial, 700)
    expect(offsets[2].degreeDiff).toBeCloseTo(0, 5)
    expect(offsets[6].degreeDiff).toBeCloseTo(0, 5)
  })
})
