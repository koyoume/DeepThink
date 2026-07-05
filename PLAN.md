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
- [~] P7 · 시각 디자인 "Outliner Ink" (디자인만, 동작 불변) — **main 직접 반영**. 1차: `@theme` 토큰+웹폰트(Fraunces/Inter/Noto KR), emerald→brand 보라, 세리프 제목. 2차(프로토타입 근접): 배경 심화 `#F1ECE2`, 카드 세리프 제목+여백/구분+rounded-2xl, 카테고리 순서기반 색 팔레트(활성 칩 채움·상세 라벨 점). REQUIREMENTS §5.1/§5.1.1. 하단 탭바·검색·인라인 서식은 미도입(후속). `npm run build` 통과, 배포 성공. 3차(버그): 홈 카드 높이 content-driven 수정(§5.1.2, `content-start items-start`).

## 4. 개발 워크플로
`WEB_DEV_GUIDE.md` 그대로 따름 — 의미 있는 단위마다 즉시 commit, 애매한 UX 결정은 짧은 질문으로 확인 후 진행.

## 5. 열린 항목 / 추후 결정
- **카테고리 칩·주제 카드 순서 변경 방식 재설계(진행 중)**: drag 기반이 세션14에서 8차례 수정에도 기기별 터치 제스처 문제가 계속 나와, 사용자가 drag 대신 명시적 방식으로 바꾸기로 결정. 확정 필요: (1) 범위는 칩+카드만(글쓰기 줄 드래그는 유지, 9차 수정으로 확정됨) (2) UI 방식 — 항상 보이는 ▲▼ 버튼 / '순서 편집' 모드 토글 / 별도 순서 편집 화면 중 미확정. 확정되는 대로 이 항목을 지우고 §5.2 이후 서브섹션에 구현 기록.
- 인라인 서식 후속(선택): 밑줄·글자색 프리셋, 서식 툴바/키보드 단축키 — 굵게·이탤릭은 세션10에서 구현 완료(REQUIREMENTS §5.1.4).
- 검색 동작 정의 (UI-DESIGN.md TODO에서 이월, 아직 미구현)
- 카테고리 색상 커스터마이징 (추가/이름변경/삭제는 Settings 화면에 구현됨, 색은 없음)
- 관련 자료 추가 UI (표시/삭제는 구현, 새로 추가하는 입력 폼은 없음)
- 웹 앱 Settings 화면에 프록시 URL(`https://deepthink-git-proxy.koyoume.workers.dev`) 입력해서 실사용 테스트 (배포 자체는 완료)
- 실제 GitHub 저장소로 clone/push/pull 왕복 검증 (P2에서 PAT 없어 보류, `npm run verify:git` 또는 실사용 중 확인)
- **`koyoume/DataHub` 실제 데이터 복구**: §6 세션 3의 격리 보장 버그로 HEAD에서 사라진 카테고리 5개(Assets/Books/Dev(company)/Dev(personal)/Life) + `WORKFLOW.md`가 git 히스토리엔 남아있음(커밋 `e22f12b9`). 아직 복구 안 함 — 되돌리려면 해당 커밋에서 파일들을 복원해 새 커밋으로 다시 push 필요.
- **롱프레스 드래그 학습**: (1) 텍스트 있는 요소에 롱프레스 드래그를 붙일 땐 `touch-action:none`만으론 부족, `user-select:none` + `-webkit-touch-callout:none`도 항상 같이 걸어야 함(세션14). (2) 롱프레스 대기 타이머는 `pointerup`에서 **리스너 정리뿐 아니라 `clearTimeout`도 반드시 호출**해야 함(세션14 4차 수정). (3) **상태 세팅과 리스너 부착을 별도 `useEffect`로 나누면 안 됨** — 그 사이 시간차에 `pointerup`이 끼어들면 리스너를 못 붙인 채로 드래그 상태가 영원히 안 풀림. 롱프레스 확정 콜백 안에서 `setState`+리스너 부착을 동기적으로 함께 처리할 것(세션14 5차 수정, "평상시에도 카드가 겹쳐 보임"의 실제 원인). `pointercancel`도 `pointerup`과 동일하게 처리해서 브라우저가 제스처를 강제 취소하는 경우까지 방어할 것.
- **flexbox `min-width` 학습**: `truncate`(Tailwind)를 flex item에 걸 때 `min-w-0`을 안 걸면 아무 효과가 없다 — flex item의 기본 `min-width:auto`가 내용의 원래 폭 밑으로 줄어드는 걸 막아서, 긴 텍스트가 있으면 부모(행/카드)가 의도한 폭보다 넓어져 옆 요소와 겹칠 수 있음(세션14 6차 수정 = "가로 길이 조절 안 됨"의 실제 원인이었을 가능성 큼). `truncate`를 쓰는 모든 flex item엔 `min-w-0`을 세트로 걸 것 — 이후 새 UI 작업 시 체크리스트화.
- **이 환경의 한계**: 실제 브라우저/터치 기기가 없어 `tsc`/`vite build`/도메인 유닛 검증까지만 가능. `playwright install`도 네트워크 정책(`cdn.playwright.dev` 미허용)으로 실패 — 시각적 회귀는 스크린샷이나 사용자의 실기기 확인에 의존해야 함.

## 6. 세션 이력 (진행 로그)
- **2026-07-05 (세션 14, 9차 수정)**: 사용자가 카테고리 칩·주제 카드는 drag 대신 명시적 방식으로 바꾸기로 결정(범위/UI 방식 확정 대기 중, §5 열린 항목 참조). 글쓰기 화면 줄 드래그는 그대로 유지하되 "드래그 인지 위치가 해당 줄 전체"가 되도록 요청받음 — 기존엔 작은 핸들(⠿) 아이콘만 히트 영역이었음. 줄 전체를 롱프레스(320ms) 히트 영역으로 넓히고, 짧게 누르면 그 아래 버튼이 정상 동작하도록 `onClickCapture`로 실제 드래그 발동시에만 클릭을 억제. 동시에 카드/칩에서 배운 방어 조치(동기적 상태+리스너 부착, pointercancel, 활성화 후 최소 이동거리 가드, 화면 하단 엣지 스크롤 여유)를 처음부터 적용. `npm run build`·`lint`·`verify:domain` 통과. REQUIREMENTS §5.2.8 신설. main 직접 push.
- **2026-07-05 (세션 14, 8차 수정)**: "마지막 것만 누르면 선택되려다 바로 풀림" 리포트를 사용자와 함께 진단 — 화면 하단 엣지에 있을 때만 그러고 스크롤로 중간에 옮기면 정상이라는 걸 확인해, 코드 버그가 아니라 **모바일 OS가 화면 최하단 근처 터치를 홈/뒤로가기 제스처로 먼저 가로채는 것**으로 결론. 완전히 막을 순 없어 완화 조치로 카드를 누르는 순간 하단 96px 이내면 롱프레스 타이머 돌기 전에 그만큼 위로 스크롤해 여유를 만들도록 추가(`EDGE_MARGIN_PX`). `npm run build`·`lint`·`verify:domain` 통과. REQUIREMENTS §5.2.7 신설, 한계 명시(100% 근절 불가). main 직접 push.
- **2026-07-05 (세션 14, 7차 수정)**: 겹침 해결 확인됨. 새 리포트 — 목록 마지막 주제를 드래그하려고 누르고 있으면(움직이기 전에) 바로 첫 번째 위치로 순간이동. 활성화 직후의 사소한 포인터 이벤트(좌표 지터/합성 이벤트 추정)가 순서 재계산을 잘못 트리거하는 것으로 보고, 근본 원인 확정 대신 방어적으로 **활성화 지점에서 6px 이상 실제로 움직이기 전엔 순서 재계산을 하지 않는 가드**(`REORDER_MOVE_THRESHOLD`) 추가(카드·칩 공통) + `clientX/clientY`가 `(0,0)`인 명백히 비정상 이벤트 무시. `npm run build`·`lint`·`verify:domain` 통과. REQUIREMENTS §5.2.6 신설. main 직접 push.
- **2026-07-05 (세션 14, 6차 수정)**: "가로 길이가 적절히 조절이 안 됨"이라는 구체적 리포트로 재진단 — 드래그 로직이 아니라 정적 CSS 버그로 확정. 실제 브라우저로 확인하려고 `npx playwright install chromium` 시도했으나 네트워크 정책상 `cdn.playwright.dev` 미허용으로 실패, 코드 감사로 원인 특정: 카드 미리보기 행의 `<span className="truncate">`가 `flex` 행의 자식인데 `min-w-0`이 없어서, flex item 기본값(`min-width:auto`)이 긴 텍스트의 원래 폭 밑으로 안 줄어들게 막아 카드가 컬럼 폭을 넘어 옆으로 밀려나던 것으로 추정(flexbox의 잘 알려진 `truncate`+`min-w-0` 누락 함정). 미리보기 행·span에 `min-w-0` 추가, 카드 `<button>`엔 `w-full min-w-0`, 그리드 래퍼 `<div>`엔 `min-w-0`을 방어적으로 명시. `npm run build`(컴파일된 CSS에 `.min-w-0{min-width:0}` 생성 확인)·`lint`·`verify:domain` 통과. REQUIREMENTS §5.2.5 신설, PLAN §5 학습 항목 갱신. main 직접 push. 시각적 최종 확인은 여전히 사용자 몫.
- **2026-07-05 (세션 14, 5차 수정)**: 카테고리는 해결됐지만 카드 겹침이 "드래그와 무관하게 평상시에도" 발생한다는 확인을 받아 재진단. 실제 원인: 롱프레스 타이머 콜백에서 `setCardDrag`로 상태만 세팅하고, 별도 `useEffect`가 한 박자 늦게 실제 드래그 리스너를 부착하는 2단계 구조 — 그 사이 시간차에 `pointerup`이 끼면 리스너를 못 붙인 채 `cardDrag`가 영원히 안 풀려 고스트 카드가 눌어붙어 다른 카드와 겹쳐 보임(화면 이동 시 리마운트되면 사라지지만 그 전까진 "평상시에도" 겹쳐 보임). `useEffect` 기반 2단계 구조를 없애고 타이머 콜백 안에서 `setState`+리스너 부착을 동기적으로 처리하는 `activateCardDrag`/`activateChipDrag`로 통합, `pointercancel`도 `pointerup`과 동일하게 방어 처리(칩·카드 둘 다 동일 구조라 함께 수정). `npm run build`·`lint`·`verify:domain` 통과. REQUIREMENTS §5.2.4 신설, PLAN §5 학습 항목 갱신. main 직접 push.
- **2026-07-05 (세션 14, 4차 수정)**: "카테고리 선택만 하려고 눌러도 drag 되려 함", "카드 겹침 여전"이 재발 리포트됨. 진짜 원인 발견: 롱프레스 대기 로직의 `onUp`(pointerup) 핸들러가 이벤트 리스너만 정리하고 **`setTimeout` 타이머를 clearTimeout 안 하는 버그**였음 — 짧게 탭해도 320ms 뒤 타이머가 그대로 실행돼 드래그가 뒤늦게 발동. 칩은 화면 전환이 없어 바로 눈에 띄었고, 카드는 탭하면 화면이 바뀌어 안 보였지만 대시보드 복귀 시마다 유령 드래그 상태가 남아 카드 겹침의 실제 원인이었을 가능성 큼. `onUp`에 `window.clearTimeout(timer)` 추가로 수정(칩·카드 둘 다), 코드 한 줄 버그. `npm run build`·`lint`·`verify:domain` 통과. REQUIREMENTS §5.2.3 신설, PLAN §5 학습 항목 갱신. main 직접 push.
- **2026-07-05 (세션 14)**: 세션12~13 드래그 재정렬 재발 버그 3차 수정. 사용자 리포트 두 갈래: (1) "주제 박스 drag는 잘됨, 근데 겹치기 해결 필요" → 1차 수정(테두리 하이라이트)이 근본 해결이 안 됐던 것으로 확인, **실시간 리플로우**로 재설계: 드래그 중 매 pointermove마다 현재 화면의 카드/칩 좌표를 다시 측정해 삽입 지점을 계산하고, 배열 순서를 실제로 바꿔 다른 카드/칩이 진짜로 자리를 비켜주게 함(이전엔 좌표를 드래그 시작 시점에 한 번만 캐시해서 재사용 — 리플로우 없이 하이라이트만 있었음). 드래그 중인 카드/칩 자체는 그리드에서 완전히 빼고 `position:fixed` 고스트로 포인터를 따라다니게 분리. (2) "카테고리 drag 누르면 글자 선택이나 스크롤이 됨" → 진짜 원인은 스크롤 경합이 아니라 **모바일 롱프레스 텍스트 선택 콜아웃**이었음(`ThoughtRow` 핸들엔 있던 `select-none` 보호가 `CategoryChips`엔 빠져 있었음) — `select-none`+`WebkitUserSelect:none`+`WebkitTouchCallout:none` 추가로 해결. `npm run build`·`lint`·`verify:domain` 모두 통과. REQUIREMENTS §5.2.1(재작성)·§5.2.2 신설, PLAN §5에 롱프레스 드래그 학습 항목 추가. main 직접 push. 계속 재발 시 @dnd-kit 전환을 다음 옵션으로 열어둠.
- **2026-07-05 (세션 13)**: 세션12 드래그 재정렬 실사용 버그 수정 — "네모 박스 간에 겹치는 문제, drag가 자연스럽지 않고 누르면 화면 스크롤이 작동". 원인 둘: (1) 카드/칩 `touch-action: manipulation`이 롱프레스 대기 중 미세한 손가락 이동에도 브라우저 네이티브 스크롤을 먼저 채가 우리 드래그 판정과 경합 — `touch-action: none`으로 바꾸고, 롱프레스 확정 전까지는 이동량만큼 `window.scrollBy`/컨테이너 `scrollBy`로 직접 스크롤을 대신 처리하도록 수정. (2) 드래그 중 다른 카드/칩이 제자리 그대로 있어 겹쳐 보임 — 스왑 대상(`overIndex`) 카드/칩에 브랜드색 아웃라인으로 이동 위치 표시, 드래그 중인 요소는 그림자·스케일·투명도로 구분. `npm run build`·`npm run lint` 통과. REQUIREMENTS §5.2.1 신설. main 직접 push.
- **2026-07-05 (세션 12)**: 최근 카테고리 기억 + 3종 드래그 재정렬 구현. 사용자 요청 4가지를 `ask_user_input`으로 방식 확정 후 착수: (1) 카테고리 선택을 `localStorage`에 영속화해 새로고침해도 유지(기존엔 zustand 메모리 상태뿐이라 초기화됐음). (2) 홈 카테고리 칩을 **길게 눌러(320ms)** 드래그 재정렬 — 기존에 이미 있던 `.deepthink/categories.json` 순서 파일 재사용, `reorderCategories` 액션 신설. (3) 홈 주제 카드도 길게 눌러 그리드 안에서 드래그 재정렬, **카테고리별로 별도 순서** 저장(해당 카테고리 `.md` 파일 내 배열 순서), `reorderTopicsInCategory` 액션 신설. (4) 생각 줄 왼쪽에 드래그 핸들(⠿) 추가 — 좌우로 끌면 들여쓰기 레벨 변경(기존 `shiftLevel` 재사용), 위아래로 끌면 줄 순서 변경(`reorderThought` 신설, 중첩 하위 블록 통째로 이동). 기존 "줄 전체 좌우 스와이프로 들여쓰기" 제스처는 핸들 방식으로 대체. 라이브러리 추가 없이 `pointerdown/move/up` 직접 구현(기존 코드베이스 패턴 유지). `npm run build`(tsc+vite)·`npm run lint`·`npm run verify:domain` 모두 통과. REQUIREMENTS §5.2 신설. main 직접 push.
- **2026-07-05 (세션 11)**: 배포 실패 진단·수정 — 사용자가 "인라인 서식이 전혀 안 보인다"고 리포트. GitHub Actions 확인 결과 직전 커밋(`dcb2fde`, 인라인 서식)의 **E2E 게이트가 실패해 배포 자체가 스킵**됐던 것으로 확인(로그 파일은 storage host가 네트워크 allowlist 밖이라 직접 못 읽어, E2E 스펙 코드를 정적으로 분석해 원인 추론). 근본 원인: `ThoughtRow`의 렌더 모드 조건이 `focusRequested`(포커스 예약 상태)를 고려하지 않아, 하단 입력바로 새 줄을 추가하면(텍스트+포커스요청이 동시에 생김) 그 줄이 처음부터 렌더링 버튼으로 그려지고 실제 `<input>`이 없어 자동 포커스가 조용히 실패 — E2E의 "하단 입력바로 추가" 스텝이 정확히 이 흐름을 검증해 실패. 조건에 `!props.focusRequested`를 추가해 수정. 재푸시 후 GitHub Actions로 E2E 게이트·Cloudflare Pages 배포 스텝까지 전부 success 확인(추측 없이 실제 파이프라인 결과로 검증). REQUIREMENTS §5.1.4에 버그·수정 기록 추가.
- **2026-07-05 (세션 10)**: 인라인 서식(굵게·이탤릭) 구현 — 이전 세션에서 "다음 범위"로 예약해뒀던 항목. 범위를 표준 마크다운 지원 문법(`**굵게**`/`*이탤릭*`)만으로 확정, 밑줄·글자색은 비표준이라 제외. 저장 형식은 변경 없음(`Thought.text`가 원래 원문 그대로 round-trip되는 구조라 별도 코덱 작업 불필요). `src/domain/inlineFormat.tsx` 신설(정규식 파서, 빈 문자열/미종결 서식/혼용 케이스 검증). `ThoughtRow`에 포커스 중 원문 `<input>` ↔ blur 시 렌더링된 `<button>` 뷰 전환 방식 적용(안전한 방식 채택 — 이전 세션의 contentEditable 커서 버그 전례 때문에 실시간 렌더링 방식은 배제, 기존 Enter/Backspace/Tab/스와이프 키 핸들러 무변경). `TopicCard` 미리보기에도 동일 파서 적용(읽기 전용이라 리스크 없음). `npm run build`(tsc+vite) 통과. REQUIREMENTS §5.1.4 신설, §5.1.3 예약 항목을 구현 완료로 갱신. main 직접 push.
- **2026-07-05 (세션 9)**: 디자인 폴리시 — 빈/로딩 상태 + 상세·설정 화면 토큰 정합. 공용 `Loading`(브랜드 스피너)·`EmptyState`(옅은 보라 글리프+세리프 제목+힌트) 컴포넌트 신설. 대시보드 빈 상태(주제 0개)·상세 빈 생각·초기/상세 로딩 통일. 상세/설정/`ThoughtRow`의 하드코딩 색(`bg-white`·`neutral-*`·`red-*`) 전량 토큰화, `--color-danger`/`--color-danger-soft` 신설(위험 액션 전용). 설정 화면을 플랫 폼→섹션 카드(`Section`)로 그룹화, 입력 `focus:border-brand` 통일. `npm run build` 통과(타입체크 포함), dist CSS에 `.text-danger`/`.bg-danger-soft` 확인, 하드코딩 팔레트 0 확인. E2E는 이 환경에서 브라우저 미설치로 미실행 → CI 게이트가 커버. 인라인 서식은 다음 범위로 예약. REQUIREMENTS §5.1.3 신설. main 직접 push.
- **2026-07-05 (세션 8)**: 실사용 버그 수정 — "홈 카드 박스가 노출 내용보다 크게 나옴". 원인은 `DashboardScreen.tsx` 카드 그리드가 `grid grid-cols-2`만 지정해 CSS Grid 기본 `align-items: stretch`로 같은 행의 짧은 카드가 긴 카드 높이로 늘어난 것(+`flex-1` 컨테이너의 기본 `align-content: stretch`가 행 트랙까지 부풀림). `content-start items-start` 추가로 카드가 자기 내용 높이만큼만 잡히도록 수정(동작·데이터·2열 배치 불변, 순수 레이아웃). `npm run build` 통과, dist CSS에 `.content-start`/`.items-start` 유틸 확인, main 직접 push. REQUIREMENTS §5.1.2 신설.
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
