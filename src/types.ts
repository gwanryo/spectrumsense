// SpectrumSense — TypeScript Type Definitions

export type ColorName = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'pink';

export interface ColorTransition {
  from: ColorName;
  to: ColorName;
}

export interface SearchRange {
  low: number;
  high: number;
}

export interface BinarySearchState {
  transition: ColorTransition;
  searchRange: SearchRange;
  low: number;       // current search low bound (hue degrees)
  high: number;      // current search high bound (hue degrees)
  currentHue: number; // current test hue (midpoint)
  step: number;       // current step (0-based)
  maxSteps: number;
}

export interface Question {
  hue: number;              // test color hue to display
  firstLabel: string;       // first choice color name (i18n key like 'colors.red')
  secondLabel: string;      // second choice color name
  progress: number;         // 0-1 fraction of completion
  questionNumber: number;   // 1-indexed question number
  totalQuestions: number;   // dynamic total (real + catch trials)
  swapped: boolean;         // whether firstLabel/secondLabel are position-swapped
}

export interface QuestionLogEntry {
  boundaryIndex: number;
  hue: number;
  choice: boolean;
  round: number;
}

export interface CatchTrialData {
  boundaryIndex: number;
  hue: number;
  expectedChoice: boolean;
}

export interface TestState {
  mode: 'normal' | 'refine';
  boundaries: BinarySearchState[];
  currentBoundaryIndex: number;
  currentStep: number;      // global step counter (real + catch trials)
  totalSteps: number;       // dynamic: sum of boundary maxSteps + catch trial count
  phase: 'testing' | 'catch_trial' | 'interstitial' | 'complete';
  previousResults?: TestResult;  // for refine mode

  boundaryOrder: number[];   // shuffled boundary indices for current round
  roundPosition: number;     // position within current round
  currentRound: number;      // 0-based round counter

  currentSwapped: boolean;   // left-right counterbalancing for current question

  pendingCatchTrial: boolean;
  activeCatchTrial: CatchTrialData | null;
  catchTrialResults: boolean[];
  questionLog: QuestionLogEntry[];
}

export interface TestResult {
  boundaries: number[];  // 7 hue values: [R→O, O→Y, Y→G, G→B, B→V, V→P, P→R]
  mode: 'normal' | 'refine';
  timestamp: number;
  locale: Locale;
}

export interface Deviation {
  color: ColorName;
  userHue: number;
  referenceHue: number;
  difference: number;  // signed degrees (positive = shifted clockwise)
}

export interface ColorRegion {
  name: ColorName;
  startHue: number;
  endHue: number;
  spanDegrees: number;
}

export interface ResultSummary {
  deviations: Deviation[];
  meanAbsoluteDeviation: number;
  mostShifted: Deviation;
  colorRegions: ColorRegion[];
}

export type Locale = 'en' | 'ko' | 'ja';
export type Page = 'landing' | 'test' | 'results';
