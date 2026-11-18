export type Mastery = 1 | 2 | 3 | 4 | 5
export type Importance = 1 | 2 | 3
export type RiskLevel = 'low' | 'medium' | 'high'
export type FeedbackOption = 'all' | 'partial' | 'none'
export type TaskStatus = 'planned' | 'done' | 'partial' | 'pending'
export type TaskOrigin = 'regular' | 'carryover'

export interface Exam {
  id: string
  name: string
  examDate: string
  mastery: Mastery
  weakChapters: string
  importance: Importance
}

export interface SetupPayload {
  exams: Exam[]
  dailyMinutes: number
}

export interface RiskFactors {
  urgency: number
  mastery: number
  weakness: number
  importance: number
}

export interface ExamRisk {
  exam: Exam
  daysUntilExam: number
  riskScore: number
  riskLevel: RiskLevel
  priority: number
  factors: RiskFactors
  weakChapterList: string[]
  reason: string
  recommendedMinutes: number
}

export interface PlanTask {
  id: string
  examId: string
  examName: string
  chapter: string
  action: string
  minutes: number
  priority: number
  riskLevel: RiskLevel
  riskScore: number
  status: TaskStatus
  completedMinutes: number
  origin: TaskOrigin
  carryoverFrom?: string
}

export interface FeedbackRecord {
  option: FeedbackOption
  plannedMinutes: number
  completedMinutes: number
  recordedAt: string
}

export interface PlanDay {
  date: string
  tasks: PlanTask[]
  feedback?: FeedbackRecord
}

export interface PlanAdjustmentComparison {
  todayPlannedMinutes: number
  todayCompletedMinutes: number
  carryoverMinutes: number
  droppedMinutes: number
  dailyMinutes: number
  examChanges: Array<{
    examId: string
    name: string
    beforeMinutes: number
    afterMinutes: number
    riskLevel: RiskLevel
    priority: number
    colorIndex?: number
  }>
}

export interface PlanAdjustment {
  id: string
  createdAt: string
  feedback: FeedbackOption
  summary: string
  details: string[]
  comparison?: PlanAdjustmentComparison
}

export interface Plan {
  id: string
  createdAt: string
  startDate: string
  dailyMinutes: number
  days: PlanDay[]
  overallRiskScore: number
  overallRiskLevel: RiskLevel
  nearestExamDays: number
  strategy: string
  adjustments: PlanAdjustment[]
}

export interface AnalysisResult {
  risks: ExamRisk[]
  overallRiskScore: number
  overallRiskLevel: RiskLevel
  nearestExamDays: number
  previewPlan: Plan
}

export interface ReallocationResult {
  plan: Plan
  adjustment: PlanAdjustment
  carryoverMinutes: number
  droppedMinutes: number
}

export const MASTERY_OPTIONS = [
  { value: 1, label: '完全不会', short: '不会' },
  { value: 2, label: '不太熟', short: '不太熟' },
  { value: 3, label: '一般', short: '一般' },
  { value: 4, label: '比较熟', short: '较熟' },
  { value: 5, label: '基本掌握', short: '掌握' },
] as const satisfies ReadonlyArray<{ value: Mastery; label: string; short: string }>

export const IMPORTANCE_OPTIONS = [
  { value: 1, label: '普通', short: '普通' },
  { value: 2, label: '重要', short: '重要' },
  { value: 3, label: '非常重要', short: '非常重要' },
] as const satisfies ReadonlyArray<{ value: Importance; label: string; short: string }>

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

export const RISK_SHORT_LABELS: Record<RiskLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

export const FEEDBACK_LABELS: Record<FeedbackOption, string> = {
  all: '全部完成',
  partial: '完成一部分',
  none: '没有完成',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  planned: '待执行',
  done: '已完成',
  partial: '部分完成',
  pending: '未完成',
}
