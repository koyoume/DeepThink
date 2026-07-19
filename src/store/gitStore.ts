import { create } from 'zustand'
import type { GitConfig } from '../git/gitSync.ts'
import { initOrClone, pull, syncCategory, type SyncResult } from '../git/gitSync.ts'
import * as settingsStore from '../settings/settingsStore.ts'
import { gitDeps, REPO_DIR, vaultFileStore } from './fsInstance.ts'
import { useVaultStore } from './vaultStore.ts'

/** android-backup SettingsViewModel.kt 이식 (Zustand 버전) */

const DEFAULT_GIT_CONFIG: GitConfig = {
  remoteUrl: '',
  username: '',
  token: '',
  authorName: 'DeepThink',
  authorEmail: 'deepthink@local',
}

interface GitState {
  gitConfig: GitConfig
  corsProxy: string
  previewLines: number
  message: string | null
  busy: boolean
  syncingCategory: string | null

  loadSettings: () => void
  saveGitConfig: (partial: Partial<GitConfig>) => void
  saveCorsProxy: (url: string) => void
  setPreviewLinesSetting: (value: number) => void
  consumeMessage: () => void

  initOrCloneGit: () => Promise<void>
  pullGit: () => Promise<void>
  syncCategoryGit: (name: string) => Promise<void>
}

function describe(label: string, result: SyncResult): string {
  return result.ok ? `${label}: ${result.message}` : `${label} 오류: ${result.message}`
}

export const useGitStore = create<GitState>((set, get) => ({
  gitConfig: DEFAULT_GIT_CONFIG,
  corsProxy: '',
  previewLines: 2,
  message: null,
  busy: false,
  syncingCategory: null,

  loadSettings: () => {
    set({
      gitConfig: settingsStore.getGitConfig(),
      corsProxy: settingsStore.getCorsProxy(),
      previewLines: settingsStore.getPreviewLines(),
    })
  },

  saveGitConfig: (partial) => {
    const next = { ...get().gitConfig, ...partial }
    settingsStore.setGitConfig(next)
    set({ gitConfig: next, message: 'Git 설정을 저장했습니다.' })
  },

  saveCorsProxy: (url) => {
    settingsStore.setCorsProxy(url)
    set({ corsProxy: url.trim() })
  },

  setPreviewLinesSetting: (value) => {
    settingsStore.setPreviewLines(value)
    set({ previewLines: Math.min(Math.max(value, 0), 3) })
  },

  consumeMessage: () => set({ message: null }),

  initOrCloneGit: async () => {
    set({ busy: true })
    const result = await initOrClone(gitDeps(get().corsProxy), REPO_DIR, get().gitConfig)
    if (result.ok) await useVaultStore.getState().reload()
    set({ busy: false, message: describe('저장소 초기화', result) })
  },

  pullGit: async () => {
    set({ busy: true })
    const result = await pull(gitDeps(get().corsProxy), REPO_DIR, get().gitConfig)
    if (result.ok) await useVaultStore.getState().reload()
    set({ busy: false, message: describe('Pull', result) })
  },

  syncCategoryGit: async (name) => {
    set({ busy: true, syncingCategory: name })
    const relative = vaultFileStore.relativePath(vaultFileStore.categoryFile(name))
    const result = await syncCategory(gitDeps(get().corsProxy), REPO_DIR, get().gitConfig, relative, `update ${name}`)
    // 자동 병합으로 다른 곳의 변경 사항(같은 카테고리 또는 무관한 카테고리 파일)이 로컬에 반영됐을 수 있어
    // 항상 vault를 다시 읽어 화면 상태를 최신화한다.
    if (result.ok) await useVaultStore.getState().reload()
    const message = result.ok ? `[${name}] ${result.message}` : `[${name}] 오류: ${result.message}`
    set({ busy: false, syncingCategory: null, message })
  },
}))
