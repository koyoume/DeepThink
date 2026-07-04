import { MAX_THOUGHT_LEVEL, type Material, type MaterialKind, type Thought, type ThoughtType, type Topic } from './models.ts'

/**
 * 카테고리 1개(= md 파일 1개) <-> Topic 목록 직렬화/파싱.
 *
 * 형식 (UI-DESIGN 데이터 모델 기반, round-trip 보장):
 *
 *   # <카테고리>
 *
 *   <!-- topic: <uuid> -->
 *   ## <제목>
 *
 *   ### 관련 자료
 *   - [link](url) "title" — sub
 *   - [doc] "title" — sub
 *
 *   ### 생각
 *   - [ ] 미완료 체크 (level0)
 *   - [x] 완료 체크
 *     - [ ] 하위 체크 (들여쓰기 2칸 = level+1)
 *   - 코멘트 한 줄
 */
export interface ParsedCategory {
  name: string
  topics: Topic[]
}

const INDENT = '  ' // 레벨당 2칸
const TOPIC_MARKER = '<!-- topic:'
const SEC_MATERIALS = '### 관련 자료'
const SEC_THOUGHTS = '### 생각'

function removePrefix(s: string, prefix: string): string {
  return s.startsWith(prefix) ? s.slice(prefix.length) : s
}

function removeSuffix(s: string, suffix: string): string {
  return s.endsWith(suffix) ? s.slice(0, s.length - suffix.length) : s
}

function trimStartOnly(s: string): string {
  return s.replace(/^\s+/, '')
}

function trimEndOnly(s: string): string {
  return s.replace(/\s+$/, '')
}

function isBlank(s: string): boolean {
  return s.trim().length === 0
}

function serializeMaterial(m: Material): string {
  const head = m.kind === 'link' ? `- [link](${m.url})` : '- [doc]'
  const titlePart = ` "${m.title}"`
  const subPart = m.sub.trim().length > 0 ? ` — ${m.sub}` : ''
  return head + titlePart + subPart
}

function serializeThought(t: Thought): string {
  const indent = INDENT.repeat(Math.max(t.level, 0))
  if (t.type === 'check') {
    const box = t.done ? '[x]' : '[ ]'
    return trimEndOnly(`${indent}- ${box} ${t.text}`)
  }
  return trimEndOnly(`${indent}- ${t.text}`)
}

export function serializeCategory(category: string, topics: Topic[]): string {
  let out = `# ${category}\n`
  for (const topic of topics) {
    out += '\n'
    out += `${TOPIC_MARKER} ${topic.id} -->\n`
    out += `## ${topic.title}\n`

    if (topic.materials.length > 0) {
      out += `\n${SEC_MATERIALS}\n`
      for (const m of topic.materials) {
        out += serializeMaterial(m) + '\n'
      }
    }

    if (topic.thoughts.length > 0) {
      out += `\n${SEC_THOUGHTS}\n`
      for (const t of topic.thoughts) {
        out += serializeThought(t) + '\n'
      }
    }
  }
  return out
}

type Section = 'none' | 'materials' | 'thoughts'

function parseMaterial(line: string): Material | null {
  // line starts with "- "
  const body = removePrefix(line, '- ').trim()

  let kind: MaterialKind
  let url = ''
  let afterKind: string
  if (body.startsWith('[link]')) {
    kind = 'link'
    let rest = removePrefix(body, '[link]')
    if (rest.startsWith('(')) {
      const end = rest.indexOf(')')
      if (end >= 0) {
        url = rest.substring(1, end)
        rest = rest.substring(end + 1)
      }
    }
    afterKind = rest.trim()
  } else if (body.startsWith('[doc]')) {
    kind = 'doc'
    afterKind = removePrefix(body, '[doc]').trim()
  } else {
    return null
  }

  // afterKind: "title" — sub   (title in quotes; sub optional)
  let title: string
  let sub = ''
  const q1 = afterKind.indexOf('"')
  const q2 = afterKind.lastIndexOf('"')
  if (q1 >= 0 && q2 > q1) {
    title = afterKind.substring(q1 + 1, q2)
    const tail = afterKind.substring(q2 + 1)
    const dash = tail.indexOf('—')
    if (dash >= 0) sub = tail.substring(dash + 1).trim()
  } else {
    title = afterKind.trim()
  }
  return { kind, title, sub, url }
}

function parseThought(rawLine: string): Thought {
  let leadingSpaces = 0
  while (leadingSpaces < rawLine.length && rawLine[leadingSpaces] === ' ') leadingSpaces++
  const level = Math.min(Math.max(Math.floor(leadingSpaces / 2), 0), MAX_THOUGHT_LEVEL)
  const content = removePrefix(trimStartOnly(rawLine), '- ')
  let type: ThoughtType
  let done = false
  let text: string
  if (content.startsWith('[ ]')) {
    type = 'check'
    done = false
    text = trimStartOnly(removePrefix(content, '[ ]'))
  } else if (content.startsWith('[x]') || content.startsWith('[X]')) {
    type = 'check'
    done = true
    text = trimStartOnly(removePrefix(removePrefix(content, '[x]'), '[X]'))
  } else {
    type = 'comment'
    text = content
  }
  return { id: crypto.randomUUID(), type, level, text, done }
}

export function parseCategory(markdown: string): ParsedCategory {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  let name = ''
  const topics: Topic[] = []

  let pendingId: string | null = null
  let curTitle: string | null = null
  let curMaterials: Material[] = []
  let curThoughts: Thought[] = []
  let section: Section = 'none'

  function flush() {
    if (curTitle !== null || pendingId !== null) {
      topics.push({
        id: pendingId ?? crypto.randomUUID(),
        category: name,
        title: curTitle ?? '',
        materials: [...curMaterials],
        thoughts: [...curThoughts],
      })
    }
    pendingId = null
    curTitle = null
    curMaterials = []
    curThoughts = []
    section = 'none'
  }

  for (const line of lines) {
    const trimmedStart = trimStartOnly(line)
    if (line.startsWith('# ') && name === '' && !line.startsWith('## ')) {
      name = removePrefix(line, '# ').trim()
    } else if (trimmedStart.startsWith(TOPIC_MARKER)) {
      flush()
      pendingId = removeSuffix(removePrefix(trimmedStart, TOPIC_MARKER), '-->').trim()
    } else if (line.startsWith('## ')) {
      curTitle = removePrefix(line, '## ')
      section = 'none'
    } else if (line.trim() === SEC_MATERIALS) {
      section = 'materials'
    } else if (line.trim() === SEC_THOUGHTS) {
      section = 'thoughts'
    } else if (isBlank(line)) {
      // skip blank separators
    } else if (section === 'materials' && trimmedStart.startsWith('- ')) {
      const m = parseMaterial(trimmedStart)
      if (m) curMaterials.push(m)
    } else if (section === 'thoughts' && trimmedStart.startsWith('- ')) {
      curThoughts.push(parseThought(line))
    }
    // else: ignore unknown lines
  }
  flush()
  return { name, topics }
}
