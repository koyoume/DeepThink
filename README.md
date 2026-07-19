# DeepThink

> 한 줄 = 하나의 생각. 카테고리 → 주제 → 생각(줄) 구조로 사색을 쌓는 모바일 우선 웹앱.
> 데이터는 순수 마크다운으로 **당신의 GitHub 저장소**에 저장된다 — 벤더 종속 없음, 파일이 곧 소유권.

- **웹앱**: https://deepthink-4rb.pages.dev
- **기술 스택**: React + TypeScript + Vite + Tailwind CSS + Zustand + isomorphic-git
- **저장 방식**: 브라우저(IndexedDB)에 로컬 저장 + git으로 원격 저장소에 동기화

이 문서는 두 독자를 위한 것이다:
- **DeepThink 웹앱을 쓰려는 사용자** → [1. 앱 사용하기](#1-앱-사용하기)
- **이 코드베이스에서 작업하는 개발자 · AI 에이전트** → [2. 개발/기여](#2-개발기여)

---

## 1. 앱 사용하기

### 개념

| 용어 | 뜻 |
|---|---|
| **카테고리(Category)** | 최상위 분류. 저장소의 마크다운 파일 1개에 대응 (`DeepThink/<카테고리>.md`) |
| **주제(Topic)** | 카테고리에 속한 하나의 생각 묶음. 제목 + 관련자료 + 생각 줄들로 구성 |
| **생각(Thought)** | 주제 안의 한 줄. 체크리스트(`check`) 또는 코멘트(`comment`) 타입, 4단계까지 들여쓰기 |
| **자료(Material)** | 주제에 딸린 선택적 링크/문서 참조 |

### 시작하기

1. 웹앱(https://deepthink-4rb.pages.dev)에 접속한다. 처음엔 예시 데이터가 채워져 있다.
2. 홈 화면에 추가(설치)하면 앱처럼 전체화면으로 쓸 수 있다(PWA, 오프라인은 아직 미지원).
3. 자기 데이터를 GitHub 등에 백업·동기화하려면 아래 **저장소 연결**을 설정한다.

### 저장소 연결 (동기화)

설정(⚙️) 화면에서 자신의 git 저장소를 연결한다:

| 항목 | 설명 |
|---|---|
| **원격 URL** | 예: `https://github.com/<본인>/<vault-repo>.git`. 빈 저장소를 미리 만들어 두면 된다 |
| **username** | 비우면 `x-access-token`으로 처리 |
| **Personal Access Token** | 해당 저장소에 대한 쓰기 권한이 있는 PAT. **가급적 그 저장소 하나에만 스코프를 준 fine-grained 토큰**을 쓰고 만료를 짧게 잡을 것 |
| **커밋 작성자 이름/이메일** | 커밋에 기록될 정보 |
| **CORS 프록시** | 브라우저에서 GitHub 등에 직접 접근하면 CORS로 막히므로 프록시 URL이 필요하다 (아래 참고) |

> ⚠️ **PAT는 브라우저 `localStorage`에 평문으로 저장된다.** 개인용 도구라는 전제의 의도적 트레이드오프다. 공용 기기에서는 쓰지 말 것.

설정 후 **동기화**를 누르면 로컬 변경이 저장소로 push되고, 저장소의 변경이 로컬로 병합된다.

### 데이터가 저장되는 방식

저장소 안에서 DeepThink는 **`DeepThink/` 하위 폴더에만** 파일을 만든다 — 저장소 루트나 다른 폴더는 절대 건드리지 않는다. 그래서 이미 다른 용도로 쓰던 저장소에 얹어도 안전하다.

```
<your-repo>/
  DeepThink/
    제품 기획.md          ← 카테고리 1개 = 마크다운 1개
    독서.md
    .deepthink/
      categories.json     ← 카테고리 순서(로컬 메타)
  (그 밖의 기존 파일들은 그대로)
```

카테고리 파일은 사람이 읽을 수 있는 순수 마크다운이다:

```markdown
# 제품 기획

<!-- topic: <uuid> -->
## DeepThink 온보딩 흐름

### 생각
- [x] 첫 실행 시 카테고리 안내
- [ ] git 설정은 나중에 유도
  - 토큰 입력 마찰 줄이기
```

- `- [ ]` / `- [x]` = 미완료/완료 체크, 앞의 공백 2칸 = 들여쓰기 한 단계
- 접두어 없는 `- 텍스트` = 코멘트
- `**굵게**`, `*이탤릭*` 인라인 마크다운 지원

### 여러 곳에서 편집하기 (자동 병합)

DeepThink 웹앱이 기본 편집 경로지만, **같은 저장소를 다른 곳에서 직접 고쳐도 된다** — GitHub 웹 편집기, 다른 기기, 텍스트 에디터 등. 다음에 동기화를 누르면 변경점이 **자동으로 병합**된다:

- 로컬에서만 바뀐 줄, 원격에서만 바뀐 줄, 새로 추가된 줄은 **모두 보존**된다.
- 같은 줄을 양쪽에서 다르게 고친 경우(진짜 충돌)에도 **둘 다 보존**한다 — 원격 버전을 유지하고 로컬 버전을 바로 아래 줄로 붙인다. 데이터가 사라지지 않으며, 그 생각이 잠시 두 줄로 보일 수 있다(다시 정리하면 됨).
- **충돌 해결 화면은 뜨지 않는다.** 동기화는 항상 자동으로 끝난다.

---

## 2. 개발/기여

> **AI 에이전트에게**: 이 저장소는 여러 세션에 걸쳐 Claude와 함께 개발되어 왔다. 아래 문서 지도와 워크플로우 규칙을 먼저 읽고 시작할 것. **정본은 항상 코드**이고, 결정·이력은 md 파일에 누적된다.

### 문서 지도

| 파일 | 역할 |
|---|---|
| **`README.md`** | (이 문서) 저장소 진입점 — 사용법 + 개발 오리엔테이션 |
| **`REQUIREMENTS.md`** | 확정된 기능 스펙의 누적 정본. 데이터 모델, 마크다운 포맷, 저장/동기화, 화면별 동작, 구현 메모를 담는다. 새 결정은 여기에 반영 |
| **`PLAN.md`** | 진행 로그 — 세션별 이력(§6), 핵심 학습(§5), 열린 항목. "무엇을 왜 그렇게 했는지"의 기록 |
| **`WEB_DEV_GUIDE.md`** | 웹 기능 개발 실전 가이드(워크플로우·배포·검증 함정 모음) |
| **`android-backup/`** | 이 웹앱의 원본인 Android 앱 소스. 동작 스펙의 **정본 참고처**(포팅 시 이 코드를 직접 읽음) |
| **`docs/`** | 레거시 UI 프로토타입(`legacy-prototype/`)과 디자인 프로토타입(`prototypes/`) |

### 프로젝트 구조

```
src/
  domain/         순수 로직(플랫폼 비의존) — models, markdownCodec, vaultStore, inlineFormat
    __verify__/   Node에서 직접 실행하는 골든/회귀 검증 스크립트
  git/            클라이언트 사이드 git 동기화 — gitSync, silentMergeDriver
    __verify__/   로컬 git 서버 기반 동기화/병합 회귀 테스트
  store/          Zustand 스토어 — vaultStore(데이터), gitStore(동기화 상태)
  screens/        화면 — DashboardScreen, TopicDetailScreen, SettingsScreen
  components/     재사용 컴포넌트 — ThoughtRow, TopicCard, CategoryChips, ...
  settings/       설정 영속화(localStorage)
e2e/              Playwright E2E (배포 게이트)
proxy/            git CORS 릴레이 Cloudflare Worker (별도 배포)
```

### 개발 명령

```bash
npm install          # 의존성 설치
npm run dev          # 로컬 개발 서버(Vite)
npm run build        # 타입체크(tsc -b) + 프로덕션 빌드(vite)
npm run lint         # oxlint
npm run verify:domain # 도메인/git 로직 검증(골든 케이스 + 회귀 + 자동 병합) — 브라우저 불필요
npm run test:e2e     # Playwright E2E (로컬에 브라우저 필요)
```

### 워크플로우 규칙

- **계획 먼저, 결정 먼저, 작업은 그다음.** 결과가 크게 갈리는 설계 선택은 코딩 전에 짧게 확인받는다. 명백한 버그 수정은 바로 고친다.
- **커밋 전 검증**: 매 변경마다 `npm run build` · `npm run lint` · `npm run verify:domain`을 통과시킨 뒤 커밋한다.
- **문서화가 곧 진행**: 모든 결정은 `REQUIREMENTS.md`에, 세션 이력은 `PLAN.md §6`에 남긴다. 세션(대화)이 끊기면 그 안의 기억은 사라지고 md와 커밋만 남는다.
- **`main`에 직접 push**하고 GitHub Actions CI를 확인한다.
- **UI 구조를 바꾸면 그 구조를 검사하는 E2E 테스트도 반드시 같이 바꾼다** — "기능은 고쳤는데 테스트는 그대로"는 배포 게이트에서 터진다.

### 배포

- **웹앱**: `main`에 push하면 GitHub Actions가 검증 → 빌드 → E2E 게이트를 거쳐 **Cloudflare Pages**로 배포한다. E2E가 실패하면 배포는 스킵된다.
- **CORS 프록시**: `proxy/`는 별도 워크플로우로 **Cloudflare Workers**에 배포된다(`proxy/**` 변경 시). git 로직에는 관여하지 않고 요청 바이트를 대상 호스트로 릴레이하며 CORS 헤더만 붙이는 투명 프록시다. PAT는 그냥 지나갈 뿐 워커가 저장/열람하지 않으며, `ALLOWED_HOSTS`로 프록시 대상 호스트를 제한해 오픈 릴레이를 막는다.

### 핵심 불변 조건 (깨지 않도록 주의)

- **격리**: git 동기화는 항상 `DeepThink/<카테고리>.md` **한 파일만** add/commit/push한다. 저장소의 다른 파일을 건드리면 안 된다(과거 실제 데이터 유실 사고가 있었음 — `REQUIREMENTS.md §8`, `src/git/__verify__/regressionIsolation.mjs` 참고).
- **자동 병합 무결성**: 동기화는 충돌 화면 없이 항상 자동 병합되며 데이터를 잃지 않는다(`src/git/silentMergeDriver.ts`, `src/git/__verify__/autoMerge.mjs`).
- **round-trip**: 마크다운 직렬화/파싱은 왕복해도 내용이 보존되어야 한다(`src/domain/__verify__/cases.mjs`).
