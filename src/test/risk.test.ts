import { describe, expect, it } from 'vitest'
import type { Exam } from '../types'
import { assessExams, classifyRisk, parseWeakChapters } from '../lib/risk'

const REFERENCE_DATE = '2026-11-18'

const exams: Exam[] = [
  {
    id: 'math',
    name: '高等数学',
    examDate: '2026-11-21',
    mastery: 1,
    weakChapters: '极限、级数、微分方程',
    importance: 3,
  },
  {
    id: 'probability',
    name: '概率论',
    examDate: '2026-11-25',
    mastery: 2,
    weakChapters: '随机变量、数字特征',
    importance: 2,
  },
  {
    id: 'network',
    name: '计算机网络',
    examDate: '2026-11-29',
    mastery: 3,
    weakChapters: '传输层、网络层',
    importance: 1,
  },
]

describe('risk assessment', () => {
  it('ranks every course and produces a level, score, reason and factor breakdown', () => {
    const result = assessExams(exams, REFERENCE_DATE)

    expect(result.risks).toHaveLength(3)
    expect(result.risks.map((risk) => risk.exam.id)).toEqual([
      'math',
      'probability',
      'network',
    ])
    expect(result.risks.map((risk) => risk.priority)).toEqual([1, 2, 3])
    result.risks.forEach((risk) => {
      expect(risk.riskScore).toBeGreaterThan(0)
      expect(risk.riskScore).toBeLessThanOrEqual(100)
      expect(['low', 'medium', 'high']).toContain(risk.riskLevel)
      expect(risk.reason.length).toBeGreaterThan(4)
      expect(Object.keys(risk.factors)).toEqual([
        'urgency',
        'mastery',
        'weakness',
        'importance',
      ])
    })
    expect(result.overallRiskScore).toBeGreaterThan(0)
    expect(result.nearestExamDays).toBe(3)
  })

  it('does not simply sort by exam date', () => {
    const dateOnlyWouldPutSecondFirst: Exam[] = [
      {
        id: 'later-but-hard',
        name: '数据结构',
        examDate: '2026-11-27',
        mastery: 1,
        weakChapters: '树、图、排序、动态规划',
        importance: 3,
      },
      {
        id: 'sooner-but-easy',
        name: '大学英语',
        examDate: '2026-11-19',
        mastery: 5,
        weakChapters: '',
        importance: 1,
      },
    ]

    const result = assessExams(dateOnlyWouldPutSecondFirst, REFERENCE_DATE)
    expect(result.risks[0]?.exam.id).toBe('later-but-hard')
    expect(result.risks[0]?.daysUntilExam).toBeGreaterThan(
      result.risks[1]?.daysUntilExam ?? 0,
    )
  })

  it('uses importance and mastery to separate similar dates', () => {
    const similar: Exam[] = [
      {
        id: 'a',
        name: '低重要度',
        examDate: '2026-11-22',
        mastery: 4,
        weakChapters: '',
        importance: 1,
      },
      {
        id: 'b',
        name: '高重要度',
        examDate: '2026-11-22',
        mastery: 1,
        weakChapters: '核心章节',
        importance: 3,
      },
    ]

    const result = assessExams(similar, REFERENCE_DATE)
    expect(result.risks[0]?.exam.id).toBe('b')
    expect(result.risks[0]?.riskScore).toBeGreaterThan(result.risks[1]?.riskScore ?? 0)
  })

  it('parses Chinese and English separators and removes duplicates', () => {
    expect(parseWeakChapters('极限、级数，极限; 微分方程\n极限')).toEqual([
      '极限',
      '级数',
      '微分方程',
    ])
    expect(parseWeakChapters('')).toEqual([])
  })

  it('classifies risk boundaries consistently', () => {
    expect(classifyRisk(65)).toBe('high')
    expect(classifyRisk(64.9)).toBe('medium')
    expect(classifyRisk(42)).toBe('medium')
    expect(classifyRisk(41.9)).toBe('low')
  })
})
