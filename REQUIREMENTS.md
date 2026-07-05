# DeepThink 웹 이식 — 요구사항 (누적)
> 정본은 코드(특히 `android-backup/app/src/main/java/com/printk/deepthink/`). 이 문서는 그 위에 얹는 웹 이식 결정·적응 사항을 담는다.

## 1. 단위/용어
- **주제(Topic)**: 핵심 단위, 하나의 카테고리에 속함
- **생각(Thought)**: 주제 안의 한 줄, `check`(체크리스트) 또는 `comment`(코멘트) 타입, `level`(들여쓰기, 0~4)
- **자료(Material)**: 주제에 딸린 선택적 관련 자료, `link` 또는 `doc`
- **카테고리(Category)**: vault 안 md 파일 1개에 대응

## 2. 데이터 모델
Android `Models.kt` 기준 1:1:
```ts
type ThoughtType = 'check' | 'comment'
type MaterialKind = 'link' | 'doc'
const MAX_THOUGHT_LEVEL = 4

interface Thought {
  id: string
  type: ThoughtType
  level: number       // 0-4
  text: string
  done: boolean       // check 타입에서만 의미
}

interface Material {
  kind: MaterialKind
  title: string
  sub: string
  url: string
}

interface Topic {
  id: string
  category: string
  title: string
  materials: Material[]
  thoughts: Thought[]
}

interface Category {
  name: string
  order: number
}
```

## 3. Markdown 포맷 (round-trip 보장, `MarkdownCodec.kt` 이식)
```
# <카테고리>

<!-- topic: <uuid> -->
## <제목>

### 관련 자료
- [link](url) "title" — sub
- [doc] "title" — sub

### 생각
- [ ] 미완료 체크 (level0)
- [x] 완료 체크
  - [ ] 하위 체크 (들여쓰기 2칸 = level+1)
- 코멘트 한 줄
```
- 레벨당 들여쓰기 2칸.
- 파싱 시 알 수 없는 줄은 무시(원본과 동일 관용).
- Material 파싱: `[link](url)` 또는 `[doc]` 뒤에 `"title"`(따옴표 필수 파싱) + 선택적 ` — sub`.

## 4. 저장/동기화
- 파일 레이아웃: `<repoDir>/DeepThink/<slug(카테고리)>.md`, 순서 메타 `<repoDir>/DeepThink/.deepthink/categories.json`.
- slug 규칙: `[/\:*?"<>|]` → `_`, 빈 문자열이면 `untitled`.
- git 동기화는 **카테고리별로 해당 md 파일 1개만** add/commit/push — repo의 다른 파일은 절대 건드리지 않음(원본 불변 조건 유지).
- **PAT 저장**: `localStorage`에 평문 저장(remoteUrl/username/token/authorName/authorEmail). Android의 EncryptedSharedPreferences 같은 안전한 저장소가 브라우저엔 없음 — 개인용 도구라는 전제 하의 의도적 트레이드오프. **정정 여지**: 나중에 passphrase 기반 Web Crypto 암호화를 추가할 수 있음(현재 범위 아님).
- **CORS 프록시**: git 호스트가 브라우저 CORS를 지원하지 않아 Cloudflare Worker로 투명 프록시 필요(git 로직에 관여하지 않는 순수 바이트 릴레이).

## 5. 화면/기능별 스펙
`docs/legacy-prototype/UI-DESIGN.md` §4~6 동작 스펙을 그대로 따름(시각 디자인은 새로 함):
- **대시보드**: 카테고리 칩(단일·필수 선택, "전체" 없음), 주제 카드 2열(제목 자동축소 18px→11px, 미리보기 N줄, 메이슨리), 뷰옵션 버튼(3→2→1→끔→3 순환), FAB로 주제 추가.
- **상세 화면**: 제목 고정 높이 박스(짧으면 27px 한 줄, 길면 22px→15px 두 줄), 관련자료 리스트(선택), 생각 리스트, 하단 입력바.
- **편집 인터랙션** (원본은 터치 전용 → 웹은 아래 모두 지원):
  | 동작 | 원본(터치) | 웹 추가 지원 |
  |---|---|---|
  | 줄 편집 | 탭 | 클릭 |
  | 줄 추가/삽입 | 편집 중 Enter | 동일 |
  | 입력 종료 | 빈 줄 Enter | 동일 |
  | 줄 삭제 | 빈 줄 맨앞 Backspace | 동일 |
  | 들여쓰기 | 오른쪽 스와이프 | + Tab, + ⋯메뉴 |
  | 내어쓰기 | 왼쪽 스와이프 | + Shift+Tab, + ⋯메뉴 |
  | 완료 토글 | 체크 아이콘 탭 | 클릭 |
  | 줄 메뉴 | 길게 누르기(~480ms) | + 줄별 "⋯" 버튼 클릭 |
- **들여쓰기 규칙** (`TopicDetailViewModel.shiftLevel` 기준): 들여쓰기 시 상한 = `min(바로 위 줄 level+1, MAX_THOUGHT_LEVEL)`, 내어쓰기 시 하한 0. 대상 줄 이후 `level > 현재 level`인 연속 줄들(하위 트리)이 함께 이동.
- **설정 화면**: git 원격 URL/username/token/author 설정, 미리보기 기본 줄 수(0~3).

## 5.1 시각 디자인 — "Outliner Ink" (2026-07-05 확정)
`docs/legacy-prototype/UI-DESIGN.md`의 **동작·레이아웃(§4~6)은 고정**, 시각만 새로 정의. 강조색은 레거시 pine에서 브랜드 보라로 교체.
- **토큰**(`src/index.css` `@theme`): paper `#FBFAF7` / surface `#FFFFFF` / ink `#211B33` / muted `#78748A` / faint `#A8A4B4` / line `#ECEAE3` / guide(레일) `#E4DEF6` / **brand `#6B4EFF`** / brand-soft `#EDE9FF` / comment(amber) `#C9803A`.
- **폰트**: 본문 `Inter + Noto Sans KR`, 제목(화면·상세) `Fraunces + Noto Serif KR`. 한글 커버 위해 Noto KR 병기(Fraunces/Inter는 라틴 전용). Google Fonts로 로드, `display=swap`.
- **강조 운용**: 활성 카테고리 칩·완료 체크·FAB·포커스 = brand. 코멘트 글리프는 amber 유지(체크와 색·모양으로 구분).
- **형태**: 칩·소형 버튼 `rounded-full`→`rounded-lg`. FAB·코멘트 글리프만 원형 유지. emerald 계열 전면 제거.
- **PWA/브라우저 크롬**: `theme-color`·manifest `theme_color`/`background_color` = paper `#FBFAF7`(상태바가 앱 배경과 이어지도록).
- **범위 밖(후속)**: 인라인 굵게/이탤릭(`**`/`*`, 에디터 개조 필요), 검색 화면·기능, 카테고리 색(모델에 색 필드 없음).

### 5.1.1 2차 강화 (2026-07-05, 프로토타입 근접)
프로토타입과의 간극을 좁히는 시각 강화. 하단 탭바는 **미도입**(설정=헤더 버튼 유지).
- **배경 심화**: paper `#FBFAF7`→`#F1ECE2`(흰 카드 대비↑). theme-color·manifest 동일 반영.
- **카드**: 제목 **세리프**(Fraunces+Noto Serif KR, 자동축소 20→13px) + 내부 여백↑(p-4) + 제목/미리보기 사이 헤어라인 구분 + rounded-2xl + hover 시 보라 그림자.
- **카테고리 색 = 순서 기반 팔레트**(`src/domain/categoryColor.ts`, 8색). 모델에 색 필드가 없어 카테고리 배열 index로 결정론적 배정(이름 변경/추가에도 안정). **활성 칩=카테고리 색 채움**, 비활성 칩=색 점+이름, 상세 화면 카테고리 라벨=색 점.
- 완료 체크·FAB는 브랜드 보라 유지(카테고리 색과 역할 구분).

### 5.1.2 카드 높이 = content-driven (2026-07-05, 버그 수정)
**규칙**: 홈 2열 그리드의 각 카드 높이는 **자기 노출 내용(제목 + 미리보기 N줄)에만** 맞춘다. 행/컨테이너에 맞춰 늘어나지 않는다.
- 버그: 카드 그리드 컨테이너가 `grid grid-cols-2`만 지정 → CSS Grid 기본값 `align-items: stretch`로 **같은 행의 짧은 카드가 옆의 긴 카드 높이로 늘어남**. 추가로 `flex-1`이 컨테이너를 화면 높이로 키우면서 기본 `align-content: stretch`가 행 트랙까지 세로로 부풀림 → 카드가 노출 내용보다 크게 보임.
- 수정: 그리드 컨테이너에 `content-start items-start` 추가(`align-content/​items: flex-start`). `items-start`=카드가 행 이웃에 안 끌려감, `content-start`=행이 위로 모여 트랙이 안 늘어남. `flex-1`은 스크롤 영역 확보용으로 유지(빈 공간만 아래로).
- 불변: 동작·데이터·2열 배치 그대로. 순수 레이아웃 수정.

### 5.1.3 화면 폴리시 · 빈/로딩 상태 (2026-07-05)
대시보드 대비 상세·설정 화면에 남아 있던 하드코딩 색을 토큰으로 통일하고, 빈/로딩 상태를 브랜드 언어로 정리. **순수 시각(동작·데이터·네비 불변).**
- **danger 토큰 신설**: `--color-danger #C4453D`(종이 팔레트에 맞춘 차분한 레드) / `--color-danger-soft #F7E7E5`(hover 배경). 삭제 등 위험 액션에만 사용. 기존 하드코딩 `text-red-*`/`hover:bg-red-*` 전량 대체.
- **토큰 정합(전 화면)**: `bg-white`→`bg-surface`, `text-neutral-*`→`text-muted`/`text-faint`, `border-neutral-*`→`border-line`. 상세 화면(주제 메뉴)·`ThoughtRow`(줄 메뉴)·설정 화면 모두 적용. 하드코딩 팔레트 0.
- **공용 컴포넌트**:
  - `Loading`(`src/components/Loading.tsx`): 브랜드 보라 스피너 + muted 라벨. App 초기 로딩·상세 로딩 공통 사용(기존 각기 다른 맨텍스트 통일).
  - `EmptyState`(`src/components/EmptyState.tsx`): 옅은 보라 원 글리프 + 세리프 제목 + muted 힌트. 재사용.
- **빈 상태 적용**:
  - 대시보드: 선택 카테고리에 주제 0개일 때(기존엔 빈 그리드) → "아직 주제가 없어요" + "＋로 첫 주제 추가" 힌트.
  - 상세: 생각 0개 → "첫 생각을 적어보세요" + 하단 입력 유도 힌트(기존 "아직 생각이 없습니다." 대체).
- **설정 화면 그룹화**: 플랫 폼 → 섹션 카드(`Section` 로컬 컴포넌트: 소제목 + `rounded-2xl border-line bg-surface` 카드)로 위계 부여. 입력 필드 `focus:border-brand`·`placeholder:text-faint` 통일, 버튼 hover 트랜지션 추가. 그룹: Git 저장소 / CORS 프록시 / 동기화 / 미리보기 기본 줄 수 / 카테고리 관리.
- **인라인 서식 구현 완료(2026-07-05)**: §5.1.4 참조.

### 5.1.4 인라인 서식 — 굵게·이탤릭 (2026-07-05 구현)
표준 마크다운 문법만 지원. **밑줄·글자색은 마크다운 비표준이라 범위 밖(미도입)**.
- **저장**: 변경 없음. `Thought.text`는 원래도 원문 문자열 그대로 저장·round-trip되므로, 사용자가 `**text**`/`*text*`를 그냥 입력하면 기존 코덱으로 그대로 저장·복원됨.
- **파싱**: `src/domain/inlineFormat.tsx`의 `renderInlineFormatted()` — 정규식으로 `**...**`(굵게)→`<strong>`, `*...*`(이탤릭)→`<em>` 매칭, 그 외(짝 안 맞는 `*`, 서식 없는 텍스트)는 원문 그대로 표시. 논리 오류 없음(빈 문자열·미종결 서식·굵게+이탤릭 혼용 케이스 검증 완료).
- **렌더링 방식(상세 화면 `ThoughtRow`)**: 안전한 방식 채택 — **포커스 중엔 원문이 보이는 기존 `<input>` 유지**(Enter/Backspace/Tab/스와이프 키 핸들러 전혀 안 건드림), **blur 시 같은 자리에 굵게/이탤릭 렌더링된 `<button>` 뷰로 전환**, 클릭하면 다시 편집 모드로 돌아가 원문 노출. `contentEditable` 방식은 이전 세션에서 상세 제목 편집 시 커서가 튀는 버그가 있었던 전례가 있어 채택하지 않음(PLAN §6 세션1 참조).
- **홈 카드 미리보기(`TopicCard`)**: 읽기 전용이라 리스크 없이 같은 파서 적용 — 카드에서도 굵게/이탤릭이 그대로 보임.
- **범위 밖**: 밑줄, 글자색(프리셋), 서식 적용 툴바/키보드 단축키(Cmd/Ctrl+B 등). 필요 시 별도 결정 후 추가.

## 6. 비기능 요구
- 반응형: 데스크톱/모바일 브라우저 모두 대응(원본은 모바일 전용이었으나 웹은 양쪽 지원).
- 편집 후 400ms debounce 저장 (원본 `TopicDetailViewModel.scheduleSave` 동일 패턴).

## 7. 범위 제외 (Non-Goals)
- ~~PWA/오프라인 지원~~ → **정정**: PWA **설치**는 지원함(§9 참조). **오프라인 실행(service worker/캐싱)** 은 여전히 범위 제외.
- Android `migrateLegacyRootFiles()` 레거시 마이그레이션 로직
- PAT 암호화 저장(향후 개선 후보)
- 검색 기능 구체 동작(추후 정의)

## 8. 구현 메모 (실제 코딩하며 발견/정정한 것)
- `tsconfig.app.json`에 `erasableSyntaxOnly: true`가 켜져 있어(Node 네이티브 TS 실행 호환 목적) TypeScript `enum`과 생성자 parameter property(`constructor(private readonly x: T)`) 문법을 못 씀 — 컴파일 에러(TS1294). `markdownCodec.ts`의 Section은 문자열 유니온으로, `vaultStore.ts`의 `VaultFileStore` 생성자는 일반 필드 할당으로 작성.
- `node`으로 `.ts` 파일을 직접 실행할 때 상대 import는 확장자(`./models.ts`)를 명시해야 함 — Vite bundler 모드(`allowImportingTsExtensions`)와도 호환되므로 도메인 레이어 전체에 이 컨벤션 사용.
- `@isomorphic-git/lightning-fs`는 브라우저 IndexedDB 전제라 Node에서 직접 검증하려면 `fake-indexeddb` 폴리필이 필요(devDependency로 추가, 프로덕션 번들엔 포함 안 됨). 폴리필이 타이머를 남겨 스크립트가 안 끝나는 문제가 있어 검증 스크립트 끝에 `process.exit(0)` 추가.
- `gitSync.ts`는 `fs`/`http`를 주입받는 구조로 설계 — 브라우저에선 `LightningFS` + `isomorphic-git/http/web`(+corsProxy), Node 검증에선 실제 `node:fs` + `isomorphic-git/http/node`(CORS는 브라우저 전용 제약이라 Node에선 프록시 불필요). 덕분에 `src/git/__verify__/liveSync.mjs`로 실제 GitHub 저장소 왕복을 프록시 없이 검증 가능(단, 실행하려면 `GIT_VERIFY_REMOTE_URL`/`GIT_VERIFY_TOKEN` env var 필요 — 세션 1에서는 PAT 미제공으로 미실행, 코드 리뷰/타입체크만 완료).
- 첫 동기화 시(로컬에 커밋이 아직 없는데 원격엔 이미 데이터가 있는 경우) isomorphic-git의 고수준 `pull()`/`fastForward()`가 "unborn branch" 상황을 어떻게 처리하는지 문서만으론 불확실해, 대신 `resolveRef`로 로컬/원격 커밋 존재 여부를 직접 분기해 로컬에 커밋이 없으면 `git.branch({object: remoteOid, checkout: true})`로 명시적으로 채택하는 방식을 택함 — 동작이 예측 가능하고 테스트하기 쉬움.
- Cloudflare Worker CORS 프록시(`proxy/`)는 isomorphic-git의 `corsProxy` 관례(`<proxy>/<host>/<path>` → `https://<host>/<path>`로 재구성)를 그대로 구현. 오픈 릴레이가 되지 않도록 `ALLOWED_HOSTS`(기본 github.com/gitlab.com/bitbucket.org)로 대상 호스트를 제한하고, 전달 헤더도 git smart-HTTP에 필요한 것만 화이트리스트.
- **중요(실버그, Playwright로 발견)**: `@isomorphic-git/lightning-fs`는 IndexedDB 저장을 내부적으로 500ms 디바운스한다(`saveSuperblock`). 우리 앱의 400ms 자체 디바운스 저장과 별개로, `VaultFileStore`가 `fs.promises.writeFile()`만 호출하고 끝내면 실제 IndexedDB 기록 전에 탭을 닫거나 새로고침하면 데이터가 유실될 수 있는 창이 생긴다. `writeCategory`/`deleteCategoryFile`/`writeOrder` 끝에 `fs.promises.flush()`를 추가해 매 쓰기마다 즉시 영속되도록 수정(개인 메모 앱의 쓰기 빈도에서는 성능 비용보다 데이터 유실 방지가 훨씬 중요하다고 판단). Playwright로 "편집 → 새로고침 → 데이터 유지"를 검증해 실제로 재현/수정 확인.
- `useAutoFitFontSize`를 `contentEditable` div가 아니라 `<textarea>`/`<div>`에 범용으로 쓸 수 있도록 제네릭으로 설계 — 상세 제목은 원래 `contentEditable`로 시도했으나 React가 매 렌더마다 controlled children을 다시 밀어넣어 커서 위치가 튀는 문제가 있어(잘 알려진 React+contentEditable 함정) 다른 입력 필드들과 동일하게 controlled `<textarea>`로 통일.
- 편집 인터랙션(들여쓰기 스와이프, Tab/Shift+Tab, 줄 메뉴 ⋯, Enter 삽입, 빈 줄 Backspace 삭제)은 Playwright로 실제 클릭/키보드 입력을 통해 동작 확인 완료 — Tab 들여쓰기, 하단 입력바 Enter 추가, 새로고침 후 영속까지 자동화 스크립트로 재현.
- 번들 크기가 500KB(gzip 153KB)를 넘어 Vite 경고가 뜬다 — isomorphic-git+lightning-fs가 원래 큼. 개인용 도구 규모에서는 지금 당장 code-splitting할 필요는 없다고 판단, 추후 필요해지면 `React.lazy`로 상세/설정 화면을 분리하는 정도로 대응 가능(Non-Goal, 지금은 보류).
- **실버그(배포된 앱에서 Pull 실행 시 발견)**: `isomorphic-git`이 내부적으로(git index 인코딩 등, `GitIndex._entryToBuffer` 등) Node의 전역 `Buffer`를 참조하는데, Vite는 webpack과 달리 Node 전역을 자동 폴리필하지 않아 브라우저에서 `Buffer is not defined` ReferenceError가 났다. `buffer` 패키지를 의존성으로 추가하고 `src/polyfills.ts`(엔트리 `main.tsx` 최상단에서 import)에서 `globalThis.Buffer`를 채워 넣어 해결. 수정 후 Playwright로 Settings의 Pull 버튼을 실제로 눌러 확인 — 가짜 토큰으로도 `Buffer` 에러 없이 실제 GitHub 응답(`HTTP Error: 401`)까지 도달하는 것 확인, 즉 브라우저→isomorphic-git→CORS 프록시→GitHub 전체 경로가 실제로 동작함.
- **🔴 중대 실버그(실사용 중 사용자의 실제 GitHub 저장소에서 데이터 유실 발생, 사용자 리포트로 발견)**: "카테고리 1개만 add→commit→push, 다른 파일은 절대 안 건드림"이라는 핵심 격리 보장이 실제로는 깨져 있었다. 원인은 `pull()`에서 원격 상태를 로컬로 반영할 때 쓴 `git.branch({..., checkout: true})`와 `git.merge({fastForwardOnly: true})` — 이 둘 다 워킹 디렉토리/git 인덱스를 실제로는 완전히 채우지 않는다(Node로 직접 재현: `branch({checkout:true})`는 워킹 디렉토리에 파일을 아예 안 씀, `merge()`는 병합된 새 파일을 워킹 디렉토리에 반영 안 함). 그 상태에서 `syncCategory()`가 카테고리 파일 1개만 `git.add()` 하고 `git.commit()`하면, isomorphic-git의 commit은 **인덱스에 있는 내용만으로 트리를 구성**하므로, 인덱스에 없던(=워킹 디렉토리엔 있지만 한 번도 add된 적 없는) 다른 모든 파일이 새 커밋에서 통째로 빠져 "삭제된 것"으로 기록된다. 실제로 사용자의 `koyoume/DataHub` 저장소에서 카테고리 하나("제품 기획")만 동기화했는데 다른 카테고리 5개(Assets/Books/Dev(company)/Dev(personal)/Life)와 무관한 루트 파일 2개(`WORKFLOW.md`, 레거시 `제품 기획.md`)가 HEAD에서 사라짐 — GitHub API로 diff 확인하며 재현.
  **수정**: `pull()`의 두 분기 모두 `git.branch()`/`git.merge()` 직후 명시적으로 `git.checkout({ref: BRANCH, force: true})`를 호출해 워킹 디렉토리+인덱스를 실제로 HEAD와 맞춤. **추가 안전장치**: `syncCategory()`가 커밋하기 직전 `git.statusMatrix({ref: HEAD})`로 "HEAD엔 있는데 인덱스엔 없는"(=이 커밋에서 사라질) 파일이 대상 파일 외에 하나라도 있으면 커밋 자체를 막고 에러를 반환하는 `assertIndexMatchesHead()` 가드 추가 — 근본 수정이 뚫려도 격리 보장이 조용히 깨지지 않고 시끄럽게 실패하도록.
  **회귀 테스트**: `src/git/__verify__/regressionIsolation.mjs` — `git http-backend`를 감싼 로컬 smart-HTTP 서버(`localGitServer.mjs`, 외부 네트워크/GitHub 계정 불필요)로 실제 `pull()`/`syncCategory()`를 왕복시켜, 사전에 존재하던 무관한 파일들이 카테고리 동기화 후에도 살아있는지 검증. `npm run verify:domain`에 포함되어 매번 실행됨.
  **영향받은 실제 데이터 복구는 미완료** — `koyoume/DataHub`는 git 히스토리에 삭제 전 커밋이 남아있어 데이터 자체는 복구 가능하지만, 아직 되돌리지 않음(§5 열린 항목).

## 9. PWA 설치 (manifest-only)
홈 화면에 독립 앱(standalone)으로 설치 가능하게만 함. **오프라인 실행은 하지 않음**(service worker 없음 — 네트워크 없으면 여전히 안 열림).
- `public/manifest.webmanifest`: name/short_name `DeepThink`, `start_url`·`scope` `/`, `display: standalone`, `background_color`/`theme_color` `#fafafa`(앱 실제 헤더·배경인 neutral-50과 일치 — 로고는 보라 `#863bff`지만 UI 크롬은 중립톤이라 상태바가 헤더와 이어지도록 중립색 선택).
- 아이콘: `favicon.svg`(보라 글리프)를 흰 배경에 중앙 배치로 래스터화 — `icon-192.png`, `icon-512.png`(purpose any), `icon-maskable-512.png`(safe-zone 여백↑), `apple-touch-icon.png`(180, iOS·투명도 없음).
- `index.html`: manifest 링크 + `theme-color` + `apple-touch-icon` + iOS 독립실행 메타(`mobile-web-app-capable`/`apple-mobile-web-app-*`).
- 설치 조건(이름·192/512 아이콘·start_url·display·HTTPS)은 Cloudflare Pages(HTTPS)에서 모두 충족.
