import { describe, expect, it } from 'vitest'
import {
  advanceFromInterstitial,
  answerQuestion,
  createTestSession,
  getCurrentQuestion,
  getTestResults,
  isTestComplete,
} from '../src/state-machine'

function runFullTest(
  mode: 'normal' | 'refine',
  previousResults?: any
): { count: number; results: any } {
  let state = createTestSession(mode, 'en', previousResults)
  let count = 0

  while (!isTestComplete(state)) {
    state = answerQuestion(state, count % 2 === 0)
    count++

    if (state.phase === 'interstitial') {
      state = advanceFromInterstitial(state)
    }
  }

  return { count, results: getTestResults(state, 'en') }
}

describe('createTestSession', () => {
  it('normal mode has 36 total steps', () => {
    const state = createTestSession('normal', 'en')
    expect(state.totalSteps).toBe(36)
    expect(state.mode).toBe('normal')
    expect(state.phase).toBe('testing')
  })

  it('refine mode has 18 total steps', () => {
    const state = createTestSession('refine', 'en')
    expect(state.totalSteps).toBe(18)
    expect(state.mode).toBe('refine')
  })

  it('initializes 6 boundary states', () => {
    const state = createTestSession('normal', 'en')
    expect(state.boundaries).toHaveLength(6)
  })

  it('starts at boundary index 0, step 0', () => {
    const state = createTestSession('normal', 'en')
    expect(state.currentBoundaryIndex).toBe(0)
    expect(state.currentStep).toBe(0)
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
    expect(question.totalQuestions).toBe(36)
  })

  it('first question is for Red->Orange boundary', () => {
    const state = createTestSession('normal', 'en')
    const question = getCurrentQuestion(state)
    expect(question.firstLabel).toBe('colors.red')
    expect(question.secondLabel).toBe('colors.orange')
  })
})

describe('answerQuestion', () => {
  it('advances step counter', () => {
    let state = createTestSession('normal', 'en')
    state = answerQuestion(state, true)
    expect(state.currentStep).toBe(1)
  })

  it('cycles through boundaries', () => {
    let state = createTestSession('normal', 'en')
    for (let i = 0; i < 6; i++) {
      state = answerQuestion(state, true)
      if (state.phase === 'interstitial') state = advanceFromInterstitial(state)
    }
    expect(state.currentBoundaryIndex).toBe(0)
  })

  it('sets phase to interstitial after answer', () => {
    let state = createTestSession('normal', 'en')
    state = answerQuestion(state, true)
    expect(state.phase).toBe('interstitial')
  })

  it('sets phase to complete after last answer', () => {
    const { count } = runFullTest('normal')
    expect(count).toBe(36)
  })
})

describe('Normal mode: exactly 36 questions', () => {
  it('completes in exactly 36 answers', () => {
    const { count } = runFullTest('normal')
    expect(count).toBe(36)
  })

  it('returns 6 valid boundary hue values', () => {
    const { results } = runFullTest('normal')
    expect(results.boundaries).toHaveLength(6)
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
})

describe('Refine mode: exactly 18 questions', () => {
  it('completes in exactly 18 answers', () => {
    const { results: normalResults } = runFullTest('normal')
    const { count } = runFullTest('refine', normalResults)
    expect(count).toBe(18)
  })

  it('refine results are within +/-15 degrees of normal results', () => {
    const { results: normalResults } = runFullTest('normal')
    const { results: refineResults } = runFullTest('refine', normalResults)

    for (let i = 0; i < 6; i++) {
      const diff = Math.abs(refineResults.boundaries[i] - normalResults.boundaries[i])
      const circularDiff = Math.min(diff, 360 - diff)
      expect(circularDiff).toBeLessThanOrEqual(15)
    }
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

  it('does nothing if not in interstitial phase', () => {
    const state = createTestSession('normal', 'en')
    expect(state.phase).toBe('testing')
    const unchanged = advanceFromInterstitial(state)
    expect(unchanged.phase).toBe('testing')
  })
})
