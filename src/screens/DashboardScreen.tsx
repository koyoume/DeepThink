import { useState } from 'react'
import { CategoryChips } from '../components/CategoryChips.tsx'
import { TopicCard } from '../components/TopicCard.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { effectiveSelectedCategory, topicsInCategory, useVaultStore } from '../store/vaultStore.ts'
import { useGitStore } from '../store/gitStore.ts'

interface Props {
  onOpenTopic: (id: string) => void
  onOpenSettings: () => void
}

/** UI-DESIGN §4: 대시보드 — 카테고리 칩(단일 필수) + 2열 카드 그리드 + 뷰옵션 + FAB */
export function DashboardScreen({ onOpenTopic, onOpenSettings }: Props) {
  const categories = useVaultStore((s) => s.categories)
  const topics = useVaultStore((s) => s.topics)
  const selectedCategory = useVaultStore((s) => s.selectedCategory)
  const selectCategory = useVaultStore((s) => s.selectCategory)
  const createTopic = useVaultStore((s) => s.createTopic)
  const settingPreviewLines = useGitStore((s) => s.previewLines)

  const [previewOverride, setPreviewOverride] = useState<number | null>(null)
  const previewLines = previewOverride ?? settingPreviewLines
  const current = effectiveSelectedCategory({ categories, selectedCategory })
  const shown = topicsInCategory(topics, current)

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
            onClick={cyclePreviewLines}
            className="rounded-lg border border-line px-3 py-1 text-xs text-muted transition-colors hover:bg-brand-soft"
          >
            미리보기 {previewLines > 0 ? `${previewLines}줄` : '끔'}
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

      <CategoryChips names={categories.map((c) => c.name)} selected={current} onSelect={selectCategory} />

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
          {shown.map((topic) => (
            <TopicCard key={topic.id} topic={topic} previewLines={previewLines} onOpen={() => onOpenTopic(topic.id)} />
          ))}
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
