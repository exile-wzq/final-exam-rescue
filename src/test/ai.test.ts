import { describe, expect, it } from 'vitest'
import {
  localAllocationExplanation,
  localChapterTask,
  localRiskExplanation,
} from '../services/ai'
import type { ExamRisk, Plan } from '../types'

const risk: ExamRisk = {
  exam: {
    id: 'math',
    name: '高等数学',
    examDate: '2026-11-21',
    mastery: 1,
    weakChapters: '极限、级数',
    importance: 3,
  },
  daysUntilExam: 3,
  riskScore: 91,
  riskLevel: 'high',
  priority: 1,
  factors: { urgency: 81, mastery: 100, weakness: 75, importance: 100 },
  weakChapterList: ['极限', '级数'],
  reason: '距考试 3 天，掌握度仅 1/5。',
  recommendedMinutes: 600,
}

const plan: Plan = {
  id: 'plan',
  createdAt: '2026-11-18T12:00:00.000Z',
  startDate: '2026-11-18',
  dailyMinutes: 180,
  days: [
    {
      date: '2026-11-18',
      tasks: [
        {
          id: 'task',
          examId: 'math',
          examName: '高等数学',
          chapter: '极限',
          action: '基础补强 + 概念例题',
          minutes: 60,
          priority: 1,
          riskLevel: 'high',
          riskScore: 91,
          status: 'planned',
          completedMinutes: 0,
          origin: 'regular',
        },
      ],
    },
  ],
  overallRiskScore: 82,
  overallRiskLevel: 'high',
  nearestExamDays: 3,
  strategy: '优先保障高等数学。',
  adjustments: [],
}

describe('local AI explanation layer', () => {
  it('explains risk without replacing the deterministic score', () => {
    const text = localRiskExplanation({
      risks: [risk],
      overallRiskScore: 82,
      overallRiskLevel: 'high',
      dailyMinutes: 180,
    })
    expect(text).toContain('高等数学')
    expect(text).toContain('不是单纯按考试日期排序')
  })

  it('turns a weak chapter into an actionable local task description', () => {
    const text = localChapterTask({
      examName: '高等数学',
      chapter: '极限',
      mastery: 1,
      daysUntilExam: 3,
      fallbackAction: '基础补强',
    })
    expect(text).toContain('极限')
    expect(text).toContain('30 分钟')
  })

  it('explains the allocation and daily cap', () => {
    const text = localAllocationExplanation({ plan, risks: [risk] })
    expect(text).toContain('未来 7 天共安排')
    expect(text).toContain('3 小时')
  })
})
