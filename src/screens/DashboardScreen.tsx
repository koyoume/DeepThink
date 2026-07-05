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
    originLeft: number
    originTop: number
    originWidth: number
    originHeight: number
    startClientX: number
    startClientY: number
    dx: number
    dy: number
    order: string[]
  }
  const [cardDrag, setCardDrag] = useState<CardDragState | null>(null)
  const cardSuppressClick = useRef<Set<string>>(new Set())

  function handleCardPointerDown(id: string, e: React.PointerEvent) {
    const startX = e.clientX
    const startY = e.clientY
    let lastX = e.clientX
    let lastY = e.clientY
    let timerFired = false
    let movedPastThreshold = false

    function onMove(ev: PointerEvent) {
      if (timerFired) return
      // touch-action:none이라 브라우저가 이 터치로 스크롤을 안 해주므로, 롱프레스 확정 전까지는 직접 스크롤을 대신 넘겨준다.
      const dy = ev.clientY - lastY
      lastX = ev.clientX
      lastY = ev.clientY
      window.scrollBy(0, -dy)
      if (!movedPastThreshold && (Math.abs(ev.clientX - startX) > MOVE_CANCEL_PX || Math.abs(ev.clientY - startY) > MOVE_CANCEL_PX)) {
        movedPastThreshold = true
        window.clearTimeout(timer)
      }
    }
    function onUp() {
      window.clearTimeout(timer)
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
      const el = cardRefs.current.get(id)
      const r = el?.getBoundingClientRect()
      if (!r) return
      cardSuppressClick.current.add(id)
      setCardDrag({
        id,
        originLeft: r.left,
        originTop: r.top,
        originWidth: r.width,
        originHeight: r.height,
        startClientX: lastX,
        startClientY: lastY,
        dx: 0,
        dy: 0,
        order: shown.map((t) => t.id),
      })
    }, LONG_PRESS_MS)
  }

  // 드래그 중: 포인터 위치로 실시간 삽입 지점을 다시 측정해 다른 카드가 실제로 자리를 비켜주게 한다(겹침 방지).
  useEffect(() => {
    if (!cardDrag) return
    function onMove(e: PointerEvent) {
      setCardDrag((d) => {
        if (!d) return d
        const dx = e.clientX - d.startClientX
        const dy = e.clientY - d.startClientY
        const restIds = d.order.filter((cid) => cid !== d.id)
        let bestIdx = restIds.length
        let bestDist = Infinity
        restIds.forEach((cid, i) => {
          const el = cardRefs.current.get(cid)
          const r = el?.getBoundingClientRect()
          if (!r) return
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          const dist = (cx - e.clientX) ** 2 + (cy - e.clientY) ** 2
          if (dist < bestDist) {
            bestDist = dist
            bestIdx = i
          }
        })
        const newOrder = [...restIds.slice(0, bestIdx), d.id, ...restIds.slice(bestIdx)]
        const changed = newOrder.some((cid, i) => cid !== d.order[i])
        return { ...d, dx, dy, order: changed ? newOrder : d.order }
      })
    }
    function onUp() {
      setCardDrag((d) => {
        if (d) {
          const original = shown.map((t) => t.id)
          const changed = d.order.some((cid, i) => cid !== original[i])
          if (changed && current) void reorderTopicsInCategory(current, d.order)
          window.setTimeout(() => cardSuppressClick.current.delete(d.id), 50)
        }
        return null
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
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
          {(() => {
            const byId = new Map(shown.map((t) => [t.id, t]))
            const gridIds = cardDrag ? cardDrag.order.filter((cid) => cid !== cardDrag.id) : shown.map((t) => t.id)
            return gridIds.map((id) => {
              const topic = byId.get(id)
              if (!topic) return null
              return (
                <div
                  key={id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(id, el)
                    else cardRefs.current.delete(id)
                  }}
                  onPointerDown={(e) => handleCardPointerDown(id, e)}
                  style={{ touchAction: 'none', borderRadius: 16, WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                >
                  <TopicCard
                    topic={topic}
                    previewLines={previewLines}
                    onOpen={() => {
                      if (cardSuppressClick.current.has(id)) return
                      onOpenTopic(id)
                    }}
                  />
                </div>
              )
            })
          })()}
        </div>
      )}

      {cardDrag &&
        (() => {
          const draggedTopic = shown.find((t) => t.id === cardDrag.id)
          if (!draggedTopic) return null
          return (
            <div
              style={{
                position: 'fixed',
                left: cardDrag.originLeft + cardDrag.dx,
                top: cardDrag.originTop + cardDrag.dy,
                width: cardDrag.originWidth,
                height: cardDrag.originHeight,
                zIndex: 50,
                pointerEvents: 'none',
                transform: 'scale(1.04)',
                boxShadow: '0 16px 32px rgba(33,27,51,0.22)',
                borderRadius: 16,
                opacity: 0.96,
              }}
            >
              <TopicCard topic={draggedTopic} previewLines={previewLines} onOpen={() => {}} />
            </div>
          )
        })()}

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
