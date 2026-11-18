export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  if (safe < 60) return `${safe} 分钟`
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  if (rest === 0) return `${hours} 小时`
  return `${hours} 小时 ${rest} 分`
}

export function formatMinutesCompact(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  if (safe < 60) return `${safe}m`
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}

export function formatHours(minutes: number, digits = 1): string {
  const value = minutes / 60
  const rounded = Number(value.toFixed(digits))
  return `${rounded}`
}

export function formatHourUnit(minutes: number): string {
  return `${formatHours(minutes)}h`
}

export function formatPercent(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}
