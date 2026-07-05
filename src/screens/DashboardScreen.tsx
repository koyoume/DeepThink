import { useEffect, useRef, useState } from 'react'
import { CategoryChips } from '../components/CategoryChips.tsx'
import { TopicCard } from '../components/TopicCard.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { effectiveSelectedCategory, topicsInCategory, useVaultStore } from '../store/vaultStore.ts'
import { useGitStore } from '../store/gitStore.ts'

const LONG_PRESS_MS = 320
const MOVE_CANCEL_PX = 8

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
  const reorderCategories = useVaultStore((s) => s.reorderCategories)
  const reorderTopicsInCategory = useVaultStore((s) => s.reorderTopicsInCategory)
  const settingPreviewLines = useGitStore((s) => s.previewLines)

  const [previewOverride, setPreviewOverride] = useState<number | null>(null)
  const previewLines = previewOverride ?? settingPreviewLines
  const current = effectiveSelectedCategory({ categories, selectedCategory })
  const shown = topicsInCategory(topics, current)

  // 홈 화면 주제 카드 길게 눌러 드래그 재정렬 (카테고리별 순서)
  const cardRefs = useRef(new Map<string, HTMLElement>())
  interface CardDragState {
    id: string
    dx: number
    dy: number
    overIndex: number
    centers: { id: string; cx: number; cy: number }[]
  }
  const [cardDrag, setCardDrag] = useState<CardDragState | null>(null)
  const cardSuppressClick = useRef<Set<string>>(new Set())

  function handleCardPointerDown(id: string, e: React.PointerEvent) {
    const startX = e.clientX
    const startY = e.clientY
    let lastY = e.clientY
    let timerFired = false
    let movedPastThreshold = false

    function onMove(ev: PointerEvent) {
      if (timerFired) return
      // touch-action:none이라 브라우저가 이 터치로 스크롤을 안 해주므로, 롱프레스 확정 전까지는 직접 스크롤을 대신 넘겨준다.
      const dy = ev.clientY - lastY
      lastY = ev.clientY
      window.scrollBy(0, -dy)
      if (!movedPastThreshold && (Math.abs(ev.clientX - startX) > MOVE_CANCEL_PX || Math.abs(ev.clientY - startY) > MOVE_CANCEL_PX)) {
        movedPastThreshold = true
        window.clearTimeout(timer)
      }
    }
    function onUp() {
      cleanup()
    }
    function cleanup() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    const timer = window.setTimeout(() => {
      timerFired = true
      cleanup()
      const centers = shown.map((t) => {
        const el = cardRefs.current.get(t.id)
        const r = el?.getBoundingClientRect()
        return { id: t.id, cx: r ? r.left + r.width / 2 : 0, cy: r ? r.top + r.height / 2 : 0 }
      })
      const overIndex = shown.findIndex((t) => t.id === id)
      cardSuppressClick.current.add(id)
      setCardDrag({ id, dx: 0, dy: 0, overIndex, centers })
    }, LONG_PRESS_MS)
  }

  useEffect(() => {
    if (!cardDrag) return
    function nearestIndex(x: number, y: number, centers: CardDragState['centers']): number {
      let best = 0
      let bestDist = Infinity
      centers.forEach((c, i) => {
        const d = (c.cx - x) ** 2 + (c.cy - y) ** 2
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      })
      return best
    }
    let startX = 0
    let startY = 0
    const origin = cardDrag.centers.find((c) => c.id === cardDrag.id)
    if (origin) {
      startX = origin.cx
      startY = origin.cy
    }
    function onMoveSimple(e: PointerEvent) {
      setCardDrag((d) => {
        if (!d) return d
        const dx = e.clientX - startX
        const dy = e.clientY - startY
        const overIndex = nearestIndex(e.clientX, e.clientY, d.centers)
        return { ...d, dx, dy, overIndex }
      })
    }
    function onUp() {
      setCardDrag((d) => {
        if (d) {
          const originalIndex = d.centers.findIndex((c) => c.id === d.id)
          if (d.overIndex !== originalIndex) {
            const ids = d.centers.map((c) => c.id)
            const [moved] = ids.splice(originalIndex, 1)
            ids.splice(d.overIndex, 0, moved)
            if (current) void reorderTopicsInCategory(current, ids)
          }
        }
        window.setTimeout(() => cardSuppressClick.current.delete(d?.id ?? ''), 50)
        return null
      })
    }
    window.addEventListener('pointermove', onMoveSimple)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMoveSimple)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDrag?.id])

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

      <CategoryChips
        names={categories.map((c) => c.name)}
        selected={current}
        onSelect={selectCategory}
        onReorder={(names) => void reorderCategories(names)}
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
          {shown.map((topic) => {
            const isDragging = cardDrag?.id === topic.id
            const isDropTarget = !isDragging && cardDrag != null && shown[cardDrag.overIndex]?.id === topic.id
            return (
              <div
                key={topic.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(topic.id, el)
                  else cardRefs.current.delete(topic.id)
                }}
                onPointerDown={(e) => handleCardPointerDown(topic.id, e)}
                style={{
                  touchAction: 'none',
                  transform: isDragging ? `translate(${cardDrag!.dx}px, ${cardDrag!.dy}px) scale(1.04)` : undefined,
                  position: isDragging ? 'relative' : undefined,
                  zIndex: isDragging ? 10 : undefined,
                  boxShadow: isDragging ? '0 12px 28px rgba(33,27,51,0.18)' : undefined,
                  borderRadius: 16,
                  outline: isDropTarget ? '2px solid var(--color-brand)' : undefined,
                  outlineOffset: isDropTarget ? -2 : undefined,
                  opacity: isDragging ? 0.92 : undefined,
                  transition: isDragging ? undefined : 'outline-color 120ms',
                }}
              >
                <TopicCard
                  topic={topic}
                  previewLines={previewLines}
                  onOpen={() => {
                    if (cardSuppressClick.current.has(topic.id)) return
                    onOpenTopic(topic.id)
                  }}
                />
              </div>
            )
          })}
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
