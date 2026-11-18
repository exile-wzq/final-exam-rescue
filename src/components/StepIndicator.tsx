import { Check } from 'lucide-react'

const STEPS = ['期末诊断', '风险分析', '时间决策', '7 天行动']

export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="step-indicator" aria-label="制定计划进度">
      {STEPS.map((label, index) => {
        const step = index + 1
        const isDone = step < current
        const isCurrent = step === current
        return (
          <li
            key={label}
            className={isDone ? 'is-done' : isCurrent ? 'is-current' : ''}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="step-number">{isDone ? <Check size={12} strokeWidth={3} /> : step}</span>
            <span className="step-label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
