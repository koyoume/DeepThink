import type { GitConfig } from '../git/gitSync.ts'

/**
 * android-backup의 SettingsRepositoryImpl.kt 이식.
 *
 * ⚠️ PAT 저장 트레이드오프 (REQUIREMENTS.md §4): Android는 EncryptedSharedPreferences를 썼지만
 * 브라우저엔 그에 준하는 안전한 저장소가 없다. 개인용 도구라는 전제로 localStorage에 평문 저장한다.
 */

const STORAGE_KEY = 'deepthink.gitConfig'
const PREVIEW_LINES_KEY = 'deepthink.previewLines'
const CORS_PROXY_KEY = 'deepthink.corsProxy'

const DEFAULT_GIT_CONFIG: GitConfig = {
  remoteUrl: '',
  username: '',
  token: '',
  authorName: 'DeepThink',
  authorEmail: 'deepthink@local',
}

const DEFAULT_PREVIEW_LINES = 2

export function getGitConfig(): GitConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_GIT_CONFIG
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_GIT_CONFIG, ...parsed }
  } catch {
    return DEFAULT_GIT_CONFIG
  }
}

export function setGitConfig(config: GitConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function getPreviewLines(): number {
  const raw = localStorage.getItem(PREVIEW_LINES_KEY)
  if (raw === null) return DEFAULT_PREVIEW_LINES
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 3) : DEFAULT_PREVIEW_LINES
}

export function setPreviewLines(value: number): void {
  localStorage.setItem(PREVIEW_LINES_KEY, String(Math.min(Math.max(value, 0), 3)))
}

/** 웹 전용 추가 설정 — GitHub 등은 브라우저 CORS를 지원하지 않아 프록시가 필요하다 (REQUIREMENTS.md §4) */
export function getCorsProxy(): string {
  return localStorage.getItem(CORS_PROXY_KEY) ?? ''
}

export function setCorsProxy(url: string): void {
  localStorage.setItem(CORS_PROXY_KEY, url.trim())
}
