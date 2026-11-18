import { describe, expect, it } from 'vitest'
import type { SetupPayload } from '../types'
import { buildMarketingReport } from '../lib/marketing'
import { planTotalMinutes } from '../lib/planner'

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

describe('marketing diagnosis report', () => {
  it('produces a bounded readiness score and a clear status', () => {
    const report = buildMarketingReport(setup, REFERENCE_DATE)
    expect(report.readiness).toBeGreaterThanOrEqual(0)
    expect(report.readiness).toBeLessThanOrEqual(100)
    expect(report.statusLabel).toBe('中高风险')
    expect(report.focusRisk.exam.id).toBe('math')
    expect(report.nearestExam?.id).toBe('math')
  })

  it('builds concise evidence for the main problem and action', () => {
    const report = buildMarketingReport(setup, REFERENCE_DATE)
    expect(report.problemPoints.length).toBe(3)
    expect(report.problemPoints[0]).toContain('高等数学')
    expect(report.focusReasonChips.length).toBeGreaterThanOrEqual(3)
    expect(report.mainProblem).toBe('门门都救，等于门门都救不到。')
    expect(report.mainProblem).not.toMatch(/不是[^。]*而是/)
  })

  it('binds subject identity colors to input order, not priority', () => {
    const report = buildMarketingReport(setup, REFERENCE_DATE)
    for (const item of report.allocationItems) {
      expect(item.colorIndex).toBe(
        setup.exams.findIndex((exam) => exam.id === item.id),
      )
    }
    const indexes = report.allocationItems.map((item) => item.colorIndex)
    expect(new Set(indexes).size).toBe(indexes.length)
  })

  it('adapts the main problem to a calm state', () => {
    const calmSetup: SetupPayload = {
      dailyMinutes: 120,
      exams: [
        {
          id: 'calm',
          name: '线性代数',
          examDate: '2026-12-20',
          mastery: 5,
          weakChapters: '',
          importance: 1,
        },
      ],
    }
    const report = buildMarketingReport(calmSetup, REFERENCE_DATE)
    expect(report.status).toBe('low')
    expect(report.statusLabel).toBe('状态较稳')
    expect(report.mainProblem).toBe('状态在线，保持节奏比临时加量更重要。')
  })

  it('keeps allocation totals aligned with the 7-day plan', () => {
    const report = buildMarketingReport(setup, REFERENCE_DATE)
    const total = report.allocationItems.reduce((sum, item) => sum + item.minutes, 0)
    expect(total).toBe(planTotalMinutes(report.analysis.previewPlan.days))
    expect(report.weeklyCapacityMinutes).toBe(7 * setup.dailyMinutes)
  })
})
