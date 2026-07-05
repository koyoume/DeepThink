import type { Topic } from '../domain/models.ts'
import { useAutoFitFontSize } from './useAutoFit.ts'
import { ThoughtGlyph } from './ThoughtGlyph.tsx'

interface Props {
  topic: Topic
  previewLines: number
  onOpen: () => void
}

/** UI-DESIGN §4: 카드 안엔 카테고리 표기 없음, 제목 자동축소, 미리보기 최대 N줄(가변 높이).
 *  시각 §5.1: 제목 세리프(에디토리얼), 여백↑, 제목/미리보기 구분선. */
export function TopicCard({ topic, previewLines, onOpen }: Props) {
  const titleRef = useAutoFitFontSize(topic.title || '(제목 없음)', { max: 20, min: 13, lines: 1 })
  const preview = previewLines > 0 ? topic.thoughts.slice(-previewLines) : []

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-start rounded-2xl border border-line bg-surface p-4 text-left shadow-[0_1px_2px_rgba(33,27,51,0.04)] transition-shadow hover:shadow-[0_6px_20px_rgba(107,78,255,0.10)]"
    >
      <div
        ref={titleRef}
        className="w-full overflow-hidden whitespace-nowrap font-serif font-semibold leading-snug text-ink"
      >
        {topic.title || '(제목 없음)'}
      </div>
      {preview.length > 0 && (
        <div className="mt-3 flex w-full flex-col gap-1.5 border-t border-line pt-3">
          {preview.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-xs text-muted">
              <ThoughtGlyph type={t.type} done={t.done} />
              <span className={`truncate ${t.type === 'check' && t.done ? 'text-faint line-through' : ''}`}>
                {t.text || ' '}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}
