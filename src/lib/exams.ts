import type { Exam } from '../types'
import { addDays } from './dates'
import { createId } from './ids'

export function createBlankExam(referenceDate: string): Exam {
  return {
    id: createId('exam'),
    name: '',
    examDate: addDays(referenceDate, 7),
    mastery: 3,
    weakChapters: '',
    importance: 1,
  }
}

export function formatHourInput(minutes: number): string {
  const value = Math.round((minutes / 60) * 100) / 100
  return Number.isInteger(value) ? String(value) : String(value)
}
