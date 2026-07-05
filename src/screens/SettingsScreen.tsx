import { useState } from 'react'
import type { ReactNode } from 'react'
import { useGitStore } from '../store/gitStore.ts'
import { useVaultStore } from '../store/vaultStore.ts'

interface Props {
  onBack: () => void
}

const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-brand'

/** 설정 섹션 카드 — 소제목 + 카드 컨테이너(대시보드 카드와 같은 시각 언어). */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-faint">{title}</h2>
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">{children}</div>
    </section>
  )
}

/** android-backup SettingsScreen.kt 이식 — git 설정/동기화 + 카테고리 관리 + 미리보기 기본값 */
export function SettingsScreen({ onBack }: Props) {
  const categories = useVaultStore((s) => s.categories)
  const addCategory = useVaultStore((s) => s.addCategory)
  const renameCategory = useVaultStore((s) => s.renameCategory)
  const deleteCategory = useVaultStore((s) => s.deleteCategory)

  const gitConfig = useGitStore((s) => s.gitConfig)
  const corsProxy = useGitStore((s) => s.corsProxy)
  const previewLines = useGitStore((s) => s.previewLines)
  const message = useGitStore((s) => s.message)
  const busy = useGitStore((s) => s.busy)
  const syncingCategory = useGitStore((s) => s.syncingCategory)
  const saveGitConfig = useGitStore((s) => s.saveGitConfig)
  const saveCorsProxy = useGitStore((s) => s.saveCorsProxy)
  const setPreviewLinesSetting = useGitStore((s) => s.setPreviewLinesSetting)
  const initOrCloneGit = useGitStore((s) => s.initOrCloneGit)
  const pullGit = useGitStore((s) => s.pullGit)
  const syncCategoryGit = useGitStore((s) => s.syncCategoryGit)

  const [form, setForm] = useState(gitConfig)
  const [proxyForm, setProxyForm] = useState(corsProxy)
  const [newCategoryName, setNewCategoryName] = useState('')

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-paper px-4 pb-16 pt-4">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="뒤로가기" className="text-xl text-muted">
          ‹
        </button>
        <h1 className="font-serif text-2xl font-semibold text-ink">설정</h1>
      </header>

      {message && (
        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">{message}</div>
      )}

      <Section title="Git 저장소">
        <input
          value={form.remoteUrl}
          onChange={(e) => setForm({ ...form, remoteUrl: e.target.value })}
          placeholder="https://github.com/you/vault.git"
          className={inputCls}
        />
        <input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="username (비우면 x-access-token)"
          className={inputCls}
        />
        <input
          value={form.token}
          onChange={(e) => setForm({ ...form, token: e.target.value })}
          type="password"
          placeholder="Personal Access Token"
          className={inputCls}
        />
        <div className="flex gap-2">
          <input
            value={form.authorName}
            onChange={(e) => setForm({ ...form, authorName: e.target.value })}
            placeholder="커밋 작성자 이름"
            className={inputCls}
          />
          <input
            value={form.authorEmail}
            onChange={(e) => setForm({ ...form, authorEmail: e.target.value })}
            placeholder="커밋 작성자 이메일"
            className={inputCls}
          />
        </div>
        <button
          type="button"
          onClick={() => saveGitConfig(form)}
          className="self-start rounded-lg bg-brand px-4 py-1.5 text-sm text-white transition-opacity hover:opacity-90"
        >
          Git 설정 저장
        </button>
      </Section>

      <Section title="CORS 프록시 (브라우저 전용)">
        <input
          value={proxyForm}
          onChange={(e) => setProxyForm(e.target.value)}
          placeholder="https://<worker>.workers.dev"
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => saveCorsProxy(proxyForm)}
          className="self-start rounded-lg border border-line px-4 py-1.5 text-sm text-muted transition-colors hover:bg-brand-soft"
        >
          프록시 저장
        </button>
      </Section>

      <Section title="동기화">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={initOrCloneGit}
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm text-muted transition-colors hover:bg-brand-soft disabled:opacity-50"
          >
            저장소 초기화 / 첫 동기화
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={pullGit}
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm text-muted transition-colors hover:bg-brand-soft disabled:opacity-50"
          >
            Pull
          </button>
        </div>
      </Section>

      <Section title="미리보기 기본 줄 수">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPreviewLinesSetting(n)}
              className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                previewLines === n ? 'bg-brand text-white' : 'border border-line text-muted hover:bg-brand-soft'
              }`}
            >
              {n === 0 ? '끔' : `${n}줄`}
            </button>
          ))}
        </div>
      </Section>

      <Section title="카테고리 관리">
        <ul className="flex flex-col gap-1">
          {categories.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            >
              <span className="text-ink">{c.name}</span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => syncCategoryGit(c.name)}
                  className="rounded-lg border border-line px-2 py-1 text-muted transition-colors hover:bg-brand-soft disabled:opacity-50"
                >
                  {syncingCategory === c.name ? '동기화 중…' : '동기화'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = window.prompt('새 이름', c.name)
                    if (next && next.trim()) renameCategory(c.name, next.trim())
                  }}
                  className="text-muted transition-colors hover:text-ink"
                >
                  이름변경
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`"${c.name}" 카테고리를 삭제할까요? 안의 주제도 함께 삭제됩니다.`)) {
                      deleteCategory(c.name)
                    }
                  }}
                  className="text-danger transition-opacity hover:opacity-80"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="새 카테고리 이름"
            className={`flex-1 ${inputCls}`}
          />
          <button
            type="button"
            onClick={() => {
              const name = newCategoryName.trim()
              if (!name) return
              setNewCategoryName('')
              void addCategory(name)
            }}
            className="shrink-0 rounded-lg bg-brand px-4 py-1.5 text-sm text-white transition-opacity hover:opacity-90"
          >
            추가
          </button>
        </div>
      </Section>
    </div>
  )
}
