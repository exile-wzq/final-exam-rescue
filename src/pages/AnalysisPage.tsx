import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Info,
  Share2,
  Target,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { ExamRisk, Plan, SetupPayload } from '../types'
import { IMPORTANCE_OPTIONS, MASTERY_OPTIONS } from '../types'
import { formatHourUnit, formatMinutes, formatPercent } from '../lib/format'
import { monthDayLabel, todayKey } from '../lib/dates'
import { buildPlan, planTotalMinutes } from '../lib/planner'
import { buildMarketingReport } from '../lib/marketing'
import { subjectColor } from '../lib/subjectColors'
import { RiskBadge } from '../components/RiskBadge'
import { ReadinessRing } from '../components/ReadinessRing'
import { RiskMatrix } from '../components/RiskMatrix'
import { TimeDonut } from '../components/TimeDonut'
import { StepIndicator } from '../components/StepIndicator'
import { ShareCardModal } from '../components/ShareCardModal'
import {
  aiService,
  localAllocationExplanation,
  localRiskExplanation,
  type AllocationExplanationInput,
  type RiskExplanationInput,
} from '../services/ai'

export function AnalysisPage({
  setup,
  onGenerate,
}: {
  setup: SetupPayload
  onGenerate: (plan: Plan) => void
}) {
  const navigate = useNavigate()
  const today = todayKey()
  const report = useMemo(() => buildMarketingReport(setup, today), [setup, today])
  const analysis = report.analysis
  const totalAllocated = useMemo(
    () => planTotalMinutes(analysis.previewPlan.days),
    [analysis.previewPlan.days],
  )
  const [shareOpen, setShareOpen] = useState(false)

  const riskInput = useMemo<RiskExplanationInput>(
    () => ({
      risks: analysis.risks,
      overallRiskScore: analysis.overallRiskScore,
      overallRiskLevel: analysis.overallRiskLevel,
      dailyMinutes: setup.dailyMinutes,
    }),
    [analysis, setup.dailyMinutes],
  )
  const allocationInput = useMemo<AllocationExplanationInput>(
    () => ({ plan: analysis.previewPlan, risks: analysis.risks }),
    [analysis],
  )

  const [riskText, setRiskText] = useState(() => localRiskExplanation(riskInput))
  const [allocationText, setAllocationText] = useState(() =>
    localAllocationExplanation(allocationInput),
  )
  const riskSummary = summarize(riskText, 2)
  const allocationSummary = summarize(allocationText, 2)

  useEffect(() => {
    let active = true
    setRiskText(localRiskExplanation(riskInput))
    setAllocationText(localAllocationExplanation(allocationInput))

    void aiService
      .explainRisk(riskInput)
      .then((text) => {
        if (active && text.trim()) setRiskText(text)
      })
      .catch(() => undefined)
    void aiService
      .explainAllocation(allocationInput)
      .then((text) => {
        if (active && text.trim()) setAllocationText(text)
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [riskInput, allocationInput])

  return (
    <div className="page shell diagnosis-page">
      <StepIndicator current={3} />

      <div className="diagnosis-topbar">
        <Link className="back-link" to="/setup">
          <ArrowLeft size={15} />
          返回修改状态
        </Link>
        <span className="diagnosis-report-id">
          DIAGNOSIS REPORT · {monthDayLabel(today)}
        </span>
      </div>

      <section className={`diagnosis-hero diagnosis-hero-${analysis.overallRiskLevel}`}>
        <div className="diagnosis-hero-copy">
          <span className="diagnosis-kicker">
            <span className="live-dot" />
            期末时间体检结果
          </span>
          <h1>你的期末状态</h1>
          <div className="diagnosis-status-line">
            <span className={`diagnosis-status-pill diagnosis-status-${analysis.overallRiskLevel}`}>
              {report.statusLabel}
            </span>
            <span>风险指数 {analysis.overallRiskScore}/100</span>
            <span>·</span>
            <span>{report.readinessLabel}</span>
          </div>
          <h2>{report.statusHeadline}</h2>
          <p>{report.statusDescription}</p>
          <div className="diagnosis-hero-actions">
            <button
              className="button button-light"
              type="button"
              onClick={() => setShareOpen(true)}
            >
              <Share2 size={16} />
              生成我的状态卡
            </button>
            <span>诊断结果可保存为分享卡</span>
          </div>
        </div>

        <div className="diagnosis-hero-score">
          <ReadinessRing
            score={report.readiness}
            level={analysis.overallRiskLevel}
            size={210}
            stroke={7}
            caption="期末准备度"
            label={report.readinessLabel}
            className="diagnosis-main-ring"
          />
          <div className="diagnosis-hero-score-note">
            <span>还有</span>
            <strong>{report.nearestDays}</strong>
            <span>天到最近考试</span>
          </div>
        </div>

        <div className="diagnosis-facts">
          <div>
            <span>距离最近考试</span>
            <strong>
              {report.nearestDays}
              <small>天</small>
            </strong>
            <em>{report.nearestExam?.name ?? '—'}</em>
          </div>
          <div>
            <span>每日可用时间</span>
            <strong>{formatHourUnit(setup.dailyMinutes)}</strong>
            <em>硬性上限</em>
          </div>
          <div>
            <span>考试科目</span>
            <strong>
              {analysis.risks.length}
              <small>门</small>
            </strong>
            <em>{report.highRiskCount} 门高风险</em>
          </div>
          <div>
            <span>当前主要风险</span>
            <strong className="fact-subject">{report.focusRisk.exam.name}</strong>
            <em>{report.focusReasonChips.slice(0, 3).join(' · ')}</em>
          </div>
        </div>
      </section>

      <section className="diagnosis-verdict">
        <div className="verdict-statement">
          <span className="section-kicker">你的主要问题</span>
          <h2>{report.mainProblem}</h2>
          <p>
            报告只回答一件事：接下来 7 天，每一小时给谁。
            下面的排序与配额都由此展开。
          </p>
        </div>
        <div className="verdict-points">
          {report.problemPoints.map((point, index) => (
            <div key={point}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{point}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="analysis-section resource-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">时间决策</span>
            <h2>未来 7 天，时间这样分</h2>
          </div>
          <span className="section-count">共 {formatHourUnit(totalAllocated)}</span>
        </div>

        <div className="resource-card">
          <div className="resource-donut-wrap">
            <TimeDonut items={report.allocationItems} />
            <span className="resource-cap">每日上限 {formatHourUnit(setup.dailyMinutes)}</span>
          </div>

          <div className="resource-list">
            {report.allocationItems.map((item, index) => {
              const percent = formatPercent(item.minutes, totalAllocated)
              const risk = analysis.risks.find((entry) => entry.exam.id === item.id)
              return (
                <div className="resource-row" key={item.id}>
                  <span
                    className="resource-index"
                    style={{ color: subjectColor(item.colorIndex ?? index) }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="resource-row-main">
                    <div className="resource-row-head">
                      <strong>{item.name}</strong>
                      {risk && <RiskBadge level={risk.riskLevel} compact />}
                      <span>{formatHourUnit(item.minutes)}</span>
                      <em>{percent}%</em>
                    </div>
                    <div className="resource-mini-track">
                      <span
                        style={{
                          width: `${percent}%`,
                          backgroundColor: subjectColor(item.colorIndex ?? index),
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            <p className="resource-explain">{allocationSummary}</p>
          </div>
        </div>
      </section>

      <section className="analysis-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">科目诊断</span>
            <h2>为什么先救这几门</h2>
          </div>
          <span className="section-count">{analysis.risks.length} 项</span>
        </div>

        <div className="risk-report-list">
          {analysis.risks.map((risk) => (
            <RiskReportCard key={risk.exam.id} risk={risk} />
          ))}
        </div>
      </section>

      <section className="analysis-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">风险矩阵</span>
            <h2>哪些科目最急、最缺</h2>
          </div>
          <span className="section-count">右上优先</span>
        </div>
        <RiskMatrix risks={analysis.risks} />
      </section>

      <div className="diagnosis-insight">
        <div className="diagnosis-insight-head">
          <span className="insight-icon">
            <Compass size={18} />
          </span>
          <div>
            <span className="section-kicker">系统解读</span>
            <strong>为什么这样排</strong>
          </div>
          <span className="insight-tag">{aiService.mode === 'remote' ? 'AI 解释层' : '本地确定性计算'}</span>
        </div>
        <p>{riskSummary}</p>
        <div className="insight-foot">
          <Info size={14} />
          AI 只解释已经计算出的结果；时间分配始终由确定性排程引擎完成。
        </div>
      </div>

      <div className="risk-notes">
        <span className="risk-note-icon">
          <Target size={17} />
        </span>
        <p>
          诊断的用途很具体：告诉你哪门课值得今天多花 1 小时，
          哪门课现在可以少花一点。
        </p>
      </div>

      <div className="action-dock action-dock-marketing">
        <div className="action-dock-copy">
          <span>下一步 / 7 天行动</span>
          <strong>把诊断变成每天能执行的任务</strong>
          <small>
            每日上限 {formatMinutes(setup.dailyMinutes)} · 已预留反馈重排
          </small>
        </div>
        <div className="action-dock-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setShareOpen(true)}
          >
            <Share2 size={16} />
            状态卡
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              onGenerate(buildPlan(setup, today))
              navigate('/plan')
            }}
          >
            生成 7 天行动
            <ArrowRight size={17} />
          </button>
        </div>
      </div>

      {shareOpen && (
        <ShareCardModal report={report} onClose={() => setShareOpen(false)} />
      )}
    </div>
  )
}

function summarize(text: string, maxSentences: number): string {
  const sentences = text
    .split('。')
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  return `${sentences.slice(0, maxSentences).join('。')}。`
}

function RiskReportCard({ risk }: { risk: ExamRisk }) {
  const importance = IMPORTANCE_OPTIONS.find((item) => item.value === risk.exam.importance)
  const mastery = MASTERY_OPTIONS.find((item) => item.value === risk.exam.mastery)
  const weakCount = risk.weakChapterList.length

  return (
    <article className={`risk-report-card risk-border-${risk.riskLevel}`}>
      <div className="risk-report-rank">
        <span>优先级</span>
        <strong>{String(risk.priority).padStart(2, '0')}</strong>
      </div>

      <div className="risk-report-body">
        <div className="risk-report-head">
          <div>
            <h3>{risk.exam.name}</h3>
            <div className="risk-report-chips">
              <span>{risk.daysUntilExam === 0 ? '今天考试' : `${risk.daysUntilExam} 天后考试`}</span>
              <span>掌握度 {risk.exam.mastery}/5 · {mastery?.label}</span>
              <span>{weakCount > 0 ? `${weakCount} 个薄弱章节` : '无明确薄弱章节'}</span>
              <span>{importance?.label}</span>
            </div>
          </div>
          <div className="risk-report-score">
            <RiskBadge level={risk.riskLevel} compact />
            <strong>{Math.round(risk.riskScore)}</strong>
            <span>风险分</span>
          </div>
        </div>

        <p className="risk-report-why">{risk.reason}</p>

        <div className="risk-report-footer">
          <div>
            <span>未来 7 天建议投入</span>
            <strong>{formatHourUnit(risk.recommendedMinutes)}</strong>
          </div>
          <div className="risk-report-track">
            <span
              className={`risk-bg-${risk.riskLevel}`}
              style={{ width: `${Math.min(100, risk.riskScore)}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  )
}
