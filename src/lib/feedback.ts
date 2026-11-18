import type {
  ExamRisk,
  FeedbackOption,
  Plan,
  PlanAdjustment,
  PlanDay,
  PlanTask,
  ReallocationResult,
  SetupPayload,
} from '../types'
import { addDays, monthDayLabel, weekdayLabel, clamp, roundToStep } from './dates'
import { formatMinutes } from './format'
import {
  buildFutureWindow,
  examMinutesByExam,
  sumTaskMinutes,
  type CarryoverSeed,
} from './planner'
import { assessExams, riskLevelRank } from './risk'

const FEEDBACK_STEP_MINUTES = 15

export function applyFeedback(
  plan: Plan,
  setup: SetupPayload,
  option: FeedbackOption,
  referenceDate: string,
): ReallocationResult {
  const todayIndex = plan.days.findIndex((day) => day.date === referenceDate)
  if (todayIndex < 0) {
    throw new Error('找不到今天的计划，请重新制定计划。')
  }

  const today = plan.days[todayIndex]
  if (!today) {
    throw new Error('今天的计划数据不完整。')
  }
  if (today.feedback) {
    throw new Error('今天的反馈已经记录过了。')
  }

  const plannedMinutes = sumTaskMinutes(today.tasks)
  const targetCompleted = completionTarget(plannedMinutes, option)
  const markedTasks = markCompletion(today.tasks, targetCompleted)
  const completedMinutes = markedTasks.reduce(
    (sum, task) => sum + Math.min(task.completedMinutes, task.minutes),
    0,
  )
  const unfinishedMinutes = plannedMinutes - completedMinutes

  const todayWithFeedback: PlanDay = {
    ...today,
    tasks: markedTasks,
    feedback: {
      option,
      plannedMinutes,
      completedMinutes,
      recordedAt: new Date().toISOString(),
    },
  }

  const assessment = assessExams(setup.exams, referenceDate)
  let futureDays: PlanDay[]
  let carryoverScheduledMinutes = 0
  let droppedMinutes = 0
  let affectedDates: string[] = []

  if (unfinishedMinutes <= 0) {
    futureDays = plan.days.slice(todayIndex + 1)
  } else {
    const seeds: CarryoverSeed[] = markedTasks
      .filter((task) => task.minutes - task.completedMinutes > 0)
      .map((task) => ({
        task: {
          ...task,
          carryoverFrom: today.date,
        },
        remainingMinutes: task.minutes - task.completedMinutes,
      }))

    const futureWindow = buildFutureWindow({
      exams: setup.exams,
      risks: assessment.risks,
      dailyMinutes: plan.dailyMinutes,
      startDate: addDays(referenceDate, 1),
      daysCount: plan.days.length - todayIndex - 1,
      carryover: seeds,
    })
    futureDays = futureWindow.days
    carryoverScheduledMinutes = futureWindow.carryoverScheduledMinutes
    droppedMinutes = futureWindow.droppedMinutes
    affectedDates = futureWindow.affectedDates
  }

  const updatedDays = [
    ...plan.days.slice(0, todayIndex),
    todayWithFeedback,
    ...futureDays,
  ]

  const beforeTotals = examMinutesByExam(plan.days.slice(todayIndex + 1))
  const afterTotals = examMinutesByExam(futureDays)
  const adjustment = buildAdjustment({
    option,
    plannedMinutes,
    completedMinutes,
    unfinishedMinutes,
    carryoverScheduledMinutes,
    droppedMinutes,
    affectedDates,
    dailyMinutes: plan.dailyMinutes,
    futureDays,
    beforeTotals,
    afterTotals,
    risks: assessment.risks,
    exams: setup.exams,
  })

  const updatedPlan: Plan = {
    ...plan,
    days: updatedDays,
    adjustments: [adjustment, ...plan.adjustments].slice(0, 8),
  }

  return {
    plan: updatedPlan,
    adjustment,
    carryoverMinutes: carryoverScheduledMinutes,
    droppedMinutes,
  }
}

function completionTarget(plannedMinutes: number, option: FeedbackOption): number {
  if (option === 'all') return plannedMinutes
  if (option === 'none') return 0
  const half = roundToStep(plannedMinutes * 0.5, FEEDBACK_STEP_MINUTES)
  return clamp(half, 0, plannedMinutes)
}

function markCompletion(tasks: PlanTask[], targetMinutes: number): PlanTask[] {
  const completionOrder = [...tasks].sort((a, b) => {
    if (a.riskLevel !== b.riskLevel) return riskLevelRank(b.riskLevel) - riskLevelRank(a.riskLevel)
    if (a.priority !== b.priority) return a.priority - b.priority
    return b.riskScore - a.riskScore
  })

  const statusById = new Map<
    string,
    { status: PlanTask['status']; completedMinutes: number }
  >()
  let remaining = targetMinutes

  for (const task of completionOrder) {
    if (remaining >= task.minutes) {
      statusById.set(task.id, { status: 'done', completedMinutes: task.minutes })
      remaining -= task.minutes
    } else if (remaining > 0) {
      statusById.set(task.id, { status: 'partial', completedMinutes: remaining })
      remaining = 0
    } else {
      statusById.set(task.id, { status: 'pending', completedMinutes: 0 })
    }
  }

  return tasks.map((task) => {
    const status = statusById.get(task.id) ?? { status: 'pending' as const, completedMinutes: 0 }
    return {
      ...task,
      status: status.status,
      completedMinutes: status.completedMinutes,
    }
  })
}

function buildAdjustment(input: {
  option: FeedbackOption
  plannedMinutes: number
  completedMinutes: number
  unfinishedMinutes: number
  carryoverScheduledMinutes: number
  droppedMinutes: number
  affectedDates: string[]
  dailyMinutes: number
  futureDays: PlanDay[]
  beforeTotals: Map<string, number>
  afterTotals: Map<string, number>
  risks: ExamRisk[]
  exams: SetupPayload['exams']
}): PlanAdjustment {
  const {
    option,
    completedMinutes,
    unfinishedMinutes,
    carryoverScheduledMinutes,
    droppedMinutes,
    affectedDates,
    dailyMinutes,
    futureDays,
    beforeTotals,
    afterTotals,
    risks,
    exams,
  } = input

  const riskByExam = new Map(risks.map((risk) => [risk.exam.id, risk]))
  const examNameById = new Map(exams.map((exam) => [exam.id, exam.name]))
  const details: string[] = []
  let summary = ''

  if (option === 'all' || unfinishedMinutes <= 0) {
    summary = `今天的计划全部完成，未来 ${futureDays.length} 天维持原有节奏，没有任务需要顺延。`
    details.push(`今日完成：${formatMinutes(completedMinutes)}`)
    details.push('未来计划：保持原有风险排序与每日上限')
  } else {
    const carryoverByExam = new Map<string, number>()
    for (const day of futureDays) {
      for (const task of day.tasks) {
        if (task.origin === 'carryover') {
          carryoverByExam.set(task.examId, (carryoverByExam.get(task.examId) ?? 0) + task.minutes)
        }
      }
    }

    const preserved = [...carryoverByExam.entries()]
      .map(([examId, minutes]) => ({
        examId,
        minutes,
        risk: riskByExam.get(examId),
      }))
      .sort((a, b) => (b.risk?.riskScore ?? 0) - (a.risk?.riskScore ?? 0))

    const deltas = [...new Set([...beforeTotals.keys(), ...afterTotals.keys()])].map((examId) => {
      const before = beforeTotals.get(examId) ?? 0
      const after = afterTotals.get(examId) ?? 0
      return {
        examId,
        before,
        after,
        delta: after - before,
        name: examNameById.get(examId) ?? '未知科目',
        risk: riskByExam.get(examId),
      }
    })

    const deferred = deltas
      .filter((item) => item.delta < -14)
      .sort((a, b) => {
        const priorityA = a.risk?.priority ?? 999
        const priorityB = b.risk?.priority ?? 999
        return priorityB - priorityA
      })

    const detailDateText =
      affectedDates.length > 0
        ? affectedDates
            .slice(0, 2)
            .map((date) => `${monthDayLabel(date)} ${weekdayLabel(date)}`)
            .join('、')
        : ''

    const firstPreserved = preserved[0]
    const firstPreservedName = firstPreserved
      ? examNameById.get(firstPreserved.examId) ?? '高优先级科目'
      : ''

    const sentences: string[] = []
    sentences.push(
      option === 'none'
        ? `今天没有完成计划，共少完成 ${formatMinutes(unfinishedMinutes)}。`
        : `今天完成约 ${formatMinutes(completedMinutes)}，少完成 ${formatMinutes(unfinishedMinutes)}。`,
    )

    if (carryoverScheduledMinutes > 0 && firstPreserved) {
      sentences.push(
        `优先保留「${firstPreservedName}」未完成的 ${formatMinutes(carryoverScheduledMinutes)}${
          detailDateText
            ? `，${affectedDates.length > 1 ? '拆分' : '安排'}到 ${detailDateText}`
            : ''
        }。`,
      )
    } else {
      sentences.push('没有可继续顺延的任务。')
    }

    if (deferred.length > 0) {
      const names = deferred
        .slice(0, 2)
        .map((item) => `「${item.name}」`)
        .join('、')
      const deferredMinutes = Math.abs(deferred.reduce((sum, item) => sum + item.delta, 0))
      const onlyLowPriority = deferred.every((item) => item.risk?.riskLevel === 'low')
      sentences.push(
        onlyLowPriority
          ? `${names}的低优先级任务向后移动 ${formatMinutes(deferredMinutes)}。`
          : `为承接顺延，${names}的未来常规任务减少 ${formatMinutes(deferredMinutes)}。`,
      )
    }

    if (droppedMinutes > 0) {
      sentences.push(`受考试日期限制，另有 ${formatMinutes(droppedMinutes)} 无法继续安排。`)
    }

    sentences.push(`所有日期仍不超过每日 ${formatMinutes(dailyMinutes)}。`)
    summary = sentences.join('')

    if (firstPreserved) {
      details.push(
        `保留内容：${firstPreservedName} ${formatMinutes(firstPreserved.minutes)}（${detailDateText || '未来几天'}）`,
      )
    }
    if (deferred.length > 0) {
      details.push(
        `常规任务压缩：${deferred
          .slice(0, 3)
          .map((item) => `${item.name} ${item.delta < 0 ? '−' : '+'}${formatMinutes(Math.abs(item.delta))}`)
          .join('、')}`,
      )
    }
    if (droppedMinutes > 0) {
      details.push(`无法安排：${formatMinutes(droppedMinutes)}（考试日已过或容量不足）`)
    }

    const maxDay = futureDays.reduce(
      (max, day) => Math.max(max, sumTaskMinutes(day.tasks)),
      0,
    )
    details.push(`每日上限：${formatMinutes(dailyMinutes)}，最高单日 ${formatMinutes(maxDay)}`)
  }

  return {
    id: `adjustment-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    feedback: option,
    summary,
    details,
  }
}
