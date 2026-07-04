import { useEffect, useState } from 'react'
import { DashboardScreen } from './screens/DashboardScreen.tsx'
import { SettingsScreen } from './screens/SettingsScreen.tsx'
import { TopicDetailScreen } from './screens/TopicDetailScreen.tsx'
import { useGitStore } from './store/gitStore.ts'
import { useVaultStore } from './store/vaultStore.ts'

type Screen = { name: 'dashboard' } | { name: 'detail'; topicId: string } | { name: 'settings' }

function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'dashboard' })
  const init = useVaultStore((s) => s.init)
  const loaded = useVaultStore((s) => s.loaded)
  const loadSettings = useGitStore((s) => s.loadSettings)

  useEffect(() => {
    void init()
    loadSettings()
  }, [init, loadSettings])

  // 브라우저 뒤로가기 버튼 지원: 상세/설정에서는 항상 대시보드로
  useEffect(() => {
    function onPopState() {
      setScreen({ name: 'dashboard' })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function openTopic(id: string) {
    window.history.pushState({}, '')
    setScreen({ name: 'detail', topicId: id })
  }

  function openSettings() {
    window.history.pushState({}, '')
    setScreen({ name: 'settings' })
  }

  function goBack() {
    window.history.back()
  }

  if (!loaded) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">불러오는 중…</div>
  }

  if (screen.name === 'detail') {
    return <TopicDetailScreen topicId={screen.topicId} onBack={goBack} />
  }
  if (screen.name === 'settings') {
    return <SettingsScreen onBack={goBack} />
  }
  return <DashboardScreen onOpenTopic={openTopic} onOpenSettings={openSettings} />
}

export default App
