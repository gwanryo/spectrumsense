# SpectrumSense — Project Knowledge

## Overview

색상 인지 경계를 측정하는 인터랙티브 웹앱. 이진 탐색 기반 질문을 통해 사용자가 Red↔Orange, Orange↔Yellow 등 인접 색상 간 경계를 어디에 두는지 매핑하고, 표준 경계와 비교.

- **URL**: https://rwe.kr/spectrumsense/
- **Repo**: github.com/gwanryo/spectrumsense
- **배포**: GitHub Pages (Actions) — `main` push 시 자동 배포
- **의존성**: 없음 (zero runtime dependencies, devDependencies만 존재)
- **외부 리소스**: Google Fonts (Instrument Serif, JetBrains Mono, Outfit) — `index.html`에서 로드

## Architecture

### Tech Stack
- TypeScript (strict), Vite, Vitest
- No frameworks — 순수 DOM + Canvas API
- Hash-based routing (`#/`, `#/test`, `#/results`)

### Source Structure
```
src/
├── types.ts          # 모든 타입 정의 (ColorName, Boundary, TestState, TestResult 등)
├── color.ts          # BOUNDARIES 배열 (7개), getColorName(), circularMidpoint(), normalizeHue()
├── binary-search.ts  # 이진 탐색 알고리즘 (데이터 기반, 경계 개수 무관하게 동작)
├── state-machine.ts  # 테스트 상태 머신 (데이터 기반, BOUNDARIES.length 사용)
├── result.ts         # 편차 계산, 색상 영역 계산
├── url-state.ts      # 결과 인코딩/디코딩 (16바이트 바이너리 → Base64URL)
├── sharing.ts        # X/Twitter 공유, 클립보드 복사
├── router.ts         # 해시 기반 라우팅 (landing, test, results 3개 페이지)
├── main.ts           # 엔트리포인트 — registerRoute 3개
├── canvas/
│   ├── spectrum-bar.ts   # 스펙트럼 바 캔버스 렌더링 + 라벨
│   └── result-card.ts    # 다운로드 가능한 결과 카드 PNG (1200x630)
├── pages/
│   ├── landing.ts    # 랜딩 페이지
│   ├── test.ts       # 테스트 페이지 (카드 레이아웃 + 확인 화면 포함)
│   └── results.ts    # 결과 페이지
├── i18n/
│   ├── index.ts      # i18n 초기화, t() 함수
│   ├── en.json       # 영어 (47개 키)
│   ├── ko.json       # 한국어 (47개 키)
│   └── ja.json       # 일본어 (47개 키)
└── styles/
    └── main.css      # CSS 커스텀 프로퍼티, 전역 스타일
```

### Test Structure
```
tests/
├── color.test.ts         # BOUNDARIES, getColorName, circularMidpoint (21 tests)
├── binary-search.test.ts # 수렴 테스트, 7개 경계 (20 tests)
├── state-machine.test.ts # 상태 전이, 42/21 문항 (17 tests)
├── url-state.test.ts     # 인코딩/디코딩 round-trip (13 tests)
├── result.test.ts        # 편차/영역 계산 (13 tests)
├── i18n.test.ts          # 3개 로케일 키 일치 검증 (9 tests)
└── spectrum-bar.test.ts  # 라벨 위치 정확성 (1 test)
```

## Key Design Decisions

### 7색 시스템
- **색상**: Red, Orange, Yellow, Green, Blue, Violet, Pink
- **경계**: 7개 — R→O(18°), O→Y(48°), Y→G(78°), G→B(163°), B→V(258°), V→P(300°), P→R(345°)
- Pink은 Violet과 Red 사이에 추가 (300°~345°)
- P→R 경계의 searchRange.high = 390 (360° 래핑 처리)
- `binary-search.ts`와 `state-machine.ts`는 **데이터 기반**으로 동작하여 경계 개수 변경 시 코드 수정 불필요

### URL 인코딩 포맷
- 16바이트 바이너리 → Base64URL
- 7 경계 × 2바이트 (uint16, 0.1° 정밀도) = 14바이트
- mode 1바이트 (offset 14): 0=normal, 1=refine
- locale 1바이트 (offset 15): 0=en, 1=ko, 2=ja

### 테스트 페이지 레이아웃
- **카드 스타일**: 다크 배경(`#0a0a0f`) 위에 80% 크기의 둥근 모서리 색상 카드
- **모바일** (≤375px): 카드가 전체 화면으로 확장
- `transition: background-color 0ms` — 색상 전환은 의도적으로 즉시

### 확인 화면
- 테스트 완료 시 즉시 결과 페이지로 이동하지 않고 확인 화면 표시
- `src/pages/test.ts` 내 `showConfirmationScreen()` 함수로 구현
- 별도 `Page` 타입이나 라우트 없이 test.ts 내부에서 처리
- "See Results" + "Refine (+21)" 두 버튼

### 라우팅
- 3개 페이지만 존재: `landing`, `test`, `results`
- `router.ts`의 `navigateTo(page, params?)` 사용
- `?r=` 파라미터로 결과 데이터 전달

## Critical Invariants (절대 깨뜨리면 안 되는 것)

1. **i18n 키 일치**: `tests/i18n.test.ts`가 en/ko/ja 3개 파일의 키 일치를 강제 검증
2. **경계 개수**: `BOUNDARIES.length`를 동적으로 사용하는 곳(state-machine, binary-search)은 건드리지 않음
3. **URL 바이트 포맷**: 16바이트 고정. 변경 시 기존 공유 링크 전부 깨짐
4. **vite.config.ts base**: `/spectrumsense/` 고정. GitHub Pages 경로와 일치해야 함
5. **No runtime dependencies**: `devDependencies`만 사용. `dependencies`에 추가 금지
6. **NORMAL_STEPS=6, REFINE_STEPS=3**: 경계당 스텝 수 상수. 전체 문항 수는 경계 개수 × 이 값

## Common Operations

```bash
npm run dev        # 개발 서버 (localhost:5173)
npm test           # vitest run (94 tests)
npm run test:watch # vitest watch mode
npm run build      # tsc && vite build
npm run preview    # 빌드 결과물 프리뷰 서버
npx tsc --noEmit   # 타입 체크만
```

## Gotchas & Pitfalls

### 수정 시 주의사항
- **color.ts `getColorName()`**: 7개 영역을 if/else로 분기. 경계 추가/삭제 시 반드시 수정 필요
- **url-state.ts**: 바이트 오프셋 하드코딩됨 (14, 15, 16). 경계 개수 변경 시 전부 수정
- **result-card.ts**: colorNames에 3개 언어 하드코딩됨 (i18n 시스템 미사용, 캔버스 렌더링이라)
- **spectrum-bar.ts `drawColorLabels()`**: 인덱스 수학 `(i + 6) % 7`로 이전 경계 참조. 경계 수 변경 시 반드시 업데이트
- **result.ts `getColorRegions()`**: `BOUNDARIES.length` 동적 사용 — 이 패턴을 변경하면 안 됨

### 과거에 발생했던 버그
- **라벨 위치 밀림**: `drawColorLabels()`에서 `startHue = normalized[i]` 사용 → 각 라벨이 한 칸씩 밀려 표시됨. 수정: `startHue = normalized[(i + N-1) % N]`, `endHue = normalized[i]`
- **result.ts `% 6` 하드코딩**: `normalized[(i + 1) % 6]` → `% BOUNDARIES.length`로 수정 필요했음

### macOS 환경 이슈
- `sed`의 정규표현식이 GNU와 다름 — 복잡한 텍스트 처리는 `python3 -c` 사용 권장
- `cat -A` 사용 불가 (macOS의 cat은 `-A` 미지원)

### Git 커밋 시 주의
- SSH GPG 서명이 설정되어 있음
- 커밋 메시지에 AI 도구 흔적(Co-authored-by, Ultraworked 등)이 자동 삽입될 수 있음 — 커밋 후 반드시 확인
- force push가 필요한 경우 `git push --force origin main`

## OG Image
- `public/og-image.png` — 1200×630 PNG, 758KB
- 생성 스크립트: `scripts/og-image.html` (Playwright로 스크린샷)
- 빌드 시 자동 포함 (`dist/og-image.png`)

## Deployment
- GitHub Actions: `.github/workflows/deploy.yml`
- `main` 브랜치 push → 자동 빌드 + GitHub Pages 배포
- CI Node 버전: 22
- 도메인: `rwe.kr/spectrumsense/` (커스텀 도메인, base path 유지)
