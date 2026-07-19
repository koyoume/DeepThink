import { useEffect, useRef } from 'react'
import { categoryColorByIndex } from '../domain/categoryColor.ts'

interface Props {
  names: string[]
  selected: string | null
  onSelect: (name: string) => void
  onReorder?: (names: string[]) => void
  editingOrder: boolean
}

/** UI-DESIGN §4: "전체" 없음, 항상 하나 선택.
 *  시각 §5.1: 활성 칩은 카테고리 색으로 채움, 비활성 칩은 색 점 + 이름.
 *  §5.3: drag 대신 "순서 편집" 모드 — 켜지면 각 칩 옆에 ◀▶ 버튼으로 즉시 순서 변경. */
export function CategoryChips({ names, selected, onSelect, onReorder, editingOrder }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  // 접속(마운트) 및 선택 카테고리 변경 시, 가로 스크롤되는 칩 행에서 선택된 칩이
  // 화면 밖에 있어 안 보이는 문제를 막기 위해 선택 칩이 가운데로 오도록 칩 행만 스크롤한다.
  // getBoundingClientRect 기반이라 컨테이너의 position 설정과 무관하고, 페이지 세로 스크롤엔 영향 없다.
  useEffect(() => {
    const container = scrollRef.current
    const el = selectedRef.current
    if (!container || !el) return
    const cRect = container.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    const delta = eRect.left - cRect.left - (container.clientWidth - el.clientWidth) / 2
    container.scrollLeft += delta // 브라우저가 [0, maxScroll]로 자동 클램프
  }, [selected, names])

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= names.length) return
    const next = [...names]
    ;[next[index], next[target]] = [next[target], next[index]]
    onReorder?.(next)
  }

  return (
    <div ref={scrollRef} className="flex gap-2 overflow-x-auto px-4 py-2">
      {names.map((name, i) => {
        const active = name === selected
        const color = categoryColorByIndex(i)
        return (
          <div key={name} ref={active ? selectedRef : undefined} className="flex shrink-0 items-center gap-0.5">
            {editingOrder && (
              <button
                type="button"
                aria-label={`${name} 왼쪽으로 이동`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="rounded px-1 text-sm text-muted disabled:opacity-30"
              >
                ◀
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelect(name)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
              style={
                active
                  ? { backgroundColor: color, color: '#fff', fontWeight: 500 }
                  : { border: '1px solid var(--color-line)', color: 'var(--color-muted)' }
              }
            >
              {!active && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
              {name}
            </button>
            {editingOrder && (
              <button
                type="button"
                aria-label={`${name} 오른쪽으로 이동`}
                disabled={i === names.length - 1}
                onClick={() => move(i, 1)}
                className="rounded px-1 text-sm text-muted disabled:opacity-30"
              >
                ▶
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
