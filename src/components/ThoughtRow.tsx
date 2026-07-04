import { useEffect, useRef, useState } from 'react'
import type { Thought } from '../domain/models.ts'
import { ThoughtGlyph } from './ThoughtGlyph.tsx'

interface Props {
  thought: Thought
  focusRequested: boolean
  onFocusHandled: () => void
  onFocus: () => void
  onBlur: () => void
  onTextChange: (text: string) => void
  onToggleDone: () => void
  onToggleType: () => void
  onEnter: () => void
  onBackspaceAtStart: () => void
  onIndent: () => void
  onOutdent: () => void
  onDelete: () => void
}

const SWIPE_THRESHOLD = 40

/** UI-DESIGN §6: 인라인 편집 + Enter 삽입, 좌우 스와이프 들여쓰기, 길게 누르기(⋯ 버튼) 메뉴 */
export function ThoughtRow(props: Props) {
  const { thought } = props
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const pointer = useRef<{ x: number; y: number; active: boolean } | null>(null)

  const onFocusHandled = props.onFocusHandled
  useEffect(() => {
    if (props.focusRequested && inputRef.current) {
      inputRef.current.focus()
      onFocusHandled()
    }
  }, [props.focusRequested, onFocusHandled])

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

  function handlePointerDown(e: React.PointerEvent) {
    pointer.current = { x: e.clientX, y: e.clientY, active: true }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!pointer.current?.active) return
    const dx = e.clientX - pointer.current.x
    const dy = e.clientY - pointer.current.y
    pointer.current = null
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) props.onIndent()
      else props.onOutdent()
    }
  }

  return (
    <div
      className="group relative flex items-start gap-2 py-1"
      style={{ marginLeft: thought.level * 22, borderLeft: thought.level > 0 ? '1px solid #e3e1d9' : undefined, paddingLeft: thought.level > 0 ? 8 : 0 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <ThoughtGlyph type={thought.type} done={thought.done} onToggle={props.onToggleDone} />
      <input
        ref={inputRef}
        type="text"
        value={thought.text}
        placeholder="생각을 입력하세요"
        onChange={(e) => props.onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
          thought.type === 'check' && thought.done ? 'text-neutral-400 line-through' : 'text-neutral-800'
        }`}
      />
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="줄 메뉴"
          className="rounded px-1 text-neutral-400 opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-neutral-200 bg-white py-1 text-sm shadow-lg">
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50"
              onClick={() => {
                props.onToggleType()
                setMenuOpen(false)
              }}
            >
              {thought.type === 'check' ? '코멘트로 전환' : '체크로 전환'}
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50"
              onClick={() => {
                props.onIndent()
                setMenuOpen(false)
              }}
            >
              들여쓰기
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50"
              onClick={() => {
                props.onOutdent()
                setMenuOpen(false)
              }}
            >
              내어쓰기
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
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
