# SpectrumSense — Project Knowledge

## Snapshot

색상 인지 경계를 측정하는 인터랙티브 웹앱. 이진 탐색 질문으로 Red↔Orange 같은 인접 색상 경계를 찾고, 표준값과 비교한다.

- URL: https://rwe.kr/spectrumsense/
- Repo: github.com/gwanryo/spectrumsense
- Deploy: GitHub Pages (`main` push 시 Actions 자동 배포)
- Runtime deps: 없음 (devDependencies only)
- External resources: Google Fonts (Instrument Serif, JetBrains Mono, Noto Sans KR/JP, Outfit), HTML Color Codes (reference)

## Stack & Architecture

- TypeScript (strict), Vite, Vitest
- Framework 없음 (DOM + Canvas API)
- Hash routing: `#/`, `#/test`, `#/results`

### Core source map

```text
src/
├── types.ts              # 공통 타입
├── color.ts              # 7개 경계/색상 계산
├── binary-search.ts      # 경계별 이진 탐색
├── state-machine.ts      # 테스트 진행/셔플/캐치 트라이얼
├── result.ts             # 편차/영역 계산
├── url-state.ts          # 16-byte 결과 인코딩
├── sharing.ts            # 공유/복사
├── router.ts             # 해시 라우팅
├── main.ts               # 엔트리
├── canvas/
│   ├── spectrum-bar.ts   # 스펙트럼 바 렌더링
│   └── result-card.ts    # 1200x630 결과 카드 생성
├── pages/
│   ├── landing.ts
│   ├── test.ts
│   └── results.ts
├── i18n/
│   ├── index.ts
│   ├── en.json
│   ├── ko.json
│   └── ja.json
└── styles/
    └── main.css
```

### Tests

- `tests/color.test.ts`: 경계/색상 매핑
- `tests/binary-search.test.ts`: 수렴/완료 가드
- `tests/state-machine.test.ts`: 상태 전이/셔플/캐치
- `tests/url-state.test.ts`: 인코딩/디코딩
- `tests/result.test.ts`: 편차/영역 계산
- `tests/i18n.test.ts`: locale 키 일치 + 런타임 동작
- `tests/spectrum-bar.test.ts`: 마커 오프셋/래핑
- `tests/router.test.ts`: hash 파싱/navigate 검증

## Product Rules

### Color model (7 colors)

- 색상: Red, Orange, Yellow, Green, Blue, Violet, Pink
- 기준 색상(`STANDARD_COLORS`): R 0°, O 39°, Y 60°, G 120°, B 240°, V 300°, P 350°
- 인접 색상 전환(`COLOR_TRANSITIONS`): `COLOR_ORDER`에서 자동 생성
- 탐색 범위(`SEARCH_RANGES`): [0,40], [30,70], [55,120], [120,230], [220,310], [280,350], [330,390]
- P→R 탐색 상한은 `390`으로 래핑 처리
- `COLOR_TRANSITIONS`과 `SEARCH_RANGES`는 런타임 assertion으로 길이 동기화 보장
- `binary-search.ts`, `state-machine.ts`는 `COLOR_TRANSITIONS.length` 기반 동적 로직

### Test reliability behavior

- 라운드마다 경계 순서 셔플 (Fisher-Yates)
- 버튼 좌우 라벨 카운터밸런싱 (50%)
- 인터스티셜 1200ms, 중성 회색 `#808080`
- 최소 응답 시간 300ms
- 라운드 종료 후 캐치 트라이얼 1회
- 워밍업 2문항 (결과 미반영)
- 흐름: 환경 체크(닉네임 입력 포함) → 워밍업 → 본 테스트
- Refine 모드: 환경 체크/워밍업 스킵
- Refine 버튼은 테스트 완료 화면에서 normal 모드 결과일 때만 표시

### URL state format (critical)

- 총 16 bytes (고정)
- 경계값 14 bytes (`7 * uint16`, 0.1°)
- offset 14: mode (`0=normal`, `1=refine`)
- offset 15: locale (`0=en`, `1=ko`, `2=ja`)

## UI/Style Conventions

- Primary 버튼은 teal 단색 (`--accent: #2dd4bf`)
- 무지개 그라데이션은 스펙트럼 영역에만 사용
- CJK 폴백: `--font-sans`, `--font-mono`에 Noto Sans KR/JP 유지
- 페이지별 스타일은 `injectTestStyles()`, `injectResultsStyles()`에서 동적 주입
- 결과 액션 행은 `.actions-row` 사용 (Retake/Copy/WebShare/Download)
- 결과 헤더는 `sessionStorage['spectrumsense-nickname']`가 있으면 타이틀에 닉네임 포함
- 스펙트럼 레전드는 상단(user boundaries) + 하단(reference color positions, ▲ marker) 2행 구조 유지

## Critical Invariants (Do Not Break)

1. i18n 키 3개 locale 완전 일치 (`tests/i18n.test.ts`)
2. 경계 개수 관련 동적 패턴(`COLOR_TRANSITIONS.length`) 유지
3. URL 포맷 16 bytes 고정
4. `vite.config.ts` base는 `/spectrumsense/` 고정
5. runtime dependencies 추가 금지
6. `NORMAL_STEPS=6`, `REFINE_STEPS=3` 유지
7. 닉네임 저장 키는 `spectrumsense-nickname` 유지 (sessionStorage)

## Known Pitfalls

- `color.ts/getColorName()`은 7개 영역 하드 분기라 경계 변경 시 필수 수정
- `url-state.ts`는 바이트 오프셋 하드코딩 (14/15/16)
- `result-card.ts` 색상명은 i18n이 아니라 내부 하드코딩
- `computeRegionCenter()`는 사용자 경계 span의 순수 기하학적 중점 (기준 색상 가중치 미사용)
- `result.ts/getColorRegions()`에서 모듈러는 항상 `COLOR_TRANSITIONS.length`
- `results.ts`/`result-card.ts`의 사용자 색상 스와치는 `getColorRegions()` + `sampleHueRange()` 그라데이션으로 렌더링
- `huePositionInRange()`는 `color.ts`에서 공유 — `results.ts`와 `result-card.ts` 모두 import
- `spectrum-bar.ts`와 `result-card.ts`의 reference marker(하단 ▲ + 라벨) 시각 언어는 함께 유지
- i18n 키 중 `landing.*` 일부는 실제로 `test.ts` 환경 체크에서 사용됨

## Command Cheat Sheet

```bash
npm run dev
npm test
npm run test:watch
npm run build
npm run preview
npx tsc --noEmit
```

## Assets & Deployment

- OG 이미지: `public/og-image.png` (1200x630)
- 생성 스크립트: `scripts/og-image.html`
- Deploy workflow: `.github/workflows/deploy.yml`
- CI Node: 22
- Domain: `rwe.kr/spectrumsense/`

## Environment Notes

- macOS `sed`는 GNU `sed`와 동작 차이 있음
- 복잡한 텍스트 치환은 `python3 -c` 사용 권장
