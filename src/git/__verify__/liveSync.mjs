// Live round-trip check for gitSync.ts against a REAL git remote (e.g. a throwaway GitHub repo).
// Uses Node's real fs + isomorphic-git/http/node, so no CORS proxy is needed here (CORS is a
// browser-only restriction) — this only exercises the git logic, not the browser proxy path.
//
// Skipped (exit 0) unless env vars are set, so it's safe to leave wired into CI/npm scripts:
//   GIT_VERIFY_REMOTE_URL   e.g. https://github.com/<you>/<throwaway-repo>.git
//   GIT_VERIFY_TOKEN        fine-grained PAT scoped to that repo only, short expiry
//   GIT_VERIFY_USERNAME     optional (defaults to 'x-access-token')
//
// Run: node src/git/__verify__/liveSync.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'isomorphic-git/http/node'
import { initOrClone, isRepoInitialized, pull, syncCategory } from '../gitSync.ts'
import { VaultFileStore } from '../../domain/vaultStore.ts'

const remoteUrl = process.env.GIT_VERIFY_REMOTE_URL
const token = process.env.GIT_VERIFY_TOKEN
const username = process.env.GIT_VERIFY_USERNAME ?? ''

if (!remoteUrl || !token) {
  console.log('skip - set GIT_VERIFY_REMOTE_URL and GIT_VERIFY_TOKEN to run this live check')
  process.exit(0)
}

const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deepthink-git-verify-'))
const deps = { fs, http }
const config = {
  remoteUrl,
  username,
  token,
  authorName: 'DeepThink Verify',
  authorEmail: 'deepthink-verify@local',
}

assert.equal(await isRepoInitialized(deps, repoDir), false, 'fresh temp dir should not look like a repo yet')

const first = await initOrClone(deps, repoDir, config)
console.log('initOrClone:', first)
assert.equal(first.ok, true, 'initial clone/pull should succeed')

const store = new VaultFileStore(fs, repoDir)
const category = `verify-${Date.now()}`
await store.writeCategory(category, [
  { id: 'v1', category, title: '검증 주제', materials: [], thoughts: [{ id: 't1', type: 'check', level: 0, text: '왕복 확인', done: true }] },
])

const relative = store.relativePath(store.categoryFile(category))
const pushed = await syncCategory(deps, repoDir, config, relative, `verify: add ${category}`)
console.log('syncCategory (push):', pushed)
assert.equal(pushed.ok, true, 'push should succeed')

// second sync with no changes should report "no changes" rather than erroring
const pushedAgain = await syncCategory(deps, repoDir, config, relative, `verify: add ${category} (again)`)
console.log('syncCategory (no-op push):', pushedAgain)
assert.equal(pushedAgain.ok, true)

// pull into a second fresh clone to confirm the remote actually has the commit
const repoDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'deepthink-git-verify-2-'))
const second = await pull(deps, repoDir2, config)
console.log('pull into second clone:', second)
assert.equal(second.ok, true)
const store2 = new VaultFileStore(fs, repoDir2)
const all = await store2.readAll()
assert.ok(all.some((c) => c.name === category), 'second clone should see the pushed category')

fs.rmSync(repoDir, { recursive: true, force: true })
fs.rmSync(repoDir2, { recursive: true, force: true })

console.log('all live gitSync checks passed — remember to delete the test category from the remote if it is not disposable')
