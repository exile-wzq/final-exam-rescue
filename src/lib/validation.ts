import type { Exam } from '../types'
import { isValidDateKey } from './dates'

export interface SetupValidation {
  ok: boolean
  errors: Record<string, string>
}

export function validateSetup(
  exams: Exam[],
  dailyMinutes: number,
  referenceDate: string,
): SetupValidation {
  const errors: Record<string, string> = {}

  if (exams.length === 0) {
    errors.exams = '至少添加一门考试。'
  }

  if (!Number.isFinite(dailyMinutes) || dailyMinutes < 30) {
    errors.dailyMinutes = '每天至少需要 0.5 小时。'
  } else if (dailyMinutes > 960) {
    errors.dailyMinutes = '每天复习时间不要超过 16 小时。'
  } else if (dailyMinutes % 30 !== 0) {
    errors.dailyMinutes = '请按 0.5 小时递增填写。'
  }

  exams.forEach((exam, index) => {
    const label = `第 ${index + 1} 门考试`
    if (!exam.name.trim()) {
      errors[`${exam.id}.name`] = `${label}还没有填写科目名称。`
    } else if (exam.name.trim().length > 24) {
      errors[`${exam.id}.name`] = '科目名称请控制在 24 个字符以内。'
    }

    if (!exam.examDate) {
      errors[`${exam.id}.date`] = '请选择考试日期。'
    } else if (!isValidDateKey(exam.examDate)) {
      errors[`${exam.id}.date`] = '考试日期格式不正确。'
    } else if (exam.examDate < referenceDate) {
      errors[`${exam.id}.date`] = '考试日期不能早于今天。'
    }

    if (exam.mastery < 1 || exam.mastery > 5) {
      errors[`${exam.id}.mastery`] = '请选择当前掌握程度。'
    }

    if (exam.importance < 1 || exam.importance > 3) {
      errors[`${exam.id}.importance`] = '请选择考试重要程度。'
    }

    if (exam.weakChapters.length > 240) {
      errors[`${exam.id}.weakChapters`] = '薄弱章节请控制在 240 个字符以内。'
    }
  })

  return { ok: Object.keys(errors).length === 0, errors }
}
