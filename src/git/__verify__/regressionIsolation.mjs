// Regression test for a real data-loss incident: syncing ONE category through
// the deployed app deleted 5 other categories plus two unrelated root files
// from a real GitHub repo that already had content before DeepThink touched it.
// Root cause: pull()'s git.branch({checkout:true}) (and merge(), separately)
// don't actually sync the local git INDEX to match the checked-out tree, so a
// later `git.add(oneFile) + git.commit()` builds its tree from an
// under-populated index and silently drops every file it doesn't know about.
// Fixed by following branch()/merge() with an explicit git.checkout(). This
// test exercises the real exported pull()/syncCategory() against a real local
// git smart-HTTP server (no GitHub/network needed) and fails loudly if the
// isolation guarantee — "touch only the one category file" — is ever broken
// again.
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'isomorphic-git/http/node'
import { initOrClone, syncCategory } from '../gitSync.ts'
import { VaultFileStore } from '../../domain/vaultStore.ts'
import { startLocalGitServer } from './localGitServer.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deepthink-regression-'))
const bareDir = path.join(root, 'repo.git')
execSync(`git init --bare -q --initial-branch=main "${bareDir}"`)
execSync(`git -C "${bareDir}" config http.receivepack true`)

// Seed the remote with content DeepThink never wrote: an unrelated root file
// (like the real "WORKFLOW.md" work document) plus category files for
// categories the browser session syncing later has never heard of (like
// syncing from a second device, or a category created elsewhere).
const seedDir = path.join(root, 'seed')
execSync(`git clone -q "${bareDir}" "${seedDir}"`)
fs.mkdirSync(path.join(seedDir, 'DeepThink'), { recursive: true })
fs.writeFileSync(path.join(seedDir, 'WORKFLOW.md'), '# unrelated work doc\n')
fs.writeFileSync(path.join(seedDir, 'DeepThink', 'Assets.md'), '# Assets\n\n- [ ] existing thought\n')
fs.writeFileSync(path.join(seedDir, 'DeepThink', 'Books.md'), '# Books\n\n- [ ] existing thought\n')
execSync('git add -A', { cwd: seedDir })
execSync('git -c user.email=a@b.com -c user.name=seed commit -q -m "pre-existing content"', { cwd: seedDir })
execSync('git push -q origin main', { cwd: seedDir })

const server = await startLocalGitServer(root)
const config = {
  remoteUrl: `${server.url}/repo.git`,
  username: '',
  token: 'unused-local-server-has-no-auth',
  authorName: 'DeepThink',
  authorEmail: 'deepthink@local',
}

try {
  // Simulate a fresh browser session: pull adopts the existing remote state.
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deepthink-regression-browser-'))
  const deps = { fs, http }
  const pulled = await initOrClone(deps, repoDir, config)
  assert.equal(pulled.ok, true, `initOrClone failed: ${pulled.message}`)

  const store = new VaultFileStore(fs, repoDir)
  const before = await store.readAll()
  assert.deepEqual(
    before.map((c) => c.name).sort(),
    ['Assets', 'Books'],
    'pull should see the pre-existing categories',
  )

  // Now sync ONE new category the user just created in this session.
  await store.writeCategory('제품 기획', [
    { id: 't1', category: '제품 기획', title: '새 주제', materials: [], thoughts: [{ id: 'x', type: 'check', level: 0, text: '새 생각', done: false }] },
  ])
  const relative = store.relativePath(store.categoryFile('제품 기획'))
  const synced = await syncCategory(deps, repoDir, config, relative, 'update 제품 기획')
  assert.equal(synced.ok, true, `syncCategory failed: ${synced.message}`)

  // THE REGRESSION CHECK: fetch the actual pushed tree straight from the bare
  // repo and confirm nothing else got deleted.
  const tree = execSync(`git -c core.quotepath=false --git-dir="${bareDir}" ls-tree -r HEAD --name-only`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .sort()
  assert.deepEqual(
    tree,
    ['DeepThink/Assets.md', 'DeepThink/Books.md', 'DeepThink/제품 기획.md', 'WORKFLOW.md'].sort(),
    `syncCategory must only ADD its own file, never touch others. Actual remote tree: ${tree.join(', ')}`,
  )

  fs.rmSync(repoDir, { recursive: true, force: true })
  console.log('ok - syncing one category preserves unrelated pre-existing files (regression for the DataHub incident)')
} finally {
  await server.close()
  fs.rmSync(root, { recursive: true, force: true })
}
