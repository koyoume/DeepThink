import { useEffect, useRef, useState } from 'react'
import { ThoughtRow } from '../components/ThoughtRow.tsx'
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

  // 하단 입력바 없이 일반 에디터처럼 동작: 목록이 완전히 비면(첫 진입 포함) 커서 둘 빈 줄 하나를 자동으로 만든다.
  useEffect(() => {
    if (detail.state.loaded && detail.state.thoughts.length === 0) {
      detail.addAtEnd()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.state.loaded, detail.state.thoughts.length])
  const [menuOpen, setMenuOpen] = useState(false)

  const LONG_PRESS_MS = 320
  const MOVE_CANCEL_PX = 8
  const REORDER_MOVE_THRESHOLD = 6
  const EDGE_MARGIN_PX = 96

  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const rowSuppressClick = useRef<Set<string>>(new Set())
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

  /** 롱프레스가 확정된 그 즉시(같은 틱) 드래그용 리스너까지 동기적으로 붙인다.
   *  별도 useEffect로 분리하면 상태 반영과 리스너 부착 사이의 틈에 pointerup이 끼어들 때
   *  아무도 못 받아서 drag가 영원히 안 풀리는 경쟁 상태가 생길 수 있다(대시보드 카드 겹침 버그와 동일 원인). */
  function activateRowDrag(id: string, startClientX: number, startClientY: number) {
    const metrics = detail.state.thoughts.map((t) => {
      const el = rowRefs.current.get(t.id)
      const rect = el?.getBoundingClientRect()
      return { id: t.id, top: rect?.top ?? 0, height: rect?.height ?? 32 }
    })
    const overIndex = detail.state.thoughts.findIndex((t) => t.id === id)
    rowSuppressClick.current.add(id)
    setDrag({ id, startX: startClientX, startY: startClientY, dx: 0, dy: 0, overIndex, metrics })

    function onMove(e: PointerEvent) {
      setDrag((d) => {
        if (!d) return d
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        // 활성화 지점에서 실제로 어느 정도 움직이기 전까진 삽입 지점 재계산을 하지 않는다.
        if (Math.hypot(dx, dy) < REORDER_MOVE_THRESHOLD) {
          return { ...d, dx, dy }
        }
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
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
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
          window.setTimeout(() => rowSuppressClick.current.delete(d.id), 50)
        }
        return null
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  /** UI-DESIGN §6 / §5.2: 드래그 인지 영역은 줄 전체 — 어디를 눌러도 길게 누르면 들여쓰기·순서 변경 드래그가 시작된다.
   *  짧게 누르면(320ms 이내 뗌) 그 아래 버튼(텍스트 편집·체크 토글·메뉴)의 원래 클릭이 정상 동작한다. */
  function handleRowPointerDown(id: string, e: React.PointerEvent) {
    // 화면 하단 엣지 근처(입력창 위)를 누르면 모바일 OS 제스처와 겹칠 수 있어 살짝 위로 스크롤해 여유를 만든다.
    const distanceFromBottom = window.innerHeight - e.clientY
    if (distanceFromBottom < EDGE_MARGIN_PX) {
      window.scrollBy({ top: EDGE_MARGIN_PX - distanceFromBottom })
    }
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
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    const timer = window.setTimeout(() => {
      timerFired = true
      cleanup()
      activateRowDrag(id, lastX, lastY)
    }, LONG_PRESS_MS)
  }

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

      <div className="flex-1 px-4 pb-8 pt-3">
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
                touchAction: 'none',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
              }}
              onPointerDown={(e) => handleRowPointerDown(t.id, e)}
              onClickCapture={(e) => {
                if (rowSuppressClick.current.has(t.id)) {
                  e.preventDefault()
                  e.stopPropagation()
                }
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
                onCycleType={() => detail.cycleType(t.id)}
                onEnter={() => detail.addAfter(t.id)}
                onBackspaceAtStart={() => {
                  if (t.text === '') detail.deleteThought(t.id)
                }}
                onIndent={() => detail.indent(t.id)}
                onOutdent={() => detail.outdent(t.id)}
                onDelete={() => detail.deleteThought(t.id)}
              />
            </div>
          )
        })}
        {drag && overThoughtId === '__end__' && (
          <div style={{ borderTop: '2px solid var(--color-brand)', height: 0 }} />
        )}
      </div>
    </div>
  )
}
