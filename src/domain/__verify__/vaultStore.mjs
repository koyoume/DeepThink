// vaultStore.ts sanity check against an in-memory IndexedDB polyfill (Node has no
// native IndexedDB; the real app runs this against the browser's IndexedDB).
//
// Run: node src/domain/__verify__/vaultStore.mjs
import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import LightningFS from '@isomorphic-git/lightning-fs'
import { VaultFileStore } from '../vaultStore.ts'

const fs = new LightningFS('verify-vault-' + Math.random().toString(36).slice(2))
const store = new VaultFileStore(fs, '/repo')

// starts empty
assert.equal(await store.isEmpty(), true, 'fresh vault should be empty')
assert.deepEqual(await store.readOrder(), [], 'fresh vault should have no order')

// write a category, read it back
const topics = [
  { id: 't1', category: '독서', title: '책 제목', materials: [], thoughts: [{ id: 'x', type: 'check', level: 0, text: '읽기', done: false }] },
]
await store.writeCategory('독서', topics)
assert.equal(await store.isEmpty(), false, 'vault should not be empty after write')

const all = await store.readAll()
assert.equal(all.length, 1)
assert.equal(all[0].name, '독서')
assert.equal(all[0].topics[0].title, '책 제목')

// category file path uses slug + lives under DeepThink/
assert.equal(store.categoryFile('독서'), '/repo/DeepThink/독서.md')
assert.equal(store.relativePath(store.categoryFile('독서')), 'DeepThink/독서.md')

// slug sanitizes unsafe characters
await store.writeCategory('a/b:c', [])
assert.equal(store.categoryFile('a/b:c'), '/repo/DeepThink/a_b_c.md')

// order persists and reorders readAll()
await store.writeOrder(['a/b:c', '독서'])
const ordered = await store.readAll()
assert.deepEqual(ordered.map((c) => c.name), ['a/b:c', '독서'])

// delete removes the file but not others
await store.deleteCategoryFile('a/b:c')
const afterDelete = await store.readAll()
assert.deepEqual(afterDelete.map((c) => c.name), ['독서'])

console.log('all vaultStore checks passed')
// fake-indexeddb/LightningFS leave a timer alive; force a clean exit.
process.exit(0)
