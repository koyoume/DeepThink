import type LightningFS from '@isomorphic-git/lightning-fs'
import git, { Errors } from 'isomorphic-git'
import type { HttpClient } from 'isomorphic-git'
import { ensureDir } from '../domain/fsUtil.ts'

/**
 * 브라우저 클라이언트 사이드 git 동기화 (android-backup의 JGitClient.kt + GitSyncRepositoryImpl.kt 이식).
 * 카테고리별로 해당 md 파일 1개만 add → commit → push — repo의 다른 파일은 절대 건드리지 않는다.
 *
 * fs/http는 주입받는다: 브라우저에선 LightningFS + isomorphic-git/http/web(+corsProxy),
 * Node 검증 스크립트에선 os의 실제 fs + isomorphic-git/http/node(프록시 불필요, CORS는 브라우저 전용 문제).
 */
export interface GitConfig {
  remoteUrl: string
  username: string
  token: string
  authorName: string
  authorEmail: string
}

export function isGitConfigured(config: GitConfig): boolean {
  return config.remoteUrl.trim().length > 0 && config.token.trim().length > 0
}

export interface GitSyncDeps {
  fs: LightningFS
  http: HttpClient
  /** 브라우저에서 GitHub 등 CORS 미지원 호스트에 접근할 때 필요한 투명 프록시 URL */
  corsProxy?: string
}

export type SyncResult = { ok: true; message: string } | { ok: false; message: string }

const REMOTE = 'origin'
const BRANCH = 'main'

function creds(config: GitConfig) {
  return { username: config.username.trim() || 'x-access-token', password: config.token }
}

function author(config: GitConfig) {
  return { name: config.authorName, email: config.authorEmail }
}

function describeError(err: unknown): string {
  if (err instanceof Errors.FastForwardError) return '원격이 앞서 있습니다. 먼저 pull 하세요.'
  if (err instanceof Error) return err.message
  return String(err)
}

export async function isRepoInitialized(deps: GitSyncDeps, repoDir: string): Promise<boolean> {
  try {
    await deps.fs.promises.stat(`${repoDir}/.git`)
    return true
  } catch {
    return false
  }
}

async function ensureRepo(deps: GitSyncDeps, repoDir: string, config: GitConfig): Promise<void> {
  await ensureDir(deps.fs, repoDir)
  if (!(await isRepoInitialized(deps, repoDir))) {
    await git.init({ fs: deps.fs, dir: repoDir, defaultBranch: BRANCH })
  }
  // JGitClient.ensureRepo와 동일: repo가 이미 있어도 remote url은 매번 최신화
  await git.addRemote({ fs: deps.fs, dir: repoDir, remote: REMOTE, url: config.remoteUrl, force: true })
}

/** 원격에서 fetch 후 main으로 fast-forward. 로컬에 커밋이 아직 없으면(첫 동기화) origin/main을 그대로 채택. */
export async function pull(deps: GitSyncDeps, repoDir: string, config: GitConfig): Promise<SyncResult> {
  if (!isGitConfigured(config)) return { ok: false, message: '원격 URL과 토큰을 먼저 입력하세요.' }
  try {
    await ensureRepo(deps, repoDir, config)
    await git.fetch({
      fs: deps.fs,
      http: deps.http,
      dir: repoDir,
      remote: REMOTE,
      url: config.remoteUrl,
      corsProxy: deps.corsProxy,
      onAuth: () => creds(config),
    })

    let remoteOid: string
    try {
      remoteOid = await git.resolveRef({ fs: deps.fs, dir: repoDir, ref: `refs/remotes/${REMOTE}/${BRANCH}` })
    } catch (err) {
      if (err instanceof Errors.NotFoundError) {
        return { ok: true, message: `원격에 ${BRANCH} 브랜치가 아직 없습니다 (첫 push 필요)` }
      }
      throw err
    }

    let localOid: string | null
    try {
      localOid = await git.resolveRef({ fs: deps.fs, dir: repoDir, ref: `refs/heads/${BRANCH}` })
    } catch (err) {
      if (err instanceof Errors.NotFoundError) {
        localOid = null
      } else {
        throw err
      }
    }

    if (localOid === null) {
      // 로컬에 커밋이 없는 첫 동기화 — origin/main을 그대로 로컬 main으로 채택(클론과 동등한 효과)
      await git.branch({ fs: deps.fs, dir: repoDir, ref: BRANCH, object: remoteOid, force: true, checkout: true })
      return { ok: true, message: '초기 동기화 완료' }
    }
    if (localOid === remoteOid) {
      return { ok: true, message: '이미 최신' }
    }

    await git.merge({
      fs: deps.fs,
      dir: repoDir,
      ours: BRANCH,
      theirs: `refs/remotes/${REMOTE}/${BRANCH}`,
      fastForwardOnly: true,
      author: author(config),
    })
    return { ok: true, message: 'pull 완료' }
  } catch (err) {
    return { ok: false, message: describeError(err) }
  }
}

/** initOrClone: pull과 동일(ensureRepo는 pull 내부에서 항상 먼저 수행됨) */
export const initOrClone = pull

/** 지정한 카테고리 파일 1개만 add → commit → push. */
export async function syncCategory(
  deps: GitSyncDeps,
  repoDir: string,
  config: GitConfig,
  relativePath: string,
  message: string,
): Promise<SyncResult> {
  if (!isGitConfigured(config)) return { ok: false, message: '원격 URL과 토큰을 먼저 입력하세요.' }
  try {
    await ensureRepo(deps, repoDir, config)
    await git.add({ fs: deps.fs, dir: repoDir, filepath: relativePath })

    const fileStatus = await git.status({ fs: deps.fs, dir: repoDir, filepath: relativePath })
    const nothingStaged = fileStatus === 'unmodified'
    if (!nothingStaged) {
      await git.commit({ fs: deps.fs, dir: repoDir, message, author: author(config), committer: author(config) })
    }

    const pushResult = await git.push({
      fs: deps.fs,
      http: deps.http,
      dir: repoDir,
      remote: REMOTE,
      ref: BRANCH,
      remoteRef: BRANCH,
      url: config.remoteUrl,
      corsProxy: deps.corsProxy,
      onAuth: () => creds(config),
    })

    if (!pushResult.ok) {
      const refUpdate = pushResult.refs[`refs/heads/${BRANCH}`]
      const errMessage = refUpdate?.error ?? pushResult.error ?? '알 수 없는 오류'
      if (/fast.?forward|fetch first|non-fast-forward/i.test(errMessage)) {
        return { ok: false, message: '원격이 앞서 있습니다. 먼저 pull 하세요.' }
      }
      return { ok: false, message: `push 거부: ${errMessage}` }
    }

    return { ok: true, message: nothingStaged ? '변경 없음 (이미 최신)' : `push 완료: ${relativePath}` }
  } catch (err) {
    return { ok: false, message: describeError(err) }
  }
}
