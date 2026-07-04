// Golden-case round-trip verification, ported from
// android-backup/app/src/test/java/com/printk/deepthink/data/vault/MarkdownCodecTest.kt
//
// Run: node src/domain/__verify__/cases.mjs
// (requires the TS to be transpiled — see run-verify.mjs which uses esbuild-register style loading via tsx/ts-node,
//  or run through `npm run verify:domain` which handles the TS loader)

import assert from 'node:assert/strict'
import { serializeCategory, parseCategory } from '../markdownCodec.ts'

function normalize(topic) {
  return {
    ...topic,
    thoughts: topic.thoughts.map((t) => ({ ...t, id: 'x' })),
  }
}

function roundTrip(name, category, topics) {
  const md = serializeCategory(category, topics)
  const parsed = parseCategory(md)
  assert.equal(parsed.name, category, `[${name}] category name mismatch`)
  assert.deepEqual(
    parsed.topics.map(normalize),
    topics.map(normalize),
    `[${name}] topics mismatch`,
  )
  console.log(`ok - ${name}`)
}

function topic(overrides) {
  return { id: '', category: '', title: '', materials: [], thoughts: [], ...overrides }
}

function thought(overrides) {
  return { id: '', type: 'check', level: 0, text: '', done: false, ...overrides }
}

// basicTopicsRoundTrip
roundTrip('basicTopicsRoundTrip', '제품 기획', [
  topic({
    id: 'id-1',
    category: '제품 기획',
    title: '온보딩 흐름',
    thoughts: [
      thought({ type: 'check', level: 0, text: '카테고리 안내', done: true }),
      thought({ type: 'check', level: 0, text: 'git 설정 유도', done: false }),
      thought({ type: 'comment', level: 1, text: '토큰 마찰 줄이기' }),
    ],
  }),
  topic({ id: 'id-2', category: '제품 기획', title: '카드 밀도' }),
])

// materialsRoundTrip
roundTrip('materialsRoundTrip', '독서', [
  topic({
    id: 'id-3',
    category: '독서',
    title: '사색적 글쓰기',
    materials: [
      { kind: 'link', title: 'Paul Graham 에세이', sub: 'paulgraham.com', url: 'http://paulgraham.com/essay.html' },
      { kind: 'doc', title: '독서 노트', sub: '로컬', url: '' },
    ],
    thoughts: [thought({ type: 'comment', text: '한 줄 단위로 쌓기' })],
  }),
])

// deepIndentAndEmptySections
roundTrip('deepIndentAndEmptySections', '학습', [
  topic({
    id: 'id-4',
    category: '학습',
    title: '깊은 들여쓰기',
    thoughts: [
      thought({ level: 0, text: 'L0' }),
      thought({ level: 1, text: 'L1' }),
      thought({ level: 2, text: 'L2' }),
      thought({ level: 3, text: 'L3', done: true }),
    ],
  }),
  topic({ id: 'id-5', category: '학습', title: '빈 주제' }),
])

// specialCharsInTitle
roundTrip('specialCharsInTitle', '일상', [
  topic({ id: 'id-6', category: '일상', title: '제목에 — 대시와 "따옴표" 포함', thoughts: [] }),
])

console.log('all golden cases passed')
