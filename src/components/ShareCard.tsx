import type { Ref } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { MarketingReport } from '../lib/marketing'
import { subjectColor } from '../lib/subjectColors'
import { formatHourUnit } from '../lib/format'
import { ReadinessRing } from './ReadinessRing'

export function ShareCard({
  report,
  cardRef,
}: {
  report: MarketingReport
  cardRef?: Ref<HTMLDivElement>
}) {
  const allocationTotal = report.allocationItems.reduce(
    (sum, item) => sum + item.minutes,
    0,
  )
  const year = new Date().getFullYear()

  return (
    <div className={`share-card share-card-${report.status}`} ref={cardRef}>
      <div className="share-grid-texture" aria-hidden="true" />

      <header className="share-top">
        <div className="share-brand">
          <span className="share-brand-mark" aria-hidden="true">
            <span />
          </span>
          <div>
            <strong>期末急救站</strong>
            <span>FINAL WEEK RESCUE</span>
          </div>
        </div>
        <span className="share-edition">期末状态卡 / {year}</span>
      </header>

      <div className="share-main">
        <div className="share-title-block">
          <span className="share-kicker">我的期末状态</span>
          <h2>{report.statusHeadline}</h2>
          <div className="share-status">
            <span className={`share-status-pill share-status-${report.status}`}>
              {report.statusLabel}
            </span>
            <span>{report.readinessLabel}</span>
          </div>
        </div>
        <ReadinessRing
          score={report.readiness}
          level={report.status}
          size={118}
          stroke={7}
          caption="期末准备度"
          label={report.readinessLabel}
          className="share-ring"
        />
      </div>

      <div className="share-verdict">
        <span>主要问题</span>
        <p>“{report.mainProblem}”</p>
      </div>

      <div className="share-facts">
        <div>
          <span>距离最近考试</span>
          <strong>
            {report.nearestDays}
            <small>天</small>
          </strong>
          <em>{report.nearestExam?.name ?? '—'}</em>
        </div>
        <div>
          <span>每日需要</span>
          <strong>
            {formatHourUnit(report.analysis.previewPlan.dailyMinutes)}
          </strong>
          <em>每天上限</em>
        </div>
        <div>
          <span>最需关注</span>
          <strong className="share-focus-name">{report.focusRisk.exam.name}</strong>
          <em>{report.focusRisk.riskLevel === 'high' ? '高风险' : '优先处理'}</em>
        </div>
      </div>

      <div className="share-allocation">
        <div className="share-allocation-head">
          <span>未来 7 天时间去向</span>
          <span>{formatHourUnit(allocationTotal)}</span>
        </div>
        <div className="share-allocation-bar" aria-hidden="true">
          {report.allocationItems.map((item, index) => (
            <span
              key={item.id}
              style={{
                width: `${allocationTotal > 0 ? (item.minutes / allocationTotal) * 100 : 0}%`,
                backgroundColor: subjectColor(item.colorIndex ?? index),
              }}
            />
          ))}
        </div>
        <div className="share-allocation-legend">
          {report.allocationItems.map((item, index) => (
            <span key={item.id}>
              <i style={{ backgroundColor: subjectColor(item.colorIndex ?? index) }} />
              {item.name}
            </span>
          ))}
        </div>
      </div>

      <div className="share-action">
        <span>本周第一行动</span>
        <strong>
          先补「{report.focusRisk.exam.name}」
          {report.focusRisk.weakChapterList[0]
            ? ` · ${report.focusRisk.weakChapterList[0]}`
            : ' 的核心章节'}
        </strong>
      </div>

      <footer className="share-footer">
        <div>
          <strong>期末急救站</strong>
          <span>大学生 AI 期末时间决策工具</span>
        </div>
        <span className="share-cta">
          {report.shareHook}
          <ArrowUpRight size={13} />
        </span>
      </footer>
    </div>
  )
}
