import type { ExamRisk } from '../types'

const WIDTH = 420
const HEIGHT = 290
const PAD = { top: 22, right: 20, bottom: 34, left: 38 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

export function RiskMatrix({ risks }: { risks: ExamRisk[] }) {
  return (
    <div className="matrix-card">
      <div className="matrix-chart">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="风险矩阵：横轴为时间紧迫度，纵轴为能力缺口"
        >
          <rect
            x={PAD.left}
            y={PAD.top}
            width={PLOT_W}
            height={PLOT_H}
            className="matrix-plot-bg"
            rx="8"
          />
          {[25, 50, 75].map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + PLOT_W}
                y1={PAD.top + (tick / 100) * PLOT_H}
                y2={PAD.top + (tick / 100) * PLOT_H}
                className="matrix-grid-line"
              />
              <line
                x1={PAD.left + (tick / 100) * PLOT_W}
                x2={PAD.left + (tick / 100) * PLOT_W}
                y1={PAD.top}
                y2={PAD.top + PLOT_H}
                className="matrix-grid-line"
              />
            </g>
          ))}
          <line
            x1={PAD.left + PLOT_W / 2}
            x2={PAD.left + PLOT_W / 2}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            className="matrix-axis-line"
          />
          <line
            x1={PAD.left}
            x2={PAD.left + PLOT_W}
            y1={PAD.top + PLOT_H / 2}
            y2={PAD.top + PLOT_H / 2}
            className="matrix-axis-line"
          />

          <text x={WIDTH - PAD.right - 4} y={PAD.top + 14} className="matrix-quadrant-label" textAnchor="end">
            立即抢救
          </text>
          <text x={PAD.left + 7} y={PAD.top + 14} className="matrix-quadrant-label">
            重点补强
          </text>
          <text
            x={WIDTH - PAD.right - 4}
            y={PAD.top + PLOT_H - 8}
            className="matrix-quadrant-label"
            textAnchor="end"
          >
            保持手感
          </text>
          <text x={PAD.left + 7} y={PAD.top + PLOT_H - 8} className="matrix-quadrant-label">
            稳住即可
          </text>

          {risks.map((risk, index) => {
            const urgency = risk.factors.urgency
            const abilityGap =
              risk.factors.mastery * 0.65 + risk.factors.weakness * 0.35
            const cx = PAD.left + (urgency / 100) * PLOT_W
            const cy = PAD.top + (1 - abilityGap / 100) * PLOT_H
            const radius = 10 + risk.exam.importance * 1.4
            return (
              <g key={risk.exam.id} className="matrix-point-group">
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius + 5}
                  className={`matrix-point-halo matrix-halo-${risk.riskLevel}`}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  className={`matrix-point matrix-point-${risk.riskLevel}`}
                >
                  <title>
                    {risk.exam.name} · 风险 {risk.riskScore} · {risk.daysUntilExam} 天后考试
                  </title>
                </circle>
                <text
                  x={cx}
                  y={cy + 3.5}
                  className="matrix-point-label"
                  textAnchor="middle"
                >
                  P{index + 1}
                </text>
              </g>
            )
          })}

          <text x={WIDTH / 2} y={HEIGHT - 5} className="matrix-axis-label" textAnchor="middle">
            时间紧迫度 →
          </text>
          <text
            x={12}
            y={PAD.top + PLOT_H / 2}
            className="matrix-axis-label"
            textAnchor="middle"
            transform={`rotate(-90 12 ${PAD.top + PLOT_H / 2})`}
          >
            能力缺口 →
          </text>
        </svg>
      </div>

      <div className="matrix-legend">
        {risks.map((risk, index) => (
          <span key={risk.exam.id}>
            <i className={`risk-bg-${risk.riskLevel}`} />
            <b>P{index + 1}</b>
            {risk.exam.name}
            <em>{risk.riskLevel === 'high' ? '高' : risk.riskLevel === 'medium' ? '中' : '低'}风险</em>
          </span>
        ))}
      </div>
    </div>
  )
}
