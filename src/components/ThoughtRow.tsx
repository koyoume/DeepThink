import { useEffect, useRef, useState } from 'react'
import type { Thought } from '../domain/models.ts'
import { ThoughtGlyph } from './ThoughtGlyph.tsx'
import { renderInlineFormatted } from '../domain/inlineFormat.tsx'

interface Props {
  thought: Thought
  focusRequested: boolean
  onFocusHandled: () => void
  onFocus: () => void
  onBlur: () => void
  onTextChange: (text: string) => void
  onCycleType: () => void
  onEnter: () => void
  onBackspaceAtStart: () => void
  onIndent: () => void
  onOutdent: () => void
  onDelete: () => void
  dragging?: boolean
}

/** UI-DESIGN §6: 인라인 편집 + Enter 삽입. 드래그 인지 영역은 줄 전체(길게 누르면 들여쓰기·순서 변경 시작,
 *  좌우=들여쓰기/우측=순서, TopicDetailScreen에서 처리) — ⠿는 그 자리에 있다는 시각적 표시일 뿐 별도 히트영역 아님.
 *  길게 누르기(⋯ 버튼) 메뉴. */
export function ThoughtRow(props: Props) {
  const { thought } = props
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [focused, setFocused] = useState(false)

  const onFocusHandled = props.onFocusHandled
  useEffect(() => {
    if (props.focusRequested && inputRef.current) {
      inputRef.current.focus()
      onFocusHandled()
    }
  }, [props.focusRequested, onFocusHandled])

  // 렌더 뷰(blur 상태)를 클릭해 편집 모드로 전환할 때, input이 막 마운트된 뒤 포커스를 옮긴다.
  useEffect(() => {
    if (focused) inputRef.current?.focus()
  }, [focused])

  function handleFocus() {
    props.onFocus()
    setFocused(true)
  }

  function handleBlur() {
    props.onBlur()
    setFocused(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      props.onEnter()
    } else if (e.key === 'Backspace') {
      const el = e.currentTarget
      if (el.selectionStart === 0 && el.selectionEnd === 0) {
        e.preventDefault()
        props.onBackspaceAtStart()
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) props.onOutdent()
      else props.onIndent()
    }
  }

  return (
    <div
      className={`group relative flex items-start gap-1 py-1 ${props.dragging ? 'opacity-70' : ''}`}
      style={{ marginLeft: thought.level * 22, borderLeft: thought.level > 0 ? '2px solid var(--color-guide)' : undefined, paddingLeft: thought.level > 0 ? 8 : 0 }}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 shrink-0 select-none px-0.5 text-xs leading-none text-faint opacity-0 transition-opacity group-hover:opacity-100"
      >
        ⠿
      </span>
      <ThoughtGlyph type={thought.type} done={thought.done} onCycle={props.onCycleType} />
      {!focused && !props.focusRequested && thought.text.trim() !== '' ? (
        <button
          type="button"
          onClick={() => setFocused(true)}
          className={`min-w-0 flex-1 truncate bg-transparent text-left text-sm outline-none ${
            thought.type === 'check' && thought.done ? 'text-faint line-through' : 'text-ink'
          }`}
        >
          {renderInlineFormatted(thought.text)}
        </button>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={thought.text}
          placeholder="생각을 입력하세요"
          onChange={(e) => props.onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
            thought.type === 'check' && thought.done ? 'text-faint line-through' : 'text-ink'
          }`}
        />
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="줄 메뉴"
          className="rounded px-1 text-faint opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-line bg-surface py-1 text-sm shadow-lg">
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-brand-soft"
              onClick={() => {
                props.onIndent()
                setMenuOpen(false)
              }}
            >
              들여쓰기
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-brand-soft"
              onClick={() => {
                props.onOutdent()
                setMenuOpen(false)
              }}
            >
              내어쓰기
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-danger hover:bg-danger-soft"
              onClick={() => {
                props.onDelete()
                setMenuOpen(false)
              }}
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
