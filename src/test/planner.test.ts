import { describe, expect, it } from 'vitest'
import type { SetupPayload } from '../types'
import { buildAnalysis, buildPlan, planTotalMinutes, sumTaskMinutes } from '../lib/planner'

const REFERENCE_DATE = '2026-11-18'

const setup: SetupPayload = {
  dailyMinutes: 180,
  exams: [
    {
      id: 'math',
      name: '高等数学',
      examDate: '2026-11-21',
      mastery: 1,
      weakChapters: '极限、级数、微分方程',
      importance: 3,
    },
    {
      id: 'probability',
      name: '概率论',
      examDate: '2026-11-25',
      mastery: 2,
      weakChapters: '随机变量、数字特征',
      importance: 2,
    },
    {
      id: 'network',
      name: '计算机网络',
      examDate: '2026-11-29',
      mastery: 3,
      weakChapters: '传输层、网络层',
      importance: 1,
    },
  ],
}

describe('seven day planner', () => {
  it('creates seven days with concrete, prioritized tasks', () => {
    const plan = buildPlan(setup, REFERENCE_DATE)
    expect(plan.days).toHaveLength(7)
    expect(plan.dailyMinutes).toBe(180)
    expect(plan.days[0]?.date).toBe(REFERENCE_DATE)
    expect(plan.days[6]?.date).toBe('2026-11-24')

    const tasks = plan.days.flatMap((day) => day.tasks)
    expect(tasks.length).toBeGreaterThan(10)
    tasks.forEach((task) => {
      expect(task.minutes).toBeGreaterThan(0)
      expect(task.chapter.length).toBeGreaterThan(0)
      expect(task.action.length).toBeGreaterThan(0)
      expect(task.priority).toBeGreaterThanOrEqual(1)
      expect(['low', 'medium', 'high']).toContain(task.riskLevel)
    })
  })

  it('never exceeds the daily time limit in the initial plan', () => {
    const plan = buildPlan(setup, REFERENCE_DATE)
    for (const day of plan.days) {
      expect(sumTaskMinutes(day.tasks)).toBeLessThanOrEqual(setup.dailyMinutes)
    }
    expect(planTotalMinutes(plan.days)).toBe(7 * setup.dailyMinutes)
  })

  it('does not schedule a task after that subject exam date', () => {
    const plan = buildPlan(setup, REFERENCE_DATE)
    const examDates = new Map(setup.exams.map((exam) => [exam.id, exam.examDate]))
    for (const day of plan.days) {
      for (const task of day.tasks) {
        expect(day.date <= (examDates.get(task.examId) ?? '')).toBe(true)
      }
    }
  })

  it('assigns recommended time and preserves it in the preview plan', () => {
    const analysis = buildAnalysis(setup, REFERENCE_DATE)
    expect(analysis.risks).toHaveLength(3)
    analysis.risks.forEach((risk) => {
      expect(risk.recommendedMinutes).toBeGreaterThan(0)
    })
    expect(analysis.risks.reduce((sum, risk) => sum + risk.recommendedMinutes, 0)).toBe(
      planTotalMinutes(analysis.previewPlan.days),
    )
    expect(planTotalMinutes(analysis.previewPlan.days)).toBe(1260)
  })

  it('respects a smaller daily budget', () => {
    const plan = buildPlan({ ...setup, dailyMinutes: 60 }, REFERENCE_DATE)
    for (const day of plan.days) {
      expect(sumTaskMinutes(day.tasks)).toBeLessThanOrEqual(60)
      expect(sumTaskMinutes(day.tasks) % 30).toBe(0)
    }
  })
})
