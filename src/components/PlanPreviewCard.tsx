import { ArrowUpRight, Compass } from 'lucide-react'
import { ReadinessRing } from './ReadinessRing'
import { subjectColor } from '../lib/subjectColors'

const SAMPLE_SUBJECTS = [
  { name: '高等数学', time: '8.5h', colorIndex: 0, width: 42.5 },
  { name: '概率论', time: '6.5h', colorIndex: 1, width: 32.5 },
  { name: '计算机网络', time: '5.0h', colorIndex: 2, width: 25 },
]

export function PlanPreviewCard() {
  return (
    <div className="diagnosis-preview">
      <div className="diagnosis-preview-top">
        <div className="preview-brandline">
          <span className="preview-logo">+</span>
          <span>期末时间体检</span>
        </div>
        <span className="preview-sample">示例诊断</span>
      </div>

      <div className="diagnosis-preview-head">
        <div className="diagnosis-preview-title">
          <span>MY FINAL WEEK</span>
          <h2>你的期末状态</h2>
          <div className="diagnosis-status-line">
            <span className="diagnosis-status-dot" />
            中高风险 · 还有 12 天
          </div>
        </div>
        <ReadinessRing
          score={60}
          level="high"
          size={132}
          stroke={7}
          caption="准备度"
          label="需要急救"
          className="diagnosis-preview-ring"
        />
      </div>

      <div className="diagnosis-countdown">
        <div>
          <span>距离最近考试</span>
          <strong>12<small>天</small></strong>
        </div>
        <div className="diagnosis-countdown-focus">
          <span>最需要关注</span>
          <strong>高等数学</strong>
          <em>距考试 12 天 · 掌握度 2/5</em>
        </div>
        <ArrowUpRight size={18} />
      </div>

      <div className="diagnosis-resource">
        <div className="diagnosis-resource-head">
          <span>本周时间去向</span>
          <span>每日上限 3h</span>
        </div>
        <div className="diagnosis-resource-bar" aria-hidden="true">
          {SAMPLE_SUBJECTS.map((subject) => (
            <span
              key={subject.name}
              style={{
                width: `${subject.width}%`,
                backgroundColor: subjectColor(subject.colorIndex),
              }}
            />
          ))}
        </div>
        <div className="diagnosis-resource-list">
          {SAMPLE_SUBJECTS.map((subject) => (
            <span key={subject.name}>
              <i style={{ backgroundColor: subjectColor(subject.colorIndex) }} />
              {subject.name}
              <b>{subject.time}</b>
            </span>
          ))}
        </div>
      </div>

      <div className="diagnosis-preview-foot">
        <span>
          <Compass size={14} />
          分配逻辑：先风险，后日期
        </span>
        <span>7 天方案已生成</span>
      </div>
    </div>
  )
}
