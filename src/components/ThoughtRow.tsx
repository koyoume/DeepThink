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
  onEnter: (before: string, after: string) => void
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
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const caretToEndRef = useRef(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [focused, setFocused] = useState(false)

  function autoResize(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const onFocusHandled = props.onFocusHandled
  useEffect(() => {
    if (props.focusRequested && inputRef.current) {
      inputRef.current.focus()
      autoResize(inputRef.current)
      onFocusHandled()
    }
  }, [props.focusRequested, onFocusHandled])

  // 렌더 뷰(blur 상태)를 클릭해 편집 모드로 전환할 때, input이 막 마운트된 뒤 포커스를 옮긴다.
  // 뷰를 탭해 들어온 경우(caretToEndRef)엔 커서를 줄 맨 끝에 둔다(기본값은 맨 앞이라 수정이 불편).
  // 새 줄/분리(focusRequested)로 들어온 경우엔 맨 앞(0)에 두어 이어지는 텍스트 앞에서 타이핑하게 한다.
  useEffect(() => {
    if (focused) {
      const el = inputRef.current
      el?.focus()
      if (el && caretToEndRef.current) {
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
      caretToEndRef.current = false
      autoResize(el)
    }
  }, [focused])

  // 텍스트가 바뀔 때마다(타이핑 포함) 줄바꿈으로 늘어난 높이를 반영.
  useEffect(() => {
    autoResize(inputRef.current)
  }, [thought.text])

  function handleFocus() {
    props.onFocus()
    setFocused(true)
  }

  function handleBlur() {
    props.onBlur()
    setFocused(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const el = e.currentTarget
      const before = el.value.slice(0, el.selectionStart)
      const after = el.value.slice(el.selectionEnd)
      props.onEnter(before, after)
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
          data-testid="thought-view"
          onClick={() => {
            caretToEndRef.current = true
            setFocused(true)
          }}
          className={`min-w-0 flex-1 whitespace-normal break-words bg-transparent text-left text-sm outline-none ${
            thought.type === 'check' && thought.done ? 'text-faint line-through' : 'text-ink'
          }`}
        >
          {renderInlineFormatted(thought.text)}
        </button>
      ) : (
        <textarea
          ref={inputRef}
          data-testid="thought-input"
          value={thought.text}
          placeholder="생각을 입력하세요"
          rows={1}
          onChange={(e) => {
            props.onTextChange(e.target.value)
            autoResize(e.target)
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`min-w-0 flex-1 resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent text-sm leading-normal outline-none ${
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
