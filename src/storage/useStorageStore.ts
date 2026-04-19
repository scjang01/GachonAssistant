import { create } from 'zustand'

import { chromeStorageClient } from './chromeStorageClient'
import packageJson from '../../package.json'
import { filterActivities } from '@/content/components/task/filterActivities'
import type { Activity, StorageData } from '@/types'
import { isMac } from '@/utils'

interface StorageStore extends StorageData {
  isInitialized: boolean
  initialize: () => Promise<void>
  updateData: <K extends keyof StorageData>(key: K, updater: (prev: StorageData[K]) => StorageData[K]) => Promise<void>
  getFilteredActivities: (searchQuery: string) => Activity[]
  resetStore: () => Promise<void>
}

const initialStorageData: StorageData = {
  meta: { version: packageJson.version, updateAt: '2024-01-01T00:00:00.000Z' },
  contents: { courseList: [], activityList: [] },
  filterOptions: { statuses: [], courseIds: [], categories: [] },
  manualOverrides: {},
  settings: {
    refreshInterval: 1000 * 60 * 20,
    trigger: {
      type: 'color',
      color: '#3b82f6',
    },
    shortcut: isMac() ? 'meta+/' : 'Ctrl+/',
  },
}

const mergeData = (initial: StorageData, stored: Partial<StorageData>): StorageData => ({
  meta: { ...initial.meta, ...stored.meta, version: packageJson.version },
  contents: { ...initial.contents, ...stored.contents },
  filterOptions: { ...initial.filterOptions, ...stored.filterOptions },
  manualOverrides: { ...initial.manualOverrides, ...stored.manualOverrides },
  settings: { ...initial.settings, ...stored.settings },
})

export const useStorageStore = create<StorageStore>((set, get) => ({
  ...initialStorageData,
  isInitialized: false,

  initialize: async () => {
    const storedData = await chromeStorageClient.getData()
    const mergedData = mergeData(initialStorageData, storedData)

    await chromeStorageClient.setData(mergedData)
    set({ ...mergedData, isInitialized: true })
  },

  updateData: async <K extends keyof StorageData>(key: K, updater: (prev: StorageData[K]) => StorageData[K]) => {
    const updatedData = updater(get()[key])

    // activityList 업데이트 시 manualOverrides 정리
    if (key === 'contents') {
      const { activityList } = updatedData as StorageData['contents']
      const currentOverrides = { ...get().manualOverrides }
      let hasChanged = false

      activityList.forEach(activity => {
        if (currentOverrides[activity.id] !== undefined && currentOverrides[activity.id] === activity.hasSubmitted) {
          delete currentOverrides[activity.id]
          hasChanged = true
        }
      })

      if (hasChanged) {
        await chromeStorageClient.updateDataByKey('manualOverrides', () => currentOverrides)
        set(state => ({ ...state, manualOverrides: currentOverrides }))
      }
    }

    await chromeStorageClient.updateDataByKey(key, () => updatedData)
    set(state => ({ ...state, [key]: updatedData }))
  },

  getFilteredActivities: (searchQuery: string) => {
    const { activityList } = get().contents
    const { manualOverrides, filterOptions } = get()

    return activityList
      .map(activity => ({
        ...activity,
        hasSubmitted: manualOverrides[activity.id] !== undefined ? manualOverrides[activity.id] : activity.hasSubmitted,
      }))
      .filter(activity => filterActivities(activity, { ...filterOptions, searchQuery }))
      .sort((a, b) => {
        const timeA = a.endAt ? new Date(a.endAt).getTime() : Infinity
        const timeB = b.endAt ? new Date(b.endAt).getTime() : Infinity
        return timeA - timeB
      })
  },

  resetStore: async () => {
    await chromeStorageClient.setData(initialStorageData)
    set({ ...initialStorageData, isInitialized: true })
  },
}))

useStorageStore.getState().initialize()

chromeStorageClient.onStorageChanged(changes => {
  const newState = Object.entries(changes).reduce((acc, [key, { newValue }]) => {
    if (key in initialStorageData) {
      acc[key as keyof StorageData] = newValue
    }
    return acc
  }, {} as Partial<StorageData>)

  if (Object.keys(newState).length > 0) {
    useStorageStore.setState(state => ({ ...state, ...newState }))
  }
})
