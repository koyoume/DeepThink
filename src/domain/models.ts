/** 생각 줄 유형: 체크리스트 / 코멘트 */
export type ThoughtType = 'check' | 'comment'

/** 관련 자료 유형: 링크 / 문서 */
export type MaterialKind = 'link' | 'doc'

/** 들여쓰기 최대 깊이 (UI-DESIGN: 4단계) */
export const MAX_THOUGHT_LEVEL = 4

/**
 * 한 줄 단위 생각.
 * level: 들여쓰기 레벨 (0 = 최상위)
 * done: CHECK 타입에서만 의미
 */
export interface Thought {
  id: string
  type: ThoughtType
  level: number
  text: string
  done: boolean
}

/** 주제에 딸린 관련 자료 (선택) */
export interface Material {
  kind: MaterialKind
  title: string
  sub: string
  url: string
}

/** 핵심 단위. 하나의 카테고리에 속하며 제목 + 관련자료 + 여러 줄 생각으로 구성. */
export interface Topic {
  id: string
  category: string
  title: string
  materials: Material[]
  thoughts: Thought[]
}

/** 카테고리 = vault 안의 md 파일 1개 */
export interface Category {
  name: string
  order: number
}

export function newThought(overrides: Partial<Thought> = {}): Thought {
  return {
    id: crypto.randomUUID(),
    type: 'check',
    level: 0,
    text: '',
    done: false,
    ...overrides,
  }
}

export function newTopic(overrides: Partial<Topic> & { category: string }): Topic {
  return {
    id: crypto.randomUUID(),
    title: '',
    materials: [],
    thoughts: [],
    ...overrides,
  }
}
