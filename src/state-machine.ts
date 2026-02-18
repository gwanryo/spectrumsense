import type {
  CatchTrialData,
  Locale,
  Question,
  QuestionLogEntry,
  TestResult,
  TestState,
} from './types'
import {
  getNextHue,
  getResult,
  initBinarySearch,
  isComplete,
  recordChoice,
} from './binary-search'
import { BOUNDARIES } from './color'

const NORMAL_STEPS = 6
const REFINE_STEPS = 3

function shuffleArray(arr: number[]): number[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getActiveBoundaryIndices(boundaries: import('./types').BinarySearchState[]): number[] {
  return boundaries
    .map((bs, i) => ({ index: i, done: isComplete(bs) }))
    .filter((b) => !b.done)
    .map((b) => b.index)
}

function computeTotalSteps(boundaries: import('./types').BinarySearchState[]): number {
  const realSteps = boundaries.reduce((sum, bs) => sum + bs.maxSteps, 0)
  const maxRounds = Math.max(...boundaries.map((bs) => bs.maxSteps))
  const catchTrialCount = maxRounds
  return realSteps + catchTrialCount
}

export function createTestSession(
  mode: 'normal' | 'refine',
  locale: Locale = 'en',
  previousResults?: TestResult
): TestState {
  void locale
  const maxSteps = mode === 'refine' ? REFINE_STEPS : NORMAL_STEPS

  const boundaries = BOUNDARIES.map((boundary, i) => {
    const prevHue = previousResults?.boundaries[i]
    return initBinarySearch(boundary, maxSteps, prevHue)
  })

  const indices = Array.from({ length: BOUNDARIES.length }, (_, i) => i)
  const boundaryOrder = shuffleArray(indices)

  return {
    mode,
    boundaries,
    currentBoundaryIndex: boundaryOrder[0],
    currentStep: 0,
    totalSteps: computeTotalSteps(boundaries),
    phase: 'testing',
    previousResults,

    boundaryOrder,
    roundPosition: 0,
    currentRound: 0,

    currentSwapped: Math.random() < 0.5,

    pendingCatchTrial: false,
    activeCatchTrial: null,
    catchTrialResults: [],
    questionLog: [],
  }
}

export function getCurrentQuestion(state: TestState): Question {
  if (state.phase === 'catch_trial' && state.activeCatchTrial) {
    const ct = state.activeCatchTrial
    const boundary = BOUNDARIES[ct.boundaryIndex]
    const fromLabel = `colors.${boundary.from}`
    const toLabel = `colors.${boundary.to}`

    return {
      hue: ct.hue,
      firstLabel: state.currentSwapped ? toLabel : fromLabel,
      secondLabel: state.currentSwapped ? fromLabel : toLabel,
      progress: state.currentStep / state.totalSteps,
      questionNumber: state.currentStep + 1,
      totalQuestions: state.totalSteps,
      swapped: state.currentSwapped,
    }
  }

  const boundaryState = state.boundaries[state.currentBoundaryIndex]
  const boundary = boundaryState.boundary
  const hue = getNextHue(boundaryState)
  const fromLabel = `colors.${boundary.from}`
  const toLabel = `colors.${boundary.to}`

  return {
    hue,
    firstLabel: state.currentSwapped ? toLabel : fromLabel,
    secondLabel: state.currentSwapped ? fromLabel : toLabel,
    progress: state.currentStep / state.totalSteps,
    questionNumber: state.currentStep + 1,
    totalQuestions: state.totalSteps,
    swapped: state.currentSwapped,
  }
}

export function answerQuestion(state: TestState, choseFirst: boolean): TestState {
  if (state.phase === 'complete') {
    return state
  }

  if (state.phase === 'catch_trial') {
    return answerCatchTrial(state, choseFirst)
  }
  return answerNormalQuestion(state, choseFirst)
}

function answerNormalQuestion(state: TestState, choseFirst: boolean): TestState {
  const currentBoundaryIdx = state.currentBoundaryIndex
  const updatedBoundaryState = recordChoice(
    state.boundaries[currentBoundaryIdx],
    choseFirst
  )

  const newBoundaries = [...state.boundaries]
  newBoundaries[currentBoundaryIdx] = updatedBoundaryState

  const logEntry: QuestionLogEntry = {
    boundaryIndex: currentBoundaryIdx,
    hue: getNextHue(state.boundaries[currentBoundaryIdx]),
    choice: choseFirst,
    round: state.currentRound,
  }
  const newLog = [...state.questionLog, logEntry]

  const nextRoundPos = state.roundPosition + 1
  const active = getActiveBoundaryIndices(newBoundaries)
  const roundComplete = nextRoundPos >= state.boundaryOrder.length

  const newTotalSteps = computeTotalSteps(newBoundaries)
  const nextStep = state.currentStep + 1

  if (roundComplete) {
    const catchSource = pickCatchTrialSource(newLog, state.currentRound)

    if (catchSource) {
      return {
        ...state,
        boundaries: newBoundaries,
        currentStep: nextStep,
        totalSteps: newTotalSteps,
        phase: 'interstitial',
        questionLog: newLog,
        roundPosition: nextRoundPos,
        pendingCatchTrial: true,
        activeCatchTrial: catchSource,
        currentSwapped: Math.random() < 0.5,
      }
    }

    if (active.length === 0) {
      return {
        ...state,
        boundaries: newBoundaries,
        currentStep: nextStep,
        totalSteps: newTotalSteps,
        phase: 'complete',
        questionLog: newLog,
        currentSwapped: Math.random() < 0.5,
      }
    }

    const newOrder = shuffleArray(active)
    return {
      ...state,
      boundaries: newBoundaries,
      currentBoundaryIndex: newOrder[0],
      currentStep: nextStep,
      totalSteps: newTotalSteps,
      phase: 'interstitial',
      questionLog: newLog,
      boundaryOrder: newOrder,
      roundPosition: 0,
      currentRound: state.currentRound + 1,
      currentSwapped: Math.random() < 0.5,
    }
  }

  const nextBoundaryIndex = state.boundaryOrder[nextRoundPos]

  return {
    ...state,
    boundaries: newBoundaries,
    currentBoundaryIndex: nextBoundaryIndex,
    currentStep: nextStep,
    totalSteps: newTotalSteps,
    phase: 'interstitial',
    questionLog: newLog,
    roundPosition: nextRoundPos,
    currentSwapped: Math.random() < 0.5,
  }
}

function answerCatchTrial(state: TestState, choseFirst: boolean): TestState {
  const ct = state.activeCatchTrial
  const consistent = ct ? choseFirst === ct.expectedChoice : true

  const active = getActiveBoundaryIndices(state.boundaries)
  const nextStep = state.currentStep + 1

  if (active.length === 0) {
    return {
      ...state,
      currentStep: nextStep,
      phase: 'complete',
      pendingCatchTrial: false,
      activeCatchTrial: null,
      catchTrialResults: [...state.catchTrialResults, consistent],
      currentSwapped: Math.random() < 0.5,
    }
  }

  const newOrder = shuffleArray(active)
  const nextRound = state.currentRound + 1

  return {
    ...state,
    currentBoundaryIndex: newOrder[0],
    currentStep: nextStep,
    phase: 'interstitial',
    boundaryOrder: newOrder,
    roundPosition: 0,
    currentRound: nextRound,
    pendingCatchTrial: false,
    activeCatchTrial: null,
    catchTrialResults: [...state.catchTrialResults, consistent],
    currentSwapped: Math.random() < 0.5,
  }
}

function pickCatchTrialSource(
  log: QuestionLogEntry[],
  currentRound: number
): CatchTrialData | null {
  const roundEntries = log.filter((e) => e.round === currentRound)
  if (roundEntries.length === 0) return null

  const pick = roundEntries[Math.floor(Math.random() * roundEntries.length)]
  return {
    boundaryIndex: pick.boundaryIndex,
    hue: pick.hue,
    expectedChoice: pick.choice,
  }
}

export function advanceFromInterstitial(state: TestState): TestState {
  if (state.phase !== 'interstitial') return state

  if (state.pendingCatchTrial && state.activeCatchTrial) {
    return { ...state, phase: 'catch_trial' }
  }

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

export function getConsistencyScore(state: TestState): number {
  if (state.catchTrialResults.length === 0) return 1
  const consistent = state.catchTrialResults.filter(Boolean).length
  return consistent / state.catchTrialResults.length
}
