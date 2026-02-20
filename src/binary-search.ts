import type { BinarySearchState, ColorTransition, SearchRange } from './types'
import { circularMidpoint, normalizeHue } from './color'

export function initBinarySearch(
  transition: ColorTransition,
  searchRange: SearchRange,
  maxSteps: number = 6,
  previousResult?: number
): BinarySearchState {
  let low = searchRange.low
  let high = searchRange.high

  if (previousResult !== undefined) {
    const isWrapAround = high > 360

    if (isWrapAround) {
      let previousInExtendedSpace = previousResult
      if (previousInExtendedSpace < 60) previousInExtendedSpace += 360
      low = Math.max(searchRange.low, previousInExtendedSpace - 15)
      high = Math.min(searchRange.high, previousInExtendedSpace + 15)
    } else {
      low = Math.max(searchRange.low, previousResult - 15)
      high = Math.min(searchRange.high, previousResult + 15)
    }
  }

  const currentHue = getCircularMidpointInRange(low, high)

  return {
    transition,
    searchRange,
    low,
    high,
    currentHue,
    step: 0,
    maxSteps,
  }
}

export function getNextHue(state: BinarySearchState): number {
  return state.currentHue
}

export function recordChoice(
  state: BinarySearchState,
  choseFirst: boolean
): BinarySearchState {
  const { low, high, currentHue } = state
  const currentPoint = toComparableHue(currentHue, low, high)

  let newLow: number
  let newHigh: number

  if (choseFirst) {
    newLow = currentPoint
    newHigh = high
  } else {
    newLow = low
    newHigh = currentPoint
  }

  const newHue = getCircularMidpointInRange(newLow, newHigh)

  return {
    ...state,
    low: newLow,
    high: newHigh,
    currentHue: newHue,
    step: state.step + 1,
  }
}

export function isComplete(state: BinarySearchState): boolean {
  return state.step >= state.maxSteps
}

export function getResult(state: BinarySearchState): number {
  return normalizeHue(getCircularMidpointInRange(state.low, state.high))
}

function getCircularMidpointInRange(low: number, high: number): number {
  if (high > 360) {
    const midpointInExtendedSpace = (low + high) / 2
    return normalizeHue(midpointInExtendedSpace)
  }

  return circularMidpoint(low, high)
}

function toComparableHue(hue: number, low: number, high: number): number {
  if (high > 360 && hue < low) {
    return hue + 360
  }

  return hue
}
