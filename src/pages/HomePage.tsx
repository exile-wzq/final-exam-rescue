import {
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
  Gauge,
  LockKeyhole,
  RefreshCw,
  ScanLine,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Plan } from '../types'
import { monthDayLabel, todayKey } from '../lib/dates'
import { PlanPreviewCard } from '../components/PlanPreviewCard'

export function HomePage({ plan, examCount }: { plan: Plan | null; examCount: number }) {
  return (
    <div className="home-page">
      <section className="hero hero-marketing shell">
        <div className="hero-copy">
          <p className="hero-kicker">
            <span className="live-dot" />
            大学生 AI 期末时间决策工具
          </p>

          <h1>
            <span className="hero-title-line">你的时间，</span>
            <span className="hero-title-line hero-question-line">
              还有多少<span className="hero-highlight">余量</span>？
            </span>
          </h1>

          <p className="hero-subtitle">
            输入考试时间、当前掌握程度和每天可投入时间，
            <br className="desktop-break" />
            生成你的期末状态与复习方案。
          </p>

          <div className="hero-actions">
            <Link className="button button-primary button-large" to="/setup">
              开始我的期末诊断
              <ArrowRight size={18} />
            </Link>
            <span className="hero-time-note">
              <LockKeyhole size={14} />
              约 2 分钟 · 无需登录
            </span>
          </div>

          <div className="hero-proof">
            <span>风险诊断</span>
            <span>7 天行动</span>
            <span>每日重排</span>
            <span>状态分享卡</span>
          </div>

          {plan && (
            <Link className="resume-card" to="/plan">
              <span className="resume-mark">
                <ArrowUpRight size={18} />
              </span>
              <span className="resume-copy">
                <strong>继续上次的期末计划</strong>
                <span>
                  {examCount} 门考试 · 生成于 {monthDayLabel(plan.startDate)}
                </span>
              </span>
              <span className="resume-meta">打开</span>
            </Link>
          )}
        </div>

        <div className="hero-visual">
          <div className="hero-visual-note">
            <span>从录入到行动</span>
            <span>一份看得懂的期末状态</span>
          </div>
          <PlanPreviewCard />
        </div>
      </section>

      <section className="home-process shell" aria-label="产品流程">
        <div className="process-intro">
          <span className="section-kicker">先体检，再开方</span>
          <h2>
            先诊断，
            <br />
            再决定，最后执行。
          </h2>
        </div>
        <div className="process-steps">
          <article>
            <span className="process-index">01</span>
            <ScanLine size={19} />
            <h3>期末诊断</h3>
            <p>考试时间 × 掌握度 × 薄弱章节 × 重要程度，形成你的期末状态。</p>
          </article>
          <article>
            <span className="process-index">02</span>
            <Gauge size={19} />
            <h3>时间决策</h3>
            <p>先救哪门、每门投入多少、哪些可以后移，一次说清楚。</p>
          </article>
          <article>
            <span className="process-index">03</span>
            <FastForwardIcon />
            <h3>7 天行动</h3>
            <p>每天的任务、时长和优先级都落到卡片里，打开就知道做什么。</p>
          </article>
        </div>
      </section>

      <section className="value-section shell" aria-label="产品价值">
        <div className="value-heading">
          <div>
            <p className="eyebrow">WHY IT WORKS</p>
            <h2>
              同样 3 小时，
              <br />
              先花在关键处。
            </h2>
          </div>
          <p className="value-lead">
            期末拼的是取舍顺序。系统把「感觉该学什么」
            换成一套看得懂的风险排序和每日行动。
          </p>
        </div>

        <div className="value-grid value-grid-marketing">
          <article className="value-item">
            <span className="value-icon">
              <Gauge size={20} strokeWidth={1.8} />
            </span>
            <span className="value-index">01</span>
            <h3>风险决定顺序</h3>
            <p>
              更近的考试不一定更该先救。掌握缺口、薄弱章节和考试重要度都会被计入风险。
            </p>
          </article>
          <article className="value-item">
            <span className="value-icon">
              <CalendarRange size={20} strokeWidth={1.8} />
            </span>
            <span className="value-index">02</span>
            <h3>每天都有硬上限</h3>
            <p>
              计划不会把时间塞爆。每天任务总量永远不超过你设置的可用时间。
            </p>
          </article>
          <article className="value-item">
            <span className="value-icon">
              <RefreshCw size={20} strokeWidth={1.8} />
            </span>
            <span className="value-index">03</span>
            <h3>真的会重新安排</h3>
            <p>
              完成不了不是失败。高风险任务优先保留，低优先级内容自动后移。
            </p>
          </article>
        </div>
      </section>

      <section className="home-metrics shell" aria-label="方案生成参数">
        <div className="metrics-head">
          <span className="section-kicker">方案如何生成</span>
          <p>所有数字由本地确定性算法得出，AI 只负责解释。</p>
        </div>
        <div className="metrics-grid">
          <div>
            <strong>
              4<small>维</small>
            </strong>
            <span>风险模型</span>
            <em>时限 · 掌握 · 薄弱 · 权重</em>
          </div>
          <div>
            <strong>
              30<small>分钟</small>
            </strong>
            <span>排程粒度</span>
            <em>任务块的最小单位</em>
          </div>
          <div>
            <strong>
              7<small>天</small>
            </strong>
            <span>计划窗口</span>
            <em>从今天开始排列</em>
          </div>
          <div>
            <strong>
              1<small>个</small>
            </strong>
            <span>核心问题</span>
            <em>先救哪门、每天各花多久</em>
          </div>
        </div>
      </section>

      <section className="closing-note shell">
        <div>
          <span className="closing-label">现在开始</span>
          <p>先用 2 分钟，看清你的期末状态。</p>
        </div>
        <Link className="text-link" to="/setup">
          开始我的期末诊断 <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="site-footer shell">
        <span>期末急救站 · Final Week Rescue</span>
        <span>大学生 AI 期末时间决策工具</span>
        <span className="footer-date">{monthDayLabel(todayKey())}</span>
      </footer>
    </div>
  )
}

function FastForwardIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 5 7 7-7 7" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  )
}
