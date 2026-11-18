import { useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleOff,
  Clock3,
  Compass,
  MinusCircle,
  RefreshCw,
  RotateCcw,
  Share2,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  FEEDBACK_LABELS,
  type FeedbackOption,
  type Plan,
  type PlanAdjustment,
  type PlanAdjustmentComparison,
  type PlanDay,
  type PlanTask,
  type SetupPayload,
} from '../types'
import {
  dateParts,
  monthDayLabel,
  todayKey,
  weekdayLabel,
} from '../lib/dates'
import {
  formatHourUnit,
  formatMinutes,
  formatMinutesCompact,
  formatPercent,
} from '../lib/format'
import {
  examMinutesByExam,
  planTotalMinutes,
  sumTaskMinutes,
} from '../lib/planner'
import { applyFeedback } from '../lib/feedback'
import { buildMarketingReport, STATUS_LABELS } from '../lib/marketing'
import { subjectColor } from '../lib/subjectColors'
import { PriorityBadge } from '../components/PriorityBadge'
import { ProgressBar } from '../components/ProgressBar'
import { StepIndicator } from '../components/StepIndicator'
import { TimeDonut } from '../components/TimeDonut'
import { ShareCardModal } from '../components/ShareCardModal'
import { aiService } from '../services/ai'

interface PlanPageProps {
  plan: Plan
  setup: SetupPayload
  onUpdatePlan: (plan: Plan) => void
}

export function PlanPage({ plan, setup, onUpdatePlan }: PlanPageProps) {
  const today = todayKey()
  const report = useMemo(() => buildMarketingReport(setup, today), [setup, today])
  const todayIndex = plan.days.findIndex((day) => day.date === today)
  const todayDay = todayIndex >= 0 ? plan.days[todayIndex] : undefined
  const latestAdjustment = plan.adjustments[0]
  const totalAllocated = useMemo(() => planTotalMinutes(plan.days), [plan.days])
  const isStale = plan.startDate !== today
  const [feedbackChoice, setFeedbackChoice] = useState<FeedbackOption | null>(null)
  const [feedbackError, setFeedbackError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const allocationItems = useMemo(() => {
    const byExam = new Map<
      string,
      {
        id: string
        name: string
        minutes: number
        riskLevel: PlanTask['riskLevel']
        priority: number
      }
    >()
    for (const day of plan.days) {
      for (const task of day.tasks) {
        const existing = byExam.get(task.examId)
        if (existing) {
          existing.minutes += task.minutes
          existing.priority = Math.min(existing.priority, task.priority)
        } else {
          byExam.set(task.examId, {
            id: task.examId,
            name: task.examName,
            minutes: task.minutes,
            riskLevel: task.riskLevel,
            priority: task.priority,
          })
        }
      }
    }
    return [...byExam.values()]
      .sort((a, b) => a.priority - b.priority)
      .map((item) => ({
        id: item.id,
        name: item.name,
        minutes: item.minutes,
        riskLevel: item.riskLevel,
        colorIndex: setup.exams.findIndex((exam) => exam.id === item.id),
      }))
  }, [plan.days, setup.exams])

  function handleFeedback() {
    if (!feedbackChoice || !todayDay) return
    setSubmitting(true)
    setFeedbackError('')

    try {
      const result = applyFeedback(plan, setup, feedbackChoice, today)
      const comparison = buildComparison(plan, result.plan, setup, today, result)
      const adjustmentWithComparison: PlanAdjustment = {
        ...result.adjustment,
        comparison,
      }
      const planWithComparison: Plan = {
        ...result.plan,
        adjustments: [
          adjustmentWithComparison,
          ...result.plan.adjustments.slice(1),
        ],
      }

      onUpdatePlan(planWithComparison)
      setFeedbackChoice(null)

      void aiService
        .suggestAdjustment({
          plan: planWithComparison,
          adjustment: adjustmentWithComparison,
        })
        .then((text) => {
          if (!text.trim() || text === adjustmentWithComparison.summary) return
          onUpdatePlan({
            ...planWithComparison,
            adjustments: planWithComparison.adjustments.map((item) =>
              item.id === adjustmentWithComparison.id
                ? { ...item, summary: text }
                : item,
            ),
          })
        })
        .catch(() => undefined)
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : '调整失败，请稍后再试。')
    } finally {
      setSubmitting(false)
    }
  }

  function scrollToDay(date: string) {
    document
      .getElementById(`plan-day-${date}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="page plan-page shell">
      <StepIndicator current={4} />

      <header className="plan-page-head">
        <div>
          <p className="eyebrow">7 DAY ACTION / 我的期末计划</p>
          <h1>未来 7 天</h1>
          <p>
            今天只做该做的事。计划生成于 {monthDayLabel(plan.startDate)}，
            每天结束后反馈，系统会重排剩余行动。
          </p>
        </div>
        <div className="plan-page-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setShareOpen(true)}
          >
            <Share2 size={16} />
            分享状态卡
          </button>
          <Link className="back-link" to="/setup">
            <RotateCcw size={14} />
            调整考试状态
          </Link>
        </div>
      </header>

      {isStale && (
        <div className="stale-banner">
          <AlertTriangle size={18} />
          <div>
            <strong>这份计划不是从今天开始的</strong>
            <p>
              日期仍按生成时排列。若你想获得准确的每日反馈与重排，建议重新生成一份 7 天计划。
            </p>
          </div>
          <Link className="text-link" to="/setup">
            重新制定
          </Link>
        </div>
      )}

      <section className="plan-overview">
        <div className="plan-overview-copy">
          <div className="overview-kicker">
            <span className="section-kicker">本周行动总览</span>
            <span className="overview-date">{monthDayLabel(plan.startDate)} 生成</span>
          </div>
          <h2>先完成今天的，再想明天的。</h2>

          <div className="plan-overview-stats">
            <div className="countdown-stat">
              <span>距离最近考试</span>
              <strong>
                {report.nearestDays}
                <small>天</small>
              </strong>
              <em>{report.nearestExam?.name}</em>
            </div>
            <div>
              <span>每日上限</span>
              <strong>{formatHourUnit(plan.dailyMinutes)}</strong>
              <em>所有日期不超时</em>
            </div>
            <div>
              <span>期末准备度</span>
              <strong>{report.readiness}<small>/100</small></strong>
              <em>{report.readinessLabel}</em>
            </div>
            <div>
              <span>整体状态</span>
              <strong className={`risk-text-${plan.overallRiskLevel} stat-label-strong`}>
                {STATUS_LABELS[plan.overallRiskLevel]}
              </strong>
              <em>风险指数 {plan.overallRiskScore}/100</em>
            </div>
          </div>

          <div className="overview-strategy">
            <Compass size={16} />
            <p>{plan.strategy}</p>
          </div>
        </div>

        <div className="plan-resource-panel">
          <div className="resource-panel-head">
            <div>
              <span className="section-kicker">本周复习资源</span>
              <strong>{formatHourUnit(totalAllocated)}</strong>
            </div>
            <span>7 天总投入</span>
          </div>
          <div className="plan-resource-body">
            <TimeDonut items={allocationItems} onDark />
            <div className="plan-resource-legend">
              {allocationItems.map((item, index) => (
                <div key={item.id}>
                  <i style={{ backgroundColor: subjectColor(item.colorIndex ?? index, true) }} />
                  <span>{item.name}</span>
                  <strong>{formatHourUnit(item.minutes)}</strong>
                  <em>{formatPercent(item.minutes, totalAllocated)}%</em>
                </div>
              ))}
            </div>
          </div>
          <div className="plan-resource-foot">
            <ShieldCheck size={14} />
            每天总时长不超过 {formatHourUnit(plan.dailyMinutes)}
          </div>
        </div>
      </section>

      <nav className="week-rail" aria-label="七天计划快速定位">
        {plan.days.map((day, index) => {
          const total = sumTaskMinutes(day.tasks)
          const isToday = day.date === today
          const parts = dateParts(day.date)
          return (
            <button
              key={day.date}
              type="button"
              className={isToday ? 'is-today' : ''}
              onClick={() => scrollToDay(day.date)}
              aria-label={`${monthDayLabel(day.date)} ${weekdayLabel(day.date)}，${formatHourUnit(total)}`}
            >
              <span>{weekdayLabel(day.date).replace('周', '')}</span>
              <strong>{parts.day}</strong>
              <em>{isToday ? '今天' : index === 0 ? '第 1 天' : ''}</em>
              <i>
                <b
                  style={{
                    width: `${plan.dailyMinutes > 0 ? Math.min(100, (total / plan.dailyMinutes) * 100) : 0}%`,
                  }}
                />
              </i>
            </button>
          )
        })}
      </nav>

      {latestAdjustment && <AdjustmentCard adjustment={latestAdjustment} />}

      <section className="plan-days">
        <div className="section-heading">
          <div>
            <span className="section-kicker">逐日行动</span>
            <h2>今天，只做这些</h2>
          </div>
          <span className="section-count">
            {plan.days.filter((day) => day.tasks.length > 0).length} 天有安排
          </span>
        </div>

        <div className="day-list">
          {plan.days.map((day, index) => {
            const isToday = day.date === today
            return (
              <DayCard
                key={day.date}
                day={day}
                index={index}
                dailyMinutes={plan.dailyMinutes}
                today={today}
                isToday={isToday}
              >
                {isToday && (
                  <FeedbackPanel
                    day={day}
                    selected={feedbackChoice}
                    error={feedbackError}
                    submitting={submitting}
                    adjustment={latestAdjustment}
                    onSelect={(choice) => {
                      setFeedbackChoice(choice)
                      setFeedbackError('')
                    }}
                    onSubmit={handleFeedback}
                  />
                )}
              </DayCard>
            )
          })}
        </div>
      </section>

      <div className="plan-endnote">
        <div>
          <span className="section-kicker">计划检查</span>
          <h3>每天不超时，才有执行价值。</h3>
          <p>
            每日任务之和都不超过 {formatMinutes(plan.dailyMinutes)}。若实际执行偏离计划，
            请在当天反馈，系统会优先保留高风险内容并重排剩余日期。
          </p>
        </div>
        <div className="plan-endnote-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setShareOpen(true)}
          >
            <Share2 size={16} />
            分享我的期末状态
          </button>
          <Link className="button button-ghost" to="/setup">
            重新制定
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {shareOpen && (
        <ShareCardModal report={report} onClose={() => setShareOpen(false)} />
      )}
    </div>
  )
}

function buildComparison(
  previousPlan: Plan,
  nextPlan: Plan,
  setup: SetupPayload,
  today: string,
  result: ReturnType<typeof applyFeedback>,
): PlanAdjustmentComparison {
  const before = examMinutesByExam(
    previousPlan.days.filter((day) => day.date > today),
  )
  const after = examMinutesByExam(
    nextPlan.days.filter((day) => day.date > today),
  )
  const focus = buildMarketingReport(setup, today).analysis.risks
  const riskMap = new Map(focus.map((risk) => [risk.exam.id, risk]))
  const todayFeedback = nextPlan.days.find((day) => day.date === today)?.feedback

  const examChanges = setup.exams
    .map((exam) => {
      const risk = riskMap.get(exam.id)
      return {
        examId: exam.id,
        name: exam.name,
        beforeMinutes: before.get(exam.id) ?? 0,
        afterMinutes: after.get(exam.id) ?? 0,
        riskLevel: risk?.riskLevel ?? 'low',
        priority: risk?.priority ?? 99,
        colorIndex: setup.exams.findIndex((entry) => entry.id === exam.id),
      }
    })
    .filter((change) => change.beforeMinutes !== change.afterMinutes)
    .sort((a, b) => a.priority - b.priority)

  return {
    todayPlannedMinutes: todayFeedback?.plannedMinutes ?? 0,
    todayCompletedMinutes: todayFeedback?.completedMinutes ?? 0,
    carryoverMinutes: result.carryoverMinutes,
    droppedMinutes: result.droppedMinutes,
    dailyMinutes: previousPlan.dailyMinutes,
    examChanges,
  }
}

function DayCard({
  day,
  index,
  dailyMinutes,
  today,
  isToday,
  children,
}: {
  day: PlanDay
  index: number
  dailyMinutes: number
  today: string
  isToday: boolean
  children: ReactNode
}) {
  const parts = dateParts(day.date)
  const dayTotal = sumTaskMinutes(day.tasks)
  const isPast = day.date < today
  const feedback = day.feedback
  const completedMinutes = day.tasks.reduce(
    (sum, task) => sum + Math.min(task.completedMinutes, task.minutes),
    0,
  )
  const doneTasks = day.tasks.filter((task) => task.status === 'done').length

  return (
    <article
      id={`plan-day-${day.date}`}
      className={`day-card${isToday ? ' is-today' : ''}${isPast ? ' is-past' : ''}`}
    >
      <header className="day-card-head">
        <div className="day-date">
          {isToday && <span className="today-ribbon">TODAY / 今天</span>}
          <span className="day-number">{parts.day}</span>
          <div>
            <span className="day-month">
              {parts.month} · {weekdayLabel(day.date)}
            </span>
            <span className="day-relative">
              {isToday ? '只做这些' : index === 0 ? '第 1 天' : `第 ${index + 1} 天`}
              {isPast && ' · 已过去'}
            </span>
          </div>
        </div>
        <div className="day-load">
          <span>
            {formatHourUnit(dayTotal)} <small>/ {formatHourUnit(dailyMinutes)}</small>
          </span>
          <ProgressBar
            value={dayTotal}
            total={dailyMinutes}
            label={`${monthDayLabel(day.date)}学习时长`}
          />
        </div>
      </header>

      {isToday && (
        <div className="today-brief">
          <div>
            <span>今日行动</span>
            <strong>
              {day.tasks.length > 0
                ? `${day.tasks[0]?.examName} · ${day.tasks[0]?.chapter}`
                : '今天没有待复习科目'}
            </strong>
          </div>
          <span>
            {doneTasks > 0 ? `已完成 ${doneTasks}/${day.tasks.length}` : `${day.tasks.length} 个任务`}
          </span>
        </div>
      )}

      {feedback && (
        <div className="day-feedback-summary">
          <CheckCircle2 size={15} />
          已记录：{FEEDBACK_LABELS[feedback.option]} · 完成{' '}
          {formatMinutes(completedMinutes)} / {formatMinutes(feedback.plannedMinutes)}
        </div>
      )}

      <div className="task-list">
        {day.tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
        {day.tasks.length === 0 && (
          <div className="no-tasks">
            <CircleOff size={16} />
            没有待复习科目，留给休息或机动。
          </div>
        )}
      </div>

      {children}
    </article>
  )
}

function TaskRow({ task }: { task: PlanTask }) {
  const statusLabel =
    task.status === 'done'
      ? '已完成'
      : task.status === 'partial'
        ? `完成 ${formatMinutesCompact(task.completedMinutes)}`
        : task.status === 'pending'
          ? '未完成'
          : '待执行'

  return (
    <div className={`plan-task task-${task.status}`}>
      <div className="task-duration">
        <Clock3 size={13} />
        {formatMinutesCompact(task.minutes)}
      </div>
      <div className="task-copy">
        <div className="task-meta">
          <span className="task-exam">{task.examName}</span>
          {task.origin === 'carryover' && <span className="task-tag">顺延</span>}
          {statusLabel && (
            <span className={`task-status status-${task.status}`}>
              {task.status === 'done' && <Check size={12} />}
              {statusLabel}
            </span>
          )}
        </div>
        <h3>{task.chapter}</h3>
        <p>{task.action}</p>
      </div>
      <PriorityBadge priority={task.priority} level={task.riskLevel} />
    </div>
  )
}

function FeedbackPanel({
  day,
  selected,
  error,
  submitting,
  adjustment,
  onSelect,
  onSubmit,
}: {
  day: PlanDay
  selected: FeedbackOption | null
  error: string
  submitting: boolean
  adjustment?: PlanAdjustment
  onSelect: (choice: FeedbackOption) => void
  onSubmit: () => void
}) {
  if (day.feedback) {
    return (
      <div className="feedback-recorded">
        <span className="feedback-recorded-icon">
          <CheckCircle2 size={19} />
        </span>
        <div className="feedback-recorded-copy">
          <strong>今日反馈已记录</strong>
          <p>
            {day.feedback.option === 'all'
              ? '全部完成。未来计划维持原有节奏，无需顺延。'
              : `${FEEDBACK_LABELS[day.feedback.option]}。未完成内容已按风险优先级重新安排。`}
          </p>
          {adjustment && (
            <div className="feedback-inline-adjustment">
              <span>调整结果</span>
              <p>{adjustment.summary}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (day.tasks.length === 0) return null

  const options: Array<{
    value: FeedbackOption
    icon: ReactNode
    hint: string
  }> = [
    { value: 'all', icon: <CheckCircle2 size={18} />, hint: '按计划完成' },
    { value: 'partial', icon: <MinusCircle size={18} />, hint: '按约一半估算' },
    { value: 'none', icon: <CircleOff size={18} />, hint: '需要重新分配' },
  ]

  return (
    <section className="feedback-panel" aria-labelledby="feedback-title">
      <div className="feedback-head">
        <div>
          <span className="section-kicker">每日反馈</span>
          <h3 id="feedback-title">今天的计划完成了吗？</h3>
          <p>反馈会用于重排剩余日期，但不会改变考试优先级本身。</p>
        </div>
        <span className="feedback-days-left">今天</span>
      </div>

      <div className="feedback-options" role="radiogroup" aria-label="今日计划完成情况">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected === option.value}
            className={selected === option.value ? 'is-selected' : ''}
            onClick={() => onSelect(option.value)}
          >
            <span className="feedback-option-icon">{option.icon}</span>
            <strong>{FEEDBACK_LABELS[option.value]}</strong>
            <small>{option.hint}</small>
          </button>
        ))}
      </div>

      {selected === 'partial' && (
        <p className="feedback-hint">
          “完成一部分”会按计划时长的约 50% 估算，并优先勾销高风险任务。
        </p>
      )}
      {selected === 'none' && (
        <p className="feedback-hint">
          未完成任务会按风险优先级顺延，低优先级内容可能被后移。单日上限不会提高。
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <button
        className="button button-primary feedback-submit"
        type="button"
        disabled={!selected || submitting}
        onClick={onSubmit}
      >
        {submitting ? '正在重排…' : '提交反馈并调整后续计划'}
        <RefreshCw size={16} />
      </button>
    </section>
  )
}

function AdjustmentCard({ adjustment }: { adjustment: PlanAdjustment }) {
  const comparison = adjustment.comparison
  const deferredMinutes = comparison
    ? comparison.examChanges.reduce(
        (sum, change) => sum + Math.max(0, change.beforeMinutes - change.afterMinutes),
        0,
      )
    : 0

  return (
    <section
      className="adjustment-card adjustment-card-marketing"
      aria-label="计划调整说明"
      role="status"
      aria-live="polite"
    >
      <div className="adjustment-head">
        <div className="adjustment-title">
          <span className="adjustment-icon">
            <RefreshCw size={17} />
          </span>
          <div>
            <span className="section-kicker">PLAN CHANGED</span>
            <strong>计划已重新调整</strong>
          </div>
        </div>
        <span className="adjustment-feedback-pill">
          {FEEDBACK_LABELS[adjustment.feedback]}
        </span>
      </div>

      <div className="adjustment-body">
        <div className="adjustment-summary-block">
          <span className="section-kicker">发生了什么</span>
          <h3>你的计划变聪明了一点。</h3>
          <p className="adjustment-summary">{adjustment.summary}</p>
          <ul className="adjustment-principles">
            <li>
              <span>01</span>
              高风险任务优先保留
            </li>
            <li>
              <span>02</span>
              低优先级内容向后移动
            </li>
            <li>
              <span>03</span>
              每日上限不被突破
            </li>
          </ul>
          {!comparison && (
            <ul className="adjustment-details">
              {adjustment.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>

        {comparison && (
          <div className="adjustment-comparison">
            <div className="adjustment-metrics">
              <div>
                <span>今日完成</span>
                <strong>
                  {formatMinutes(comparison.todayCompletedMinutes)}
                  <small> / {formatMinutes(comparison.todayPlannedMinutes)}</small>
                </strong>
              </div>
              <div>
                <span>顺延保留</span>
                <strong>{formatMinutes(comparison.carryoverMinutes)}</strong>
              </div>
              <div>
                <span>常规任务让位</span>
                <strong>{formatMinutes(deferredMinutes)}</strong>
              </div>
              <div>
                <span>每日上限</span>
                <strong>≤ {formatHourUnit(comparison.dailyMinutes)}</strong>
              </div>
            </div>

            <div className="before-after">
              <div className="before-after-head">
                <span>未来 6 天投入</span>
                <span>Before → After</span>
              </div>
              {comparison.examChanges.length > 0 ? (
                <>
                  {comparison.examChanges.map((change, index) => (
                    <div className="change-row" key={change.examId}>
                      <i style={{ backgroundColor: subjectColor(change.colorIndex ?? index) }} />
                      <strong>{change.name}</strong>
                      <span className="change-before">{formatHourUnit(change.beforeMinutes)}</span>
                      <ArrowRight size={13} />
                      <span className="change-after">{formatHourUnit(change.afterMinutes)}</span>
                      <em>
                        {change.afterMinutes - change.beforeMinutes > 0 ? '+' : '−'}
                        {formatMinutesCompact(
                          Math.abs(change.afterMinutes - change.beforeMinutes),
                        )}
                      </em>
                    </div>
                  ))}
                  <p className="before-after-note">
                    顺延内容已计入对应科目；其余微调来自剩余容量的再平衡，科目优先级不变。
                  </p>
                </>
              ) : (
                <p className="before-after-empty">
                  {comparison.carryoverMinutes > 0
                    ? '各科总投入不变，顺延内容已替换对应时段的常规任务。'
                    : '未来计划保持不变，没有需要顺延的任务。'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="adjustment-foot">
        <ShieldCheck size={14} />
        {comparison
          ? `新的每日总时长仍控制在 ${formatHourUnit(comparison.dailyMinutes)} 以内。`
          : '所有日期仍不超过用户设置的每日上限。'}
      </div>
    </section>
  )
}
