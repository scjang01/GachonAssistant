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
      // fetchAndParse 내부에서 로그인 필요 시 'LOGIN_REQUIRED' 에러를 던집니다.
      const courseList = await getCourses()

      if (courseList.length === 0) {
        // 성공적으로 접속했으나(로그인 상태) 과목이 정말 없는 경우
        await updateData('meta', prev => ({ ...prev, updateAt: new Date().toISOString() }))
        toast.error('수강 중인 과목을 찾을 수 없습니다.')
        return
      }

      const maxPos = courseList.length * 4
      let curPos = 0

      const activityList: Activity[] = []
      for (const course of courseList) {
        try {
          // 2. 활동 내용은 파싱을 위해 영어로 가져옴
          const [assignmentSubmittedArray, videoSubmittedArray, quizSubmittedArray, activitiesPage$] = await Promise.all([
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
            activitiesPage$,
          )
          activityList.push(...activities)
        } catch (courseError) {
          // 개별 과목 실패 시 (이미 한 번 getCourses를 통과했으므로 로그인 에러일 확률은 낮음)
          console.error(`Failed to fetch course ${course.title}:`, courseError)
          // 만약 여기서도 로그인 에러가 발생한다면 상위 catch로 던짐
          if (courseError instanceof Error && courseError.message === 'LOGIN_REQUIRED') {
            throw courseError
          }
        } finally {
          curPos += 4
          setProgress((curPos / maxPos) * 100)
        }
      }

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
      // 동기화 실패 시 예외 처리
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
    // 자동 갱신 시도
    if (isInitialized && shouldRefresh) {
      fetchContents()
    }
  }, [isInitialized, shouldRefresh])

  return { refetch: fetchContents, isLoading, progress }
}
