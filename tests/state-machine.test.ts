import { describe, expect, it } from 'vitest'
import {
  advanceFromInterstitial,
  answerQuestion,
  createTestSession,
  getConsistencyScore,
  getCurrentQuestion,
  getTestResults,
  isTestComplete,
} from '../src/state-machine'

function runFullTest(
  mode: 'normal' | 'refine',
  previousResults?: any,
  alwaysTrue = true
): { count: number; results: any; state: any } {
  let state = createTestSession(mode, 'en', previousResults)
  let count = 0

  while (!isTestComplete(state)) {
    const choice = alwaysTrue ? true : count % 2 === 0
    state = answerQuestion(state, choice)
    count++

    if (state.phase === 'interstitial') {
      state = advanceFromInterstitial(state)
    }
  }

  return { count, results: getTestResults(state, 'en'), state }
}

describe('createTestSession', () => {
  it('normal mode includes catch trials in totalSteps', () => {
    const state = createTestSession('normal', 'en')
    expect(state.totalSteps).toBe(48)
    expect(state.mode).toBe('normal')
    expect(state.phase).toBe('testing')
  })

  it('refine mode includes catch trials in totalSteps', () => {
    const state = createTestSession('refine', 'en')
    expect(state.totalSteps).toBe(24)
    expect(state.mode).toBe('refine')
  })

  it('initializes 7 boundary states', () => {
    const state = createTestSession('normal', 'en')
    expect(state.boundaries).toHaveLength(7)
  })

  it('starts at step 0 with randomized boundary order', () => {
    const state = createTestSession('normal', 'en')
    expect(state.currentStep).toBe(0)
    expect(state.boundaryOrder).toHaveLength(7)
    expect(state.roundPosition).toBe(0)
    expect(state.currentBoundaryIndex).toBe(state.boundaryOrder[0])
  })

  it('shuffles boundary order (non-sequential over many runs)', () => {
    const firstIndices = new Set<number>()
    for (let i = 0; i < 50; i++) {
      const state = createTestSession('normal', 'en')
      firstIndices.add(state.currentBoundaryIndex)
    }
    expect(firstIndices.size).toBeGreaterThan(1)
  })
})

describe('getCurrentQuestion', () => {
  it('returns a valid question with hue and labels', () => {
    const state = createTestSession('normal', 'en')
    const question = getCurrentQuestion(state)
    expect(question.hue).toBeGreaterThanOrEqual(0)
    expect(question.hue).toBeLessThanOrEqual(360)
    expect(question.firstLabel).toMatch(/^colors\./)
    expect(question.secondLabel).toMatch(/^colors\./)
    expect(question.questionNumber).toBe(1)
    expect(question.totalQuestions).toBe(48)
  })

  it('question labels match a valid boundary pair', () => {
    const state = createTestSession('normal', 'en')
    const question = getCurrentQuestion(state)
    const labels = new Set([question.firstLabel, question.secondLabel])
    expect(labels.size).toBe(2)
    expect([...labels].every((l) => l.startsWith('colors.'))).toBe(true)
  })

  it('swapped flag affects label order', () => {
    const swappedSeen = new Set<boolean>()
    for (let i = 0; i < 50; i++) {
      const state = createTestSession('normal', 'en')
      const question = getCurrentQuestion(state)
      swappedSeen.add(question.swapped)
    }
    expect(swappedSeen.size).toBe(2)
  })
})

describe('answerQuestion', () => {
  it('advances step counter', () => {
    let state = createTestSession('normal', 'en')
    state = answerQuestion(state, true)
    expect(state.currentStep).toBe(1)
  })

  it('visits all 7 boundaries in each round', () => {
    let state = createTestSession('normal', 'en')
    const visited = new Set<number>()
    for (let i = 0; i < 7; i++) {
      visited.add(state.currentBoundaryIndex)
      state = answerQuestion(state, true)
      if (state.phase === 'interstitial') state = advanceFromInterstitial(state)
    }
    expect(visited.size).toBe(7)
  })

  it('sets phase to interstitial after answer', () => {
    let state = createTestSession('normal', 'en')
    state = answerQuestion(state, true)
    expect(state.phase).toBe('interstitial')
  })

  it('eventually reaches complete phase', () => {
    const { state } = runFullTest('normal')
    expect(state.phase).toBe('complete')
  })
})

describe('Normal mode with catch trials', () => {
  it('completes in 48 answers (42 real + 6 catch trials) with consistent choices', () => {
    const { count } = runFullTest('normal')
    expect(count).toBe(48)
  })

  it('returns 7 valid boundary hue values', () => {
    const { results } = runFullTest('normal')
    expect(results.boundaries).toHaveLength(7)
    for (const hue of results.boundaries) {
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThanOrEqual(360)
      expect(isNaN(hue)).toBe(false)
    }
  })

  it('result mode is normal', () => {
    const { results } = runFullTest('normal')
    expect(results.mode).toBe('normal')
  })

  it('records catch trial consistency', () => {
    const { state } = runFullTest('normal')
    expect(state.catchTrialResults.length).toBe(6)
  })

  it('consistency score is 1.0 with consistent choices', () => {
    const { state } = runFullTest('normal')
    expect(getConsistencyScore(state)).toBe(1)
  })
})

describe('Refine mode with catch trials', () => {
  it('completes in 24 answers (21 real + 3 catch trials) with consistent choices', () => {
    const { results: normalResults } = runFullTest('normal')
    const { count } = runFullTest('refine', normalResults)
    expect(count).toBe(24)
  })

  it('refine results are within +/-15 degrees of normal results', () => {
    const { results: normalResults } = runFullTest('normal')
    const { results: refineResults } = runFullTest('refine', normalResults)

    for (let i = 0; i < 7; i++) {
      const diff = Math.abs(refineResults.boundaries[i] - normalResults.boundaries[i])
      const circularDiff = Math.min(diff, 360 - diff)
      expect(circularDiff).toBeLessThanOrEqual(15)
    }
  })
})

describe('Adaptive step extension', () => {
  it('extends total steps when oscillation triggers adaptive behavior', () => {
    const { count } = runFullTest('normal', undefined, false)
    expect(count).toBeGreaterThan(48)
  })
})

describe('advanceFromInterstitial', () => {
  it('changes phase from interstitial to testing', () => {
    let state = createTestSession('normal', 'en')
    state = answerQuestion(state, true)
    expect(state.phase).toBe('interstitial')
    state = advanceFromInterstitial(state)
    expect(state.phase).toBe('testing')
  })

  it('transitions to catch_trial when pending', () => {
    let state = createTestSession('normal', 'en')
    for (let i = 0; i < 7; i++) {
      state = answerQuestion(state, true)
      if (state.phase === 'interstitial' && !state.pendingCatchTrial) {
        state = advanceFromInterstitial(state)
      }
    }
    if (state.pendingCatchTrial) {
      state = advanceFromInterstitial(state)
      expect(state.phase).toBe('catch_trial')
    }
  })

  it('does nothing if not in interstitial phase', () => {
    const state = createTestSession('normal', 'en')
    expect(state.phase).toBe('testing')
    const unchanged = advanceFromInterstitial(state)
    expect(unchanged.phase).toBe('testing')
  })
})
