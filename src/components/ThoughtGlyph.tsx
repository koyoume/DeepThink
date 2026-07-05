import type { ThoughtType } from '../domain/models.ts'

interface Props {
  type: ThoughtType
  done: boolean
  onToggle?: () => void
}

const CHECK_BASE =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] leading-none transition-colors'

/** UI-DESIGN §3: 체크(둥근 사각 체크박스, pine) vs 코멘트(둥근 말풍선, amber) */
export function ThoughtGlyph({ type, done, onToggle }: Props) {
  if (type === 'check') {
    const className = `${CHECK_BASE} ${done ? 'border-brand bg-brand text-white' : 'border-faint text-transparent'}`
    if (!onToggle) {
      return (
        <span className={className} aria-hidden="true">
          ✓
        </span>
      )
    }
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? '완료 취소' : '완료로 표시'}
        className={className}
      >
        ✓
      </button>
    )
  }
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]"
      style={{ borderColor: 'var(--color-comment)', background: 'var(--color-comment-soft)', color: 'var(--color-comment)' }}
    >
      ●
    </span>
  )
}
