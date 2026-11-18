import { subjectColor } from '../lib/subjectColors'
import { formatHourUnit } from '../lib/format'

export interface DonutItem {
  id: string
  name: string
  minutes: number
  colorIndex?: number
}

export function TimeDonut({
  items,
  onDark = false,
}: {
  items: DonutItem[]
  onDark?: boolean
}) {
  const total = items.reduce((sum, item) => sum + item.minutes, 0)
  let cursor = 0
  return (
    <div className="time-donut" role="img" aria-label="未来 7 天各科时间分配环形图">
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r="53" pathLength="100" className="donut-track" />
        <g transform="rotate(-90 70 70)">
          {items.map((item, index) => {
            const percent = total > 0 ? (item.minutes / total) * 100 : 0
            const offset = cursor
            cursor += percent
            return (
              <circle
                key={item.id}
                cx="70"
                cy="70"
                r="53"
                pathLength="100"
                className="donut-segment"
                style={{ stroke: subjectColor(item.colorIndex ?? index, onDark) }}
                strokeDasharray={`${Math.max(0.5, percent - 1.8)} ${100 - Math.max(0.5, percent - 1.8)}`}
                strokeDashoffset={-offset}
              />
            )
          })}
        </g>
      </svg>
      <div className="time-donut-center">
        <strong>{formatHourUnit(total)}</strong>
        <span>7 天总投入</span>
      </div>
    </div>
  )
}
