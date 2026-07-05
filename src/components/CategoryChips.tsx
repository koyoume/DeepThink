interface Props {
  names: string[]
  selected: string | null
  onSelect: (name: string) => void
}

/** UI-DESIGN §4: "전체" 없음, 항상 하나 선택. */
export function CategoryChips({ names, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2">
      {names.map((name) => {
        const active = name === selected
        return (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              active ? 'bg-brand font-medium text-white' : 'border border-line text-muted'
            }`}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}
