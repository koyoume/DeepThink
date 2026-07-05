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
  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= names.length) return
    const next = [...names]
    ;[next[index], next[target]] = [next[target], next[index]]
    onReorder?.(next)
  }

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2">
      {names.map((name, i) => {
        const active = name === selected
        const color = categoryColorByIndex(i)
        return (
          <div key={name} className="flex shrink-0 items-center gap-0.5">
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
