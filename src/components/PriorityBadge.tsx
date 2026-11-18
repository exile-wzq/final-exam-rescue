import type { RiskLevel } from '../types'

export function PriorityBadge({
  priority,
  level,
  label = false,
}: {
  priority: number
  level: RiskLevel
  label?: boolean
}) {
  return (
    <span
      className={`priority-badge priority-${level}`}
      title={`优先级 P${priority}`}
      aria-label={`优先级 P${priority}`}
    >
      <strong>P{priority}</strong>
      {label && <span>优先级</span>}
    </span>
  )
}
