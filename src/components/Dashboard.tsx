import { useState, useMemo } from 'react'

import { BottomNavigation } from '@/content/components/BottomNavigation'
import { SettingsContent } from '@/content/components/setting/SettingsContent'
import { TaskContent } from '@/content/components/task/TaskContent'
import { ToastContainer } from '@/content/components/ToastContainer'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'settings'>('tasks')

  const content = useMemo(() => {
    if (activeTab === 'tasks') return <TaskContent />
    return <SettingsContent />
  }, [activeTab])

  return (
    <div className="flex h-full flex-col">
      {content}
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <ToastContainer />
    </div>
  )
}
