# SpectrumSense — Project Knowledge

## Overview

색상 인지 경계를 측정하는 인터랙티브 웹앱. 이진 탐색 기반 질문을 통해 사용자가 Red↔Orange, Orange↔Yellow 등 인접 색상 간 경계를 어디에 두는지 매핑하고, 표준 경계와 비교.

- **URL**: https://rwe.kr/spectrumsense/
- **Repo**: github.com/gwanryo/spectrumsense
- **배포**: GitHub Pages (Actions) — `main` push 시 자동 배포
- **의존성**: 없음 (zero runtime dependencies, devDependencies만 존재)
- **외부 리소스**: Google Fonts (Instrument Serif, JetBrains Mono, Noto Sans KR, Noto Sans JP, Outfit) — `index.html`에서 로드

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
├── binary-search.ts  # 이진 탐색 알고리즘 (데이터 기반, 적응적 스텝 확장, oscillation 감지)
├── state-machine.ts  # 테스트 상태 머신 (라운드별 셔플, 캐치 트라이얼, 좌우 카운터밸런싱)
├── result.ts         # 편차 계산, 색상 영역 계산
├── url-state.ts      # 결과 인코딩/디코딩 (16바이트 바이너리 → Base64URL)
├── sharing.ts        # Web Share API, 클립보드 복사
├── router.ts         # 해시 기반 라우팅 (landing, test, results 3개 페이지)
├── main.ts           # 엔트리포인트 — registerRoute 3개
├── canvas/
│   ├── spectrum-bar.ts   # 스펙트럼 바 캔버스 렌더링 + 라벨
│   └── result-card.ts    # 다운로드 가능한 결과 카드 PNG (1200x630)
├── pages/
│   ├── landing.ts    # 랜딩 페이지 (hero 섹션만 — 스펙트럼 프리뷰, 제목, 설명, 시작 버튼)
│   ├── test.ts       # 테스트 페이지 (환경 체크 + 진행 방식 안내 + 카드 레이아웃 + 확인 화면)
│   └── results.ts    # 결과 페이지 (액션 버튼 아래 레퍼런스 푸터)
├── i18n/
│   ├── index.ts      # i18n 초기화, t() 함수
│   ├── en.json       # 영어 (63개 키)
│   ├── ko.json       # 한국어 (63개 키)
│   └── ja.json       # 일본어 (63개 키)
└── styles/
    └── main.css      # CSS 커스텀 프로퍼티, 전역 스타일
```

### Test Structure
```
tests/
├── color.test.ts         # BOUNDARIES, getColorName, circularMidpoint (21 tests)
├── binary-search.test.ts # 수렴 테스트, 7개 경계, oscillation (24 tests)
├── state-machine.test.ts # 상태 전이, 셔플, 캐치 트라이얼, 적응적 스텝 (23 tests)
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

### 테스트 신뢰성 시스템 (Psychometric Reliability)
- **라운드별 경계 셔플**: Fisher-Yates 알고리즘으로 매 라운드마다 경계 순서를 무작위화 (순서 효과/프라이밍 효과 방지)
- **좌우 카운터밸런싱**: 매 질문마다 50% 확률로 버튼 라벨을 좌우 반전 (위치 편향 상쇄)
- **색순응 리셋**: 인터스티셜 1200ms (500ms에서 상향) — 중성 회색 #808080으로 이전 색상 잔상 제거
- **최소 응답 시간**: 버튼 300ms 비활성화 — 색상 인지 전의 무의식적 클릭 방지
- **캐치 트라이얼**: 매 라운드 종료 후 1회 (이전 라운드 질문 중 하나를 반복). 결과에 내적 일관성 점수(consistency score) 제공
- **워밍업**: 테스트 시작 전 2개의 연습 문항 (명확한 색상) — 결과에 미반영
- **적응적 스텝**: choices[] 배열에서 oscillation 감지 → 3회 이상 방향 전환 시 maxSteps를 1~2 확장 (최대 +2)
- **환경 체크**: 테스트 전 화면 밝기, 야간 모드, 조명 환경 안내(좌정렬) + 진행 방식 3단계 설명 + 경계값/측정 정확도 info 카드(2-column grid) + 적응적 문항 수 안내
- **테스트 페이지 흐름**: 환경 체크(+진행 방식+경계/정확도 info) → 워밍업(2Q) → 워밍업 완료 전환 화면 → 본 테스트(48Q normal / 24Q refine, 적응적 확장 가능). **Refine 모드는 환경 체크·워밍업을 건너뛰고 바로 본 테스트 진입**

### URL 인코딩 포맷
- 16바이트 바이너리 → Base64URL
- 7 경계 × 2바이트 (uint16, 0.1° 정밀도) = 14바이트
- mode 1바이트 (offset 14): 0=normal, 1=refine
- locale 1바이트 (offset 15): 0=en, 1=ko, 2=ja

### 디자인 시스템
- **버튼**: `.btn-primary`와 `.test-confirmation-btn-primary`는 teal 단색(`--accent: #2dd4bf`) + 어두운 텍스트. 무지개 그라데이션은 스펙트럼 프리뷰/프로그레스 바에만 사용
- **CJK 폰트**: `--font-mono`와 `--font-sans` 스택에 Noto Sans KR/JP를 CJK 폴백으로 포함. JetBrains Mono는 Latin 전용, 한글/일본어는 Noto Sans로 렌더링
- **CSS 주입 패턴**: 각 페이지가 `injectResultsStyles()`, `injectTestStyles()`로 `<style>` 태그를 동적 삽입. 전역 스타일만 `main.css`에 존재

### 테스트 페이지 레이아웃
- **`showConfirmationScreen()`은 `startRealTest()` 내부 클로저** — state/results에 직접 접근. 별도 함수로 추출 시 인자 전달 필요
- **카드 스타일**: 다크 배경(`#0a0a0f`) 위에 80% 크기의 둥근 모서리 색상 카드
- **캔버스 DPR**: `spectrum-bar.ts`는 `devicePixelRatio` 스케일링 적용 (retina 대응), `result-card.ts`는 고정 1200×630 (다운로드용이라 DPR 무시)
- **모바일** (≤375px): 카드가 전체 화면으로 확장
- `transition: background-color 0ms` — 색상 전환은 의도적으로 즉시

### 전환 화면들
- **워밍업 완료**: 연습 2문항 후 `showWarmupComplete()` — 체크 아이콘 + "연습 완료" 메시지 + 시작 버튼. 본 테스트 시작 전 명시적 전환점
- **테스트 완료**: `showConfirmationScreen()` — "See Results" 버튼 + (normal 모드일 때만) "Refine (+21)" 버튼. Refine은 1회만 허용 (`result.mode !== 'refine'` 체크)
- 별도 `Page` 타입이나 라우트 없이 test.ts 내부에서 처리

### 결과 페이지 레이아웃
- **섹션 순서**: 스펙트럼 바 → 편차 카드 그리드 → disclaimer → 액션 버튼 → 레퍼런스 푸터
- **Refine 버튼**: `result.mode !== 'refine'`일 때만 렌더링 (test.ts 확인 화면 + results.ts 모두)
- **typical value 스타일**: `--text-primary` + `opacity: 0.55` — user value와 구분하면서 가독성 확보

### 결과 카드 이미지 (result-card.ts)
- **배경**: `#10101c` (밝은 네이비) + teal 그라데이션 양쪽 배치 + 16px 라운드 코너 테두리
- **standard 마커**: teal (`rgba(45, 212, 191, 0.7)`) 대시선, 바 아래로 연장 — 웹 스펙트럼 바와 동일한 시각 언어
- **boundary stats**: user value 옆에 `/ {standard}°` 형태로 typical value 표시

### 라우팅
- 3개 페이지만 존재: `landing`, `test`, `results`
- `router.ts`의 `navigateTo(page, params?)` 사용
- `?r=` 파라미터로 결과 데이터 전달
- `?prev=` 파라미터로 refine 시 이전 결과 전달 (base64-encoded JSON, `main.ts`에서 파싱)

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
npm test           # vitest run (104 tests)
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
- **spectrum-bar.ts `drawColorLabels()`**: 인덱스 수학 `(i + N-1) % N`으로 이전 경계 참조 (동적). 라벨 x좌표는 캔버스 엣지 클램핑 적용됨
- **result.ts `getColorRegions()`**: `BOUNDARIES.length` 동적 사용 — 이 패턴을 변경하면 안 됨
- **spectrum-bar.ts ↔ result-card.ts 시각 일관성**: standard 경계 마커는 양쪽 모두 teal 대시선 사용. 한쪽만 변경하면 안 됨
- **spectrum-bar.ts `drawLegend()`**: 반투명 배경 pill(`roundRect`) 위에 범례 표시. 범례 수정 시 배경 영역 크기도 함께 조정 필요
- **i18n 키 크로스 참조**: `landing.how_title`, `landing.how_step1-3`, `landing.boundaries_title/desc`, `landing.reliability_title/desc` 키는 `test.ts`의 환경 체크 화면에서 사용됨 (landing.ts에서는 미사용). 키 prefix가 실제 사용처와 불일치하므로 삭제/리네임 시 주의

### 과거에 발생했던 버그
- **라벨 위치 밀림**: `drawColorLabels()`에서 `startHue = normalized[i]` 사용 → 각 라벨이 한 칸씩 밀려 표시됨. 수정: `startHue = normalized[(i + N-1) % N]`, `endHue = normalized[i]`
- **result.ts `% 6` 하드코딩**: `normalized[(i + 1) % 6]` → `% BOUNDARIES.length`로 수정 필요했음
- **Red 라벨 캔버스 클리핑**: Red(≈1.5°)가 캔버스 좌측 끝에서 잘림 → `drawColorLabels()`에 `pillW/2` 기반 x좌표 클램핑 추가로 수정
- **Refine 무한 반복 버그**: `showConfirmationScreen()`과 results.ts에서 mode 체크 없이 항상 Refine 버튼 렌더링 → `result.mode !== 'refine'` 조건 추가로 1회만 허용

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
