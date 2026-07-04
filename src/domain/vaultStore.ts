import type LightningFS from '@isomorphic-git/lightning-fs'
import { ensureDir, isNotFound } from './fsUtil.ts'
import { parseCategory, serializeCategory, type ParsedCategory } from './markdownCodec.ts'
import type { Topic } from './models.ts'

/**
 * 저장소 레이아웃 (android-backup VaultFileStore.kt 1:1 이식, 요구: repo의 다른 폴더/파일에 영향 주지 않기)
 *
 *   <repoDir>/                 ← git working tree (= .git 위치, 원격이 clone 되는 곳)
 *     DeepThink/               ← DeepThink 데이터는 이 하위 폴더에만 격리 저장
 *       <카테고리>.md          ← 카테고리 1개 = md 1개
 *       .deepthink/
 *         categories.json      ← 카테고리 순서(로컬)
 *
 * git add/commit/push 는 항상 `DeepThink/<카테고리>.md` 경로 하나만 대상으로 하므로
 * repo 루트나 다른 폴더의 파일은 절대 건드리지 않는다.
 *
 * (Android의 migrateLegacyRootFiles()는 신규 웹 클라이언트엔 불필요해 이식하지 않음 — REQUIREMENTS.md §7)
 */

const DATA_SUBDIR = 'DeepThink'
const META_DIR = '.deepthink'

function slug(name: string): string {
  const cleaned = name.trim().replace(/[/\\:*?"<>|]/g, '_')
  return cleaned.length > 0 ? cleaned : 'untitled'
}

export class VaultFileStore {
  private readonly fs: LightningFS
  readonly repoDir: string

  constructor(fs: LightningFS, repoDir: string) {
    this.fs = fs
    this.repoDir = repoDir
  }

  /** DeepThink 데이터 전용 하위 폴더 */
  get dataDir(): string {
    return `${this.repoDir}/${DATA_SUBDIR}`
  }

  private get metaDir(): string {
    return `${this.dataDir}/${META_DIR}`
  }

  private get orderFile(): string {
    return `${this.metaDir}/categories.json`
  }

  async ensureDirs(): Promise<void> {
    await ensureDir(this.fs, this.repoDir)
    await ensureDir(this.fs, this.dataDir)
    await ensureDir(this.fs, this.metaDir)
  }

  async isEmpty(): Promise<boolean> {
    return (await this.listMarkdownFiles()).length === 0
  }

  /** DeepThink/ 안의 .md 파일 경로 목록 (이름순 정렬) */
  async listMarkdownFiles(): Promise<string[]> {
    let names: string[]
    try {
      names = await this.fs.promises.readdir(this.dataDir)
    } catch (err) {
      if (isNotFound(err)) return []
      throw err
    }
    return names
      .filter((n) => n.endsWith('.md'))
      .sort()
      .map((n) => `${this.dataDir}/${n}`)
  }

  /** 모든 카테고리 파일을 파싱해 순서대로 반환 */
  async readAll(): Promise<ParsedCategory[]> {
    const files = await this.listMarkdownFiles()
    const parsed: ParsedCategory[] = []
    for (const file of files) {
      const text = await this.fs.promises.readFile(file, 'utf8')
      const category = parseCategory(text)
      if (category.name.trim().length > 0) parsed.push(category)
    }
    const order = await this.readOrder()
    return [...parsed].sort((a, b) => {
      const ia = order.indexOf(a.name)
      const ib = order.indexOf(b.name)
      const ra = ia >= 0 ? ia : Number.MAX_SAFE_INTEGER
      const rb = ib >= 0 ? ib : Number.MAX_SAFE_INTEGER
      return ra - rb
    })
  }

  async writeCategory(name: string, topics: Topic[]): Promise<void> {
    await this.ensureDirs()
    await this.fs.promises.writeFile(this.categoryFile(name), serializeCategory(name, topics), 'utf8')
  }

  async deleteCategoryFile(name: string): Promise<void> {
    try {
      await this.fs.promises.unlink(this.categoryFile(name))
    } catch (err) {
      if (!isNotFound(err)) throw err
    }
  }

  /** 카테고리 파일 경로 (DeepThink/ 하위) */
  categoryFile(name: string): string {
    return `${this.dataDir}/${slug(name)}.md`
  }

  /** git add/commit 용 상대 경로 (repo 루트 기준) → 예: "DeepThink/제품 기획.md" */
  relativePath(absPath: string): string {
    const prefix = `${this.repoDir}/`
    return absPath.startsWith(prefix) ? absPath.slice(prefix.length) : absPath
  }

  // ---- order meta ----

  async readOrder(): Promise<string[]> {
    try {
      const text = await this.fs.promises.readFile(this.orderFile, 'utf8')
      const parsed = JSON.parse(text)
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  }

  async writeOrder(names: string[]): Promise<void> {
    await this.ensureDirs()
    await this.fs.promises.writeFile(this.orderFile, JSON.stringify(names, null, 2), 'utf8')
  }
}
