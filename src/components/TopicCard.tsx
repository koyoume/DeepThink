import type { Topic } from '../domain/models.ts'
import { useAutoFitFontSize } from './useAutoFit.ts'
import { ThoughtGlyph } from './ThoughtGlyph.tsx'

interface Props {
  topic: Topic
  previewLines: number
  onOpen: () => void
}

/** UI-DESIGN §4: 카드 안엔 카테고리 표기 없음, 제목 자동축소(18→11px), 미리보기 최대 N줄(가변 높이). */
export function TopicCard({ topic, previewLines, onOpen }: Props) {
  const titleRef = useAutoFitFontSize(topic.title || '(제목 없음)', { max: 18, min: 11, lines: 1 })
  const preview = previewLines > 0 ? topic.thoughts.slice(-previewLines) : []

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-start rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div ref={titleRef} className="w-full overflow-hidden whitespace-nowrap font-medium text-neutral-900">
        {topic.title || '(제목 없음)'}
      </div>
      {preview.length > 0 && (
        <div className="mt-2 flex w-full flex-col gap-1">
          {preview.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 text-xs text-neutral-600">
              <ThoughtGlyph type={t.type} done={t.done} />
              <span className={`truncate ${t.type === 'check' && t.done ? 'text-neutral-400 line-through' : ''}`}>
                {t.text || ' '}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}
