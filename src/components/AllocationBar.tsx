import type { RiskLevel } from '../types'
import { subjectColor } from '../lib/subjectColors'
import { formatPercent, formatMinutesCompact } from '../lib/format'

export interface AllocationItem {
  id: string
  name: string
  minutes: number
  riskLevel: RiskLevel
  colorIndex?: number
}

export function AllocationBar({
  items,
  compact = false,
}: {
  items: AllocationItem[]
  compact?: boolean
}) {
  const total = items.reduce((sum, item) => sum + item.minutes, 0)
  const visible = items.filter((item) => item.minutes > 0)

  return (
    <div className={`allocation${compact ? ' is-compact' : ''}`}>
      <div className="allocation-track" aria-label="时间分配比例">
        {total > 0 &&
          visible.map((item, index) => (
            <span
              key={item.id}
              className="allocation-segment"
              style={{
                width: `${(item.minutes / total) * 100}%`,
                backgroundColor: subjectColor(item.colorIndex ?? index),
              }}
              title={`${item.name} ${formatMinutesCompact(item.minutes)}`}
            />
          ))}
      </div>
      <div className="allocation-legend">
        {items.map((item, index) => (
          <div className="allocation-legend-row" key={item.id}>
            <span
              className="legend-dot"
              style={{ backgroundColor: subjectColor(item.colorIndex ?? index) }}
              aria-hidden="true"
            />
            <span className="legend-name">{item.name}</span>
            <span className="legend-time">{formatMinutesCompact(item.minutes)}</span>
            <span className="legend-percent">{formatPercent(item.minutes, total)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
