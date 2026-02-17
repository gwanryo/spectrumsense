// SpectrumSense — TypeScript Type Definitions

export type ColorName = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'pink';

export interface Boundary {
  from: ColorName;
  to: ColorName;
  standardHue: number;  // typical boundary in HSL degrees
  searchRange: { low: number; high: number };  // binary search range
}

export interface BinarySearchState {
  boundary: Boundary;
  low: number;       // current search low bound (hue degrees)
  high: number;      // current search high bound (hue degrees)
  currentHue: number; // current test hue (midpoint)
  step: number;       // current step (0-5 for normal, 0-2 for refine)
  maxSteps: number;   // 6 for normal, 3 for refine
}

export interface Question {
  hue: number;              // test color hue to display
  firstLabel: string;       // first choice color name (i18n key like 'colors.red')
  secondLabel: string;      // second choice color name
  progress: number;         // 0-1 fraction of completion
  questionNumber: number;   // 1-indexed question number
  totalQuestions: number;   // 42 or 21
}

export interface TestState {
  mode: 'normal' | 'refine';
  boundaries: BinarySearchState[];
  currentBoundaryIndex: number;
  currentStep: number;      // global step counter (0-41 or 0-20)
  totalSteps: number;       // 42 for normal, 21 for refine
  phase: 'testing' | 'interstitial' | 'complete';
  previousResults?: TestResult;  // for refine mode
}

export interface TestResult {
  boundaries: number[];  // 7 hue values: [R→O, O→Y, Y→G, G→B, B→V, V→P, P→R]
  mode: 'normal' | 'refine';
  timestamp: number;
  locale: Locale;
}

export interface Deviation {
  boundary: Boundary;
  userHue: number;
  standardHue: number;
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
  mostShiftedBoundary: Deviation;
  colorRegions: ColorRegion[];
}

export type Locale = 'en' | 'ko' | 'ja';
export type Page = 'landing' | 'test' | 'results';
