import { useState } from 'react'
import { ThoughtRow } from '../components/ThoughtRow.tsx'
import { useAutoFitFontSize } from '../components/useAutoFit.ts'
import { useVaultStore } from '../store/vaultStore.ts'
import { useTopicDetailState } from './useTopicDetailState.ts'

interface Props {
  topicId: string
  onBack: () => void
}

/** UI-DESIGN §5: 상세 화면 — 고정 높이 제목 박스, 관련자료, 생각 리스트, 하단 입력바 */
export function TopicDetailScreen({ topicId, onBack }: Props) {
  const categories = useVaultStore((s) => s.categories)
  const detail = useTopicDetailState(topicId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const titleRef = useAutoFitFontSize<HTMLTextAreaElement>(detail.state.title || '(제목 없음)', {
    max: 27,
    min: 15,
    lines: 2,
  })

  if (!detail.state.loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">불러오는 중…</div>
    )
  }

  function handleBack() {
    detail.flush()
    onBack()
  }

  function submitDraft() {
    const text = draft.trim()
    setDraft('')
    if (!text) return
    const id = detail.addAtEnd()
    detail.setText(id, text)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-paper">
      <header className="flex items-center justify-between px-4 pt-4">
        <button type="button" onClick={handleBack} aria-label="뒤로가기" className="text-xl text-muted">
          ‹
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="더보기" className="text-xl text-muted">
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-neutral-200 bg-white py-1 text-sm shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                onClick={() => {
                  setMenuOpen(false)
                  detail.deleteTopic(onBack)
                }}
              >
                주제 삭제
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="px-4 pt-2">
        <select
          value={detail.state.category}
          onChange={(e) => detail.changeCategory(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-1 text-xs text-muted"
        >
          {categories.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 pt-3" style={{ height: 64 }}>
        <textarea
          ref={titleRef}
          value={detail.state.title}
          onChange={(e) => detail.setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          rows={2}
          className="h-full w-full resize-none overflow-hidden border-none bg-transparent font-serif font-semibold leading-tight text-ink outline-none"
        />
      </div>

      {detail.state.materials.length > 0 && (
        <div className="px-4 pt-2">
          <p className="text-xs text-faint">관련 자료 (선택)</p>
          <ul className="mt-1 flex flex-col gap-1">
            {detail.state.materials.map((m, i) => (
              <li key={`${m.title}-${i}`} className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-faint">{m.kind === 'link' ? '🔗' : '📄'}</span>
                  <span className="truncate">{m.title}</span>
                  {m.sub && <span className="shrink-0 text-xs text-faint">{m.sub}</span>}
                </div>
                <button type="button" onClick={() => detail.removeMaterial(i)} className="text-faint" aria-label="자료 삭제">
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 px-4 pb-24 pt-3">
        {detail.state.thoughts.length === 0 && (
          <p className="py-8 text-center text-sm text-faint">아직 생각이 없습니다.</p>
        )}
        {detail.state.thoughts.map((t) => (
          <ThoughtRow
            key={t.id}
            thought={t}
            focusRequested={detail.focusRequest === t.id}
            onFocusHandled={detail.clearFocusRequest}
            onFocus={() => detail.setFocused(t.id)}
            onBlur={() => detail.clearFocused(t.id)}
            onTextChange={(text) => detail.setText(t.id, text)}
            onToggleDone={() => detail.toggleDone(t.id)}
            onToggleType={() => detail.setType(t.id, t.type === 'check' ? 'comment' : 'check')}
            onEnter={() => detail.addAfter(t.id)}
            onBackspaceAtStart={() => {
              if (t.text === '') detail.deleteThought(t.id)
            }}
            onIndent={() => detail.indent(t.id)}
            onOutdent={() => detail.outdent(t.id)}
            onDelete={() => detail.deleteThought(t.id)}
          />
        ))}
      </div>

      <footer className="fixed bottom-0 left-1/2 flex w-full max-w-2xl -translate-x-1/2 items-center gap-2 border-t border-line bg-surface p-3">
        <button
          type="button"
          onClick={detail.toggleNewType}
          className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs text-muted"
        >
          {detail.newType === 'check' ? '체크' : '코멘트'}
        </button>
        <input
          type="text"
          value={draft}
          placeholder="새 생각 추가"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitDraft()
            }
          }}
          className="flex-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-brand"
        />
      </footer>
    </div>
  )
}
