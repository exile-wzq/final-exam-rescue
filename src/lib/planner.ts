import type {
  AnalysisResult,
  ExamRisk,
  Exam,
  Plan,
  PlanDay,
  PlanTask,
  SetupPayload,
} from '../types'
import { addDays, diffCalendarDays } from './dates'
import { formatMinutes } from './format'
import { assessExams, riskLevelRank } from './risk'

export const HORIZON_DAYS = 7
export const DAILY_BLOCK_MINUTES = 30
export const TASK_MAX_MINUTES = 60

let idCounter = 0

function makeId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`
}

export interface CarryoverSeed {
  task: PlanTask
  remainingMinutes: number
}

export interface FutureWindowResult {
  days: PlanDay[]
  carryoverScheduledMinutes: number
  droppedMinutes: number
  affectedDates: string[]
}

export function buildAnalysis(setup: SetupPayload, referenceDate: string): AnalysisResult {
  const assessment = assessExams(setup.exams, referenceDate)
  const previewPlan = createPlan(setup, referenceDate, assessment)
  const totals = examMinutesByExam(previewPlan.days)

  return {
    ...assessment,
    risks: assessment.risks.map((risk) => ({
      ...risk,
      recommendedMinutes: totals.get(risk.exam.id) ?? 0,
    })),
    previewPlan,
  }
}

export function buildPlan(setup: SetupPayload, referenceDate: string): Plan {
  const assessment = assessExams(setup.exams, referenceDate)
  return createPlan(setup, referenceDate, assessment)
}

function createPlan(
  setup: SetupPayload,
  referenceDate: string,
  assessment: ReturnType<typeof assessExams>,
): Plan {
  const window = buildFutureWindow({
    exams: setup.exams,
    risks: assessment.risks,
    dailyMinutes: setup.dailyMinutes,
    startDate: referenceDate,
    daysCount: HORIZON_DAYS,
  })

  return {
    id: makeId('plan'),
    createdAt: new Date().toISOString(),
    startDate: referenceDate,
    dailyMinutes: setup.dailyMinutes,
    days: window.days,
    overallRiskScore: assessment.overallRiskScore,
    overallRiskLevel: assessment.overallRiskLevel,
    nearestExamDays: assessment.nearestExamDays,
    strategy: composeStrategy(assessment.risks, setup.dailyMinutes),
    adjustments: [],
  }
}

export function buildFutureWindow(input: {
  exams: Exam[]
  risks: ExamRisk[]
  dailyMinutes: number
  startDate: string
  daysCount: number
  carryover?: CarryoverSeed[]
}): FutureWindowResult {
  const { exams, risks, dailyMinutes, startDate, daysCount, carryover = [] } = input
  const dates = Array.from({ length: daysCount }, (_, index) => addDays(startDate, index))
  const dayTasks = new Map<string, PlanTask[]>()
  dates.forEach((date) => dayTasks.set(date, []))

  const carryoverCap = Math.min(
    dailyMinutes,
    Math.max(DAILY_BLOCK_MINUTES, Math.floor((dailyMinutes * 0.5) / DAILY_BLOCK_MINUTES) * DAILY_BLOCK_MINUTES),
  )
  const carryoverUsed = new Map<string, number>(dates.map((date) => [date, 0]))
  const affectedDates = new Set<string>()
  let carryoverScheduledMinutes = 0
  let droppedMinutes = 0

  const seeds = carryover
    .filter((seed) => seed.remainingMinutes > 0)
    .sort((a, b) => {
      if (b.task.riskScore !== a.task.riskScore) return b.task.riskScore - a.task.riskScore
      return a.task.priority - b.task.priority
    })

  for (const seed of seeds) {
    const exam = exams.find((item) => item.id === seed.task.examId)
    if (!exam) {
      droppedMinutes += seed.remainingMinutes
      continue
    }

    let remaining = seed.remainingMinutes

    for (const date of dates) {
      if (remaining <= 0) break
      if (diffCalendarDays(date, exam.examDate) < 0) continue

      const used = carryoverUsed.get(date) ?? 0
      const capLeft = carryoverCap - used
      if (capLeft < 15) continue

      const chunk = Math.min(remaining, capLeft, TASK_MAX_MINUTES)
      const roundedChunk = Math.floor(chunk / 15) * 15
      if (roundedChunk < 15) continue

      const tasks = dayTasks.get(date)
      if (!tasks) continue

      addCarryoverTask(tasks, seed.task, roundedChunk, date)
      carryoverUsed.set(date, used + roundedChunk)
      carryoverScheduledMinutes += roundedChunk
      affectedDates.add(date)
      remaining -= roundedChunk
    }

    if (remaining > 0) {
      droppedMinutes += remaining
    }
  }

  const days: PlanDay[] = dates.map((date) => {
    const tasks = dayTasks.get(date) ?? []
    const usedMinutes = sumTaskMinutes(tasks)
    const capacity = Math.max(0, dailyMinutes - usedMinutes)
    const regularMinutes = allocateRegularMinutes(risks, date, capacity)
    const regularTasks = createRegularTasks(date, regularMinutes)

    return {
      date,
      tasks: sortTasks([...tasks, ...regularTasks]),
    }
  })

  return {
    days,
    carryoverScheduledMinutes,
    droppedMinutes,
    affectedDates: [...affectedDates],
  }
}

export function allocateRegularMinutes(
  risks: ExamRisk[],
  date: string,
  capacityMinutes: number,
): Array<{ risk: ExamRisk; minutes: number }> {
  const units = Math.floor(capacityMinutes / DAILY_BLOCK_MINUTES)
  if (units <= 0) return []

  const eligible = risks.filter((risk) => diffCalendarDays(date, risk.exam.examDate) >= 0)
  if (eligible.length === 0) return []

  const weights = eligible.map((risk) => {
    const daysToExam = Math.max(0, diffCalendarDays(date, risk.exam.examDate))
    const urgencyMultiplier = 1 + 1.4 / Math.max(1, daysToExam + 1)
    return Math.max(10, risk.riskScore - 15) * urgencyMultiplier
  })

  const counts = new Array<number>(eligible.length).fill(0)
  let remainingUnits = units

  // Give every eligible subject a small floor when the day has enough room,
  // then distribute the rest by risk. This avoids silently starving a subject.
  if (units >= eligible.length) {
    counts.fill(1)
    remainingUnits = units - eligible.length
  } else {
    const order = eligible
      .map((_, index) => ({ index, weight: weights[index] ?? 0 }))
      .sort((a, b) => b.weight - a.weight)
    for (let index = 0; index < units; index += 1) {
      const target = order[index]
      if (target) counts[target.index] = (counts[target.index] ?? 0) + 1
    }
    remainingUnits = 0
  }

  if (remainingUnits > 0) {
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
    const raw = weights.map((weight) => (remainingUnits * weight) / weightSum)
    const floors = raw.map((value) => Math.floor(value))
    let assigned = floors.reduce((sum, value) => sum + value, 0)
    floors.forEach((value, index) => {
      counts[index] = (counts[index] ?? 0) + value
    })

    const fractions = raw
      .map((value, index) => ({
        index,
        fraction: value - Math.floor(value),
        priority: eligible[index]?.priority ?? 999,
      }))
      .sort((a, b) => {
        if (b.fraction !== a.fraction) return b.fraction - a.fraction
        return a.priority - b.priority
      })

    let cursor = 0
    while (assigned < remainingUnits) {
      const target = fractions[cursor % fractions.length]
      if (target) counts[target.index] = (counts[target.index] ?? 0) + 1
      assigned += 1
      cursor += 1
    }
  }

  return eligible
    .map((risk, index) => ({
      risk,
      minutes: (counts[index] ?? 0) * DAILY_BLOCK_MINUTES,
    }))
    .filter((allocation) => allocation.minutes > 0)
    .sort((a, b) => a.risk.priority - b.risk.priority)
}

function createRegularTasks(
  date: string,
  allocations: Array<{ risk: ExamRisk; minutes: number }>,
): PlanTask[] {
  const tasks: PlanTask[] = []

  for (const { risk, minutes } of allocations) {
    const chunks = splitTaskMinutes(minutes)
    chunks.forEach((chunk, chunkIndex) => {
      const chapter = pickChapter(risk, date, chunkIndex)
      const daysToExam = Math.max(0, diffCalendarDays(date, risk.exam.examDate))
      tasks.push({
        id: `regular-${date}-${risk.exam.id}-${chunkIndex}`,
        examId: risk.exam.id,
        examName: risk.exam.name,
        chapter,
        action: actionFor(risk.exam, daysToExam),
        minutes: chunk,
        priority: risk.priority,
        riskLevel: risk.riskLevel,
        riskScore: risk.riskScore,
        status: 'planned',
        completedMinutes: 0,
        origin: 'regular',
      })
    })
  }

  return tasks
}

function splitTaskMinutes(minutes: number): number[] {
  if (minutes <= TASK_MAX_MINUTES) return [minutes]
  const chunks: number[] = []
  let remaining = minutes
  while (remaining > 0) {
    const chunk = Math.min(TASK_MAX_MINUTES, remaining)
    chunks.push(chunk)
    remaining -= chunk
  }
  return chunks
}

function pickChapter(risk: ExamRisk, date: string, chunkIndex: number): string {
  const chapters =
    risk.weakChapterList.length > 0
      ? risk.weakChapterList
      : ['整体框架', '高频考点', '错题回顾']
  const ordinal = diffCalendarDays('1970-01-01', date)
  const index = Math.abs(ordinal + risk.priority * 2 + chunkIndex) % chapters.length
  return chapters[index] ?? chapters[0] ?? '整体框架'
}

function actionFor(exam: Exam, daysToExam: number): string {
  if (daysToExam <= 1) return '考前速览 + 易错点'
  if (exam.mastery === 1) return '基础补强 + 概念例题'
  if (exam.mastery === 2) return '基础补强 + 重点例题'
  if (exam.mastery === 3) return '专题训练 + 薄弱点突破'
  if (exam.mastery === 4) return '限时训练 + 查漏补缺'
  return '真题演练 + 保持手感'
}

function addCarryoverTask(
  tasks: PlanTask[],
  source: PlanTask,
  minutes: number,
  date: string,
): void {
  const existing = tasks.find(
    (task) =>
      task.origin === 'carryover' &&
      task.examId === source.examId &&
      task.chapter === source.chapter &&
      task.action === source.action &&
      task.carryoverFrom === source.carryoverFrom,
  )

  if (existing) {
    existing.minutes += minutes
    return
  }

  tasks.push({
    id: `carry-${date}-${source.id}`,
    examId: source.examId,
    examName: source.examName,
    chapter: source.chapter,
    action: source.action,
    minutes,
    priority: source.priority,
    riskLevel: source.riskLevel,
    riskScore: source.riskScore,
    status: 'planned',
    completedMinutes: 0,
    origin: 'carryover',
    carryoverFrom: source.carryoverFrom ?? new Date().toISOString().slice(0, 10),
  })
}

export function sortTasks(tasks: PlanTask[]): PlanTask[] {
  return [...tasks].sort((a, b) => {
    if (a.riskLevel !== b.riskLevel) return riskLevelRank(b.riskLevel) - riskLevelRank(a.riskLevel)
    if (a.priority !== b.priority) return a.priority - b.priority
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore
    return b.minutes - a.minutes
  })
}

export function sumTaskMinutes(tasks: PlanTask[]): number {
  return tasks.reduce((sum, task) => sum + task.minutes, 0)
}

export function planTotalMinutes(days: PlanDay[]): number {
  return days.reduce((sum, day) => sum + sumTaskMinutes(day.tasks), 0)
}

export function examMinutesByExam(days: PlanDay[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const day of days) {
    for (const task of day.tasks) {
      totals.set(task.examId, (totals.get(task.examId) ?? 0) + task.minutes)
    }
  }
  return totals
}

export function composeStrategy(risks: ExamRisk[], dailyMinutes: number): string {
  if (risks.length === 0) return '添加考试后，系统会生成时间分配策略。'

  const top = risks[0]
  const nearest = [...risks].sort((a, b) => a.daysUntilExam - b.daysUntilExam)[0]
  const highRiskNames = risks
    .filter((risk) => risk.riskLevel === 'high')
    .slice(0, 2)
    .map((risk) => `「${risk.exam.name}」`)

  if (!top) return '系统会按风险而不是考试日期排序。'

  const parts: string[] = []
  if (highRiskNames.length > 0) {
    parts.push(`优先保障${highRiskNames.join('、')}`)
  } else {
    parts.push(`优先保障优先级最高的「${top.exam.name}」`)
  }

  if (nearest && nearest.exam.id !== top.exam.id) {
    parts.push(`最紧的「${nearest.exam.name}」还有 ${nearest.daysUntilExam} 天开考，会随日期临近自动提高权重`)
  } else if (nearest) {
    parts.push(`它还有 ${nearest.daysUntilExam} 天开考，任务会前置安排`)
  }

  parts.push(`每日总复习量严格限制在 ${formatMinutes(dailyMinutes)} 内，低优先级任务会排到计划后段`)
  return `${parts.join('；')}。`
}
