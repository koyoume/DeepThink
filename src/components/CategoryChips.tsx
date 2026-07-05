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

/** UI-DESIGN §4: "전체" 없음, 항상 하나 선택.
 *  시각 §5.1: 활성 칩은 카테고리 색으로 채움, 비활성 칩은 색 점 + 이름.
 *  §5.2: 칩을 길게 누르면 드래그로 순서 변경(가로 1열 재정렬), 짧게 누르면 기존처럼 선택. */
export function CategoryChips({ names, selected, onSelect, onReorder }: Props) {
  const chipRefs = useRef(new Map<string, HTMLElement>())
  const suppressClick = useRef<Set<string>>(new Set())

  interface DragState {
    id: string
    dx: number
    overIndex: number
    centers: { name: string; cx: number }[]
  }
  const [drag, setDrag] = useState<DragState | null>(null)

  function handlePointerDown(name: string, e: React.PointerEvent) {
    const startX = e.clientX
    const startY = e.clientY
    let cancelled = false
    function onEarlyMove(ev: PointerEvent) {
      if (Math.abs(ev.clientX - startX) > MOVE_CANCEL_PX || Math.abs(ev.clientY - startY) > MOVE_CANCEL_PX) {
        cancelled = true
        cleanup()
      }
    }
    function onEarlyUp() {
      cleanup()
    }
    function cleanup() {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', onEarlyMove)
      window.removeEventListener('pointerup', onEarlyUp)
    }
    window.addEventListener('pointermove', onEarlyMove)
    window.addEventListener('pointerup', onEarlyUp)
    const timer = window.setTimeout(() => {
      cleanup()
      if (cancelled || !onReorder) return
      const centers = names.map((n) => {
        const el = chipRefs.current.get(n)
        const r = el?.getBoundingClientRect()
        return { name: n, cx: r ? r.left + r.width / 2 : 0 }
      })
      const overIndex = names.indexOf(name)
      suppressClick.current.add(name)
      setDrag({ id: name, dx: 0, overIndex, centers })
    }, LONG_PRESS_MS)
  }

  useEffect(() => {
    if (!drag) return
    const origin = drag.centers.find((c) => c.name === drag.id)
    const startX = origin?.cx ?? 0

    function nearestIndex(x: number, centers: DragState['centers']): number {
      let best = 0
      let bestDist = Infinity
      centers.forEach((c, i) => {
        const d = Math.abs(c.cx - x)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      })
      return best
    }

    function onMove(e: PointerEvent) {
      setDrag((d) => {
        if (!d) return d
        const dx = e.clientX - startX
        const overIndex = nearestIndex(e.clientX, d.centers)
        return { ...d, dx, overIndex }
      })
    }
    function onUp() {
      setDrag((d) => {
        if (d) {
          const originalIndex = d.centers.findIndex((c) => c.name === d.id)
          if (d.overIndex !== originalIndex) {
            const order = d.centers.map((c) => c.name)
            const [moved] = order.splice(originalIndex, 1)
            order.splice(d.overIndex, 0, moved)
            onReorder?.(order)
          }
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

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2">
      {names.map((name, i) => {
        const active = name === selected
        const color = categoryColorByIndex(i)
        const isDragging = drag?.id === name
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
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={{
              touchAction: 'manipulation',
              transform: isDragging ? `translateX(${drag!.dx}px) scale(1.05)` : undefined,
              position: isDragging ? 'relative' : undefined,
              zIndex: isDragging ? 10 : undefined,
              boxShadow: isDragging ? '0 6px 16px rgba(33,27,51,0.16)' : undefined,
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
    </div>
  )
}
