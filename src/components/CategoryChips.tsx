import { categoryColorByIndex } from '../domain/categoryColor.ts'

interface Props {
  names: string[]
  selected: string | null
  onSelect: (name: string) => void
}

/** UI-DESIGN §4: "전체" 없음, 항상 하나 선택.
 *  시각 §5.1: 활성 칩은 카테고리 색으로 채움, 비활성 칩은 색 점 + 이름. */
export function CategoryChips({ names, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2">
      {names.map((name, i) => {
        const active = name === selected
        const color = categoryColorByIndex(i)
        return (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={
              active
                ? { backgroundColor: color, color: '#fff', fontWeight: 500 }
                : { border: '1px solid var(--color-line)', color: 'var(--color-muted)' }
            }
          >
            {!active && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
            {name}
          </button>
        )
      })}
    </div>
  )
}
