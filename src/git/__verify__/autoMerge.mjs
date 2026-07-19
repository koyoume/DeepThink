// "웹앱이 아닌 다른 경로(예: GitHub 웹에서 직접 편집)로 repo가 바뀌어 있어도, 설정에서
// 동기화를 누르면 사용자에게 아무것도 묻지 않고 자동으로 병합되어야 한다"는 요구사항의 회귀 테스트.
//
// 시나리오:
//   1) 앱 세션 A가 카테고리 파일을 만들어 첫 push(base).
//   2) 다른 경로(순수 git CLI로 직접 clone/edit/push — "누군가 repo에 직접 접근해 수정"을 흉내)가
//      같은 생각(thought) 줄을 다른 문장으로 고쳐 push.
//   3) 세션 A는 이 사실을 모른 채(pull 안 하고) 같은 줄을 또 다른 문장으로 고치고 syncCategory 호출.
//      → push가 non-fast-forward로 거부되어야 하고, gitSync가 자동으로 fetch+병합 후 재push해야 함.
//   4) 결과: syncCategory가 ok:true를 반환하고, 원격 최종 파일에 두 문장이 전부(유실 없이) 남아 있고,
//      git 충돌 마커(<<<<<<<)는 전혀 없어야 한다(=사용자 개입 없는 완전 자동 병합).
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'isomorphic-git/http/node'
import { initOrClone, syncCategory } from '../gitSync.ts'
import { VaultFileStore } from '../../domain/vaultStore.ts'
import { startLocalGitServer } from './localGitServer.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deepthink-automerge-'))
const bareDir = path.join(root, 'repo.git')
execSync(`git init --bare -q --initial-branch=main "${bareDir}"`)
execSync(`git -C "${bareDir}" config http.receivepack true`)

const server = await startLocalGitServer(root)
const config = {
  remoteUrl: `${server.url}/repo.git`,
  username: '',
  token: 'unused-local-server-has-no-auth',
  authorName: 'DeepThink',
  authorEmail: 'deepthink@local',
}
const category = '충돌테스트'

try {
  // 1) 세션 A: 카테고리 생성 후 첫 push(base 커밋)
  const repoDirA = fs.mkdtempSync(path.join(os.tmpdir(), 'deepthink-automerge-a-'))
  const depsA = { fs, http }
  const initedA = await initOrClone(depsA, repoDirA, config)
  assert.equal(initedA.ok, true, `session A initOrClone failed: ${initedA.message}`)

  const storeA = new VaultFileStore(fs, repoDirA)
  await storeA.writeCategory(category, [
    {
      id: 't1',
      category,
      title: '충돌 테스트 주제',
      materials: [],
      thoughts: [{ id: 'c', type: 'comment', level: 0, text: '원본 문장', done: false }],
    },
  ])
  const relative = storeA.relativePath(storeA.categoryFile(category))
  const pushed1 = await syncCategory(depsA, repoDirA, config, relative, 'base')
  assert.equal(pushed1.ok, true, `session A base push failed: ${pushed1.message}`)

  // 2) "다른 경로"(순수 git CLI 직접 clone/edit/push) — 앱을 거치지 않고 repo를 직접 수정하는 상황을 흉내낸다.
  const directDir = path.join(root, 'direct-edit')
  execSync(`git clone -q "${bareDir}" "${directDir}"`)
  const filePath = path.join(directDir, 'DeepThink', `${category}.md`)
  const original = fs.readFileSync(filePath, 'utf8')
  assert.ok(original.includes('원본 문장'), 'base file should contain the original line')
  fs.writeFileSync(filePath, original.replace('원본 문장', '원격에서 직접 고친 문장'))
  execSync('git add -A', { cwd: directDir })
  execSync('git -c user.email=a@b.com -c user.name=direct-editor commit -q -m "직접 수정"', { cwd: directDir })
  execSync('git push -q origin main', { cwd: directDir })

  // 3) 세션 A는 이 사실을 모른 채(pull 없이) 같은 줄을 다른 문장으로 또 고치고 동기화(sync) 클릭을 흉내낸다.
  const staleRead = await storeA.readAll()
  const staleTopic = staleRead.find((c) => c.name === category).topics[0]
  staleTopic.thoughts[0].text = '로컬 세션에서 고친 문장'
  await storeA.writeCategory(category, [staleTopic])

  const synced = await syncCategory(depsA, repoDirA, config, relative, 'local edit')
  assert.equal(synced.ok, true, `자동 병합 후 push가 실패함: ${synced.message}`)

  // 4) 원격 최종 내용 확인 — 두 문장 다 남아 있어야 하고, 충돌 마커는 없어야 한다(완전 자동 병합).
  const verifyDir = path.join(root, 'verify-clone')
  execSync(`git clone -q "${bareDir}" "${verifyDir}"`)
  const finalContent = fs.readFileSync(path.join(verifyDir, 'DeepThink', `${category}.md`), 'utf8')

  assert.ok(finalContent.includes('원격에서 직접 고친 문장'), `원격에서 직접 고친 내용이 사라짐:\n${finalContent}`)
  assert.ok(finalContent.includes('로컬 세션에서 고친 문장'), `로컬 세션에서 고친 내용이 사라짐:\n${finalContent}`)
  assert.ok(!finalContent.includes('<<<<<<<'), `충돌 마커가 남아있음(자동 병합 실패):\n${finalContent}`)
  assert.ok(!original.includes('로컬 세션에서 고친 문장'), 'sanity: 원본에는 로컬 수정 문장이 없어야 함')

  fs.rmSync(repoDirA, { recursive: true, force: true })
  console.log('ok - 다른 경로에서 직접 수정된 repo도 sync 클릭 한 번으로 데이터 유실 없이 자동 병합됨')
} finally {
  await server.close()
  fs.rmSync(root, { recursive: true, force: true })
}
