import type { RiskLevel } from '../types'
import { RISK_LABELS } from '../types'

export function RiskBadge({
  level,
  compact = false,
}: {
  level: RiskLevel
  compact?: boolean
}) {
  return (
    <span className={`risk-badge risk-${level}${compact ? ' is-compact' : ''}`}>
      <span className="risk-dot" aria-hidden="true" />
      {RISK_LABELS[level]}
    </span>
  )
}
