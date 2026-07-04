import type LightningFS from '@isomorphic-git/lightning-fs'

export function isNotFound(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'ENOENT'
}

export function isAlreadyExists(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'EEXIST'
}

/** mkdir -p (LightningFS's mkdir is single-level and errors if a parent segment is missing) */
export async function ensureDir(fs: LightningFS, dirPath: string): Promise<void> {
  const parts = dirPath.split('/').filter((p) => p.length > 0)
  let cur = ''
  for (const part of parts) {
    cur += `/${part}`
    try {
      await fs.promises.mkdir(cur)
    } catch (err) {
      if (!isAlreadyExists(err)) throw err
    }
  }
}
