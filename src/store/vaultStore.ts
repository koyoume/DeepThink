import { create } from 'zustand'
import type { Category, Topic } from '../domain/models.ts'
import { vaultFileStore } from './fsInstance.ts'
import { createMutex } from './mutex.ts'

/**
 * android-backup TopicRepositoryImpl.kt 이식 (Zustand 버전).
 * 뷰옵션 미리보기 줄 수 임시 오버라이드는 화면 로컬 상태로 두는 게 더 단순해 여기 포함하지 않음
 * (Kotlin의 DashboardViewModel._previewOverride에 해당 — DashboardScreen 컴포넌트 상태로 이식).
 */

const SAMPLE_CATEGORIES: Array<[string, Topic[]]> = [
  [
    '제품 기획',
    [
      {
        id: 'sample-1',
        category: '제품 기획',
        title: 'DeepThink 온보딩 흐름',
        materials: [],
        thoughts: [
          { id: 'sample-1-1', type: 'check', level: 0, text: '첫 실행 시 카테고리 안내', done: true },
          { id: 'sample-1-2', type: 'check', level: 0, text: 'git 설정은 나중에 유도', done: false },
          { id: 'sample-1-3', type: 'comment', level: 1, text: '토큰 입력 마찰 줄이기', done: false },
        ],
      },
      { id: 'sample-2', category: '제품 기획', title: '대시보드 카드 밀도', materials: [], thoughts: [] },
    ],
  ],
  [
    '독서',
    [
      {
        id: 'sample-3',
        category: '독서',
        title: '사색적 글쓰기',
        materials: [],
        thoughts: [{ id: 'sample-3-1', type: 'comment', level: 0, text: '한 줄 단위로 생각을 쌓는다', done: false }],
      },
    ],
  ],
  ['투자', []],
  ['학습', []],
  ['일상', []],
  ['사이드 프로젝트', []],
]

function newId(): string {
  return crypto.randomUUID()
}

const SELECTED_CATEGORY_KEY = 'deepthink:selectedCategory'

function loadStoredSelectedCategory(): string | null {
  try {
    return localStorage.getItem(SELECTED_CATEGORY_KEY)
  } catch {
    return null
  }
}

function storeSelectedCategory(name: string): void {
  try {
    localStorage.setItem(SELECTED_CATEGORY_KEY, name)
  } catch {
    // localStorage 접근 불가(프라이빗 모드 등) — 메모리 상태로만 동작
  }
}

interface VaultState {
  loaded: boolean
  categories: Category[]
  topics: Topic[]
  selectedCategory: string | null

  init: () => Promise<void>
  reload: () => Promise<void>
  selectCategory: (name: string) => void

  createTopic: (category: string, title?: string) => Promise<string>
  updateTopic: (topic: Topic) => Promise<void>
  deleteTopic: (id: string) => Promise<void>
  moveTopic: (id: string, newCategory: string) => Promise<void>

  addCategory: (name: string) => Promise<void>
  renameCategory: (oldName: string, newName: string) => Promise<void>
  deleteCategory: (name: string) => Promise<void>
  reorderCategories: (names: string[]) => Promise<void>
  reorderTopicsInCategory: (category: string, orderedIds: string[]) => Promise<void>
}

const withMutex = createMutex()

async function persist(category: string, topics: Topic[]): Promise<void> {
  await vaultFileStore.writeCategory(
    category,
    topics.filter((t) => t.category === category),
  )
}

async function seed(): Promise<void> {
  for (const [cat, topics] of SAMPLE_CATEGORIES) {
    await vaultFileStore.writeCategory(cat, topics)
  }
  await vaultFileStore.writeOrder(SAMPLE_CATEGORIES.map(([cat]) => cat))
}

async function load(seedIfEmpty: boolean, set: (partial: Partial<VaultState>) => void): Promise<void> {
  await vaultFileStore.ensureDirs()
  if (seedIfEmpty && (await vaultFileStore.isEmpty())) {
    await seed()
  }
  const parsed = await vaultFileStore.readAll()
  const categories = parsed.map((c, i) => ({ name: c.name, order: i }))
  const topics = parsed.flatMap((c) => c.topics)
  const stored = loadStoredSelectedCategory()
  const selectedCategory = stored && categories.some((c) => c.name === stored) ? stored : null
  set({ categories, topics, loaded: true, selectedCategory })

  const order = await vaultFileStore.readOrder()
  if (order.length === 0 && categories.length > 0) {
    await vaultFileStore.writeOrder(categories.map((c) => c.name))
  }
}

export const useVaultStore = create<VaultState>((set, get) => ({
  loaded: false,
  categories: [],
  topics: [],
  selectedCategory: null,

  init: () => withMutex(() => load(true, set)),
  reload: () => withMutex(() => load(false, set)),
  selectCategory: (name) => {
    storeSelectedCategory(name)
    set({ selectedCategory: name })
  },

  createTopic: (category, title = '') =>
    withMutex(async () => {
      const topic: Topic = { id: newId(), category, title, materials: [], thoughts: [] }
      set({ topics: [...get().topics, topic] })
      await persist(category, get().topics)
      return topic.id
    }),

  updateTopic: (topic) =>
    withMutex(async () => {
      set({ topics: get().topics.map((t) => (t.id === topic.id ? topic : t)) })
      await persist(topic.category, get().topics)
    }),

  deleteTopic: (id) =>
    withMutex(async () => {
      const target = get().topics.find((t) => t.id === id)
      if (!target) return
      set({ topics: get().topics.filter((t) => t.id !== id) })
      await persist(target.category, get().topics)
    }),

  moveTopic: (id, newCategory) =>
    withMutex(async () => {
      const target = get().topics.find((t) => t.id === id)
      if (!target || target.category === newCategory) return
      const old = target.category
      set({ topics: get().topics.map((t) => (t.id === id ? { ...t, category: newCategory } : t)) })
      await persist(old, get().topics)
      await persist(newCategory, get().topics)
    }),

  addCategory: (name) =>
    withMutex(async () => {
      if (get().categories.some((c) => c.name === name)) return
      const categories = [...get().categories, { name, order: get().categories.length }]
      set({ categories })
      await vaultFileStore.writeCategory(name, [])
      await vaultFileStore.writeOrder(categories.map((c) => c.name))
    }),

  renameCategory: (oldName, newName) =>
    withMutex(async () => {
      if (oldName === newName || !get().categories.some((c) => c.name === oldName)) return
      const categories = get().categories.map((c) => (c.name === oldName ? { ...c, name: newName } : c))
      const topics = get().topics.map((t) => (t.category === oldName ? { ...t, category: newName } : t))
      set({ categories, topics })
      await vaultFileStore.deleteCategoryFile(oldName)
      await persist(newName, topics)
      await vaultFileStore.writeOrder(categories.map((c) => c.name))
    }),

  deleteCategory: (name) =>
    withMutex(async () => {
      const categories = get().categories.filter((c) => c.name !== name)
      const topics = get().topics.filter((t) => t.category !== name)
      set({ categories, topics })
      await vaultFileStore.deleteCategoryFile(name)
      await vaultFileStore.writeOrder(categories.map((c) => c.name))
    }),

  /** 홈 화면 카테고리 칩 길게 눌러 드래그 재정렬 — 순서를 .deepthink/categories.json에 영속화 */
  reorderCategories: (names) =>
    withMutex(async () => {
      const byName = new Map(get().categories.map((c) => [c.name, c]))
      const categories = names.filter((n) => byName.has(n)).map((n, i) => ({ ...byName.get(n)!, order: i }))
      if (categories.length !== get().categories.length) return // 이름 불일치 시 안전하게 무시
      set({ categories })
      await vaultFileStore.writeOrder(names)
    }),

  /** 홈 화면 주제 카드 길게 눌러 드래그 재정렬 — 카테고리별로 별도 순서 저장(해당 카테고리 .md 파일 순서) */
  reorderTopicsInCategory: (category, orderedIds) =>
    withMutex(async () => {
      const inCat = get().topics.filter((t) => t.category === category)
      const byId = new Map(inCat.map((t) => [t.id, t]))
      const reordered = orderedIds.filter((id) => byId.has(id)).map((id) => byId.get(id)!)
      if (reordered.length !== inCat.length) return
      const others = get().topics.filter((t) => t.category !== category)
      set({ topics: [...others, ...reordered] })
      await persist(category, get().topics)
    }),
}))

/** 항상 1개 선택 (없으면 첫 카테고리) — DashboardViewModel.selectedCategory와 동일 */
export function effectiveSelectedCategory(state: Pick<VaultState, 'categories' | 'selectedCategory'>): string | null {
  if (state.selectedCategory && state.categories.some((c) => c.name === state.selectedCategory)) {
    return state.selectedCategory
  }
  return state.categories[0]?.name ?? null
}

export function topicsInCategory(topics: Topic[], category: string | null): Topic[] {
  if (!category) return []
  return topics.filter((t) => t.category === category)
}
