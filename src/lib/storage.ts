import type { Exam, Plan } from '../types'
import { isValidDateKey } from './dates'

export const STORAGE_KEY = 'final-exam-rescue.v1'

export interface PersistedState {
  version: 1
  exams: Exam[]
  dailyMinutes: number
  plan: Plan | null
}

export function loadState(): PersistedState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as unknown
    if (!isPersistedState(data)) return null
    return data
  } catch {
    return null
  }
}

export function saveState(state: PersistedState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage can be unavailable in private modes. The app still works
    // for the current session; persistence is a progressive enhancement.
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

function isPersistedState(value: unknown): value is PersistedState {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<PersistedState>
  if (data.version !== 1) return false
  if (!Array.isArray(data.exams) || !data.exams.every(isExam)) return false
  if (
    typeof data.dailyMinutes !== 'number' ||
    !Number.isFinite(data.dailyMinutes) ||
    data.dailyMinutes < 30 ||
    data.dailyMinutes > 960
  ) {
    return false
  }
  if (data.plan !== null && !isPlan(data.plan)) return false
  return true
}

function isExam(value: unknown): value is Exam {
  if (!value || typeof value !== 'object') return false
  const exam = value as Partial<Exam>
  return (
    typeof exam.id === 'string' &&
    typeof exam.name === 'string' &&
    typeof exam.examDate === 'string' &&
    isValidDateKey(exam.examDate) &&
    typeof exam.mastery === 'number' &&
    exam.mastery >= 1 &&
    exam.mastery <= 5 &&
    typeof exam.weakChapters === 'string' &&
    typeof exam.importance === 'number' &&
    exam.importance >= 1 &&
    exam.importance <= 3
  )
}

function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Partial<Plan>
  return (
    typeof plan.id === 'string' &&
    typeof plan.startDate === 'string' &&
    isValidDateKey(plan.startDate) &&
    typeof plan.dailyMinutes === 'number' &&
    Array.isArray(plan.days) &&
    plan.days.length > 0 &&
    Array.isArray(plan.adjustments)
  )
}
