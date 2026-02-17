import type { Locale, Question, TestResult, TestState } from './types'
import {
  getNextHue,
  getResult,
  initBinarySearch,
  recordChoice,
} from './binary-search'
import { BOUNDARIES } from './color'

const NORMAL_STEPS = 6
const REFINE_STEPS = 3

export function createTestSession(
  mode: 'normal' | 'refine',
  locale: Locale = 'en',
  previousResults?: TestResult
): TestState {
  void locale
  const maxSteps = mode === 'refine' ? REFINE_STEPS : NORMAL_STEPS
  const totalSteps = BOUNDARIES.length * maxSteps

  const boundaries = BOUNDARIES.map((boundary, i) => {
    const prevHue = previousResults?.boundaries[i]
    return initBinarySearch(boundary, maxSteps, prevHue)
  })

  return {
    mode,
    boundaries,
    currentBoundaryIndex: 0,
    currentStep: 0,
    totalSteps,
    phase: 'testing',
    previousResults,
  }
}

export function getCurrentQuestion(state: TestState): Question {
  const boundaryState = state.boundaries[state.currentBoundaryIndex]
  const boundary = boundaryState.boundary
  const hue = getNextHue(boundaryState)

  return {
    hue,
    firstLabel: `colors.${boundary.from}`,
    secondLabel: `colors.${boundary.to}`,
    progress: state.currentStep / state.totalSteps,
    questionNumber: state.currentStep + 1,
    totalQuestions: state.totalSteps,
  }
}

export function answerQuestion(state: TestState, choseFirst: boolean): TestState {
  const currentBoundaryIdx = state.currentBoundaryIndex
  const updatedBoundaryState = recordChoice(
    state.boundaries[currentBoundaryIdx],
    choseFirst
  )

  const newBoundaries = [...state.boundaries]
  newBoundaries[currentBoundaryIdx] = updatedBoundaryState

  const nextBoundaryIndex = (currentBoundaryIdx + 1) % BOUNDARIES.length
  const nextStep = state.currentStep + 1
  const completed = nextStep >= state.totalSteps

  return {
    ...state,
    boundaries: newBoundaries,
    currentBoundaryIndex: nextBoundaryIndex,
    currentStep: nextStep,
    phase: completed ? 'complete' : 'interstitial',
  }
}

export function advanceFromInterstitial(state: TestState): TestState {
  if (state.phase !== 'interstitial') return state
  return { ...state, phase: 'testing' }
}

export function isTestComplete(state: TestState): boolean {
  return state.phase === 'complete'
}

export function getTestResults(
  state: TestState,
  locale: Locale = 'en'
): TestResult {
  const boundaries = state.boundaries.map((bs) => getResult(bs))

  return {
    boundaries,
    mode: state.mode,
    timestamp: Date.now(),
    locale,
  }
}
