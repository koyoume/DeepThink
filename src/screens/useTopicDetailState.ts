import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_THOUGHT_LEVEL, type Material, type Thought, type ThoughtType } from '../domain/models.ts'
import { useVaultStore } from '../store/vaultStore.ts'

/**
 * android-backup TopicDetailViewModel.kt 이식 (React hook 버전).
 * 편집 후 400ms debounce 저장 — 화면 이탈 시 flush()로 즉시 저장.
 */
interface DetailState {
  loaded: boolean
  category: string
  title: string
  materials: Material[]
  thoughts: Thought[]
}

function newThoughtId(): string {
  return crypto.randomUUID()
}

export function useTopicDetailState(topicId: string) {
  const topics = useVaultStore((s) => s.topics)
  const updateTopic = useVaultStore((s) => s.updateTopic)
  const deleteTopicInStore = useVaultStore((s) => s.deleteTopic)
  const moveTopicInStore = useVaultStore((s) => s.moveTopic)

  const [state, setState] = useState<DetailState>({
    loaded: false,
    category: '',
    title: '',
    materials: [],
    thoughts: [],
  })
  const [newType, setNewType] = useState<ThoughtType>('check')
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<string | null>(null)

  const stateRef = useRef(state)
  stateRef.current = state
  const saveTimer = useRef<number | undefined>(undefined)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    const topic = topics.find((t) => t.id === topicId)
    if (!topic) return
    initialized.current = true
    setState({ loaded: true, category: topic.category, title: topic.title, materials: topic.materials, thoughts: topic.thoughts })
  }, [topics, topicId])

  const persist = useCallback(
    (s: DetailState) => {
      if (!s.loaded) return
      void updateTopic({ id: topicId, category: s.category, title: s.title, materials: s.materials, thoughts: s.thoughts })
    },
    [topicId, updateTopic],
  )

  function update(transform: (s: DetailState) => DetailState) {
    setState((prev) => {
      const next = transform(prev)
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => persist(stateRef.current), 400)
      return next
    })
  }

  function flush() {
    window.clearTimeout(saveTimer.current)
    persist(stateRef.current)
  }

  useEffect(() => () => flush(), []) // 화면 이탈(unmount) 시 즉시 저장

  function setTitle(title: string) {
    update((s) => ({ ...s, title }))
  }

  function setText(id: string, text: string) {
    update((s) => ({ ...s, thoughts: s.thoughts.map((t) => (t.id === id ? { ...t, text } : t)) }))
  }

  function toggleDone(id: string) {
    update((s) => ({
      ...s,
      thoughts: s.thoughts.map((t) => (t.id === id && t.type === 'check' ? { ...t, done: !t.done } : t)),
    }))
  }

  function setType(id: string, type: ThoughtType) {
    update((s) => ({
      ...s,
      thoughts: s.thoughts.map((t) => (t.id === id ? { ...t, type, done: type === 'comment' ? false : t.done } : t)),
    }))
  }

  function toggleNewType() {
    setNewType((t) => (t === 'check' ? 'comment' : 'check'))
  }

  /** 입력바 타입 토글: 편집 중인 줄이 있으면 그 줄에 반영, 없으면 새 줄 기본 타입만 변경 */
  function toggleType() {
    const target = focusedId ? state.thoughts.find((t) => t.id === focusedId)?.type : undefined
    const next: ThoughtType = (target ?? newType) === 'check' ? 'comment' : 'check'
    setNewType(next)
    if (focusedId) setType(focusedId, next)
  }

  /** id 줄 바로 아래에 같은 레벨·타입 새 줄 삽입, 새 줄 id 반환 */
  function addAfter(id: string): string | null {
    const idx = state.thoughts.findIndex((t) => t.id === id)
    if (idx < 0) return null
    const cur = state.thoughts[idx]
    const inserted: Thought = { id: newThoughtId(), type: cur.type, level: cur.level, text: '', done: false }
    update((s) => {
      const list = [...s.thoughts]
      list.splice(idx + 1, 0, inserted)
      return { ...s, thoughts: list }
    })
    setFocusRequest(inserted.id)
    return inserted.id
  }

  /** 입력바: 맨 아래 level0 새 줄 추가, 새 줄 id 반환 */
  function addAtEnd(): string {
    const inserted: Thought = { id: newThoughtId(), type: newType, level: 0, text: '', done: false }
    update((s) => ({ ...s, thoughts: [...s.thoughts, inserted] }))
    setFocusRequest(inserted.id)
    return inserted.id
  }

  /** 빈 줄 삭제, 이전 줄 id 반환(포커스 이동용) */
  function deleteThought(id: string): string | null {
    const idx = state.thoughts.findIndex((t) => t.id === id)
    if (idx < 0) return null
    const prevId = idx > 0 ? state.thoughts[idx - 1].id : null
    update((s) => ({ ...s, thoughts: s.thoughts.filter((t) => t.id !== id) }))
    if (prevId) setFocusRequest(prevId)
    return prevId
  }

  function shiftLevel(id: string, delta: number) {
    update((s) => {
      const idx = s.thoughts.findIndex((t) => t.id === id)
      if (idx < 0) return s
      const cur = s.thoughts[idx]
      const prevLevel = idx > 0 ? s.thoughts[idx - 1].level : -1
      const maxAllowed = delta > 0 ? Math.min(prevLevel + 1, MAX_THOUGHT_LEVEL) : MAX_THOUGHT_LEVEL
      const newLevel = Math.min(Math.max(cur.level + delta, 0), maxAllowed)
      if (newLevel === cur.level) return s
      const applied = newLevel - cur.level
      let end = idx + 1
      while (end < s.thoughts.length && s.thoughts[end].level > cur.level) end++
      const list = [...s.thoughts]
      for (let i = idx; i < end; i++) {
        list[i] = { ...list[i], level: Math.min(Math.max(list[i].level + applied, 0), MAX_THOUGHT_LEVEL) }
      }
      return { ...s, thoughts: list }
    })
  }

  function indent(id: string) {
    shiftLevel(id, 1)
  }

  function outdent(id: string) {
    shiftLevel(id, -1)
  }

  /** 들여쓰기 핸들 드래그: 임의 크기의 레벨 변화를 한 번에 적용 (기존 shiftLevel 재사용) */
  function shiftLevelBy(id: string, delta: number) {
    if (delta === 0) return
    shiftLevel(id, delta)
  }

  /**
   * 들여쓰기 핸들 드래그(세로): id 줄(과 그 하위 중첩 블록 전체)을 targetIndex 위치로 이동.
   * targetIndex는 "이동 전" thoughts 배열 기준 삽입 지점(그 인덱스의 줄 앞에 삽입).
   */
  function reorderThought(id: string, targetIndex: number) {
    update((s) => {
      const idx = s.thoughts.findIndex((t) => t.id === id)
      if (idx < 0) return s
      const level = s.thoughts[idx].level
      let end = idx + 1
      while (end < s.thoughts.length && s.thoughts[end].level > level) end++
      const block = s.thoughts.slice(idx, end)
      const rest = [...s.thoughts.slice(0, idx), ...s.thoughts.slice(end)]
      let insertAt = targetIndex > idx ? targetIndex - block.length : targetIndex
      insertAt = Math.max(0, Math.min(insertAt, rest.length))
      const list = [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)]
      return { ...s, thoughts: list }
    })
  }

  function changeCategory(newCategory: string) {
    update((s) => ({ ...s, category: newCategory }))
    void moveTopicInStore(topicId, newCategory)
  }

  async function deleteTopic(onDone: () => void) {
    window.clearTimeout(saveTimer.current)
    await deleteTopicInStore(topicId)
    onDone()
  }

  function addMaterial(material: Material) {
    update((s) => ({ ...s, materials: [...s.materials, material] }))
  }

  function removeMaterial(index: number) {
    update((s) => ({ ...s, materials: s.materials.filter((_, i) => i !== index) }))
  }

  function clearFocusRequest() {
    setFocusRequest(null)
  }

  return {
    state,
    newType,
    focusedId,
    focusRequest,
    setFocused: setFocusedId,
    clearFocused: (id: string) => setFocusedId((cur) => (cur === id ? null : cur)),
    clearFocusRequest,
    setTitle,
    setText,
    toggleDone,
    setType,
    toggleNewType,
    toggleType,
    addAfter,
    addAtEnd,
    deleteThought,
    indent,
    outdent,
    shiftLevelBy,
    reorderThought,
    changeCategory,
    deleteTopic,
    addMaterial,
    removeMaterial,
    flush,
  }
}
