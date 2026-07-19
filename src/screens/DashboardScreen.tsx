import { useEffect, useRef, useState } from 'react'
import { CategoryChips } from '../components/CategoryChips.tsx'
import { TopicCard } from '../components/TopicCard.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { effectiveSelectedCategory, topicsInCategory, useVaultStore } from '../store/vaultStore.ts'
import { useGitStore } from '../store/gitStore.ts'

interface Props {
  onOpenTopic: (id: string) => void
  onOpenSettings: () => void
}

/** UI-DESIGN §4: 대시보드 — 카테고리 칩(단일 필수) + 2열 카드 그리드 + 뷰옵션 + FAB
 *  §5.3: 순서 변경은 drag가 아니라 "순서 편집" 모드 토글 + ◀▶/▲▼ 버튼으로 처리(기기별 터치 제스처 문제 회피). */
export function DashboardScreen({ onOpenTopic, onOpenSettings }: Props) {
  const categories = useVaultStore((s) => s.categories)
  const topics = useVaultStore((s) => s.topics)
  const selectedCategory = useVaultStore((s) => s.selectedCategory)
  const selectCategory = useVaultStore((s) => s.selectCategory)
  const createTopic = useVaultStore((s) => s.createTopic)
  const reorderCategories = useVaultStore((s) => s.reorderCategories)
  const reorderTopicsInCategory = useVaultStore((s) => s.reorderTopicsInCategory)
  const settingPreviewLines = useGitStore((s) => s.previewLines)
  const syncCategoryGit = useGitStore((s) => s.syncCategoryGit)
  const syncingCategory = useGitStore((s) => s.syncingCategory)
  const busy = useGitStore((s) => s.busy)
  const remoteUrl = useGitStore((s) => s.gitConfig.remoteUrl)
  const message = useGitStore((s) => s.message)
  const consumeMessage = useGitStore((s) => s.consumeMessage)

  const [previewOverride, setPreviewOverride] = useState<number | null>(null)
  const [editingOrder, setEditingOrder] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const seenInitialMessage = useRef(false)
  const previewLines = previewOverride ?? settingPreviewLines
  const current = effectiveSelectedCategory({ categories, selectedCategory })
  const shown = topicsInCategory(topics, current)
  const remoteConfigured = remoteUrl.trim() !== ''
  const syncingCurrent = syncingCategory === current

  // git 액션이 남긴 결과 메시지를 대시보드에서도 잠깐 토스트로 보여준다.
  // 마운트 시점에 남아 있던(다른 화면에서 생긴) 메시지는 조용히 소비하고 토스트는 띄우지 않는다.
  useEffect(() => {
    if (!seenInitialMessage.current) {
      seenInitialMessage.current = true
      if (message) consumeMessage()
      return
    }
    if (message) {
      setToast(message)
      consumeMessage()
    }
  }, [message, consumeMessage])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  function handleSync() {
    if (!current || !remoteConfigured || busy) return
    void syncCategoryGit(current)
  }

  function moveTopic(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= shown.length || !current) return
    const ids = shown.map((t) => t.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    void reorderTopicsInCategory(current, ids)
  }

  function cyclePreviewLines() {
    setPreviewOverride(previewLines <= 0 ? 3 : previewLines - 1)
  }

  async function handleAddTopic() {
    if (!current) return
    const id = await createTopic(current, '')
    onOpenTopic(id)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-paper">
      <header className="flex items-center justify-between px-4 pt-4">
        <h1 className="font-serif text-2xl font-semibold text-ink">생각 모음</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditingOrder((v) => !v)}
            className={`rounded-lg border px-3 py-1 text-xs transition-colors ${
              editingOrder ? 'border-brand bg-brand text-white' : 'border-line text-muted hover:bg-brand-soft'
            }`}
          >
            {editingOrder ? '완료' : '순서 편집'}
          </button>
          <button
            type="button"
            onClick={cyclePreviewLines}
            className="rounded-lg border border-line px-3 py-1 text-xs text-muted transition-colors hover:bg-brand-soft"
          >
            미리보기 {previewLines > 0 ? `${previewLines}줄` : '끔'}
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={!current || !remoteConfigured || busy}
            aria-label={current ? `'${current}' 카테고리 동기화` : '동기화'}
            title={remoteConfigured ? '현재 카테고리 동기화' : 'Git 저장소를 먼저 설정하세요'}
            className="rounded-lg border border-line px-2.5 py-1 text-sm text-muted transition-colors hover:bg-brand-soft disabled:opacity-40"
          >
            <span className={`inline-block ${syncingCurrent ? 'animate-spin' : ''}`}>⟳</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-lg border border-line px-3 py-1 text-xs text-muted transition-colors hover:bg-brand-soft"
          >
            설정
          </button>
        </div>
      </header>

      <CategoryChips
        names={categories.map((c) => c.name)}
        selected={current}
        onSelect={selectCategory}
        onReorder={(names) => void reorderCategories(names)}
        editingOrder={editingOrder}
      />

      <p className="px-4 pb-2 pt-1 text-xs text-muted">
        주제 {shown.length}개 · 미리보기 {previewLines > 0 ? `최대 ${previewLines}줄` : '끔'}
      </p>

      {shown.length === 0 ? (
        <EmptyState
          className="flex-1"
          title="아직 주제가 없어요"
          hint={current ? `우측 하단 ＋로 '${current}'에 첫 주제를 추가하세요.` : '우측 하단 ＋로 첫 주제를 추가하세요.'}
        />
      ) : (
        <div className="grid flex-1 grid-cols-2 content-start items-start gap-3.5 px-4 pb-28">
          {shown.map((topic, i) =>
            editingOrder ? (
              <div key={topic.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="min-w-0 p-4 pb-2">
                  <div className="w-full truncate font-serif font-semibold leading-snug text-ink">
                    {topic.title || '(제목 없음)'}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-line px-2 py-1.5">
                  <button
                    type="button"
                    aria-label="위로 이동"
                    disabled={i === 0}
                    onClick={() => moveTopic(i, -1)}
                    className="rounded px-2 py-0.5 text-sm text-muted disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="아래로 이동"
                    disabled={i === shown.length - 1}
                    onClick={() => moveTopic(i, 1)}
                    className="rounded px-2 py-0.5 text-sm text-muted disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
              </div>
            ) : (
              <TopicCard key={topic.id} topic={topic} previewLines={previewLines} onOpen={() => onOpenTopic(topic.id)} />
            ),
          )}
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <div className="max-w-md rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted shadow-lg">
            {toast}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleAddTopic}
        disabled={!current}
        aria-label="주제 추가"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
      >
        +
      </button>
    </div>
  )
}
