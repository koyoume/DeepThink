import LightningFS from '@isomorphic-git/lightning-fs'
import http from 'isomorphic-git/http/web'
import { VaultFileStore } from '../domain/vaultStore.ts'
import type { GitSyncDeps } from '../git/gitSync.ts'

/** 브라우저 전역 vault 파일시스템 — 앱 생애주기 동안 하나만 존재 */
export const fs = new LightningFS('deepthink')
export const REPO_DIR = '/repo'

export const vaultFileStore = new VaultFileStore(fs, REPO_DIR)

export function gitDeps(corsProxy: string | undefined): GitSyncDeps {
  return { fs, http, corsProxy: corsProxy && corsProxy.trim().length > 0 ? corsProxy.trim() : undefined }
}
