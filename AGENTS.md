# SpectrumSense — Project Knowledge

## Snapshot

색상 인지 경계를 측정하는 인터랙티브 웹앱. 이진 탐색 질문으로 Red↔Orange 같은 인접 색상 경계를 찾고, 표준값과 비교한다.

- URL: https://rwe.kr/spectrumsense/
- Repo: github.com/gwanryo/spectrumsense
- Deploy: GitHub Pages (`main` push 시 Actions 자동 배포)
- Runtime deps: 없음 (devDependencies only)
- External resources: Google Fonts (Instrument Serif, JetBrains Mono, Noto Sans KR/JP, Outfit)

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
- 경계(7개): R→O 18°, O→Y 48°, Y→G 78°, G→B 163°, B→V 258°, V→P 300°, P→R 345°
- P→R 탐색 상한은 `390`으로 래핑 처리
- `binary-search.ts`, `state-machine.ts`는 `BOUNDARIES.length` 기반 동적 로직

### Test reliability behavior

- 라운드마다 경계 순서 셔플 (Fisher-Yates)
- 버튼 좌우 라벨 카운터밸런싱 (50%)
- 인터스티셜 1200ms, 중성 회색 `#808080`
- 최소 응답 시간 300ms
- 라운드 종료 후 캐치 트라이얼 1회
- 워밍업 2문항 (결과 미반영)
- 흐름: 환경 체크 → 워밍업 → 본 테스트
- Refine 모드: 환경 체크/워밍업 스킵

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
- 결과 액션 행(`.actions-primary`)에서 Refine/Retake 반경은 모두 `var(--radius-lg)`로 통일
- Refine 버튼은 normal 결과에서만 표시 (`result.mode !== 'refine'`)

## Critical Invariants (Do Not Break)

1. i18n 키 3개 locale 완전 일치 (`tests/i18n.test.ts`)
2. 경계 개수 관련 동적 패턴(`BOUNDARIES.length`) 유지
3. URL 포맷 16 bytes 고정
4. `vite.config.ts` base는 `/spectrumsense/` 고정
5. runtime dependencies 추가 금지
6. `NORMAL_STEPS=6`, `REFINE_STEPS=3` 유지

## Known Pitfalls

- `color.ts/getColorName()`은 7개 영역 하드 분기라 경계 변경 시 필수 수정
- `url-state.ts`는 바이트 오프셋 하드코딩 (14/15/16)
- `result-card.ts` 색상명은 i18n이 아니라 내부 하드코딩
- `drawColorLabels()`는 이전 경계 참조 인덱스 `(i + N - 1) % N`이 핵심
- `result.ts/getColorRegions()`에서 모듈러는 항상 `BOUNDARIES.length`
- `spectrum-bar.ts`와 `result-card.ts`의 standard 마커(teal dashed) 시각 언어는 함께 유지
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
