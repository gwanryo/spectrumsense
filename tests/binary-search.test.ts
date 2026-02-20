import { describe, expect, it } from 'vitest'
import {
  getNextHue,
  getResult,
  initBinarySearch,
  isComplete,
  recordChoice,
} from '../src/binary-search'
import { COLOR_TRANSITIONS, SEARCH_RANGES } from '../src/color'

function runSearch(
  boundaryIndex: number,
  choices: boolean[],
  maxSteps = 6
): { hues: number[]; result: number } {
  const transition = COLOR_TRANSITIONS[boundaryIndex]
  const range = SEARCH_RANGES[boundaryIndex]
  let state = initBinarySearch(transition, range, maxSteps)
  const hues: number[] = [getNextHue(state)]

  for (const choice of choices) {
    if (isComplete(state)) break
    state = recordChoice(state, choice)
    hues.push(getNextHue(state))
  }

  return { hues, result: getResult(state) }
}

describe('initBinarySearch', () => {
  it('initializes with correct transition and range', () => {
    const transition = COLOR_TRANSITIONS[1]
    const range = SEARCH_RANGES[1]
    const state = initBinarySearch(transition, range)
    expect(state.transition).toBe(transition)
    expect(state.searchRange).toBe(range)
    expect(state.step).toBe(0)
    expect(state.maxSteps).toBe(6)
  })

  it('initial hue is within search range', () => {
    for (let i = 0; i < 6; i++) {
      const state = initBinarySearch(COLOR_TRANSITIONS[i], SEARCH_RANGES[i])
      expect(state.currentHue).toBeGreaterThanOrEqual(SEARCH_RANGES[i].low)
      expect(state.currentHue).toBeLessThanOrEqual(SEARCH_RANGES[i].high)
    }
  })

  it('refine mode narrows range around previous result', () => {
    const previousResult = 48
    const state = initBinarySearch(COLOR_TRANSITIONS[1], SEARCH_RANGES[1], 3, previousResult)
    expect(state.low).toBeGreaterThanOrEqual(30)
    expect(state.high).toBeLessThanOrEqual(65)
    expect(state.low).toBeGreaterThanOrEqual(previousResult - 15)
    expect(state.high).toBeLessThanOrEqual(previousResult + 15)
  })
})

describe('recordChoice', () => {
  it('narrows range when choosing first (from color)', () => {
    let state = initBinarySearch(COLOR_TRANSITIONS[1], SEARCH_RANGES[1])
    const initialHue = state.currentHue
    state = recordChoice(state, true)
    expect(state.low).toBeGreaterThanOrEqual(initialHue - 1)
    expect(state.step).toBe(1)
  })

  it('narrows range when choosing second (to color)', () => {
    let state = initBinarySearch(COLOR_TRANSITIONS[1], SEARCH_RANGES[1])
    const initialHue = state.currentHue
    state = recordChoice(state, false)
    expect(state.high).toBeLessThanOrEqual(initialHue + 1)
    expect(state.step).toBe(1)
  })
})

describe('isComplete', () => {
  it('returns false before maxSteps', () => {
    const state = initBinarySearch(COLOR_TRANSITIONS[0], SEARCH_RANGES[0])
    expect(isComplete(state)).toBe(false)
  })

  it('returns true after maxSteps choices (non-oscillating)', () => {
    let state = initBinarySearch(COLOR_TRANSITIONS[1], SEARCH_RANGES[1], 6)
    for (let i = 0; i < 6; i++) {
      state = recordChoice(state, true)
    }
    expect(isComplete(state)).toBe(true)
  })

  it('completes at exactly maxSteps even with alternating choices', () => {
    let state = initBinarySearch(COLOR_TRANSITIONS[1], SEARCH_RANGES[1], 6)
    for (let i = 0; i < 6; i++) {
      state = recordChoice(state, i % 2 === 0)
    }
    expect(isComplete(state)).toBe(true)
    expect(state.maxSteps).toBe(6)
  })
})

describe('Normal boundary convergence (Orange->Yellow)', () => {
  it('all-first choices converges tightly toward high bound', () => {
    const { result } = runSearch(1, Array(6).fill(true))
    expect(result).toBeGreaterThanOrEqual(69)
    expect(result).toBeLessThanOrEqual(70)
  })

  it('all-second choices converges tightly toward low bound', () => {
    const { result } = runSearch(1, Array(6).fill(false))
    expect(result).toBeGreaterThanOrEqual(30)
    expect(result).toBeLessThanOrEqual(31)
  })

  it('alternating choices converges to stable mid-range', () => {
    const choices = [true, false, true, false, true, false]
    const { result } = runSearch(1, choices)
    expect(result).toBeGreaterThanOrEqual(56)
    expect(result).toBeLessThanOrEqual(57)
  })

  it('result is deterministic for same choices', () => {
    const choices = [true, false, true, true, false, false]
    const { result: firstResult } = runSearch(1, choices)
    const { result: secondResult } = runSearch(1, choices)
    expect(firstResult).toBeCloseTo(secondResult, 5)
  })

  it('ignores extra choices after completion', () => {
    const exact = runSearch(1, Array(6).fill(true))
    const overlong = runSearch(1, Array(20).fill(true))
    expect(overlong.hues).toHaveLength(exact.hues.length)
    expect(overlong.result).toBeCloseTo(exact.result, 6)
  })
})

describe('Violet->Pink boundary convergence (boundary index 5)', () => {
  it('initial hue is in violet-pink range', () => {
    const state = initBinarySearch(COLOR_TRANSITIONS[5], SEARCH_RANGES[5])
    const hue = state.currentHue
    expect(hue).toBeGreaterThanOrEqual(280)
    expect(hue).toBeLessThanOrEqual(350)
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
        expect(hue).toBeLessThanOrEqual(350)
      }
    }
  })

  it('final result is in violet-pink range', () => {
    const choices = [true, false, true, false, true, false]
    const { result } = runSearch(5, choices)
    expect(result).toBeGreaterThanOrEqual(280)
    expect(result).toBeLessThanOrEqual(350)
  })
})

describe('CRITICAL: Pink->Red wrap-around (boundary index 6)', () => {
  it('initial hue is in pink-red region (not green/blue)', () => {
    const state = initBinarySearch(COLOR_TRANSITIONS[6], SEARCH_RANGES[6])
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

describe('Refine mode', () => {
  it('refine mode uses 3 steps', () => {
    let state = initBinarySearch(COLOR_TRANSITIONS[1], SEARCH_RANGES[1], 3, 48)
    let count = 0
    while (!isComplete(state)) {
      state = recordChoice(state, true)
      count++
    }
    expect(count).toBe(3)
  })

  it('refine result is within +/-15 degrees of previous result', () => {
    const previousResult = 48
    let state = initBinarySearch(COLOR_TRANSITIONS[1], SEARCH_RANGES[1], 3, previousResult)
    for (let i = 0; i < 3; i++) {
      state = recordChoice(state, i % 2 === 0)
    }
    const result = getResult(state)
    expect(Math.abs(result - previousResult)).toBeLessThanOrEqual(15)
  })
})
