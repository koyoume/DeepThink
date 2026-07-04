import { useLayoutEffect, useRef } from 'react'

interface FittableElement {
  style: { fontSize: string }
  scrollWidth: number
  clientWidth: number
  scrollHeight: number
  clientHeight: number
}

/**
 * 텍스트가 담긴 요소의 폰트 크기를 컨테이너에 맞게 줄인다.
 * UI-DESIGN.md: 카드 제목(18→11px 한 줄), 상세 제목(27px 한 줄 / 22→15px 두 줄) 자동 축소.
 * 최소 크기에서도 넘치면 CSS로 말줄임 처리(...).
 */
export function useAutoFitFontSize<T extends FittableElement = HTMLDivElement>(
  text: string,
  opts: { max: number; min: number; lines: 1 | 2 },
) {
  const ref = useRef<T | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let size = opts.max
    el.style.fontSize = `${size}px`
    const fits = () =>
      opts.lines === 1 ? el.scrollWidth <= el.clientWidth + 1 : el.scrollHeight <= el.clientHeight + 1

    while (!fits() && size > opts.min) {
      size -= 1
      el.style.fontSize = `${size}px`
    }
  }, [text, opts.max, opts.min, opts.lines])

  return ref
}
