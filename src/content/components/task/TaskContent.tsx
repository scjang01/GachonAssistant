import { formatDistanceToNowStrict } from 'date-fns'
import { ko } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, RefreshCw, ChevronDown, X } from 'lucide-react'
import { useRef, useState, useMemo } from 'react'

import { LoadingSkeleton } from './LoadingSkeleton'
import { TaskList } from './TaskList'
import { useContentsFetcher } from '@/hooks/useContentsFetcher'
import { useStorageStore } from '@/storage/useStorageStore'
import type { ActivityStatus, ActivityType } from '@/types'
import { cn, getTaskStatus } from '@/utils'

const statusMap: Record<string, string> = {
  ongoing: '진행 중',
  imminent: '마감 임박',
  expired: '마감 지남',
  submitted: '완료',
}

const categoryMap: Record<string, string> = {
  assignment: '과제',
  quiz: '퀴즈',
  mooc: 'MOOC',
}

export function TaskContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { progress, isLoading, refetch } = useContentsFetcher()
  const { meta, contents, filterOptions, manualOverrides, getFilteredActivities, updateData } = useStorageStore()

  const filteredTasks = getFilteredActivities(searchQuery)
  const formattedUpdateTime = formatDistanceToNowStrict(new Date(meta.updateAt), { addSuffix: true, locale: ko })
  const now = new Date()

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

  const toggleFilter = <T extends string>(key: keyof typeof filterOptions, value: T) => {
    updateData('filterOptions', prev => {
      const current = prev[key] as T[]
      let next: T[]
      if (current.includes(value)) {
        next = current.filter(v => v !== value)
      } else {
        next = [...current, value]
      }
      return { ...prev, [key]: next }
    })
  }

  const removeFilter = <T extends string>(key: keyof typeof filterOptions, value: T) => {
    updateData('filterOptions', prev => {
      const current = prev[key] as T[]
      const next = current.filter(v => v !== value)
      return { ...prev, [key]: next }
    })
  }

  // 키보드 입력이 배경 사이트로 전파되는 것을 방지합니다.
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
  }

  return (
    <>
      <div className="bg-white bg-opacity-50 px-16px py-12px">
        <div className="mb-12px flex items-center justify-between">
          <h2 className="text-16px font-bold">과제 목록</h2>
          <div className="group relative">
            <button className="d-btn d-btn-ghost d-btn-sm p-1" onClick={refetch} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <div className="absolute right-0 z-10 mt-4px whitespace-nowrap rounded-2px bg-gray-800 px-6px py-2px text-10px text-white opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100">
              {isLoading ? '갱신 중...' : `${formattedUpdateTime} 갱신됨`}
            </div>
          </div>
        </div>

        <div className="relative mb-8px">
          <input
            type="text"
            placeholder="과제 검색"
            className="d-input d-input-sm d-input-bordered w-full pl-36px"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onKeyUp={handleInputKeyDown}
          />
          <Search size={18} className="absolute left-12px top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="mb-12px flex gap-4px">
          <button
            className={cn(
              'flex flex-1 flex-col items-center justify-center rounded-lg py-8px transition-all duration-200 active:scale-95',
              filterOptions.statuses.includes('ongoing')
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
            )}
            onClick={() => toggleFilter('statuses', 'ongoing')}
          >
            <span className="text-16px font-bold">{summary.ongoing}</span>
            <span className="text-9px font-medium opacity-80">진행 중</span>
          </button>
          <button
            className={cn(
              'flex flex-1 flex-col items-center justify-center rounded-lg py-8px transition-all duration-200 active:scale-95',
              filterOptions.statuses.includes('imminent')
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
            )}
            onClick={() => toggleFilter('statuses', 'imminent')}
          >
            <span className="text-16px font-bold">{summary.imminent}</span>
            <span className="text-9px font-medium opacity-80">마감 임박</span>
          </button>
          <button
            className={cn(
              'flex flex-1 flex-col items-center justify-center rounded-lg py-8px transition-all duration-200 active:scale-95',
              filterOptions.statuses.includes('expired')
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-red-50 text-red-700 hover:bg-red-100',
            )}
            onClick={() => toggleFilter('statuses', 'expired')}
          >
            <span className="text-16px font-bold">{summary.expired}</span>
            <span className="text-9px font-medium opacity-80">마감 지남</span>
          </button>
          <button
            className={cn(
              'flex flex-1 flex-col items-center justify-center rounded-lg py-8px transition-all duration-200 active:scale-95',
              filterOptions.statuses.includes('submitted')
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
            )}
            onClick={() => toggleFilter('statuses', 'submitted')}
          >
            <span className="text-16px font-bold">{summary.submitted}</span>
            <span className="text-9px font-medium opacity-80">완료</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-12px text-gray-500">
          <div className="flex min-h-24px flex-wrap items-center gap-4px">
            {filterOptions.statuses.map(s => (
              <span
                key={s}
                className="flex items-center rounded-full bg-blue-100 px-8px py-2px text-11px text-blue-700"
              >
                {statusMap[s]}
                <button
                  className="ml-4px rounded-full p-1px hover:bg-blue-200"
                  onClick={() => removeFilter('statuses', s)}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {filterOptions.categories.map(c => (
              <span
                key={c}
                className="flex items-center rounded-full bg-blue-100 px-8px py-2px text-11px text-blue-700"
              >
                {categoryMap[c]}
                <button
                  className="ml-4px rounded-full p-1px hover:bg-blue-200"
                  onClick={() => removeFilter('categories', c)}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {filterOptions.courseIds.map(id => (
              <span
                key={id}
                className="flex items-center rounded-full bg-blue-100 px-8px py-2px text-11px text-blue-700"
              >
                {contents.courseList.find(course => course.id === id)?.title}
                <button
                  className="ml-4px rounded-full p-1px hover:bg-blue-200"
                  onClick={() => removeFilter('courseIds', id)}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>

          <button
            className="d-btn d-btn-ghost d-btn-sm flex items-center p-1"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            aria-label={isFilterOpen ? '필터 닫기' : '필터 열기'}
          >
            <Filter size={16} />
            <motion.div initial={false} animate={{ rotate: isFilterOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown size={16} />
            </motion.div>
          </button>
        </div>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-8px space-y-8px rounded-lg border border-gray-200 bg-white p-8px shadow-sm">
                <div>
                  <label className="mb-2px block text-11px font-medium text-gray-600">상태</label>
                  <div className="flex flex-wrap gap-4px">
                    {Object.entries(statusMap).map(([key, value]) => (
                      <button
                        key={key}
                        className={cn('rounded-full px-8px py-2px text-11px', {
                          'bg-blue-100 text-blue-700': filterOptions.statuses.includes(key as ActivityStatus),
                          'bg-gray-100 text-gray-700 hover:bg-gray-200': !filterOptions.statuses.includes(
                            key as ActivityStatus,
                          ),
                        })}
                        onClick={() => toggleFilter('statuses', key as ActivityStatus)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2px block text-11px font-medium text-gray-600">카테고리</label>
                  <div className="flex flex-wrap gap-4px">
                    {Object.entries(categoryMap).map(([key, value]) => (
                      <button
                        key={key}
                        className={cn('rounded-full px-8px py-2px text-11px', {
                          'bg-blue-100 text-blue-700': filterOptions.categories.includes(key as ActivityType),
                          'bg-gray-100 text-gray-700 hover:bg-gray-200': !filterOptions.categories.includes(
                            key as ActivityType,
                          ),
                        })}
                        onClick={() => toggleFilter('categories', key as ActivityType)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2px block text-11px font-medium text-gray-600">과목</label>
                  <div className="flex flex-wrap gap-4px">
                    {contents.courseList
                      .filter(course => course.id !== '-1')
                      .map(course => (
                        <button
                          key={course.id}
                          className={cn('rounded-full px-8px py-2px text-11px', {
                            'bg-blue-100 text-blue-700': filterOptions.courseIds.includes(course.id),
                            'bg-gray-100 text-gray-700 hover:bg-gray-300': !filterOptions.courseIds.includes(course.id),
                          })}
                          onClick={() => toggleFilter('courseIds', course.id)}
                        >
                          {course.title}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 실시간 로딩 바를 필터 영역 바로 아래, 리스트 영역 바로 위에 고정 */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            className="z-50 h-4px w-full origin-top bg-blue-100"
          >
            <motion.div
              className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]"
              initial={{ width: '5%' }}
              animate={{ width: `${Math.max(progress, 5)}%` }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-x-0 top-0 z-10 h-16px bg-gradient-to-b from-slate-100 to-transparent"></div>
        <div className="absolute inset-x-0 bottom-0 z-10 h-16px bg-gradient-to-t from-slate-100 to-transparent"></div>
        <div
          ref={scrollRef}
          className={cn('no-scrollbar h-full overscroll-contain px-16px py-20px', {
            'overflow-y-scroll': !isLoading,
            'overflow-hidden': isLoading,
          })}
        >
          {isLoading ? <LoadingSkeleton /> : <TaskList tasks={filteredTasks} />}
        </div>
      </div>
    </>
  )
}
