interface Props {
  label?: string
}

/** 공용 로딩 표시 — 브랜드 보라 스피너 + muted 라벨(화면 간 통일). */
export function Loading({ label = '불러오는 중…' }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper">
      <span
        aria-hidden="true"
        className="h-6 w-6 animate-spin rounded-full border-2 border-brand-soft border-t-brand"
      />
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}
