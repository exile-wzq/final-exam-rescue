export interface SubjectColor {
  base: string
  onDark: string
}

/**
 * 科目身份色：按录入顺序稳定绑定，与风险色（陶土红/赭金/灰绿）解耦。
 * 分布类图表（环形图、堆叠条、图例）使用身份色；
 * 风险语义（徽章、准备度环、风险矩阵）继续使用风险色。
 */
export const SUBJECT_PALETTE: SubjectColor[] = [
  { base: '#1f5a42', onDark: '#71c09c' },
  { base: '#ac4938', onDark: '#e2806b' },
  { base: '#9c732c', onDark: '#dcaa52' },
  { base: '#46628c', onDark: '#92abd1' },
  { base: '#7a5876', onDark: '#bb97b7' },
  { base: '#4f7d78', onDark: '#8bbcb6' },
]

export function subjectColor(index: number, onDark = false): string {
  const size = SUBJECT_PALETTE.length
  const entry = SUBJECT_PALETTE[((index % size) + size) % size]
  return onDark ? entry.onDark : entry.base
}

export function subjectColorIndex(
  exams: Array<{ id: string }>,
  examId: string,
): number {
  const index = exams.findIndex((exam) => exam.id === examId)
  return index >= 0 ? index : 0
}