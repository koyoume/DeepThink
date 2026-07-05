import { useEffect, useRef, useState } from 'react'
import { ThoughtRow } from '../components/ThoughtRow.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Loading } from '../components/Loading.tsx'
import { useAutoFitFontSize } from '../components/useAutoFit.ts'
import { categoryColorByName } from '../domain/categoryColor.ts'
import { useVaultStore } from '../store/vaultStore.ts'
import { useTopicDetailState } from './useTopicDetailState.ts'

interface Props {
  topicId: string
  onBack: () => void
}

/** UI-DESIGN §5: 상세 화면 — 고정 높이 제목 박스, 관련자료, 생각 리스트, 하단 입력바 */
export function TopicDetailScreen({ topicId, onBack }: Props) {
  const categories = useVaultStore((s) => s.categories)
  const detail = useTopicDetailState(topicId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  interface DragState {
    id: string
    startX: number
    startY: number
    dx: number
    dy: number
    overIndex: number
    metrics: { id: string; top: number; height: number }[]
  }
  const [drag, setDrag] = useState<DragState | null>(null)

  function startHandleDrag(id: string, e: React.PointerEvent) {
    e.preventDefault()
    const metrics = detail.state.thoughts.map((t) => {
      const el = rowRefs.current.get(t.id)
      const rect = el?.getBoundingClientRect()
      return { id: t.id, top: rect?.top ?? 0, height: rect?.height ?? 32 }
    })
    const overIndex = detail.state.thoughts.findIndex((t) => t.id === id)
    setDrag({ id, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, overIndex, metrics })
  }

  // 활성 드래그 동안 window 레벨에서 pointermove/pointerup 추적 (핸들 밖으로 나가도 계속 동작)
  useEffect(() => {
    if (!drag) return
    function onMove(e: PointerEvent) {
      setDrag((d) => {
        if (!d) return d
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        let overIndex = d.metrics.length
        for (let i = 0; i < d.metrics.length; i++) {
          const m = d.metrics[i]
          if (e.clientY < m.top + m.height / 2) {
            overIndex = i
            break
          }
        }
        return { ...d, dx, dy, overIndex }
      })
    }
    function onUp() {
      setDrag((d) => {
        if (d) {
          const originalIndex = d.metrics.findIndex((m) => m.id === d.id)
          if (d.overIndex !== originalIndex) {
            detail.reorderThought(d.id, d.overIndex)
          }
          const levelDelta = Math.round(d.dx / 22)
          if (levelDelta !== 0) {
            detail.shiftLevelBy(d.id, levelDelta)
          }
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
  }, [drag?.id])

  const overThoughtId = drag ? (detail.state.thoughts[drag.overIndex]?.id ?? '__end__') : null

  const titleRef = useAutoFitFontSize<HTMLTextAreaElement>(detail.state.title || '(제목 없음)', {
    max: 27,
    min: 15,
    lines: 2,
  })

  if (!detail.state.loaded) {
    return <Loading />
  }

  function handleBack() {
    detail.flush()
    onBack()
  }

  function submitDraft() {
    const text = draft.trim()
    setDraft('')
    if (!text) return
    const id = detail.addAtEnd()
    detail.setText(id, text)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-paper">
      <header className="flex items-center justify-between px-4 pt-4">
        <button type="button" onClick={handleBack} aria-label="뒤로가기" className="text-xl text-muted">
          ‹
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="더보기" className="text-xl text-muted">
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-line bg-surface py-1 text-sm shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-danger hover:bg-danger-soft"
                onClick={() => {
                  setMenuOpen(false)
                  detail.deleteTopic(onBack)
                }}
              >
                주제 삭제
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex items-center gap-2 px-4 pt-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: categoryColorByName(detail.state.category, categories.map((c) => c.name)) }}
        />
        <select
          value={detail.state.category}
          onChange={(e) => detail.changeCategory(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-1 text-xs text-muted outline-none focus:border-brand"
        >
          {categories.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 pt-3" style={{ height: 64 }}>
        <textarea
          ref={titleRef}
          value={detail.state.title}
          onChange={(e) => detail.setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          rows={2}
          className="h-full w-full resize-none overflow-hidden border-none bg-transparent font-serif font-semibold leading-tight text-ink outline-none"
        />
      </div>

      {detail.state.materials.length > 0 && (
        <div className="px-4 pt-2">
          <p className="text-xs text-faint">관련 자료 (선택)</p>
          <ul className="mt-1 flex flex-col gap-1">
            {detail.state.materials.map((m, i) => (
              <li key={`${m.title}-${i}`} className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-faint">{m.kind === 'link' ? '🔗' : '📄'}</span>
                  <span className="truncate">{m.title}</span>
                  {m.sub && <span className="shrink-0 text-xs text-faint">{m.sub}</span>}
                </div>
                <button type="button" onClick={() => detail.removeMaterial(i)} className="text-faint" aria-label="자료 삭제">
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 px-4 pb-24 pt-3">
        {detail.state.thoughts.length === 0 && (
          <EmptyState
            title="첫 생각을 적어보세요"
            hint="아래 입력창에 한 줄씩 생각을 더할 수 있어요."
            glyph="●"
          />
        )}
        {detail.state.thoughts.map((t) => {
          const isDragging = drag?.id === t.id
          return (
            <div
              key={t.id}
              ref={(el) => {
                if (el) rowRefs.current.set(t.id, el)
                else rowRefs.current.delete(t.id)
              }}
              style={{
                borderTop: overThoughtId === t.id ? '2px solid var(--color-brand)' : undefined,
                transform: isDragging ? `translate(${drag!.dx}px, ${drag!.dy}px)` : undefined,
                position: isDragging ? 'relative' : undefined,
                zIndex: isDragging ? 10 : undefined,
              }}
            >
              <ThoughtRow
                thought={t}
                dragging={isDragging}
                focusRequested={detail.focusRequest === t.id}
                onFocusHandled={detail.clearFocusRequest}
                onFocus={() => detail.setFocused(t.id)}
                onBlur={() => detail.clearFocused(t.id)}
                onTextChange={(text) => detail.setText(t.id, text)}
                onToggleDone={() => detail.toggleDone(t.id)}
                onToggleType={() => detail.setType(t.id, t.type === 'check' ? 'comment' : 'check')}
                onEnter={() => detail.addAfter(t.id)}
                onBackspaceAtStart={() => {
                  if (t.text === '') detail.deleteThought(t.id)
                }}
                onIndent={() => detail.indent(t.id)}
                onOutdent={() => detail.outdent(t.id)}
                onDelete={() => detail.deleteThought(t.id)}
                onHandlePointerDown={(e) => startHandleDrag(t.id, e)}
              />
            </div>
          )
        })}
        {drag && overThoughtId === '__end__' && (
          <div style={{ borderTop: '2px solid var(--color-brand)', height: 0 }} />
        )}
      </div>

      <footer className="fixed bottom-0 left-1/2 flex w-full max-w-2xl -translate-x-1/2 items-center gap-2 border-t border-line bg-surface p-3">
        <button
          type="button"
          onClick={detail.toggleNewType}
          className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs text-muted"
        >
          {detail.newType === 'check' ? '체크' : '코멘트'}
        </button>
        <input
          type="text"
          value={draft}
          placeholder="새 생각 추가"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitDraft()
            }
          }}
          className="flex-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-brand"
        />
      </footer>
    </div>
  )
}
