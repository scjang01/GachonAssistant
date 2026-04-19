import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import { useRefreshCheck } from './useRefreshCheck'
import {
  getActivities,
  getActivitiesPage,
  getAssignmentSubmitted,
  getCourses,
  getQuizSubmitted,
  getVideoSubmitted,
} from '@/services/parser'
import { fetchAndParse } from '@/services/parser/utils/dom'
import { URL_PATTERNS } from '@/services/parser/constants'
import { useStorageStore } from '@/storage/useStorageStore'
import type { Activity } from '@/types'

export const useContentsFetcher = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { updateData, isInitialized } = useStorageStore()
  const { shouldRefresh } = useRefreshCheck()

  const fetchContents = async () => {
    if (isLoading || !isInitialized) {
      return
    }

    setIsLoading(true)
    setProgress(5)

    try {
      // 1. 과목 리스트를 한국어로 가져옴
      const courseList = await getCourses()

      if (courseList.length === 0) {
        await updateData('meta', prev => ({ ...prev, updateAt: new Date().toISOString() }))
        toast.error('수강 중인 과목을 찾을 수 없습니다.')
        return
      }

      // 2. 모든 과목의 활동 내용을 병렬로 가져옴 (성능 최적화)
      const maxCourses = courseList.length
      const results = await Promise.all(
        courseList.map(async course => {
          try {
            const [assignmentSubmittedArray, videoSubmittedArray, quizSubmittedArray, activitiesPage$] =
              await Promise.all([
                getAssignmentSubmitted(course.id),
                getVideoSubmitted(course.id),
                getQuizSubmitted(course.id),
                getActivitiesPage(course.id),
              ])

            const activities = await getActivities(
              course.title,
              course.id,
              assignmentSubmittedArray,
              videoSubmittedArray,
              quizSubmittedArray,
            )

            return activities
          } catch (courseError) {
            console.error(`Failed to fetch course ${course.title}:`, courseError)
            if (courseError instanceof Error && courseError.message === 'LOGIN_REQUIRED') {
              throw courseError
            }
            return []
          } finally {
            // 진행률 업데이트 (5%에서 시작하여 95%까지)
            setProgress(prev => Math.min(prev + 90 / maxCourses, 95))
          }
        }),
      )

      const activityList = results.flat()

      // 3. 모든 데이터를 완벽히 성공적으로 가져온 경우에만 저장소 업데이트
      await updateData('contents', () => ({
        courseList: [{ id: '-1', title: '전체 과목' }, ...courseList],
        activityList,
      }))
      await updateData('meta', prev => ({ ...prev, updateAt: new Date().toISOString() }))

      // 언어 설정 복구 (세션 유지용)
      await fetchAndParse(URL_PATTERNS.courses, 'ko')

      toast.success('데이터가 성공적으로 업데이트되었습니다.')
    } catch (error) {
      if (error instanceof Error && error.message === 'LOGIN_REQUIRED') {
        toast.error('사이버캠퍼스 세션이 만료되었습니다. 로그인이 필요합니다.', {
          icon: '🔒',
          duration: 4000,
        })
      } else {
        toast.error('동기화 중 오류가 발생했습니다. 기존 데이터를 표시합니다.')
      }
      console.error('Sync failed:', error)
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }

  useEffect(() => {
    if (isInitialized && shouldRefresh) {
      fetchContents()
    }
  }, [isInitialized, shouldRefresh])

  return { refetch: fetchContents, isLoading, progress }
}
