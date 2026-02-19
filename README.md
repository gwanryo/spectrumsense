# SpectrumSense

Interactive color-boundary testing for human perception.

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-Test-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Live Demo](https://img.shields.io/badge/Demo-rwe.kr/spectrumsense-0ea5e9)](https://rwe.kr/spectrumsense/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

SpectrumSense is a framework-free TypeScript web app that measures where users perceive boundaries between adjacent colors. It uses binary search per boundary to estimate each transition point, then compares results against reference color positions and boundary values.

## Live Demo

- https://rwe.kr/spectrumsense/

## Features

- Binary-search-driven boundary estimation across 7 color transitions
- Reliable test flow with environment check, warm-up, interstitial timing, and catch trials
- Optional nickname capture (`sessionStorage`) shown on results and exported result cards
- Refine mode for focused re-testing around prior boundary values
- Result analysis: mean absolute deviation, largest shift, color-region widths, and share card generation
- Spectrum visualization with user boundary lines and reference color markers
- Compact URL state encoding for shareable result snapshots
- Built-in i18n with English, Korean, and Japanese locales

## How It Works

1. In normal mode, users first complete an environment checklist (with optional nickname) and 2 warm-up questions.
2. The app asks which side of an adjacent color pair a shown hue belongs to.
3. Responses update a binary search interval for that boundary.
4. After all boundaries converge, the app computes regional widths and deviation metrics.
5. Users can run a shorter refine pass around previous answers from the completion screen.

Default question counts:

- Normal mode: `7 boundaries x 6 steps = 42` main questions (+ warm-up and catch trial)
- Refine mode: `7 boundaries x 3 steps = 21` questions

## Color Model

- Colors: Red, Orange, Yellow, Green, Blue, Violet, Pink
- Reference color anchors (`STANDARD_COLORS`, degrees):
  - Red `0`, Orange `39`, Yellow `60`, Green `120`, Blue `240`, Violet `300`, Pink `350`
- Boundary order (`BOUNDARIES.standardHue`, degrees):
  - R->O `20`
  - O->Y `50`
  - Y->G `90`
  - G->B `180`
  - B->V `270`
  - V->P `325`
  - P->R `355` (search wraps with upper bound `390`)
- Search ranges (`searchRange`): `[0,40]`, `[30,70]`, `[55,120]`, `[120,230]`, `[220,310]`, `[280,350]`, `[330,390]`

Reference alignment uses the project’s selected sources: HTML Color Codes, XKCD color survey (`N=222,500`), Munsell, and CIE materials.

## Results Output

- Header can display the saved nickname from the test setup screen.
- Spectrum bar shows user boundaries in-bar and reference color positions as bottom `▲` markers.
- Summary stats highlight average deviation and the single largest shifted color.
- Per-color cards compare reference hue vs measured hue and show signed difference badges.

## Tech Stack

| Area | Choice |
| --- | --- |
| Language | TypeScript (strict) |
| Build tool | Vite |
| Test runner | Vitest |
| Runtime | Browser (DOM + Canvas API, no framework) |
| Deploy | GitHub Pages via GitHub Actions |

## Quick Start

### Prerequisites

- Node.js 22+ recommended
- npm

### Install

```bash
npm install
```

### Develop

```bash
npm run dev
```

Open the local URL shown by Vite.

## Scripts

```bash
npm run dev          # start local dev server
npm test             # run test suite once
npm run test:watch   # run tests in watch mode
npm run build        # type-check and build production assets
npm run preview      # preview production build locally
npx tsc --noEmit     # standalone type-check
```

## Testing

Current suite covers:

- Color and boundary mapping
- Binary-search convergence logic
- State-machine transitions and catch-trial behavior
- URL encode/decode format integrity
- Result metrics and region calculations
- i18n key parity and runtime locale behavior
- Canvas spectrum marker placement
- Router hash parsing/navigation

## URL State Format

Result snapshots are encoded into a fixed 16-byte payload:

- `0..13`: 7 boundary values as `uint16` in `0.1deg`
- `14`: mode (`0=normal`, `1=refine`)
- `15`: locale (`0=en`, `1=ko`, `2=ja`)

## Deployment

- Deployment target: GitHub Pages
- Base path: `/spectrumsense/`
- Deploy trigger: push to `main` (GitHub Actions)

## Contributing

Issues and PRs are welcome. For behavior-sensitive changes, please include:

- Test updates for any modified logic
- Notes on compatibility with existing URL state format
- i18n updates across all locales when keys change

## License

MIT
