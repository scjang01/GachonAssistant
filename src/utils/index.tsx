import { clsx } from 'clsx'
import { differenceInHours, isPast } from 'date-fns'
import { extendTailwindMerge } from 'tailwind-merge'

import { SHADOW_HOST_ID, UNIVERSITY_LINK_LIST } from '@/constants'
import type { UniversityLink } from '@/constants'
import { pxToRemMap } from '@/styles'
import type { Activity } from '@/types'

import type { Cheerio } from 'cheerio'
import type { ClassValue } from 'clsx'
import type { AnyNode } from 'domhandler'

// --- Link Utils ---
export function getLinkId(url: string | null | undefined): string {
  if (!url) return ''
  const idMatch = url.match(/[?&]id=(\d+)/)
  return idMatch ? idMatch[1] : ''
}

// --- Origin Utils ---
export const origin = 'https://cyber.gachon.ac.kr' as UniversityLink

export const getOrigin = (url?: string): UniversityLink => {
  if (url) {
    const matched = UNIVERSITY_LINK_LIST.find(u => url.startsWith(u))
    if (matched) return matched
  }
  return origin
}

// --- Cheerio Utils ---
export const mapElement = <T,>(
  elements: Cheerio<AnyNode>,
  callback: (i: number, el: AnyNode) => T | undefined,
): T[] => {
  return elements
    .map((i, el) => callback(i, el))
    .get()
    .filter((item): item is T => item !== undefined)
}

export const getText = ($el: Cheerio<AnyNode>): string => $el.text().trim()

export const getDirectText = ($el: Cheerio<AnyNode>): string => {
  return $el
    .contents()
    .filter((_, el) => el.type === 'text')
    .text()
    .trim()
}

export const getAttr = ($el: Cheerio<AnyNode>, attr: string): string | undefined => $el.attr(attr)

// --- OS Utils ---
export const isMac = () => {
  if (typeof window === 'undefined') return false
  return window.navigator.platform.toUpperCase().indexOf('MAC') >= 0
}

// --- CSS Utils (cn) ---
const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': Object.keys(pxToRemMap).map(key => `text-${key}`),
      'border-w': Object.keys(pxToRemMap).map(key => `border-${key}`),
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs))
}

// --- Date Utils ---
/**
 * Safari 등 다양한 브라우저에서 날짜 문자열을 안전하게 파싱합니다.
 * "2024-05-01 23:59:59" 포맷을 "2024-05-01T23:59:59"로 변환하여 처리합니다.
 */
export const safeParseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null
  try {
    const isoStr = dateStr.trim().replace(' ', 'T')
    const date = new Date(isoStr)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

// --- Task Utils ---
export type TaskStatus = 'submitted' | 'expired' | 'imminent' | 'ongoing' | 'no-deadline'

export const getTaskStatus = (task: Activity, now: Date = new Date()): TaskStatus => {
  if (task.hasSubmitted) return 'submitted'

  const endAtDate = safeParseDate(task.endAt)
  if (!endAtDate) return 'no-deadline'

  const isExpired = isPast(endAtDate)
  if (isExpired) return 'expired'

  const hoursUntilDue = differenceInHours(endAtDate, now)
  if (hoursUntilDue < 48) return 'imminent'

  return 'ongoing'
}

// --- DOM Utils (createShadowRoot) ---
export function createShadowRoot(styles: string[]): ShadowRoot {
  const host = document.createElement('div')
  host.setAttribute('id', SHADOW_HOST_ID)
  
  // 호스트를 전체 화면으로 설정하되, 클릭은 통과시키도록 함
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2147483647',
    pointerEvents: 'none', 
  })

  const shadowRoot = host.attachShadow({ mode: 'open' })

  // CSSStyleSheet() 방식이 구형 브라우저나 특정 환경에서 호환성 문제가 있을 수 있으므로 style 태그 방식으로 복구
  const styleTag = document.createElement('style')
  styleTag.textContent = styles.join('\n')
  shadowRoot.appendChild(styleTag)

  document.body.appendChild(host)

  return shadowRoot
}
