import type { ReactNode } from 'react'

interface Props {
  title: string
  hint?: string
  /** 상단 글리프(옅은 보라 원 안). 미지정 시 기본 말풍선 점. */
  glyph?: ReactNode
  className?: string
}

/** 공용 빈 상태 — 옅은 보라 글리프 + 제목 + 힌트. 화면 간 동일한 언어. */
export function EmptyState({ title, hint, glyph, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-2xl text-brand">
        {glyph ?? '＋'}
      </span>
      <p className="font-serif text-lg font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1.5 max-w-xs text-sm text-muted">{hint}</p>}
    </div>
  )
}
