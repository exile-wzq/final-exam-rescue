const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function todayKey(now = new Date()): string {
  return toDateKey(now)
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year ?? 2000, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0)
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  const date = fromDateKey(key)
  return !Number.isNaN(date.getTime()) && toDateKey(date) === key
}

export function addDays(key: string, amount: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + amount)
  return toDateKey(date)
}

export function diffCalendarDays(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number)
  const [ty, tm, td] = toKey.split('-').map(Number)
  const from = Date.UTC(fy ?? 2000, (fm ?? 1) - 1, fd ?? 1)
  const to = Date.UTC(ty ?? 2000, (tm ?? 1) - 1, td ?? 1)
  return Math.round((to - from) / 86_400_000)
}

export function weekdayLabel(key: string): string {
  return WEEKDAYS[fromDateKey(key).getDay()] ?? ''
}

export function monthDayLabel(key: string): string {
  const date = fromDateKey(key)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function dateParts(key: string): { day: string; month: string } {
  const date = fromDateKey(key)
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: `${date.getMonth() + 1}月`,
  }
}

export function relativeExamLabel(daysUntil: number): string {
  if (daysUntil <= 0) return '今天考试'
  if (daysUntil === 1) return '明天考试'
  return `${daysUntil} 天后考试`
}

export function relativeDayLabel(key: string, today: string): string {
  const delta = diffCalendarDays(today, key)
  if (delta === 0) return '今天'
  if (delta === 1) return '明天'
  if (delta === 2) return '后天'
  return `${delta} 天后`
}

export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
