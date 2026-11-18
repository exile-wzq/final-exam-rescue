import { describe, expect, it } from 'vitest'
import type { SetupPayload } from '../types'
import { buildPlan, sumTaskMinutes } from '../lib/planner'
import { applyFeedback } from '../lib/feedback'
import { validateSetup } from '../lib/validation'

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

describe('feedback reallocation', () => {
  it('records partial completion, prioritizes high-risk tasks and keeps every day under the cap', () => {
    const plan = buildPlan(setup, REFERENCE_DATE)
    const result = applyFeedback(plan, setup, 'partial', REFERENCE_DATE)
    const today = result.plan.days[0]
    expect(today?.feedback?.option).toBe('partial')
    expect(today?.feedback?.completedMinutes).toBe(90)
    expect(today?.feedback?.plannedMinutes).toBe(180)

    const doneTasks = today?.tasks.filter((task) => task.status === 'done') ?? []
    expect(doneTasks.length).toBeGreaterThan(0)
    doneTasks.forEach((task) => expect(task.priority).toBe(1))

    for (const day of result.plan.days) {
      expect(sumTaskMinutes(day.tasks)).toBeLessThanOrEqual(setup.dailyMinutes)
    }

    const carryoverTasks = result.plan.days
      .flatMap((day) => day.tasks)
      .filter((task) => task.origin === 'carryover')
    expect(carryoverTasks.length).toBeGreaterThan(0)
    expect(result.carryoverMinutes).toBe(90)
    expect(result.adjustment.summary).toContain('少完成')
    expect(result.adjustment.summary).toContain('每日 3 小时')
    expect(result.plan.adjustments).toHaveLength(1)
  })

  it('does not dump every carryover task into the next day', () => {
    const plan = buildPlan(setup, REFERENCE_DATE)
    const result = applyFeedback(plan, setup, 'none', REFERENCE_DATE)
    const nextDay = result.plan.days[1]
    expect(nextDay).toBeDefined()
    expect(sumTaskMinutes(nextDay?.tasks ?? [])).toBeLessThanOrEqual(setup.dailyMinutes)
    const carryoverNextDay = nextDay?.tasks
      .filter((task) => task.origin === 'carryover')
      .reduce((sum, task) => sum + task.minutes, 0)
    expect(carryoverNextDay).toBeLessThanOrEqual(90)
    if (result.carryoverMinutes > 90) {
      expect(result.plan.days[2]?.tasks.some((task) => task.origin === 'carryover')).toBe(true)
    }
  })

  it('keeps future plans stable when everything was completed', () => {
    const plan = buildPlan(setup, REFERENCE_DATE)
    const futureBefore = plan.days.slice(1).map((day) => ({
      date: day.date,
      taskIds: day.tasks.map((task) => task.id),
    }))
    const result = applyFeedback(plan, setup, 'all', REFERENCE_DATE)
    const futureAfter = result.plan.days.slice(1).map((day) => ({
      date: day.date,
      taskIds: day.tasks.map((task) => task.id),
    }))

    expect(futureAfter).toEqual(futureBefore)
    expect(result.plan.days[0]?.feedback?.option).toBe('all')
    expect(result.plan.days[0]?.tasks.every((task) => task.status === 'done')).toBe(true)
    expect(result.adjustment.summary).toContain('全部完成')
    expect(result.carryoverMinutes).toBe(0)
  })

  it('rejects a second feedback for the same day', () => {
    const plan = buildPlan(setup, REFERENCE_DATE)
    const result = applyFeedback(plan, setup, 'none', REFERENCE_DATE)
    expect(() => applyFeedback(result.plan, setup, 'all', REFERENCE_DATE)).toThrow(
      '今天的反馈已经记录过了',
    )
  })

  it('never exceeds the cap with a very small daily budget', () => {
    const smallSetup: SetupPayload = { ...setup, dailyMinutes: 30 }
    const plan = buildPlan(smallSetup, REFERENCE_DATE)
    const result = applyFeedback(plan, smallSetup, 'none', REFERENCE_DATE)
    for (const day of result.plan.days) {
      expect(sumTaskMinutes(day.tasks)).toBeLessThanOrEqual(30)
    }
  })
})

describe('setup validation', () => {
  it('rejects missing names, past dates and invalid daily time', () => {
    const result = validateSetup(
      [
        {
          id: 'bad',
          name: ' ',
          examDate: '2026-11-17',
          mastery: 3,
          weakChapters: '',
          importance: 1,
        },
      ],
      15,
      REFERENCE_DATE,
    )
    expect(result.ok).toBe(false)
    expect(result.errors['bad.name']).toBeTruthy()
    expect(result.errors['bad.date']).toBeTruthy()
    expect(result.errors.dailyMinutes).toBeTruthy()
  })

  it('accepts a valid setup', () => {
    const result = validateSetup(setup.exams, setup.dailyMinutes, REFERENCE_DATE)
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual({})
  })
})
