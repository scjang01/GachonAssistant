import { useEffect, useState } from 'react'

import { useStorageStore } from '@/storage/useStorageStore'

export const useRefreshCheck = () => {
  const { meta, settings, isInitialized } = useStorageStore()
  const [shouldRefresh, setShouldRefresh] = useState(false)

  useEffect(() => {
    if (!isInitialized) return

    const check = () => {
      const updateAt = meta.updateAt || '2024-01-01T00:00:00.000Z'
      const lastUpdateTime = new Date(updateAt).getTime()
      const currentTime = new Date().getTime()

      if (isNaN(lastUpdateTime)) {
        setShouldRefresh(true)
        return
      }

      setShouldRefresh(currentTime - lastUpdateTime > settings.refreshInterval)
    }

    check()
    // Check every minute to see if we should refresh
    const intervalId = setInterval(check, 1000 * 60)

    return () => clearInterval(intervalId)
  }, [isInitialized, meta.updateAt, settings.refreshInterval])

  return { shouldRefresh }
}
