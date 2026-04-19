import { DOM_SELECTORS, UNIVERSITY_REGEX, SUBMISSION_STRINGS, URL_PATTERNS } from './constants'
import { fetchAndParse } from './utils/dom'
import { UNIVERSITY_NAME_MAP } from '@/constants'
import type { University } from '@/constants'
import type { Activity, Assignment, Course, Quiz, Video, Mooc } from '@/types'
import { getLinkId, mapElement, getAttr, getText, getDirectText, origin } from '@/utils'

import type * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'

export async function getCourses(
  university: University = UNIVERSITY_NAME_MAP[origin] || '가천대학교',
  params?: { year: number; semester: number },
): Promise<Course[]> {
  // 과목명은 한국어로 가져오기 위해 'ko' 전달
  const baseUrl = params ? URL_PATTERNS.coursesWithYearSemester(params.year, params.semester) : URL_PATTERNS.courses
  const url = baseUrl

  const $ = await fetchAndParse(url, 'ko')

  const { link } = DOM_SELECTORS.courses
  let links: cheerio.Cheerio<AnyNode> = $('.my-course-lists').find(link)

  if (links.length === 0) {
    links = $(link)
  }

  const courses = mapElement(links, (_, el) => {
    const $el = $(el)
    const href = getAttr($el, 'href') || ''
    const id = getLinkId(href)

    if (!id) return undefined

    const title = getText($el)
      .replace(UNIVERSITY_REGEX[university]?.titleRegex || '', '')
      .trim()

    return { id, title }
  })

  const uniqueCourses = Array.from(new Map(courses.map(c => [c.id, c])).values())

  return uniqueCourses
}

/**
 * Generic helper to parse activities from a course page
 */
function parseActivitiesByType<T extends Activity>(
  $: cheerio.CheerioAPI,
  courseId: string,
  type: T['type'],
  selectors: { container: string; link: string; title: string; period: string },
): Array<Omit<T, 'courseTitle' | 'hasSubmitted'>> {
  const { sections } = DOM_SELECTORS.activities

  const parseItem = ($el: cheerio.Cheerio<AnyNode>, sectionTitle?: string) => {
    const $link = $el.find(selectors.link)
    const id = getLinkId(getAttr($link, 'href') || '')
    const title = getDirectText($el.find(selectors.title))
    const periodRaw = getDirectText($el.find(selectors.period))
    const [startAt, endAt] = periodRaw.split(' ~ ').map(t => t.trim())

    const base = { type, id, courseId, title, startAt: startAt || '', endAt: endAt || '', sectionTitle }
    return base as unknown as Omit<T, 'courseTitle' | 'hasSubmitted'>
  }

  const firstSectionItems = mapElement($(`${sections.first} ${selectors.container}`), (_, el) => parseItem($(el)))
  const otherSectionItems = mapElement($(sections.all), (_, content) => {
    const $content = $(content)
    const sectionTitle = getText($content.find(sections.title))
    return mapElement($content.find(selectors.container), (_, el) => parseItem($(el), sectionTitle))
  }).flat()

  return [...firstSectionItems, ...otherSectionItems]
}

export const parseAssignments = ($: cheerio.CheerioAPI, courseId: string) =>
  parseActivitiesByType<Assignment>($, courseId, 'assignment', DOM_SELECTORS.activities.assignment)

export const parseVideos = ($: cheerio.CheerioAPI, courseId: string) =>
  parseActivitiesByType<Video>($, courseId, 'video', DOM_SELECTORS.activities.video)

export const parseQuizzes = ($: cheerio.CheerioAPI, courseId: string) =>
  parseActivitiesByType<Quiz>($, courseId, 'quiz', DOM_SELECTORS.activities.quiz)

export function parseAssignmentSubmitted(
  $: cheerio.CheerioAPI,
): Array<Pick<Assignment, 'id' | 'title' | 'hasSubmitted' | 'endAt'>> {
  const { container, divider, title, period, status } = DOM_SELECTORS.submissions.assignment

  return mapElement($(container), (_, el) => {
    const $el = $(el)
    if ($el.find(divider).length) return

    const id = getLinkId(getAttr($el.find(title), 'href') || '')
    const assignmentTitle = getText($el.find(title))
    const endAt = getText($el.find(period)) + ':00'
    const statusText = getText($el.find(status))
    const { DONE } = SUBMISSION_STRINGS.ASSIGNMENT
    const hasSubmitted = (DONE as readonly string[]).some(keyword => statusText.includes(keyword))

    return { id, title: assignmentTitle, endAt, hasSubmitted }
  })
}

export function parseVideoSubmitted(
  $: cheerio.CheerioAPI,
): Array<Pick<Video, 'title' | 'hasSubmitted' | 'sectionTitle' | 'progress'>> {
  const { container, title, sectionTitle, requiredTime } = DOM_SELECTORS.submissions.video

  let currentSectionTitle = ''
  return mapElement($(container), (_, el) => {
    const $el = $(el)

    const iconSrc = $el.find('td img').attr('src') || ''
    if (!iconSrc.includes('vod') || !iconSrc.includes('icon')) return

    const $sectionTitle = $el.find(sectionTitle)
    const originalTitle = $sectionTitle.attr('title')

    if (originalTitle != null && originalTitle !== '') {
      currentSectionTitle = originalTitle
    }

    const videoTitle = getText($el.find(title))
    const $std = $el.find(requiredTime)

    const cellText = getText($std)
    const { COLLECTIVE, DONE: VIDEO_DONE } = SUBMISSION_STRINGS.VIDEO
    if ((COLLECTIVE as readonly string[]).some(s => cellText.includes(s))) {
      return { title: videoTitle, hasSubmitted: true, progress: 100, sectionTitle: currentSectionTitle }
    }

    const required = getDirectText($std)
    const study = getDirectText($std.next())

    const timeToSeconds = (time: string) => {
      const parts = time
        .split(':')
        .map(Number)
        .filter(n => !isNaN(n))
      if (parts.length === 2) return parts[0] * 60 + parts[1]
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
      return 0
    }

    const requiredSec = timeToSeconds(required)
    const studySec = timeToSeconds(study)

    const statusSymbol = getText($el.find('td').last())
    const isCompletedBySymbol = (VIDEO_DONE as readonly string[]).includes(statusSymbol)

    const progress =
      requiredSec > 0 ? Math.min(Math.round((studySec / requiredSec) * 100), 100) : isCompletedBySymbol ? 100 : 0

    const finalProgress = studySec >= requiredSec && requiredSec > 0 ? 100 : progress
    const hasSubmitted = finalProgress >= 100 || isCompletedBySymbol

    return { title: videoTitle, hasSubmitted, progress: finalProgress, sectionTitle: currentSectionTitle }
  })
}

export function parseQuizSubmitted(
  $: cheerio.CheerioAPI,
): Array<Pick<Quiz, 'id' | 'title' | 'hasSubmitted' | 'endAt'>> {
  const { container, title, period, status } = DOM_SELECTORS.submissions.quiz

  return mapElement($(container), (_, el) => {
    const $el = $(el)
    const $title = $el.find(title)
    if (!$title.length) return

    const id = getLinkId(getAttr($title, 'href'))
    const quizTitle = getText($title)
    const rawPeriod = getText($el.find(period)).trim()
    const endAt = rawPeriod === '-' || !rawPeriod ? '' : rawPeriod + ':00'
    const statusText = getText($el.find(status)).trim()

    const { PROGRESS } = SUBMISSION_STRINGS.QUIZ
    const hasSubmitted =
      statusText !== '' && statusText !== '-' && !(PROGRESS as readonly string[]).some(s => statusText.includes(s))

    return { id, title: quizTitle, endAt, hasSubmitted }
  })
}

function checkQuizSubmissionDetail($: cheerio.CheerioAPI): boolean {
  const { ICON_DONE, FINISHED, DONE } = SUBMISSION_STRINGS.QUIZ

  if ($(ICON_DONE).length > 0) return true

  const $summaryRows = $('.quizattemptsummary tbody tr')
  if ($summaryRows.length > 0) {
    let hasValidAttempt = false
    const finishedKeywords = [...FINISHED, ...DONE]
    $summaryRows.each((_, row) => {
      const statusText = getText($(row).find('td.c0'))
      if (finishedKeywords.some(keyword => statusText.includes(keyword))) {
        hasValidAttempt = true
      }
    })
    if (hasValidAttempt) return true
  }

  const mainContentText = getText($('#region-main'))
  const submissionKeywords = [
    ...FINISHED,
    ...DONE,
    '이미 응시하셨습니다',
    '최고 점수:',
    '성적:',
    'Highest grade:',
    'Grade:',
  ]
  if (submissionKeywords.some(keyword => mainContentText.includes(keyword))) {
    return true
  }

  return false
}

export async function getAssignmentSubmitted(
  courseId: string,
): Promise<Array<Pick<Assignment, 'id' | 'title' | 'hasSubmitted' | 'endAt'>>> {
  try {
    const $ = await fetchAndParse(URL_PATTERNS.assignmentSubmitted(courseId))
    return parseAssignmentSubmitted($)
  } catch {
    return []
  }
}

export async function getVideoSubmitted(
  courseId: string,
): Promise<Array<Pick<Video, 'title' | 'hasSubmitted' | 'sectionTitle' | 'progress' | 'id' | 'endAt'>>> {
  try {
    const [$progressPage, $overviewPage] = await Promise.all([
      fetchAndParse(URL_PATTERNS.videoSubmitted(courseId)),
      fetchAndParse(URL_PATTERNS.activities(courseId)),
    ])

    const progressList = parseVideoSubmitted($progressPage)

    const moocMeta: Record<string, { id: string; endAt: string }> = {}

    // 강의 오버뷰 페이지의 .modtype_vod 클래스 내부에서 정보 추출
    $overviewPage('.modtype_vod').each((_, el) => {
      const $el = $overviewPage(el)
      const $link = $el.find('.activityinstance a')
      if ($link.length) {
        // .instancename 텍스트에서 " 동영상" 또는 " Vod" 접미사 제거
        const fullTitle = getText($el.find('.instancename'))
        const title = fullTitle.replace(/\s*(동영상|Vod)$/i, '').trim()

        const href = $link.attr('href') || ''
        const id = getLinkId(href)

        const periodText = getText($el.find('.displayoptions .text-ubstrap'))
        const dateMatch =
          periodText.match(/~\s*(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}:\d{2})/i) ||
          periodText.match(/~\s*(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/i) ||
          periodText.match(/~\s*(\d{4}-\d{2}-\d{2})/i)

        let endAt = dateMatch ? dateMatch[1].trim() : ''
        if (endAt && endAt.length === 10) endAt += ' 23:59:59'

        if (title && id) {
          moocMeta[normalizeString(title)] = { id, endAt }
        }
      }
    })

    return progressList.map(item => {
      const meta = moocMeta[normalizeString(item.title)]
      return {
        ...item,
        id: meta?.id || item.title,
        endAt: meta?.endAt || '',
      }
    })
  } catch (error) {
    console.error(`[Parser] Error fetching MOOC data for ${courseId}:`, error)
    return []
  }
}

export async function getQuizSubmitted(
  courseId: string,
): Promise<Array<Pick<Quiz, 'id' | 'title' | 'hasSubmitted' | 'endAt'>>> {
  try {
    const $indexPage = await fetchAndParse(URL_PATTERNS.quizSubmitted(courseId))
    const quizzes = parseQuizSubmitted($indexPage)

    const updatedQuizzes = await Promise.all(
      quizzes.map(async quiz => {
        try {
          const $detailPage = await fetchAndParse(`/mod/quiz/view.php?id=${quiz.id}`)
          const isActuallySubmitted = checkQuizSubmissionDetail($detailPage)
          const mainContent = $detailPage('#region-main')
          const timeInfo = mainContent.text()
          const dueMatch = timeInfo.match(/Close:\s*([^\n,]+)/i) || timeInfo.match(/Closing date:\s*([^\n,]+)/i)
          const endAt = dueMatch ? dueMatch[1].trim() : quiz.endAt

          return { ...quiz, hasSubmitted: isActuallySubmitted, endAt }
        } catch {
          return quiz
        }
      }),
    )

    return updatedQuizzes
  } catch {
    return []
  }
}

const normalizeString = (str: string) => str.replace(/[\s\W_]/g, '').toLowerCase()

export async function getActivitiesPage(courseId: string): Promise<cheerio.CheerioAPI> {
  return fetchAndParse(URL_PATTERNS.activities(courseId))
}

export async function getActivities(
  courseTitle: string,
  courseId: string,
  assignmentSubmittedArray: Array<Pick<Assignment, 'id' | 'title' | 'hasSubmitted' | 'endAt'>>,
  videoSubmittedArray: Array<Pick<Video, 'title' | 'hasSubmitted' | 'sectionTitle' | 'progress' | 'id' | 'endAt'>>,
  quizSubmittedArray: Array<Pick<Quiz, 'id' | 'title' | 'hasSubmitted' | 'endAt'>>,
  _activitiesPage$?: cheerio.CheerioAPI,
): Promise<Activity[]> {
  try {
    const assignments: Assignment[] = assignmentSubmittedArray.map(a => ({
      type: 'assignment',
      id: a.id,
      courseId,
      courseTitle,
      title: a.title,
      startAt: '',
      endAt: a.endAt,
      hasSubmitted: a.hasSubmitted,
    }))

    const videos: Mooc[] = videoSubmittedArray.map(v => ({
      type: 'mooc',
      id: v.id || `mooc-${courseId}-${normalizeString(v.title)}`,
      courseId,
      courseTitle,
      title: v.title,
      startAt: '',
      endAt: v.endAt,
      sectionTitle: v.sectionTitle,
      hasSubmitted: v.hasSubmitted,
      progress: v.progress ?? 0,
    }))

    const quizzes: Quiz[] = quizSubmittedArray.map(q => ({
      type: 'quiz',
      id: q.id,
      courseId,
      courseTitle,
      title: q.title,
      startAt: '',
      endAt: q.endAt,
      hasSubmitted: q.hasSubmitted,
    }))

    const allActivities = [...assignments, ...videos, ...quizzes]

    return allActivities
  } catch (error) {
    console.error(`[Parser] Error merging activities for ${courseId}:`, error)
    return []
  }
}
