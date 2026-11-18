import type { RiskLevel } from '../types'

const RING_COLORS: Record<RiskLevel, string> = {
  high: '#ac4938',
  medium: '#9c732c',
  low: '#507460',
}

export function ReadinessRing({
  score,
  level,
  label,
  size = 190,
  stroke = 8,
  caption = '期末准备度',
  className = '',
}: {
  score: number
  level: RiskLevel
  label?: string
  size?: number
  stroke?: number
  caption?: string
  className?: string
}) {
  return (
    <div
      className={`readiness-ring readiness-${level} ${className}`.trim()}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${caption} ${score} 分，满分 100`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle
          className="ring-track"
          cx="60"
          cy="60"
          r="52"
          pathLength="100"
          fill="none"
          stroke="rgba(17, 37, 29, 0.11)"
          strokeWidth="1"
        />
        <circle
          className="ring-value"
          cx="60"
          cy="60"
          r="52"
          pathLength="100"
          fill="none"
          stroke={RING_COLORS[level]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset={100 - Math.max(0, Math.min(100, score))}
        />
        <circle
          className="ring-inner-line"
          cx="60"
          cy="60"
          r="43"
          pathLength="100"
          fill="none"
          stroke="rgba(17, 37, 29, 0.1)"
          strokeWidth="0.7"
          strokeDasharray="0.6 2.2"
        />
      </svg>
      <div className="readiness-ring-center">
        <span>{caption}</span>
        <div className="readiness-number">
          <strong>{score}</strong>
          <small>/100</small>
        </div>
        {label && <em>{label}</em>}
      </div>
    </div>
  )
}
