import type { ThoughtType } from '../domain/models.ts'

interface Props {
  type: ThoughtType
  done: boolean
  onCycle?: () => void
}

const CHECK_BASE =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] leading-none transition-colors'
const COMMENT_BASE = 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]'
const COMMENT_STYLE = { borderColor: 'var(--color-comment)', background: 'var(--color-comment-soft)', color: 'var(--color-comment)' }

/** UI-DESIGN §3: 체크(둥근 사각 체크박스, pine) vs 코멘트(둥근 말풍선, amber).
 *  §5.4: 왼쪽 글리프를 클릭하면 코멘트 → 체크(미완료) → 체크(완료) → 코멘트 순으로 순환(타입 전환 메뉴 폐기). */
export function ThoughtGlyph({ type, done, onCycle }: Props) {
  if (type === 'check') {
    const className = `${CHECK_BASE} ${done ? 'border-brand bg-brand text-white' : 'border-faint text-transparent'}`
    if (!onCycle) {
      return (
        <span className={className} aria-hidden="true">
          ✓
        </span>
      )
    }
    return (
      <button
        type="button"
        onClick={onCycle}
        aria-pressed={done}
        aria-label={done ? '완료됨 — 클릭해서 코멘트로 전환' : '미완료 — 클릭해서 완료로 표시'}
        className={className}
      >
        ✓
      </button>
    )
  }
  if (!onCycle) {
    return (
      <span className={COMMENT_BASE} style={COMMENT_STYLE} aria-hidden="true">
        ●
      </span>
    )
  }
  return (
    <button type="button" onClick={onCycle} aria-label="코멘트 — 클릭해서 체크로 전환" className={COMMENT_BASE} style={COMMENT_STYLE}>
      ●
    </button>
  )
}
