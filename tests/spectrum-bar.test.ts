import { describe, it, expect } from 'vitest'
import { getColorName, BOUNDARIES } from '../src/color'

describe('spectrum bar label positioning', () => {
  it('verifies label midpoints fall in correct color regions', () => {
    // Use standard boundaries for this test
    const boundaries = BOUNDARIES.map(b => b.standardHue)
    // [18, 48, 78, 163, 258, 300, 345]

    const expectedColors: Array<'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'pink'> = [
      'red',
      'orange',
      'yellow',
      'green',
      'blue',
      'violet',
      'pink',
    ]

    // Simulate the fixed drawColorLabels logic
    for (let i = 0; i < 7; i++) {
      const startHue = boundaries[(i + 6) % 7]
      const endHue = boundaries[i]

      // Compute circular midpoint (simplified version of circularMidpoint)
      const aRad = (startHue * Math.PI) / 180
      const bRad = (endHue * Math.PI) / 180
      const sinMean = (Math.sin(aRad) + Math.sin(bRad)) / 2
      const cosMean = (Math.cos(aRad) + Math.cos(bRad)) / 2
      const midRad = Math.atan2(sinMean, cosMean)
      const midHue = ((midRad * 180) / Math.PI + 360) % 360

      // Verify the label's midpoint falls in the correct color region
      const colorAtMidpoint = getColorName(midHue, boundaries)
      expect(colorAtMidpoint).toBe(expectedColors[i])
    }
  })
})
