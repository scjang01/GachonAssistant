export const UNIVERSITY_NAME_MAP = {
  'https://cyber.gachon.ac.kr': '가천대학교',
} as const

export type UniversityLink = keyof typeof UNIVERSITY_NAME_MAP
export type University = (typeof UNIVERSITY_NAME_MAP)[UniversityLink]

export const UNIVERSITY_LINK_LIST = Object.keys(UNIVERSITY_NAME_MAP) as UniversityLink[]

export const SHADOW_HOST_ID = 'gachon-assistant-shadow-host'

export const TAB_LIST = ['진행중인 과제', '모든 과제']

export const ACTIVITY_TYPE_MAP = {
  assignment: '과제',
  video: '녹화강의',
  quiz: '퀴즈',
} as const
