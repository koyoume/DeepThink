import { useEffect, useRef, useState } from 'react'
import { categoryColorByIndex } from '../domain/categoryColor.ts'

interface Props {
  names: string[]
  selected: string | null
  onSelect: (name: string) => void
  onReorder?: (names: string[]) => void
}

const LONG_PRESS_MS = 320
const MOVE_CANCEL_PX = 8
const SCROLL_DEADZONE_PX = 3

/** UI-DESIGN §4: "전체" 없음, 항상 하나 선택.
 *  시각 §5.1: 활성 칩은 카테고리 색으로 채움, 비활성 칩은 색 점 + 이름.
 *  §5.2: 칩을 길게 누르면 드래그로 순서 변경(가로 1열 재정렬), 짧게 누르면 기존처럼 선택.
 *  §5.2.2: 드래그 중엔 실시간으로 순서를 바꿔 다른 칩이 실제로 자리를 비켜준다(겹침 방지).
 *  스크롤 대신 넘기기는 작은 데드존(3px) 이후에만 시작 — 탭 시 미세 떨림으로 줄이 흔들리는 것 방지. */
export function CategoryChips({ names, selected, onSelect, onReorder }: Props) {
  const chipRefs = useRef(new Map<string, HTMLElement>())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const suppressClick = useRef<Set<string>>(new Set())

  interface DragState {
    id: string
    originLeft: number
    originTop: number
    originWidth: number
    startClientX: number
    dx: number
    order: string[]
  }
  const [drag, setDrag] = useState<DragState | null>(null)

  function handlePointerDown(name: string, e: React.PointerEvent) {
    const startX = e.clientX
    const startY = e.clientY
    let lastX = e.clientX
    let timerFired = false
    let movedPastThreshold = false
    let scrollStarted = false

    function onMove(ev: PointerEvent) {
      if (timerFired) return
      const totalDx = ev.clientX - startX
      const totalDy = ev.clientY - startY
      if (!scrollStarted && (Math.abs(totalDx) > SCROLL_DEADZONE_PX || Math.abs(totalDy) > SCROLL_DEADZONE_PX)) {
        scrollStarted = true
        lastX = ev.clientX // 데드존 넘는 순간부터 다시 기준을 잡아 스크롤이 갑자기 튀지 않게 함
      }
      if (scrollStarted) {
        const dx = ev.clientX - lastX
        lastX = ev.clientX
        containerRef.current?.scrollBy({ left: -dx })
      }
      if (!movedPastThreshold && (Math.abs(totalDx) > MOVE_CANCEL_PX || Math.abs(totalDy) > MOVE_CANCEL_PX)) {
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
      if (!onReorder) return
      const el = chipRefs.current.get(name)
      const r = el?.getBoundingClientRect()
      if (!r) return
      suppressClick.current.add(name)
      setDrag({ id: name, originLeft: r.left, originTop: r.top, originWidth: r.width, startClientX: lastX, dx: 0, order: names })
    }, LONG_PRESS_MS)
  }

  useEffect(() => {
    if (!drag) return
    function onMove(e: PointerEvent) {
      setDrag((d) => {
        if (!d) return d
        const dx = e.clientX - d.startClientX
        const restIds = d.order.filter((n) => n !== d.id)
        let bestIdx = restIds.length
        let bestDist = Infinity
        restIds.forEach((n, i) => {
          const el = chipRefs.current.get(n)
          const r = el?.getBoundingClientRect()
          if (!r) return
          const cx = r.left + r.width / 2
          const dist = Math.abs(cx - e.clientX)
          if (dist < bestDist) {
            bestDist = dist
            bestIdx = i
          }
        })
        const newOrder = [...restIds.slice(0, bestIdx), d.id, ...restIds.slice(bestIdx)]
        const changed = newOrder.some((n, i) => n !== d.order[i])
        return { ...d, dx, order: changed ? newOrder : d.order }
      })
    }
    function onUp() {
      setDrag((d) => {
        if (d) {
          const changed = d.order.some((n, i) => n !== names[i])
          if (changed) onReorder?.(d.order)
          window.setTimeout(() => suppressClick.current.delete(d.id), 50)
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

  const displayNames = drag ? drag.order.filter((n) => n !== drag.id) : names

  return (
    <div ref={containerRef} className="relative flex gap-2 overflow-x-auto px-4 py-2">
      {displayNames.map((name) => {
        const i = names.indexOf(name)
        const active = name === selected
        const color = categoryColorByIndex(i)
        return (
          <button
            key={name}
            type="button"
            ref={(el) => {
              if (el) chipRefs.current.set(name, el)
              else chipRefs.current.delete(name)
            }}
            onPointerDown={(e) => handlePointerDown(name, e)}
            onClick={() => {
              if (suppressClick.current.has(name)) return
              onSelect(name)
            }}
            className="flex shrink-0 select-none items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={{
              touchAction: 'none',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              ...(active
                ? { backgroundColor: color, color: '#fff', fontWeight: 500 }
                : { border: '1px solid var(--color-line)', color: 'var(--color-muted)' }),
            }}
          >
            {!active && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
            {name}
          </button>
        )
      })}
      {drag && (
        <button
          type="button"
          style={{
            position: 'fixed',
            left: drag.originLeft + drag.dx,
            top: drag.originTop,
            width: drag.originWidth,
            zIndex: 50,
            pointerEvents: 'none',
            boxShadow: '0 6px 16px rgba(33,27,51,0.2)',
            transform: 'scale(1.05)',
            opacity: 0.95,
            ...(drag.id === selected
              ? { backgroundColor: categoryColorByIndex(names.indexOf(drag.id)), color: '#fff', fontWeight: 500 }
              : { border: '1px solid var(--color-line)', color: 'var(--color-muted)', backgroundColor: 'var(--color-surface)' }),
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
          data-drag-ghost
        >
          {drag.id !== selected && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: categoryColorByIndex(names.indexOf(drag.id)) }}
            />
          )}
          {drag.id}
        </button>
      )}
    </div>
  )
}
