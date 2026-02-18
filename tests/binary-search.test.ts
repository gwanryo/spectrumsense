import { describe, expect, it } from 'vitest'
import {
  countOscillations,
  getNextHue,
  getResult,
  initBinarySearch,
  isComplete,
  recordChoice,
} from '../src/binary-search'
import { BOUNDARIES } from '../src/color'

function runSearch(
  boundaryIndex: number,
  choices: boolean[],
  maxSteps = 6
): { hues: number[]; result: number } {
  const boundary = BOUNDARIES[boundaryIndex]
  let state = initBinarySearch(boundary, maxSteps)
  const hues: number[] = [getNextHue(state)]

  for (const choice of choices) {
    if (isComplete(state)) break
    state = recordChoice(state, choice)
    hues.push(getNextHue(state))
  }

  return { hues, result: getResult(state) }
}

describe('initBinarySearch', () => {
  it('initializes with correct boundary', () => {
    const boundary = BOUNDARIES[1]
    const state = initBinarySearch(boundary)
    expect(state.boundary).toBe(boundary)
    expect(state.step).toBe(0)
    expect(state.maxSteps).toBe(6)
  })

  it('initial hue is within search range', () => {
    for (const boundary of BOUNDARIES.slice(0, 6)) {
      const state = initBinarySearch(boundary)
      expect(state.currentHue).toBeGreaterThanOrEqual(boundary.searchRange.low)
      expect(state.currentHue).toBeLessThanOrEqual(boundary.searchRange.high)
    }
  })

  it('refine mode narrows range around previous result', () => {
    const boundary = BOUNDARIES[1]
    const previousResult = 48
    const state = initBinarySearch(boundary, 3, previousResult)
    expect(state.low).toBeGreaterThanOrEqual(30)
    expect(state.high).toBeLessThanOrEqual(65)
    expect(state.low).toBeGreaterThanOrEqual(previousResult - 15)
    expect(state.high).toBeLessThanOrEqual(previousResult + 15)
  })
})

describe('recordChoice', () => {
  it('narrows range when choosing first (from color)', () => {
    const boundary = BOUNDARIES[1]
    let state = initBinarySearch(boundary)
    const initialHue = state.currentHue
    state = recordChoice(state, true)
    expect(state.low).toBeGreaterThanOrEqual(initialHue - 1)
    expect(state.step).toBe(1)
  })

  it('narrows range when choosing second (to color)', () => {
    const boundary = BOUNDARIES[1]
    let state = initBinarySearch(boundary)
    const initialHue = state.currentHue
    state = recordChoice(state, false)
    expect(state.high).toBeLessThanOrEqual(initialHue + 1)
    expect(state.step).toBe(1)
  })
})

describe('isComplete', () => {
  it('returns false before maxSteps', () => {
    const state = initBinarySearch(BOUNDARIES[0])
    expect(isComplete(state)).toBe(false)
  })

  it('returns true after maxSteps choices (non-oscillating)', () => {
    const boundary = BOUNDARIES[1]
    let state = initBinarySearch(boundary, 6)
    for (let i = 0; i < 6; i++) {
      state = recordChoice(state, true)
    }
    expect(isComplete(state)).toBe(true)
  })

  it('extends maxSteps when oscillation exceeds threshold', () => {
    const boundary = BOUNDARIES[1]
    let state = initBinarySearch(boundary, 6)
    for (let i = 0; i < 6; i++) {
      state = recordChoice(state, i % 2 === 0)
    }
    expect(isComplete(state)).toBe(false)
    expect(state.maxSteps).toBeGreaterThan(6)
  })
})

describe('Normal boundary convergence (Orange->Yellow)', () => {
  it('all-first choices converges near low bound', () => {
    const { result } = runSearch(1, Array(6).fill(true))
    expect(result).toBeGreaterThanOrEqual(30)
    expect(result).toBeLessThanOrEqual(65)
  })

  it('all-second choices converges near high bound', () => {
    const { result } = runSearch(1, Array(6).fill(false))
    expect(result).toBeGreaterThanOrEqual(30)
    expect(result).toBeLessThanOrEqual(65)
  })

  it('alternating choices converges to mid-range', () => {
    const choices = [true, false, true, false, true, false]
    const { result } = runSearch(1, choices)
    expect(result).toBeGreaterThanOrEqual(30)
    expect(result).toBeLessThanOrEqual(65)
  })

  it('result is deterministic for same choices', () => {
    const choices = [true, false, true, true, false, false]
    const { result: firstResult } = runSearch(1, choices)
    const { result: secondResult } = runSearch(1, choices)
    expect(firstResult).toBeCloseTo(secondResult, 5)
  })
})

describe('Violet->Pink boundary convergence (boundary index 5)', () => {
  it('initial hue is in violet-pink range', () => {
    const boundary = BOUNDARIES[5]
    const state = initBinarySearch(boundary)
    const hue = state.currentHue
    expect(hue).toBeGreaterThanOrEqual(280)
    expect(hue).toBeLessThanOrEqual(325)
  })

  it('all intermediate hues stay in violet-pink range', () => {
    const choicePatterns = [
      Array(6).fill(true),
      Array(6).fill(false),
      [true, false, true, false, true, false],
      [false, true, false, true, false, true],
    ]

    for (const choices of choicePatterns) {
      const { hues } = runSearch(5, choices)
      for (const hue of hues) {
        expect(hue).toBeGreaterThanOrEqual(280)
        expect(hue).toBeLessThanOrEqual(325)
      }
    }
  })

  it('final result is in violet-pink range', () => {
    const choices = [true, false, true, false, true, false]
    const { result } = runSearch(5, choices)
    expect(result).toBeGreaterThanOrEqual(280)
    expect(result).toBeLessThanOrEqual(325)
  })
})

describe('CRITICAL: Pink->Red wrap-around (boundary index 6)', () => {
  it('initial hue is in pink-red region (not green/blue)', () => {
    const boundary = BOUNDARIES[6]
    const state = initBinarySearch(boundary)
    const hue = state.currentHue
    const isInValidRange = hue >= 300 || hue <= 30
    expect(isInValidRange).toBe(true)
  })

  it('ALL intermediate hues stay in pink-red region', () => {
    const choicePatterns = [
      Array(6).fill(true),
      Array(6).fill(false),
      [true, false, true, false, true, false],
      [false, true, false, true, false, true],
    ]

    for (const choices of choicePatterns) {
      const { hues } = runSearch(6, choices)
      for (const hue of hues) {
        const isInValidRange = hue >= 300 || hue <= 30
        expect(isInValidRange).toBe(true)
      }
    }
  })

  it('final result is in pink-red region', () => {
    const choices = [true, false, true, false, true, false]
    const { result } = runSearch(6, choices)
    const isInValidRange = result >= 300 || result <= 30
    expect(isInValidRange).toBe(true)
  })

  it('never produces a hue near 181 degrees (the naive midpoint error)', () => {
    const { hues } = runSearch(6, [true, false, true, false, true, false])
    for (const hue of hues) {
      expect(Math.abs(hue - 181)).toBeGreaterThan(50)
    }
  })
})

describe('countOscillations', () => {
  it('returns 0 for consistent choices', () => {
    expect(countOscillations([true, true, true])).toBe(0)
    expect(countOscillations([false, false, false])).toBe(0)
  })

  it('counts direction changes', () => {
    expect(countOscillations([true, false, true])).toBe(2)
    expect(countOscillations([true, false, true, false, true, false])).toBe(5)
  })

  it('returns 0 for empty or single-element arrays', () => {
    expect(countOscillations([])).toBe(0)
    expect(countOscillations([true])).toBe(0)
  })
})

describe('Refine mode', () => {
  it('refine mode uses 3 steps', () => {
    const boundary = BOUNDARIES[1]
    let state = initBinarySearch(boundary, 3, 48)
    let count = 0
    while (!isComplete(state)) {
      state = recordChoice(state, true)
      count++
    }
    expect(count).toBe(3)
  })

  it('refine result is within +/-15 degrees of previous result', () => {
    const boundary = BOUNDARIES[1]
    const previousResult = 48
    let state = initBinarySearch(boundary, 3, previousResult)
    for (let i = 0; i < 3; i++) {
      state = recordChoice(state, i % 2 === 0)
    }
    const result = getResult(state)
    expect(Math.abs(result - previousResult)).toBeLessThanOrEqual(15)
  })
})
