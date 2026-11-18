import type { ExamRisk, Plan, PlanAdjustment } from '../types'
import { formatMinutes } from '../lib/format'

export interface RiskExplanationInput {
  risks: ExamRisk[]
  overallRiskScore: number
  overallRiskLevel: string
  dailyMinutes: number
}

export interface AllocationExplanationInput {
  plan: Plan
  risks: ExamRisk[]
}

export interface AdjustmentExplanationInput {
  plan: Plan
  adjustment: PlanAdjustment
}

export interface ChapterTaskInput {
  examName: string
  chapter: string
  mastery: number
  daysUntilExam: number
  fallbackAction: string
}

export interface AIService {
  readonly mode: 'local' | 'remote'
  explainRisk(input: RiskExplanationInput): Promise<string>
  suggestChapterTask(input: ChapterTaskInput): Promise<string>
  explainAllocation(input: AllocationExplanationInput): Promise<string>
  suggestAdjustment(input: AdjustmentExplanationInput): Promise<string>
}

const FACTOR_LABELS = [
  { key: 'urgency' as const, label: '考试临近' },
  { key: 'mastery' as const, label: '掌握缺口' },
  { key: 'weakness' as const, label: '薄弱章节' },
  { key: 'importance' as const, label: '考试重要度' },
]

export function localRiskExplanation(input: RiskExplanationInput): string {
  const { risks } = input
  if (risks.length === 0) return '添加考试后，系统会解释风险排序依据。'

  const top = risks[0]
  const nearest = [...risks].sort((a, b) => a.daysUntilExam - b.daysUntilExam)[0]
  if (!top) return '添加考试后，系统会解释风险排序依据。'

  const strongest = [...FACTOR_LABELS]
    .sort((a, b) => top.factors[b.key] - top.factors[a.key])
    .slice(0, 2)
    .map((item) => item.label)
    .join('、')

  const prefix =
    nearest && nearest.exam.id !== top.exam.id
      ? `优先级最高的不是最早开考的「${nearest.exam.name}」，而是「${top.exam.name}」。`
      : `优先级最高的是「${top.exam.name}」。`

  return `${prefix}系统同时考虑距考试时间、掌握程度、薄弱章节和考试重要度，其中${strongest}对它的影响最大。它不是单纯按考试日期排序，因此更难、更重要但与考试尚有一段距离的科目也可能被提前。`
}

export function localAllocationExplanation(input: AllocationExplanationInput): string {
  const { plan, risks } = input
  const totals = new Map<string, number>()
  for (const day of plan.days) {
    for (const task of day.tasks) {
      totals.set(task.examId, (totals.get(task.examId) ?? 0) + task.minutes)
    }
  }

  const allocations = risks
    .map((risk) => ({
      name: risk.exam.name,
      minutes: totals.get(risk.exam.id) ?? 0,
      riskLevel: risk.riskLevel,
      daysUntilExam: risk.daysUntilExam,
      priority: risk.priority,
    }))
    .filter((item) => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)

  if (allocations.length === 0) return '未来 7 天没有可安排的复习任务。'

  const allocationText = allocations
    .slice(0, 3)
    .map((item) => `${item.name} ${formatMinutes(item.minutes)}`)
    .join('、')
  const topPriority = [...allocations].sort((a, b) => a.priority - b.priority)[0]
  const largerLater = topPriority
    ? allocations.find(
        (item) =>
          item.priority > topPriority.priority &&
          item.minutes > topPriority.minutes &&
          item.daysUntilExam > topPriority.daysUntilExam,
      )
    : undefined

  const dateLimitNote =
    topPriority && largerLater
      ? `「${topPriority.name}」考前只剩 ${topPriority.daysUntilExam} 天，可安排的日期更少，所以系统在它可用的每一天提高了权重；「${largerLater.name}」在后续日期接棒，7 天总量更高不代表优先级更高。`
      : '高优先级科目获得更高的单日权重，同时每门考试都保留最低复习配额。'

  return `未来 7 天共安排 ${formatMinutes(
    allocations.reduce((sum, item) => sum + item.minutes, 0),
  )}：${allocationText}。${dateLimitNote}每天的总时长被硬性限制在 ${formatMinutes(
    plan.dailyMinutes,
  )} 以内。`
}

export function localChapterTask(input: ChapterTaskInput): string {
  if (input.daysUntilExam <= 1) {
    return `用 30 分钟速览「${input.chapter}」的公式与易错点，再完成 1 组限时题并核对。`
  }
  if (input.mastery <= 2) {
    return `先用 30 分钟补齐「${input.chapter}」的概念框架，再做 2 道例题和 1 道错题复盘。`
  }
  if (input.mastery === 3) {
    return `围绕「${input.chapter}」做一组 45 分钟专题训练，最后用 15 分钟整理错因。`
  }
  return `以「${input.chapter}」为主做限时训练，重点检查边界条件与常见失分点。`
}

export function localAdjustmentExplanation(input: AdjustmentExplanationInput): string {
  return input.adjustment.summary
}

class LocalAIService implements AIService {
  readonly mode = 'local' as const

  async explainRisk(input: RiskExplanationInput): Promise<string> {
    return localRiskExplanation(input)
  }

  async suggestChapterTask(input: ChapterTaskInput): Promise<string> {
    return localChapterTask(input)
  }

  async explainAllocation(input: AllocationExplanationInput): Promise<string> {
    return localAllocationExplanation(input)
  }

  async suggestAdjustment(input: AdjustmentExplanationInput): Promise<string> {
    return localAdjustmentExplanation(input)
  }
}

class RemoteAIService implements AIService {
  readonly mode = 'remote' as const

  constructor(private readonly endpoint: string) {}

  async explainRisk(input: RiskExplanationInput): Promise<string> {
    return this.generate('explain-risk', input, () => localRiskExplanation(input))
  }

  async suggestChapterTask(input: ChapterTaskInput): Promise<string> {
    return this.generate('suggest-chapter-task', input, () => localChapterTask(input))
  }

  async explainAllocation(input: AllocationExplanationInput): Promise<string> {
    return this.generate('explain-allocation', input, () => localAllocationExplanation(input))
  }

  async suggestAdjustment(input: AdjustmentExplanationInput): Promise<string> {
    return this.generate('suggest-adjustment', input, () => localAdjustmentExplanation(input))
  }

  private async generate<T>(
    task: string,
    input: T,
    fallback: () => string,
  ): Promise<string> {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, input, locale: 'zh-CN' }),
        signal: controller.signal,
      })
      if (!response.ok) return fallback()
      const data = (await response.json()) as { text?: unknown }
      return typeof data.text === 'string' && data.text.trim().length > 0
        ? data.text.trim()
        : fallback()
    } catch {
      return fallback()
    } finally {
      window.clearTimeout(timeout)
    }
  }
}

export function createAIService(): AIService {
  const endpoint = import.meta.env.VITE_AI_ENDPOINT?.trim()
  if (endpoint) return new RemoteAIService(endpoint)
  return new LocalAIService()
}

export const aiService = createAIService()
