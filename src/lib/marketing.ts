import type {
  AnalysisResult,
  Exam,
  ExamRisk,
  RiskLevel,
  SetupPayload,
} from '../types'
import { IMPORTANCE_OPTIONS, MASTERY_OPTIONS } from '../types'
import { relativeExamLabel } from './dates'
import { formatHourUnit, formatMinutes } from './format'
import { buildAnalysis } from './planner'

export interface MarketingReport {
  analysis: AnalysisResult
  readiness: number
  readinessLabel: string
  status: RiskLevel
  statusLabel: string
  statusHeadline: string
  statusDescription: string
  mainProblem: string
  problemPoints: string[]
  focusRisk: ExamRisk
  focusReasonChips: string[]
  nearestRisk: ExamRisk
  nearestExam?: Exam
  nearestDays: number
  weeklyCapacityMinutes: number
  highRiskCount: number
  allocationItems: Array<{
    id: string
    name: string
    minutes: number
    riskLevel: RiskLevel
    colorIndex: number
  }>
  shareHook: string
}

export const STATUS_LABELS: Record<RiskLevel, string> = {
  high: '中高风险',
  medium: '中等风险',
  low: '状态较稳',
}

function resolveMainProblem(status: RiskLevel, highRiskCount: number): string {
  if (status === 'high') {
    return highRiskCount > 1
      ? '门门都救，等于门门都救不到。'
      : '时间只够重点救一门，先保最能改变结果的那门。'
  }
  if (status === 'medium') {
    return '时间还够，前提是别平均分配。'
  }
  return '状态在线，保持节奏比临时加量更重要。'
}

export function buildMarketingReport(
  setup: SetupPayload,
  referenceDate: string,
): MarketingReport {
  return buildMarketingReportFromAnalysis(
    setup,
    buildAnalysis(setup, referenceDate),
  )
}

export function buildMarketingReportFromAnalysis(
  setup: SetupPayload,
  analysis: AnalysisResult,
): MarketingReport {
  const risks = analysis.risks
  const focusRisk = risks[0]
  if (!focusRisk) {
    throw new Error('至少需要一门考试才能生成期末诊断。')
  }

  const nearestRisk = [...risks].sort(
    (a, b) => a.daysUntilExam - b.daysUntilExam,
  )[0] ?? focusRisk
  const nearestExam = nearestRisk.exam
  const highRiskCount = risks.filter((risk) => risk.riskLevel === 'high').length
  const readiness = Math.max(
    12,
    Math.min(96, Math.round(100 - analysis.overallRiskScore * 0.55)),
  )
  const focusMasteryLabel =
    MASTERY_OPTIONS.find((item) => item.value === focusRisk.exam.mastery)?.label ??
    '一般'
  const focusImportanceLabel =
    IMPORTANCE_OPTIONS.find((item) => item.value === focusRisk.exam.importance)
      ?.label ?? '重要'
  const weakCount = focusRisk.weakChapterList.length

  const problemPoints: string[] = [
    `${relativeExamLabel(focusRisk.daysUntilExam)}，但「${focusRisk.exam.name}」掌握度只有 ${focusRisk.exam.mastery}/5，${weakCount > 0 ? `还有 ${weakCount} 个薄弱章节。` : '需要先做整体梳理。'}`,
  ]

  if (nearestRisk.exam.id !== focusRisk.exam.id) {
    problemPoints.push(
      `最早开考的是「${nearestRisk.exam.name}」，最高优先级却是「${focusRisk.exam.name}」。只按日期排，会把时间放错地方。`,
    )
  } else {
    problemPoints.push(
      `它是当前最需要抢救的科目：${focusImportanceLabel}，掌握程度为${focusMasteryLabel}。`,
    )
  }

  if (highRiskCount > 1) {
    problemPoints.push(
      `${highRiskCount} 门考试处于高风险区，平均用力会让每一门都不够。`,
    )
  } else {
    problemPoints.push(
      `未来 7 天共 ${formatHourUnit(setup.dailyMinutes * 7)} 可分配，每天上限 ${formatMinutes(setup.dailyMinutes)}。`,
    )
  }

  const status = analysis.overallRiskLevel
  const statusHeadline =
    status === 'high'
      ? '还有翻盘空间，但时间必须重排。'
      : status === 'medium'
        ? '局面可控，先补齐最薄弱的环节。'
        : '节奏稳定，守住计划就能赢。'

  const statusDescription =
    status === 'high'
      ? '多门考试同时逼近安全线。先把时间给最危险的科目，其余按最低配额推进。'
      : status === 'medium'
        ? '整体仍有回旋余地。把时间集中到最高风险的科目上，比平均复习更有效。'
        : '整体风险不高。保持最低复习配额，避免临近考试才发现遗漏。'

  const focusReasonChips = [
    relativeExamLabel(focusRisk.daysUntilExam),
    `掌握度 ${focusRisk.exam.mastery}/5`,
    weakCount > 0 ? `${weakCount} 个薄弱章节` : '需要整体梳理',
    focusImportanceLabel,
  ]

  return {
    analysis,
    readiness,
    readinessLabel:
      status === 'high' ? '需要急救' : status === 'medium' ? '需要聚焦' : '状态在线',
    status,
    statusLabel: STATUS_LABELS[status],
    statusHeadline,
    statusDescription,
    mainProblem: resolveMainProblem(status, highRiskCount),
    problemPoints: problemPoints.slice(0, 3),
    focusRisk,
    focusReasonChips,
    nearestRisk,
    nearestExam,
    nearestDays: nearestRisk.daysUntilExam,
    weeklyCapacityMinutes: setup.dailyMinutes * 7,
    highRiskCount,
    allocationItems: risks.map((risk) => ({
      id: risk.exam.id,
      name: risk.exam.name,
      minutes: risk.recommendedMinutes,
      riskLevel: risk.riskLevel,
      colorIndex: setup.exams.findIndex((exam) => exam.id === risk.exam.id),
    })),
    shareHook: '测测你的期末状态 →',
  }
}
