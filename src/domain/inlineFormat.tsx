import type { ReactNode } from 'react'

/** 표준 마크다운 굵게(**...**)·이탤릭(*...*)만 매칭. 밑줄·색 등 비표준 문법은 다루지 않음. */
const PATTERN = /\*\*([^*]+)\*\*|\*([^*]+)\*/g

/**
 * thought.text(원문 마크다운 문자열)를 굵게/이탤릭이 반영된 React 노드로 변환.
 * 저장 형식은 그대로 원문 문자열이라 이 함수는 순수 렌더링 전용 — round-trip에 영향 없음.
 */
export function renderInlineFormatted(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let key = 0
  PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>)
    }
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {match[1]}
        </strong>,
      )
    } else if (match[2] !== undefined) {
      nodes.push(<em key={key++}>{match[2]}</em>)
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>)
  }
  return nodes
}
