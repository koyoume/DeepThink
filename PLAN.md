# DeepThink 웹 이식 — 계획·진행 현황
> 상태: P0 진행 중 · 최종 갱신 2026-07-05

## 1. 확정된 결정
| 항목 | 결정 | 비고 |
|---|---|---|
| 기술 스택 | Vite + React + TypeScript + Tailwind CSS v4 | `WEB_DEV_GUIDE.md` §4 추천 조합 |
| 상태 관리 | Zustand | Android StateFlow/ViewModel과 유사한 가벼운 전역 store |
| Git 동기화 | 클라이언트 사이드 (`isomorphic-git` + `@isomorphic-git/lightning-fs`) | 백엔드 없음, PAT는 브라우저에서 직접 사용 |
| CORS 프록시 | Cloudflare Worker (투명 바이트 릴레이, git 로직 없음) | GitHub 등은 smart-HTTP에 CORS 헤더 없음 → 필요 |
| PAT 저장 | `localStorage` 평문 | 개인용 도구 전제, 리스크 인지 (REQUIREMENTS §4) |
| 저장소 구조 | 기존 Android 코드 → `android-backup/`, 웹 프로젝트가 루트 차지 | 이 repo는 이식 전 git 저장소가 아니었음(히스토리 없음) |
| UI 문서/프로토타입 | `docs/legacy-prototype/`로 이동, 참고만 함 | 새 디자인으로 재설계, 동작 스펙만 유지 |
| 편집 인터랙션 | 터치 스와이프 + Tab/Shift+Tab + 줄별 "⋯" 메뉴 모두 지원 | 데스크톱 웹 대응 위해 터치 전용 스와이프에서 확장 |
| 레거시 마이그레이션 | Android `migrateLegacyRootFiles()` 이식 안 함 | 신규 웹 클라이언트엔 불필요 |
| PWA/오프라인 | Non-Goal (이번 범위 제외) | |
| 배포 | Cloudflare Pages, GitHub Actions에서 `wrangler pages deploy` 직접 실행 | Git 연동 자동감지 방식 피함 (가이드 §6.2) |

## 2. 폴더 구조
```
/                        ← 웹 프로젝트 루트 (Vite)
  src/
    domain/              ← 순수 도메인 로직 (models, markdownCodec, vaultStore)
    ...                  ← (P3에서 컴포넌트/스토어 추가 예정)
  android-backup/        ← 기존 Android(Kotlin+Compose) 앱 전체 (참고용, 더 이상 유지보수 안 함)
  docs/legacy-prototype/ ← UI-DESIGN.md, thoughts-prototype.html (동작 스펙 참고, 정본 아님)
  WEB_DEV_GUIDE.md        ← 웹 개발 워크플로 가이드
  PLAN.md / REQUIREMENTS.md
```

## 3. 단계별 작업 (체크리스트)
- [x] P0-1 · Android 코드 `android-backup/`로 이동, UI 문서 `docs/legacy-prototype/`로 이동 — 확인: `ls` 결과로 루트 정리됨
- [x] P0-2 · Vite+React+TS+Tailwind 스캐폴드 (`npm run build`, dev server 200 확인)
- [ ] P0-3 · PLAN.md/REQUIREMENTS.md 작성 (본 문서)
- [ ] P0-4 · git init + 초기 커밋
- [ ] P1 · 도메인 로직 포팅: `models.ts`, `markdownCodec.ts`, golden-case 검증 스크립트 (`MarkdownCodecTest.kt` 4개 케이스 이식)
- [ ] P1 · `vaultStore.ts` (LightningFS 기반, `VaultFileStore.kt` 레이아웃 1:1)
- [ ] P2 · `gitSync.ts` (isomorphic-git, 카테고리별 md 1개만 commit/push)
- [ ] P2 · Cloudflare Worker CORS 프록시 작성/배포
- [ ] P2 · `settingsStore.ts` (GitConfig, previewLines)
- [ ] P2 · 실제 GitHub repo로 clone→push→pull 수동 검증
- [ ] P3 · Dashboard 화면 (카테고리 칩, 카드 그리드, 뷰옵션, FAB)
- [ ] P3 · Topic Detail 화면 (제목 박스, 관련자료, 생각 리스트, 입력바)
- [ ] P3 · Settings 화면
- [ ] P4 · GitHub Actions 배포 파이프라인 (빌드→검증→wrangler pages deploy)
- [ ] P5 · Playwright E2E 스켈레톤 + 배포 게이트

## 4. 개발 워크플로
`WEB_DEV_GUIDE.md` 그대로 따름 — 의미 있는 단위마다 즉시 commit, 애매한 UX 결정은 짧은 질문으로 확인 후 진행.

## 5. 열린 항목 / 추후 결정
- 검색 동작 정의 (UI-DESIGN.md TODO에서 이월)
- 카테고리 관리(추가/이름변경/색) UI
- 관련 자료 추가 UI
- Cloudflare Worker 프록시의 실제 URL/배포 계정 확정 (P2에서)

## 6. 세션 이력 (진행 로그)
- **2026-07-05 (세션 1)**: 웹 이식 킥오프. 핵심 결정 3가지 확인(클라이언트 사이드 git, 저장소 재구성, 새 UI 디자인). 계획 승인 후 P0 착수 — Android 코드 `android-backup/`, UI 문서 `docs/legacy-prototype/`로 이동, Vite+React+TS+Tailwind 스캐폴드 완료(build/dev 확인).
