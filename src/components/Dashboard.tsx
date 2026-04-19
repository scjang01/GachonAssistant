import { useState, useMemo } from 'react'

import { BottomNavigation } from '@/content/components/BottomNavigation'
import { SettingsContent } from '@/content/components/setting'
import { TaskContent } from '@/content/components/task'
import { ToastContainer } from '@/content/components/ToastContainer'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'settings'>('tasks')

  const Content = useMemo(() => {
    return activeTab === 'tasks' ? <TaskContent /> : <SettingsContent />
  }, [activeTab])

  return (
    <div className="flex h-full flex-col">
      {Content}
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <ToastContainer />
    </div>
  )
}
