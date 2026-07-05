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
- **실버그(배포 직후 발견·수정)**: 렌더 모드 조건이 `!focused && text!=''`만 보고 있어, 하단 입력바로 새 줄을 추가할 때(`addAtEnd` — 텍스트가 이미 채워진 채 `focusRequest`도 함께 생성됨) 그 줄이 마운트 시점부터 렌더링 버튼으로 그려져 실제 `<input>`이 DOM에 없었음 → 자동 포커스 효과가 `inputRef.current`를 못 찾아 조용히 실패, 새 줄이 편집 상태로 안 들어감. 이 버그가 CI E2E 게이트를 실패시켜 **직전 배포(인라인 서식 커밋) 자체가 라이브에 반영되지 못함**. 조건에 `!props.focusRequested`를 추가해 수정(포커스 요청이 걸린 줄은 텍스트 유무와 무관하게 항상 input 마운트). 수정 후 E2E 게이트·배포 모두 성공 확인.

## 5.2 최근 카테고리 기억 + 3종 드래그 재정렬 (2026-07-05 구현)
> **[대체됨, §5.3 참조]** 이 섹션과 하위 §5.2.1~5.2.8은 카테고리 칩·주제 카드의 drag 기반 순서 변경 시도와 그 과정에서 나온 9차례 수정 기록이다. 결국 기기별 터치 제스처 문제가 계속 재발해 drag 자체를 버리고 §5.3의 "순서 편집" 버튼 방식으로 교체했다. 글쓰기 화면(생각 줄)의 들여쓰기·순서 drag는 그대로 유지되며 영향 없음(§5.2.8은 계속 유효). 아래 기록은 무엇을 시도했고 왜 안 됐는지의 이력으로 남겨둔다.

**결정 배경**: 카테고리 선택이 새로고침 시 초기화됨(메모리 상태만 있고 영속화 안 됨), 카테고리/주제/생각줄 순서를 바꿀 방법이 없었음. 아래 4가지를 한 세션에서 함께 구현.

- **최근 카테고리 기억**: `selectedCategory`를 `localStorage`(`deepthink:selectedCategory`)에 저장. 앱 재시작·새로고침 시 저장된 이름이 현재 카테고리 목록에 남아 있으면 그 카테고리로 복원, 없으면 기존처럼 첫 카테고리로 폴백(`effectiveSelectedCategory` 로직 그대로 재사용).
- **카테고리 순서 변경**: 홈 화면 카테고리 칩을 **길게 누르면(320ms)** 드래그 모드 진입 → 좌우로 끌어 순서 변경 → 손을 떼면 확정. 순서는 이미 존재하던 `.deepthink/categories.json`(`vaultFileStore.writeOrder`)에 저장되므로 git sync에도 반영됨. 짧게 누르면 기존처럼 카테고리 선택(길게 눌러 드래그가 활성화된 경우에만 그 탭의 `onClick` 억제).
- **홈 화면 주제 카드 순서**: 카드도 **길게 눌러 드래그**로 2열 그리드 안에서 재정렬. **카테고리별로 별도 순서 저장**(해당 카테고리 `.md` 파일 내 주제 배열 순서 = 카드 노출 순서). `reorderTopicsInCategory` 스토어 액션 신설.
- **글 작성 들여쓰기·순서 drag**: 각 생각 줄 왼쪽에 드래그 핸들(`⠿`) 추가. **핸들을 좌우로 끌면 들여쓰기 레벨 변경**(22px당 1레벨, 기존 `shiftLevel` 로직 재사용 — 하위 중첩 블록 전체가 함께 이동), **위아래로 끌면 줄 순서 변경**(중첩 자식이 있으면 블록 전체가 함께 이동). 기존에 있던 "줄 전체를 좌우로 스와이프하면 들여쓰기" 제스처는 핸들 방식으로 대체(스크롤과의 오탐 방지 목적도 있음). 드래그 중엔 대상 줄이 포인터를 따라 살짝 들리고, 삽입 위치에 얇은 보라 선(인디케이터)이 표시됨.
- **공통 인터랙션 언어**: 카테고리 칩·주제 카드는 "길게 눌러 드래그", 생각 줄은 "전용 핸들 드래그"로 통일. 별도 라이브러리 추가 없이(dnd-kit 등 미도입) `pointerdown/move/up` 기반으로 직접 구현 — 기존 코드베이스가 이미 같은 방식(예전 `ThoughtRow`의 스와이프 제스처)을 쓰고 있어 패턴을 유지.
- **구현 위치**: `store/vaultStore.ts`(`reorderCategories`/`reorderTopicsInCategory`/localStorage), `screens/useTopicDetailState.ts`(`reorderThought`/`shiftLevelBy`), `components/CategoryChips.tsx`·`screens/DashboardScreen.tsx`(칩·카드 드래그), `components/ThoughtRow.tsx`·`screens/TopicDetailScreen.tsx`(핸들 드래그).
- **불변**: 마크다운 저장 포맷·git sync 대상 파일 구조 변경 없음(카테고리 순서는 기존 `categories.json` 재사용, 주제 순서는 기존 카테고리 `.md` 파일 내 배열 순서 재사용).

### 5.2.1 카드/칩 드래그 재설계 — 실시간 리플로우 (2026-07-05, 2차 수정)
1차 수정(테두리 하이라이트로 "여기로 이동" 표시)은 실사용에서 **겹침을 해결 못 했음** — 드래그 중 다른 카드/칩이 실제로 안 비켜주고 제자리에 있어서, 시각적 힌트만 추가됐을 뿐 근본 원인(다른 카드가 안 움직임)은 그대로였음. 칩은 추가로 **누르자마자 이상 반응**(미세한 손끝 떨림에도 매 프레임 스크롤 보정을 걸어 탭할 때마다 줄이 흔들림) 버그도 있었음.

**근본 수정**:
- **실시간 리플로우**: 드래그 중엔 배열 순서(`order` state)를 프레임마다 다시 계산해서 실제로 바꾼다. 그리드/칩 목록은 "드래그 중인 항목을 제외한" 순서로 다시 렌더링되므로, 다른 카드/칩이 **진짜로 자리를 이동해 비켜준다**(레이아웃이 실제로 리플로우됨 — 더 이상 겹치지 않음).
- **삽입 지점 재계산**: 매 `pointermove`마다 현재 화면에 있는(드래그 중인 것 제외) 카드/칩들의 `getBoundingClientRect()`를 새로 측정해 포인터와 가장 가까운 위치를 찾는다. 이전 버전은 드래그 시작 시점에 한 번만 좌표를 캐시해뒀다가 재사용해서, 리플로우가 실제로 일어나도 그 위치 정보가 바로 낡아버리는 구조적 문제가 있었음.
- **드래그 중인 카드/칩 자체는 그리드 밖으로 분리**: `position: fixed`인 별도 "고스트" 엘리먼트로 렌더링해 포인터를 그대로 따라다니게 하고, 원래 있던 그리드/칩 목록에서는 완전히 빠진다(자리만 비워두는 게 아니라 목록에서 제외 → 뒤 항목들이 앞으로 당겨짐).
- **칩 즉시반응 수정**: 롱프레스 대기 중 스크롤 대신 넘기기를 매 프레임 무조건 실행하던 것을, **3px 데드존**을 넘은 뒤에만 시작하도록 변경 — 탭 시 발생하는 1px 안팎의 손끝 떨림에도 줄 전체가 흔들리던 문제 해결.
- **한계**: 이 환경엔 실제 터치 기기·브라우저가 없어 `tsc`/`vite build`/도메인 유닛 검증까지만 가능하고, 실기기 제스처 최종 확인은 사용자가 해줘야 함. 계속 재발하면 직접 구현 대신 검증된 라이브러리(@dnd-kit) 도입도 옵션으로 열어둠(PLAN §5 참조).

### 5.2.2 칩 "누르자마자 이상 반응"의 진짜 원인 — 텍스트 선택 콜아웃 (2026-07-05, 3차 수정)
사용자가 "누르면 글자 선택이나 스크롤이 됨"이라고 정확히 짚어줌 — 실제 원인은 스크롤 경합이 아니라 **모바일 브라우저의 롱프레스 텍스트 선택/콜아웃 메뉴**였음. `ThoughtRow`의 드래그 핸들엔 이미 `select-none`(=`user-select:none`)이 있어서 문제가 없었는데, `CategoryChips`엔 그 보호가 빠져 있었던 것이 원인.
- **수정**: 칩 버튼에 `select-none`(Tailwind) + `WebkitUserSelect:'none'` + `WebkitTouchCallout:'none'` 추가. 카드 래퍼에도 동일하게 방어적으로 추가.
- **교훈**: 롱프레스 기반 드래그를 텍스트가 있는 요소에 붙일 땐 `touch-action`뿐 아니라 `user-select`/`-webkit-touch-callout`도 항상 같이 막아야 함(PLAN §5 학습 항목에 반영).

### 5.2.3 진짜 원인 발견 — 롱프레스 타이머 미취소 (2026-07-05, 4차 수정)
사용자 리포트: "drag하지 않고 카테고리 선택만 하려고 눌러도 drag가 되려고 함", "주제 네모박스 겹치기 여전".
- **원인**: 롱프레스 대기 로직의 `pointerup` 핸들러(`onUp`)가 이벤트 리스너만 정리하고 **`setTimeout` 타이머 자체를 취소하지 않는 코드 버그**였음. 그래서 짧게 탭하고 손을 떼도 320ms 뒤 타이머가 그대로 실행돼 드래그가 뒤늦게 시작됐음.
  - 칩: 화면 전환이 없으니 이 지연 발동이 그대로 눈에 보여 "누르기만 해도 drag 되려 함"으로 나타남.
  - 카드: 탭하면 바로 주제 상세로 화면 전환되어 잘 안 보였지만, 대시보드로 돌아올 때마다 이 지연 타이머가 뒤늦게 발동해 "유령 드래그 상태"가 남고, 드래그 중인 카드는 그리드에서 제외되고 고스트로만 뜨는 구조라 마무리(pointerup)를 못 받아 **그 유령이 멈춘 채 남아 다른 카드와 겹쳐 보였을 것**으로 추정.
- **수정**: `onUp`에서 `window.clearTimeout(timer)`를 반드시 호출하도록 수정(칩·카드 둘 다). 코드 한 줄 버그였고, §5.2.1/5.2.2의 재설계(리플로우·select-none)는 그대로 유효.

### 5.2.4 드래그와 무관하게 평상시에도 카드가 겹침 — 경쟁 상태(race condition) (2026-07-05, 5차 수정)
사용자 확인: 카테고리는 해결됐지만, 카드 겹침은 **드래그 중이 아니라 평상시 홈 화면에서도** 나타남 → 드래그 상호작용 자체의 문제가 아니라 "이전 드래그가 제대로 안 끝나서 상태가 눌어붙는" 문제로 재진단.
- **원인**: 롱프레스 타이머가 끝나면 `setCardDrag(...)`로 상태만 세팅하고, 그 상태 변화를 감지하는 **별도의 `useEffect`가 한 박자 늦게** 실제 드래그용 `pointermove`/`pointerup` 리스너를 부착하는 2단계 구조였음. 상태 반영(리렌더)과 이펙트 실행 사이엔 항상 미세한 시간차가 있는데, 그 틈에 `pointerup`이 발생하면 아무 리스너도 못 받아 `cardDrag`가 영원히 `null`로 안 돌아감 — 드래그 중이던 카드는 그리드에서 빠지고 `position:fixed` 고스트로만 렌더링되는 구조라, 이 상태가 눌어붙으면 그 고스트가 화면에 계속 남아 다른 카드와 겹쳐 보임. 화면을 나갔다 돌아오면(컴포넌트 리마운트) 사라지지만, 그 전까진 "평상시에도" 겹쳐 보이는 것으로 나타남.
- **수정**: 2단계 구조(타이머 콜백→`setState`→`useEffect`→리스너 부착)를 없애고, 롱프레스가 확정되는 **바로 그 콜백 안에서 `setState`와 리스너 부착을 동기적으로 함께** 처리하도록 재구성(`activateCardDrag`/`activateChipDrag` 함수로 통합). 상태 반영과 리스너 부착 사이의 시간차 자체가 사라짐.
- **추가 방어**: `pointerup`뿐 아니라 `pointercancel`(브라우저가 제스처를 강제로 취소하는 경우 — 예: 시스템 UI 개입)도 동일하게 처리하도록 리스너 추가. 이것도 놓치면 같은 종류의 "눌어붙는 드래그" 상태를 만들 수 있음.
- **칩도 동일 구조라 동일하게 수정**(카테고리는 이미 정상 동작했지만, 같은 잠재적 경쟁 상태를 안고 있었으므로 일관성·견고성을 위해 함께 수정).

### 5.2.5 진짜 원인 — flexbox `min-width` 기본값 (2026-07-05, 6차 수정)
사용자가 "가로 길이가 적절히 조절이 안 되어 있음"이라고 콕 집어줌 — 드래그 로직이 아니라 **정적 CSS 버그**였음. 이 환경엔 실제 브라우저가 없어(`playwright install`도 네트워크 정책상 `cdn.playwright.dev` 차단으로 실패) 렌더링을 직접 볼 수 없었지만, CSS를 한 줄씩 감사해서 확정적인 버그를 찾음.

- **원인**: 카드 미리보기 줄의 `<span className="truncate ...">`가 `flex items-center` 행의 자식인데, **flex item의 기본 `min-width`는 `auto`** — `truncate`(=`overflow:hidden`+`white-space:nowrap`+`text-overflow:ellipsis`)가 걸려 있어도 `min-width:0`을 명시하지 않으면 flex item은 내용의 원래 폭(줄바꿈 없는 전체 텍스트 폭) 밑으로 줄어들길 거부한다. 결과적으로 미리보기 텍스트가 길면 그 행이, 그리고 카드 전체가 원래 컬럼 폭을 넘어 옆 카드 쪽으로 밀고 들어가 겹쳐 보였을 것으로 추정 — flexbox의 잘 알려진 함정(Tailwind에서 `truncate`만 걸고 `min-w-0`을 깜빡하는 흔한 실수).
- **수정**: 미리보기 행(`flex`)과 텍스트 `span`(`truncate`) 둘 다에 `min-w-0` 추가. 방어적으로 카드 `<button>`엔 `w-full min-w-0`, 카드 그리드 래퍼 `<div>`엔 `min-w-0`도 명시적으로 추가(암묵적 stretch에 기대지 않고 명시).
- **한계**: 여전히 실제 브라우저로 최종 확인은 못 했음 — 스크린샷이나 실기기 확인 필요.

### 5.2.6 활성화 직후 첫 카드로 순간이동 — 최소 이동거리 가드 추가 (2026-07-05, 7차 수정)
겹침은 해결됐다고 확인됨. 새 리포트: 목록 **마지막**에 있는 주제를 드래그하려고 길게 누르고 있으면(손가락을 움직이기도 전에) 바로 **첫 번째** 위치로 순간 이동함.
- **추정 원인**: 드래그가 막 활성화된 시점에 발생하는 아주 사소한 포인터 이벤트(터치 좌표 지터, 브라우저의 합성/coalesced 이벤트 등)가 좌표를 왜곡해서 들어오면, 그 위치로 "가장 가까운 카드"를 계산하는 로직이 엉뚱한 인덱스(그리드 맨 앞)를 골라버릴 수 있음. 정확한 원인을 실기기 없이 100% 특정하긴 어려움.
- **수정**: 근본 원인을 못 박기보단, **활성화 지점에서 실제로 6px 이상 움직이기 전엔 순서 재계산 자체를 하지 않도록** 가드 추가(카드·칩 공통, `REORDER_MOVE_THRESHOLD`). 이러면 어떤 이유로 이상한 좌표가 한 번 끼어들어도 최소 이동거리를 못 채우면 무시됨. 추가로 `clientX===0 && clientY===0`인 명백히 비정상적인 이벤트도 방어적으로 무시.
- 드래그 시작 직후 카드/칩이 갑자기 튀는 느낌 없이, 실제로 손가락을 움직인 만큼만 반응해야 함(부수 효과로 아주 미세한 떨림에 재정렬이 안 걸리는 안정성도 개선됨).

### 5.2.7 화면 하단 엣지 근처 카드 — OS 제스처 간섭 완화 (2026-07-05, 8차 수정)
사용자 확인: 마지막 주제가 **화면 하단 엣지에 있을 때만** 누르자마자 드래그가 풀림 — 스크롤해서 화면 중간으로 옮기면 정상 동작. 이는 코드 로직 버그가 아니라 **모바일 OS(iOS/Android)가 화면 최하단 근처 터치를 홈/뒤로가기 제스처 후보로 먼저 가로채는 것**으로 확인됨. 웹 페이지 차원에서 이 엣지 제스처 자체를 완전히 막을 방법은 없음.
- **완화 조치**: 카드를 누르는 순간(`pointerdown`), 누른 지점이 화면 하단에서 `EDGE_MARGIN_PX`(96px) 이내면 롱프레스 타이머가 돌기 전에 그만큼 위로 스크롤해서 여유를 만든다. 손가락은 그대로 있고 콘텐츠만 위로 올라오므로, 롱프레스가 확정될 때쯤엔 해당 카드가 이미 위험 구간을 벗어나 있음.
- **한계**: 100% 근절은 불가능(OS/브라우저 버전에 따라 제스처 인식 구간이 다를 수 있음). 실사용 중 여전히 가끔 발생하면 임계값(`EDGE_MARGIN_PX`)을 키우는 정도로만 조정 가능.

### 5.2.8 글쓰기 화면 드래그 인지 영역을 줄 전체로 확장 (2026-07-05, 9차 수정)
카테고리 칩·주제 카드는 drag 대신 명시적 버튼 방식으로 교체하기로 결정(§5.3 예정)했지만, 글쓰기 화면의 줄 들여쓰기·순서 변경은 기존대로 drag 유지하기로 함. 다만 **드래그 인지 위치가 기존엔 작은 핸들(⠿) 아이콘 하나뿐이라 손가락으로 정확히 짚기 어려웠던 것**을 줄 전체로 넓힘.
- **변경**: 줄을 감싸는 행 전체가 롱프레스(320ms) 드래그 히트 영역이 됨(카드/칩과 동일한 패턴). 짧게 누르면(320ms 안에 뗌) 그 아래 버튼(텍스트 편집 진입·체크 토글·⋯ 메뉴)이 평소처럼 정상 동작 — `onClickCapture`로 실제 드래그가 발동했을 때만 그 클릭을 막음. ⠿ 아이콘은 이제 "여기가 그 줄"이라는 시각적 표시로만 남고 별도 히트 영역은 아님.
- **함께 적용한 방어 조치**(카드/칩에서 배운 것들을 처음부터 반영): 상태 세팅+리스너 부착 동기 처리(경쟁 상태 방지), `pointercancel` 처리, 활성화 후 6px 미만 이동 시 재계산 안 함(순간이동 방지), 화면 하단 96px 이내 롱프레스 시 스크롤로 여유 확보(OS 엣지 제스처 완화).
- **트레이드오프**: 줄 전체가 `touch-action:none`이라, 입력창(텍스트 편집 중)에서 네이티브 텍스트 드래그 선택 제스처가 안 먹을 수 있음. 목록 스크롤 자체는 롱프레스 대기 중 직접 스크롤을 대신 넘겨주는 방식(카드와 동일)으로 유지됨.

## 5.3 카테고리·주제 순서 변경 — drag 폐기, "순서 편집" 버튼 방식으로 교체 (2026-07-05, 10차 수정)
§5.2~5.2.8에서 9차례 수정해도 기기별 터치 제스처 문제(스크롤 충돌·겹침·경쟁 상태·엣지 제스처 등)가 계속 나와, 사용자 요청으로 drag를 완전히 버리고 명시적 버튼 방식으로 교체했다. **글쓰기 화면(생각 줄)의 들여쓰기·순서 drag는 버그 리포트가 없어 그대로 유지**(§5.2.8 계속 유효).

- **진입점**: 대시보드 헤더에 "순서 편집" ↔ "완료" 토글 버튼 하나 추가(칩·카드 공통 모드).
- **카테고리 칩**: 편집 모드 중엔 각 칩 좌우에 ◀▶ 버튼이 나타나 인접 항목과 즉시 자리를 바꾸고 `reorderCategories`로 바로 저장. 칩 자체는 편집 모드 중에도 계속 탭으로 선택 가능(다른 카테고리로 옮겨 그 카테고리의 카드 순서도 편집할 수 있어야 하므로). 첫 칩의 ◀, 마지막 칩의 ▶는 비활성화.
- **주제 카드**: 편집 모드 중엔 카드가 클릭 가능한 `<button>`이 아니라 일반 `<div>`로 렌더링되고(열기 비활성화, 오조작 방지), 제목만 보이는 축약 카드 아래에 ▲▼ 버튼이 붙어 인접 항목과 자리를 바꾸고 `reorderTopicsInCategory`로 즉시 저장. 첫 카드의 ▲, 마지막 카드의 ▼는 비활성화.
- **삭제된 것**: `CategoryChips.tsx`·`DashboardScreen.tsx`에서 롱프레스 타이머, `pointermove`/`pointerup`/`pointercancel` 추적, 실시간 리플로우, `position:fixed` 고스트, 엣지 스크롤 보정 등 drag 관련 코드 전부 제거 — 두 파일 모두 대폭 단순해짐(번들 크기도 감소).
- **장점**: 터치 제스처 관련 버그 클래스 자체가 사라짐(스크롤 경합·텍스트 선택 콜아웃·경쟁 상태·엣지 제스처 문제 모두 해당 없음). 데스크톱 마우스에서도 동일하게 잘 동작(드래그는 마우스에서도 미묘하게 다루기 까다로웠음).
- **트레이드오프**: 여러 칸 이동하려면 버튼을 여러 번 눌러야 함(한 번에 먼 위치로 옮기는 건 느림). 항목이 아주 많을 경우 불편할 수 있음 — 필요해지면 "맨 위로/맨 아래로" 버튼 추가를 고려.

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
