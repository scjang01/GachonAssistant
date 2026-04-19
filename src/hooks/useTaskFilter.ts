import { useMemo } from 'react'

import { useStorageStore } from '@/storage/useStorageStore'
import { getTaskStatus } from '@/utils'

export const useTaskFilter = (searchQuery: string) => {
  const contents = useStorageStore(state => state.contents)
  const filterOptions = useStorageStore(state => state.filterOptions)
  const manualOverrides = useStorageStore(state => state.manualOverrides)
  const getFilteredActivities = useStorageStore(state => state.getFilteredActivities)
  const updateData = useStorageStore(state => state.updateData)

  // BUG FIX: contents와 filterOptions가 바뀔 때도 필터링이 다시 수행되어야 합니다.
  const filteredTasks = useMemo(
    () => getFilteredActivities(searchQuery),
    [getFilteredActivities, searchQuery, contents, filterOptions, manualOverrides],
  )

  const now = useMemo(() => new Date(), [])

  const summary = useMemo(() => {
    return contents.activityList.reduce(
      (acc, task) => {
        const hasSubmitted = manualOverrides[task.id] !== undefined ? manualOverrides[task.id] : task.hasSubmitted
        const taskWithOverride = { ...task, hasSubmitted }

        if (filterOptions.courseIds.length > 0 && !filterOptions.courseIds.includes(task.courseId)) return acc
        
        if (filterOptions.categories.length > 0) {
          const isVideo = task.type === 'video' || task.type === 'mooc'
          const categoryMatch = filterOptions.categories.some(
            c => c === task.type || (isVideo && (c === 'video' || c === 'mooc')),
          )
          if (!categoryMatch) return acc
        }

        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          if (!task.title.toLowerCase().includes(query) && !task.courseTitle.toLowerCase().includes(query)) return acc
        }

        const status = getTaskStatus(taskWithOverride, now)
        if (status === 'submitted') acc.submitted++
        else if (status === 'ongoing' || status === 'no-deadline') acc.ongoing++
        else if (status === 'imminent') acc.imminent++
        else if (status === 'expired') acc.expired++
        return acc
      },
      { ongoing: 0, imminent: 0, expired: 0, submitted: 0 },
    )
  }, [contents.activityList, filterOptions.courseIds, filterOptions.categories, searchQuery, now, manualOverrides])

  const toggleFilter = <T extends string>(key: 'statuses' | 'categories' | 'courseIds', value: T) => {
    updateData('filterOptions', prev => {
      const current = prev[key] as T[]
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  const removeFilter = <T extends string>(key: 'statuses' | 'categories' | 'courseIds', value: T) => {
    updateData('filterOptions', prev => {
      const current = prev[key] as T[]
      return { ...prev, [key]: current.filter(v => v !== value) }
    })
  }

  return {
    filteredTasks,
    summary,
    toggleFilter,
    removeFilter,
    filterOptions,
    courseList: contents.courseList,
  }
}
