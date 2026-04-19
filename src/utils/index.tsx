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

// --- Task Utils ---
export type TaskStatus = 'submitted' | 'expired' | 'imminent' | 'ongoing' | 'no-deadline'

export const getTaskStatus = (task: Activity, now: Date = new Date()): TaskStatus => {
  if (task.hasSubmitted) return 'submitted'

  const endAtDate = task.endAt ? new Date(task.endAt) : null
  const isValidDate = endAtDate && !isNaN(endAtDate.getTime())

  if (!isValidDate) return 'no-deadline'

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
  
  // 배경 사이트의 어떤 요소보다도 앞에 오도록 z-index 최상위 설정
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    zIndex: '2147483647',
    pointerEvents: 'none', // 호스트 자체는 클릭을 막지 않음
  })

  const shadowRoot = host.attachShadow({ mode: 'open' })

  const globalStyleSheet = new CSSStyleSheet()
  globalStyleSheet.replaceSync(styles.join('\n'))

  shadowRoot.adoptedStyleSheets = [globalStyleSheet]

  document.body.appendChild(host)

  return shadowRoot
}
