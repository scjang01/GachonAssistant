import { z } from 'zod'

// Selectors
export const domSelectorsSchema = z.object({
  courses: z.object({
    link: z.string(),
    label: z.string(),
  }),
  activities: z.object({
    sections: z.object({
      first: z.string(),
      all: z.string(),
      title: z.string(),
    }),
    assignment: z.object({
      container: z.string(),
      link: z.string(),
      title: z.string(),
      period: z.string(),
    }),
    video: z.object({
      container: z.string(),
      link: z.string(),
      title: z.string(),
      period: z.string(),
    }),
    quiz: z.object({
      container: z.string(),
      link: z.string(),
      title: z.string(),
      period: z.string(),
    }),
  }),
  submissions: z.object({
    assignment: z.object({
      container: z.string(),
      divider: z.string(),
      title: z.string(),
      period: z.string(),
      status: z.string(),
    }),
    quiz: z.object({
      container: z.string(),
      title: z.string(),
      period: z.string(),
      status: z.string(),
    }),
    video: z.object({
      container: z.string(),
      title: z.string(),
      sectionTitle: z.string(),
      requiredTime: z.string(),
      period: z.string(),
    }),
  }),
})

export const DOM_SELECTORS = domSelectorsSchema.parse({
  courses: {
    link: 'a[href*="course/view.php?id="]',
    label: '.label-course, .course_label_re, .badge-course, .badge, .label',
  },
  activities: {
    sections: {
      first: '#section-0',
      all: '.total_sections .content',
      title: '.sectionname',
    },
    assignment: {
      container: '.modtype_assign .activityinstance',
      link: 'a',
      title: '.instancename',
      period: '.displayoptions',
    },
    video: {
      container: '.modtype_vod .activityinstance',
      link: 'a',
      title: '.instancename',
      period: '.displayoptions .text-ubstrap',
    },
    quiz: {
      container: '.modtype_quiz .activityinstance, .modtype_ubquiz .activityinstance',
      link: 'a',
      title: '.instancename',
      period: '.displayoptions',
    },
  },
  submissions: {
    assignment: {
      container: 'tbody tr',
      divider: '.tabledivider',
      title: '.c1 a',
      period: '.c2',
      status: '.c3',
    },
    quiz: {
      container: 'tbody tr',
      title: '.c1 a',
      period: '.c2',
      status: '.c3',
    },
    video: {
      container: '.user_progress tbody tr, .user_progress_table tbody tr',
      title: '.text-left',
      sectionTitle: '.sectiontitle',
      requiredTime: '.text-center.hidden-xs.hidden-sm',
      period: 'td:nth-child(2)', // 가천대 기준 두 번째 열이 주차/기간 정보임
    },
  },
})

// Universities
export const UNIVERSITY_REGEX = {
  가천대학교: {
    titleRegex: /\s*\[\d+\]|\s*\([\w\d]+_[\w\d]+\)/g,
  },
  서울시립대학교: {
    titleRegex: /\s*\[\d+\]/g,
  },
} as const

// Strict matching strings based on actual site findings (supports both Korean and English)
export const SUBMISSION_STRINGS = {
  COURSE_LABELS: ['교과', 'Course'],
  ASSIGNMENT: {
    DONE: ['제출 완료', 'Submitted for grading'],
    NOT_SUBMITTED: ['미제출', 'No submission'],
  },
  QUIZ: {
    DONE: ['제출됨', 'Submitted'],
    FINISHED: ['종료됨', 'Finished', 'Already submitted'],
    PROGRESS: ['진행 중', 'In progress'],
    ICON_DONE: '.csms-chips-status-icon-done', // CSS class for completed status
  },
  VIDEO: {
    DONE: ['O'],
    PARTIAL: ['▲'],
    ABSENT: ['X'],
    COLLECTIVE: ['일괄출석인정', 'Collective attendance'],
  },
} as const

// URLs
export const URL_PATTERNS = {
  courses: '/local/ubion/user/index.php',
  coursesWithYearSemester: (year: number, semester: number) =>
    `/local/ubion/user/index.php?year=${year}&semester=${semester}`,
  activities: (courseId: string) => `/course/view.php?id=${courseId}`,
  assignmentSubmitted: (courseId: string) => `/mod/assign/index.php?id=${courseId}`,
  videoSubmitted: (courseId: string) => `/report/ubcompletion/user_progress.php?id=${courseId}`,
  quizSubmitted: (courseId: string) => `/mod/quiz/index.php?id=${courseId}`,
  moocIndex: (courseId: string) => `/mod/vod/index.php?id=${courseId}`,
} as const
