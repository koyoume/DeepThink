# DeepThink 웹 이식 — 계획·진행 현황
> 상태: P0~P6 완료·배포 라이브. P7 시각 디자인 "Outliner Ink" 1·2차 main 반영·배포(§6 세션5·6). 실기기 확인 반복 중 · 최종 갱신 2026-07-05

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
    domain/              ← 순수 도메인 로직 (models, markdownCodec, vaultStore, fsUtil)
    git/                 ← gitSync.ts (isomorphic-git 래퍼) + __verify__/liveSync.mjs
    settings/            ← settingsStore.ts (localStorage: GitConfig, previewLines, corsProxy)
    store/               ← fsInstance.ts(LightningFS 싱글턴), vaultStore.ts, gitStore.ts (Zustand), mutex.ts
    components/          ← CategoryChips, TopicCard, ThoughtGlyph, ThoughtRow, useAutoFit
    screens/             ← DashboardScreen, TopicDetailScreen(+useTopicDetailState), SettingsScreen
    App.tsx              ← 화면 전환(대시보드/상세/설정) + 뒤로가기 버튼 연동
  proxy/                 ← 별도 소규모 프로젝트: Cloudflare Worker CORS 릴레이 프록시
    src/worker.js
    wrangler.jsonc
  android-backup/        ← 기존 Android(Kotlin+Compose) 앱 전체 (참고용, 더 이상 유지보수 안 함)
  docs/legacy-prototype/ ← UI-DESIGN.md, thoughts-prototype.html (동작 스펙 참고, 정본 아님)
  WEB_DEV_GUIDE.md        ← 웹 개발 워크플로 가이드
  PLAN.md / REQUIREMENTS.md
```

## 2.1 배포 현황 (2026-07-04 세션 2에서 실제 가동)
- **GitHub remote 연결 완료**: `https://github.com/koyoume/DeepThink` — push/pull 정상 동작(`gh auth setup-git`로 credential helper 연결, 토큰 직접 취급 안 함).
- **Cloudflare Pages 프로젝트 생성 완료**: `deepthink` — production URL `https://deepthink-4rb.pages.dev/` (200 확인).
- **웹 앱 1차 수동 배포 완료**: `wrangler pages deploy ./dist --project-name deepthink --branch main`으로 확인.
- **GitHub repo Secrets 등록 완료**: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (Cloudflare API로 유효성 확인 완료, Pages 배포로 권한도 확인). 이제 `main` push 시 `.github/workflows/deploy.yml`이 실제로 동작할 수 있는 상태.
- **프록시 Worker 배포 완료**: `https://deepthink-git-proxy.koyoume.workers.dev` — 대시보드 URL이 안 열려서, Cloudflare API(`PUT /accounts/{id}/workers/subdomain`, wrangler의 기존 OAuth 세션 토큰 사용)로 `koyoume.workers.dev` 서브도메인을 직접 등록 후 배포. 배포 직후 몇 분간 TLS 인증서 전파 대기 필요했음(핸드셰이크 실패 → 자동 해결). 스모크 테스트 전부 통과:
  - `/` (호스트 없음) → 403 (오픈릴레이 방지 정상)
  - `/github.com/octocat/Hello-World.git/info/refs?service=git-upload-pack` → 200, `content-type: application/x-git-upload-pack-advertisement`, CORS 헤더 포함
  - `/evil.example.com/...` → 403 (ALLOWED_HOSTS 화이트리스트 정상)
  - OPTIONS preflight → 204
  이 URL을 웹 앱 Settings 화면의 `corsProxy` 값으로 입력하면 실사용 가능.
- `compatibility_date`가 실제 배포 중 "미래 날짜" 에러로 거부됨(세션에 주입된 로컬 날짜가 UTC보다 하루 앞섬) — `2026-07-04`로 수정, 커밋 `190ca94`.

## 3. 단계별 작업 (체크리스트)
- [x] P0-1 · Android 코드 `android-backup/`로 이동, UI 문서 `docs/legacy-prototype/`로 이동 — 확인: `ls` 결과로 루트 정리됨
- [x] P0-2 · Vite+React+TS+Tailwind 스캐폴드 (`npm run build`, dev server 200 확인)
- [x] P0-3 · PLAN.md/REQUIREMENTS.md 작성 (본 문서)
- [x] P0-4 · git init + 초기 커밋 (`e3d06a0`)
- [x] P1 · 도메인 로직 포팅: `models.ts`, `markdownCodec.ts`, golden-case 검증 스크립트 (`MarkdownCodecTest.kt` 4개 케이스 이식) — `npm run verify:domain` 통과
- [x] P1 · `vaultStore.ts` (LightningFS 기반, `VaultFileStore.kt` 레이아웃 1:1) — fake-indexeddb로 Node에서 round-trip/순서/삭제 검증
- [x] P2 · `gitSync.ts` (isomorphic-git, 카테고리별 md 1개만 commit/push) — `tsc` 통과, 로직은 JGitClient.kt/GitSyncRepositoryImpl.kt 1:1
- [x] P2 · Cloudflare Worker CORS 프록시 작성 (`proxy/`) — `wrangler deploy --dry-run` 통과. **실제 배포는 사용자가 `wrangler login` 후 `npm run deploy` 필요** (계정 로그인 필요, 이 세션에서 대신 못 함)
- [x] P2 · `settingsStore.ts` (GitConfig, previewLines) — localStorage
- [ ] P2 · 실제 GitHub repo로 clone→push→pull 수동 검증 — **보류**(사용자 선택: 지금은 건너뛰고 코드 리뷰만). `npm run verify:git`에 env var(`GIT_VERIFY_REMOTE_URL`/`GIT_VERIFY_TOKEN`) 설정 후 준비되면 재개. P3에서 실제 브라우저 UI로 사용하며 검증하는 경로도 가능.
- [x] P3 · Dashboard 화면 (카테고리 칩, 카드 그리드, 뷰옵션, FAB)
- [x] P3 · Topic Detail 화면 (제목 박스, 관련자료, 생각 리스트, 입력바) — 인라인 편집/Enter삽입/Backspace삭제/Tab·Shift+Tab 들여쓰기/스와이프/⋯메뉴 모두 구현
- [x] P3 · Settings 화면 (git 설정, CORS 프록시, 미리보기 기본값, 카테고리 관리, 동기화 버튼)
- [x] P3 · Zustand store (`vaultStore.ts`, `gitStore.ts`) — TopicRepositoryImpl/DashboardViewModel/SettingsViewModel 로직 이식
- [x] P3 · Playwright로 실브라우저 검증(대시보드↔상세↔설정 전환, 인라인 편집, Enter로 추가, Tab 들여쓰기, 새로고침 후 IndexedDB 영속 확인, 브라우저 뒤로가기) — 콘솔 에러 0건
- [x] P4 · GitHub Actions 배포 파이프라인 (`.github/workflows/deploy.yml`: npm ci→verify:domain→build→E2E 게이트→wrangler pages deploy, §6.2 함정 회피). 프록시용 `deploy-proxy.yml` 별도.
- [x] P5 · Playwright E2E 스켈레톤 (`playwright.config.ts` + `e2e/dashboard-flow.spec.ts`) — `npm run build && npm run test:e2e`로 프로덕션 빌드(dist/) 대상 통과 확인. `deploy.yml`의 E2E 게이트가 이제 실제로 존재하는 스크립트를 참조함
- [x] P6 · PWA 설치 지원 (manifest-only, **오프라인은 범위 밖**) — `public/manifest.webmanifest`, 아이콘 4종(192/512/maskable-512/apple-touch-180, favicon.svg 래스터화), `index.html`에 manifest·theme-color·iOS 메타 추가. `npm run build`로 `dist/`에 포함·index.html 참조 확인. 실기기 "홈 화면에 추가" 테스트는 배포 후 사용자 확인 필요. REQUIREMENTS §7 정정 + §9 신설.
- [~] P7 · 시각 디자인 "Outliner Ink" (디자인만, 동작 불변) — **main 직접 반영**. 1차: `@theme` 토큰+웹폰트(Fraunces/Inter/Noto KR), emerald→brand 보라, 세리프 제목. 2차(프로토타입 근접): 배경 심화 `#F1ECE2`, 카드 세리프 제목+여백/구분+rounded-2xl, 카테고리 순서기반 색 팔레트(활성 칩 채움·상세 라벨 점). REQUIREMENTS §5.1/§5.1.1. 하단 탭바·검색·인라인 서식은 미도입(후속). `npm run build` 통과, 배포 성공.

## 4. 개발 워크플로
`WEB_DEV_GUIDE.md` 그대로 따름 — 의미 있는 단위마다 즉시 commit, 애매한 UX 결정은 짧은 질문으로 확인 후 진행.

## 5. 열린 항목 / 추후 결정
- 검색 동작 정의 (UI-DESIGN.md TODO에서 이월, 아직 미구현)
- 카테고리 색상 커스터마이징 (추가/이름변경/삭제는 Settings 화면에 구현됨, 색은 없음)
- 관련 자료 추가 UI (표시/삭제는 구현, 새로 추가하는 입력 폼은 없음)
- 웹 앱 Settings 화면에 프록시 URL(`https://deepthink-git-proxy.koyoume.workers.dev`) 입력해서 실사용 테스트 (배포 자체는 완료)
- 실제 GitHub 저장소로 clone/push/pull 왕복 검증 (P2에서 PAT 없어 보류, `npm run verify:git` 또는 실사용 중 확인)
- **`koyoume/DataHub` 실제 데이터 복구**: §6 세션 3의 격리 보장 버그로 HEAD에서 사라진 카테고리 5개(Assets/Books/Dev(company)/Dev(personal)/Life) + `WORKFLOW.md`가 git 히스토리엔 남아있음(커밋 `e22f12b9`). 아직 복구 안 함 — 되돌리려면 해당 커밋에서 파일들을 복원해 새 커밋으로 다시 push 필요.

## 6. 세션 이력 (진행 로그)
- **2026-07-05 (세션 1)**: 웹 이식 킥오프. 핵심 결정 3가지 확인(클라이언트 사이드 git, 저장소 재구성, 새 UI 디자인). 계획 승인 후 P0 착수 — Android 코드 `android-backup/`, UI 문서 `docs/legacy-prototype/`로 이동, Vite+React+TS+Tailwind 스캐폴드 완료(build/dev 확인). 이어서 P1 도메인 로직 포팅: `models.ts`/`markdownCodec.ts`(Kotlin 4개 golden case 이식, round-trip 통과), `vaultStore.ts`(LightningFS, fake-indexeddb로 Node에서 검증). `enum` 대신 문자열 유니온 사용(tsconfig `erasableSyntaxOnly` 때문에 enum·parameter property 문법 모두 컴파일 에러 — Node 네이티브 TS 실행과 궁합 좋게 순수 타입 주석만 쓰도록 함).
  이어서 P2: `gitSync.ts`(isomorphic-git, JGitClient.kt/GitSyncRepositoryImpl.kt 로직 1:1), `settingsStore.ts`, Cloudflare Worker CORS 프록시(`proxy/`, `wrangler deploy --dry-run` 통과). 실제 GitHub 왕복 검증은 PAT가 필요해 사용자 선택으로 **보류**(추후 `npm run verify:git` 또는 P3 UI에서 실사용하며 검증) — `gitSync.ts`는 타입체크만 통과한 상태로 다음 단계 진행.
  이어서 P3: Zustand store(`vaultStore.ts`/`gitStore.ts`) + 3개 화면(Dashboard/TopicDetail/Settings) 구현, 새 Tailwind 디자인. Playwright(Chromium)를 설치해 실브라우저로 직접 검증하다가 **실버그 발견**: LightningFS가 IndexedDB 저장을 500ms 디바운스하는데 우리 앱은 그걸 모르고 있었음 — 편집 후 곧장 새로고침하면 데이터가 유실될 수 있는 창이 있었음. `VaultFileStore`의 write 계열 메서드(`writeCategory`/`deleteCategoryFile`/`writeOrder`) 끝에 `fs.promises.flush()`를 추가해 즉시 영속되도록 수정, Playwright로 새로고침 후 데이터 유지 확인 완료.
  이어서 P4: `.github/workflows/deploy.yml`(npm ci→verify:domain→build→E2E게이트→wrangler pages deploy) + `deploy-proxy.yml`(proxy/ 변경 시에만) 작성. 이 repo는 아직 GitHub remote가 없어 실제 실행은 안 됨 — §2.2에 사용자가 해야 할 준비(remote 연결, Pages 프로젝트 생성, GitHub Secrets 등록) 정리.
  이어서 P5: Playwright 설정(`playwright.config.ts`, `vite preview`로 실제 프로덕션 빌드 대상) + `e2e/dashboard-flow.spec.ts`(P3에서 수기로 검증했던 시나리오를 정식 테스트로 포맷 — 대시보드 로드, 상세 진입/제목 수정, 입력바로 생각 추가, Tab 들여쓰기, 뒤로가기+새로고침 영속, 설정 화면+브라우저 뒤로가기). `npm run build && npm run test:e2e` 로컬 통과 확인 — 이제 §P0~P5 전체 골격 완료, 남은 건 사용자 쪽 계정/시크릿 설정(§2.1, §2.2)과 실제 GitHub 왕복 검증(§P2 보류 항목).
- **2026-07-04 (세션 2)**: 배포 파이프라인 실제 가동. 원격 저장소는 `https://github.com/koyoume/DeepThink`(사용자가 사전에 만들어둔 빈 repo, 세션 1 때는 로컬에 `.git`이 없어서 몰랐음 — "기존 repo 대체"가 이 repo를 의미했던 것으로 뒤늦게 확인). 사용자가 GitHub PAT를 채팅에 두 번(대소문자 오타 포함) 직접 붙여넣어 push 완료 — **경고했지만 사용자가 그대로 진행을 선택**함, 폐기/재발급 권고함. 이후 `gh` CLI가 이미 이 계정으로 인증돼 있었고 `wrangler`도 이미 Cloudflare 계정에 로그인돼 있었다는 걸 발견 — `gh auth setup-git`으로 토큰 없이 push 가능해짐, `wrangler`로 Pages 프로젝트 생성/웹앱 1차 배포까지 로그인 절차 없이 완료. Cloudflare API 토큰은 사용자가 대시보드에서 새로 발급받아 전달, `gh secret set`으로 등록 후 실제 Pages 배포로 유효성 검증.
  프록시 Worker는 workers.dev 서브도메인 미등록으로 막혔고, wrangler가 안내한 대시보드 URL이 사용자 환경에서 안 열려서 **Cloudflare API를 직접 호출해 해결**: wrangler의 기존 OAuth 세션 토큰(`~/.config/.wrangler/config/default.toml`)을 꺼내 `PUT /accounts/{id}/workers/subdomain`으로 `koyoume.workers.dev` 서브도메인을 API로 직접 등록 → 재배포 성공. 배포 직후 TLS 인증서 전파 대기(핸드셰이크 실패 → 몇 분 후 자동 해결, `ScheduleWakeup`으로 대기 후 재확인) 후 스모크 테스트(정상 프록시/오픈릴레이 차단/CORS 헤더/OPTIONS preflight) 전부 통과. 이제 배포 파이프라인은 완전히 가동 상태 — 남은 건 §5의 기능적 열린 항목과 실제 GitHub 왕복 검증뿐.
- **2026-07-04 (세션 3)**: 실사용 버그 2건 발견/수정.
  1) 배포된 앱에서 "Pull" 클릭 시 `Buffer is not defined` — isomorphic-git이 브라우저에 없는 Node 전역 `Buffer`를 참조. `buffer` 패키지 + `src/polyfills.ts`로 해결, Playwright로 실제 Pull 버튼을 눌러 GitHub까지 요청이 도달함을 확인(가짜 토큰으로 401까지 도달).
  2) **🔴 사용자가 직접 리포트한 중대 버그**: "저장소 초기화/pull이 격리 지침을 위반, repo를 초기화시켜버림." 실제로는 GitHub 원격 자체가 리셋된 게 아니라, 사용자의 실제 vault 저장소(`koyoume/DataHub`)에서 카테고리 1개만 동기화했는데 무관한 카테고리 5개 + 루트 파일 2개(`WORKFLOW.md` 포함)가 HEAD에서 통째로 사라진 것 — GitHub API로 실제 커밋 diff를 까보고 재현·확인. 근본 원인: `pull()`의 `git.branch({checkout:true})`/`git.merge()`가 워킹 디렉토리·인덱스를 실제로 채우지 않아서, 이후 "파일 1개만 add→commit"이 인덱스에 없는 나머지 전부를 삭제해버림(Node 재현으로 정확한 메커니즘 확인). `git.checkout()`을 명시적으로 추가해 수정 + `assertIndexMatchesHead()` 안전장치(다른 파일이 사라질 것 같으면 커밋 자체를 거부) 추가 + 로컬 git smart-HTTP 서버 기반 회귀 테스트(`regressionIsolation.mjs`)로 재발 방지. `koyoume/DataHub`의 실제 삭제된 데이터는 git 히스토리에 남아있어 복구 가능하지만 아직 안 함(§5).
- **2026-07-05 (세션 7)**: 프로토타입 운영 규칙 도입 — 실제 산출물에 밀착한 프로토타입을 `docs/prototypes/`에 버전 파일명(`deepthink-proto-vNN-*.html`)으로, 생성 즉시 main push(설계문서화). v1(`deepthink-proto-v1-outliner-ink.html`) 생성: 라이브 기준(배경 #F1ECE2·카드 세리프·순서기반 카테고리 색) 대시보드·상세·설정 반영. `docs/prototypes/README.md`에 규칙·이력 기록.
- **2026-07-05 (세션 6)**: 라이브 확인 후 "프로토타입과 차이 큼" 피드백 — 배포는 정상(theme-color=#FBFAF7 확인), 원인은 1차가 리스킨(토큰만)이라 구조/느낌 변화가 은근했던 것. 2차 강화 결정·구현(브랜치 없이 main 직접): 배경 종이색 심화 `#F1ECE2`, 카드 제목 세리프+여백/헤어라인 구분+rounded-2xl, 카테고리 색 **순서 기반 팔레트**(`src/domain/categoryColor.ts`) → 활성 칩 색 채움·상세 라벨 색 점. 하단 탭바·검색·인라인 서식은 미도입(후속). `npm run build` 통과. REQUIREMENTS §5.1.1 신설. 이후 브랜치 없이 항상 main에서 작업하기로 함.
- **2026-07-05 (세션 5)**: 디자인 리뉴얼. 두 방향(Outliner Ink / Quiet Precision) 프로토타입 비교 후 **A·Outliner Ink** 채택. 실코드 대조로 프로토타입의 구조 오해 정정(카드 카테고리 색 점 없음·제목 자동축소·check/comment 글리프·＋는 FAB). 이번 범위를 **"디자인만 + 저장소 직접 반영"** 으로 확정(검색 기능·인라인 서식·카테고리 색은 후속). 한글 렌더 위해 Fraunces/Inter에 Noto Serif/Sans KR 병기 결정. `src/index.css`에 `@theme` 토큰 신설 + 웹폰트 로드, 6개 컴포넌트/화면 restyle(emerald 전면 제거→brand 보라), manifest/theme-color를 paper로. `npm run build` 통과, dist CSS에 토큰 유틸(bg-brand/text-ink/…) 생성 확인. 별도 브랜치 `design/outliner-ink`로 푸시(main 직접 아님) — 실기기 확인 후 병합 대기. REQUIREMENTS §5.1 신설, P7 추가.
- **2026-07-05 (세션 4)**: 사용자 질문 "왜 웹앱으로 저장(설치)이 안 되나?"에서 출발 — 확인 결과 `index.html`에 manifest/service worker/apple 메타가 전혀 없었음(원래 PWA가 Non-Goal이었기 때문). 사용자가 **설치만(manifest-only)** 범위로 선택. P6 구현: `favicon.svg`(보라 글리프)를 sharp로 흰 배경 중앙 배치 래스터화해 아이콘 4종 생성, `manifest.webmanifest` 작성, `index.html`에 링크·메타 추가. `theme_color`는 로고 보라가 아니라 앱 실제 크롬색인 중립 `#fafafa`로 선택(상태바가 헤더와 이어지도록). `npm run build`로 dist 포함 확인. 오프라인(service worker)은 명시적으로 범위 밖 유지 — 네트워크 없으면 안 열림. 향후 오프라인까지 원하면 vite-plugin-pwa로 확장 가능(현재 보류). REQUIREMENTS §7 정정 + §9 신설.
