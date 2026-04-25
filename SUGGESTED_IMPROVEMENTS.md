# Suggested Codebase Improvements

This document outlines suggested modifications to the codebase, categorized by potential bugs, performance optimizations, readability, and React/TypeScript best practices.

## 1. Potential Bugs

### `fetchAndParse` Error Handling (`src/services/parser/utils/dom.ts`)
**Issue:** The `response.finalUrl` logic handles login redirection, but the background worker's `fetch-html` action uses `response.url`, which might just be the current URL, not clearly `finalUrl` from the perspective of XHR. Also, `any` is used for `response`.
**Fix:**
```typescript
<<<<<<< SEARCH
  const response: any = await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'fetch-html', url: fullUrl }, res => {
      resolve(res)
    })
  })
=======
  type FetchHtmlResponse = { success: boolean; html?: string; finalUrl?: string; error?: string };
  const response = await new Promise<FetchHtmlResponse>(resolve => {
    chrome.runtime.sendMessage({ action: 'fetch-html', url: fullUrl }, res => {
      resolve(res as FetchHtmlResponse)
    })
  })
>>>>>>> REPLACE
```

### Dependency on ESLint version (`package.json`)
**Issue:** `npm run lint` fails because `eslint` v8 is installed but the user environment might run v10 locally, causing errors with `.eslintrc.cjs` due to the lack of `eslint.config.js`. Alternatively, updating `@typescript-eslint/eslint-plugin` and `eslint` could prevent deprecated errors.
**Fix:** Migrate to ESLint Flat Config (`eslint.config.mjs`) or downgrade local `eslint` for consistent behaviors via `npx eslint`.

## 2. Performance Enhancements

### Optimize `getFilteredActivities` (`src/storage/useStorageStore.ts`)
**Issue:** `getFilteredActivities` chains `.map().filter().sort()`. For performance-critical functions, multiple array allocations can be avoided by performing a single loop.
**Fix:**
```typescript
<<<<<<< SEARCH
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
=======
  getFilteredActivities: (searchQuery: string) => {
    const { activityList } = get().contents
    const { manualOverrides, filterOptions } = get()
    const options = { ...filterOptions, searchQuery }

    const results: Activity[] = []

    for (const activity of activityList) {
      const hasSubmitted = manualOverrides[activity.id] !== undefined ? manualOverrides[activity.id] : activity.hasSubmitted
      const updatedActivity = { ...activity, hasSubmitted }
      
      if (filterActivities(updatedActivity, options)) {
        results.push(updatedActivity)
      }
    }

    return results.sort((a, b) => {
      const timeA = a.endAt ? new Date(a.endAt).getTime() : Infinity
      const timeB = b.endAt ? new Date(b.endAt).getTime() : Infinity
      return timeA - timeB
    })
  },
>>>>>>> REPLACE
```

## 3. Readability & Maintainability

### Consolidate Constants (`src/constants/index.ts`)
**Issue:** Hardcoded strings like `'video'`, `'mooc'`, and statuses are scattered. Moving them to constants improves maintainability.
**Fix:**
```typescript
<<<<<<< SEARCH
export const TAB_LIST = ['진행중인 과제', '모든 과제']
=======
export const TAB_LIST = ['진행중인 과제', '모든 과제']

export const ACTIVITY_TYPES = {
  ASSIGNMENT: 'assignment',
  VIDEO: 'video',
  QUIZ: 'quiz',
  MOOC: 'mooc',
} as const;

export const ACTIVITY_STATUS = {
  ALL: 'all',
  ONGOING: 'ongoing',
  IMMINENT: 'imminent',
  EXPIRED: 'expired',
  SUBMITTED: 'submitted',
  NO_DEADLINE: 'no-deadline',
} as const;
>>>>>>> REPLACE
```
*Note: This would also require replacing the magic strings in `TaskContent.tsx`, `useTaskFilter.ts`, `filterActivities.ts`, and `types/index.ts`.*

### `useTaskFilter` Redundant logic (`src/hooks/useTaskFilter.ts`)
**Issue:** `useTaskFilter.ts` recalculates the summary by reducing `activityList`, but it duplicates filter logic (like category and course filtering).
**Fix:** We can compute the summary *based on* `filteredTasks` if the user wants stats of *filtered* tasks, or compute it independently using reusable filter functions. The current logic mixes filter checks and summary calculation.

## 4. React/TypeScript Best Practices

### Consolidate State in `useContentsFetcher` (`src/hooks/useContentsFetcher.ts`)
**Issue:** Using multiple `useState` calls (`isLoading`, `progress`, `syncStatus`) can lead to multiple re-renders when they are updated sequentially inside async functions.
**Fix:** Use `useReducer` or a single `useState` object for complex state transitions.
```typescript
<<<<<<< SEARCH
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [syncStatus, setSyncStatus] = useState('')
=======
  const [syncState, setSyncState] = useState({ isLoading: false, progress: 0, syncStatus: '' })
>>>>>>> REPLACE
```
And update state like: `setSyncState({ isLoading: true, progress: 5, syncStatus: '...' })`.

### Remove Unused Variables (`src/hooks/useContentsFetcher.ts`)
**Issue:** `Activity` is imported but not used.
**Fix:** Remove `import type { Activity } from '@/types'` in `src/hooks/useContentsFetcher.ts`.

### Strict Type in `isImminentTask` (`src/background/index.ts`)
**Issue:** The `task` parameter is typed as `any`.
**Fix:** Use `Pick<Activity, 'id' | 'hasSubmitted' | 'endAt'>` or similar type interface to maintain type safety.
