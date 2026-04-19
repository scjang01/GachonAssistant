import { useState, useMemo, lazy, Suspense } from 'react'

import { BottomNavigation } from '@/content/components/BottomNavigation'
import { TaskContent } from '@/content/components/task'
import { ToastContainer } from '@/content/components/ToastContainer'

// 지연 로딩: 설정 화면은 필요할 때만 불러옴
const SettingsContent = lazy(() => import('@/content/components/setting/SettingsContent').then(m => ({ default: m.SettingsContent })))

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'settings'>('tasks')

  const content = useMemo(() => {
    if (activeTab === 'tasks') return <TaskContent />
    return (
      <Suspense fallback={<div className="flex-1 bg-gray-50" />}>
        <SettingsContent />
      </Suspense>
    )
  }, [activeTab])

  return (
    <div className="flex h-full flex-col">
      {content}
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <ToastContainer />
    </div>
  )
}
