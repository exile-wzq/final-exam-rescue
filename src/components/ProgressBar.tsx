export function ProgressBar({
  value,
  total,
  tone = 'default',
  label,
}: {
  value: number
  total: number
  tone?: 'default' | 'high' | 'medium' | 'low'
  label?: string
}) {
  const percent = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0
  return (
    <div
      className={`progress-bar tone-${tone}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
      aria-label={label}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}
