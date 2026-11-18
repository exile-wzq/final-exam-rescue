import type { Exam, ExamRisk, Importance, RiskLevel } from '../types'
import { IMPORTANCE_OPTIONS, MASTERY_OPTIONS } from '../types'
import { diffCalendarDays } from './dates'

const URGENCY_SCORES = [100, 95, 88, 81, 74, 67, 60, 54, 48, 43, 38, 33, 29, 25, 21]

const IMPORTANCE_SCORES: Record<Importance, number> = {
  1: 35,
  2: 68,
  3: 100,
}

const WEIGHTS = {
  urgency: 0.35,
  mastery: 0.25,
  weakness: 0.2,
  importance: 0.2,
}

export function parseWeakChapters(input: string): string[] {
  const seen = new Set<string>()
  return input
    .split(/[,，、;；\n]+/)
    .map((chapter) => chapter.trim().replace(/\s+/g, ' '))
    .filter((chapter) => {
      if (!chapter) return false
      const key = chapter.toLocaleLowerCase('zh-CN')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function urgencyScore(daysUntilExam: number): number {
  if (daysUntilExam <= 0) return URGENCY_SCORES[0] ?? 100
  if (daysUntilExam < URGENCY_SCORES.length) return URGENCY_SCORES[daysUntilExam] ?? 21
  if (daysUntilExam <= 21) return 18
  if (daysUntilExam <= 30) return 12
  return 8
}

export function masteryGapScore(mastery: number): number {
  return Math.round((((5 - mastery) / 4) * 100 + Number.EPSILON) * 10) / 10
}

export function weaknessScore(chapterCount: number): number {
  if (chapterCount <= 0) return 20
  return Math.min(96, 45 + chapterCount * 15)
}

export function classifyRisk(score: number): RiskLevel {
  if (score >= 65) return 'high'
  if (score >= 42) return 'medium'
  return 'low'
}

export function riskLevelRank(level: RiskLevel): number {
  if (level === 'high') return 3
  if (level === 'medium') return 2
  return 1
}

export function assessExams(
  exams: Exam[],
  referenceDate: string,
): {
  risks: ExamRisk[]
  overallRiskScore: number
  overallRiskLevel: RiskLevel
  nearestExamDays: number
} {
  const risks: ExamRisk[] = exams.map((exam) => {
    const daysUntilExam = Math.max(0, diffCalendarDays(referenceDate, exam.examDate))
    const weakChapterList = parseWeakChapters(exam.weakChapters)
    const factors = {
      urgency: urgencyScore(daysUntilExam),
      mastery: masteryGapScore(exam.mastery),
      weakness: weaknessScore(weakChapterList.length),
      importance: IMPORTANCE_SCORES[exam.importance],
    }
    const riskScore =
      Math.round(
        (factors.urgency * WEIGHTS.urgency +
          factors.mastery * WEIGHTS.mastery +
          factors.weakness * WEIGHTS.weakness +
          factors.importance * WEIGHTS.importance +
          Number.EPSILON) *
          10,
      ) / 10

    return {
      exam,
      daysUntilExam,
      riskScore,
      riskLevel: classifyRisk(riskScore),
      priority: 0,
      factors,
      weakChapterList,
      reason: buildReason(exam, daysUntilExam, weakChapterList.length),
      recommendedMinutes: 0,
    }
  })

  const sorted = risks.sort((a, b) => {
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore
    if (a.daysUntilExam !== b.daysUntilExam) return a.daysUntilExam - b.daysUntilExam
    if (b.exam.importance !== a.exam.importance) return b.exam.importance - a.exam.importance
    return a.exam.name.localeCompare(b.exam.name, 'zh-CN')
  })

  sorted.forEach((risk, index) => {
    risk.priority = index + 1
  })

  const importanceWeights: Record<Importance, number> = { 1: 1, 2: 1.25, 3: 1.5 }
  const weightedTotal = sorted.reduce(
    (sum, risk) => sum + risk.riskScore * importanceWeights[risk.exam.importance],
    0,
  )
  const weightSum = sorted.reduce(
    (sum, risk) => sum + importanceWeights[risk.exam.importance],
    0,
  )
  const average = weightSum > 0 ? weightedTotal / weightSum : 0
  const maxScore = sorted.reduce((max, risk) => Math.max(max, risk.riskScore), 0)
  const overallRiskScore = Math.round(maxScore * 0.55 + average * 0.45)
  const nearestExamDays =
    sorted.length > 0 ? Math.min(...sorted.map((risk) => risk.daysUntilExam)) : 0

  return {
    risks: sorted,
    overallRiskScore,
    overallRiskLevel: classifyRisk(overallRiskScore),
    nearestExamDays,
  }
}

function buildReason(exam: Exam, daysUntilExam: number, weakCount: number): string {
  const parts: string[] = []

  if (daysUntilExam <= 1) {
    parts.push(daysUntilExam === 0 ? '今天考试' : '明天考试')
  } else {
    parts.push(`距考试 ${daysUntilExam} 天`)
  }

  if (exam.mastery <= 2) {
    parts.push(`掌握度仅 ${exam.mastery}/5`)
  } else if (exam.mastery === 3) {
    parts.push('掌握度一般')
  }

  if (weakCount > 0) {
    parts.push(`${weakCount} 个薄弱章节`)
  }

  const importance = IMPORTANCE_OPTIONS.find((item) => item.value === exam.importance)
  if (importance && exam.importance >= 2) {
    parts.push(`重要程度为${importance.label}`)
  }

  if (parts.length === 1) {
    parts.push(
      `掌握程度为${MASTERY_OPTIONS.find((item) => item.value === exam.mastery)?.label ?? '一般'}`,
    )
  }

  return `${parts.join('，')}。`
}
