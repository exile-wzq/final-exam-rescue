import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  IMPORTANCE_OPTIONS,
  MASTERY_OPTIONS,
  type Exam,
  type Importance,
  type Mastery,
  type SetupPayload,
} from '../types'
import {
  addDays,
  clamp,
  diffCalendarDays,
  monthDayLabel,
  relativeExamLabel,
  todayKey,
} from '../lib/dates'
import { createBlankExam, formatHourInput } from '../lib/exams'
import { formatMinutes } from '../lib/format'
import { parseWeakChapters } from '../lib/risk'
import { validateSetup } from '../lib/validation'
import { StepIndicator } from '../components/StepIndicator'

interface SetupPageProps {
  initialExams: Exam[]
  initialDailyMinutes: number
  onAnalyze: (payload: SetupPayload) => void
}

export function SetupPage({
  initialExams,
  initialDailyMinutes,
  onAnalyze,
}: SetupPageProps) {
  const navigate = useNavigate()
  const today = todayKey()
  const [exams, setExams] = useState<Exam[]>(() =>
    initialExams.length > 0
      ? initialExams.map((exam) => ({ ...exam }))
      : [createBlankExam(today)],
  )
  const [dailyInput, setDailyInput] = useState(() => formatHourInput(initialDailyMinutes))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const formRef = useRef<HTMLFormElement>(null)

  function updateExam(id: string, patch: Partial<Exam>) {
    setExams((current) =>
      current.map((exam) => (exam.id === id ? { ...exam, ...patch } : exam)),
    )
    setErrors((current) => {
      const next = { ...current }
      Object.keys(patch).forEach((key) => {
        delete next[`${id}.${key === 'examDate' ? 'date' : key}`]
      })
      return next
    })
  }

  function addExam() {
    setExams((current) => [...current, createBlankExam(today)])
    setErrors((current) => {
      const next = { ...current }
      delete next.exams
      return next
    })
  }

  function removeExam(id: string) {
    setExams((current) => current.filter((exam) => exam.id !== id))
  }

  function setDailyHours(value: string) {
    setDailyInput(value)
    setErrors((current) => {
      const next = { ...current }
      delete next.dailyMinutes
      return next
    })
  }

  function stepDaily(delta: number) {
    const current = Number(dailyInput)
    const base = Number.isFinite(current) ? current : 3
    setDailyHours(String(clamp(base + delta, 0.5, 16)))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const dailyHours = Number(dailyInput)
    const dailyMinutes = Number.isFinite(dailyHours) ? Math.round(dailyHours * 60) : Number.NaN
    const normalized = exams.map((exam) => ({
      ...exam,
      name: exam.name.trim(),
      weakChapters: exam.weakChapters.trim(),
    }))
    const result = validateSetup(normalized, dailyMinutes, today)
    setErrors(result.errors)

    if (!result.ok) {
      window.requestAnimationFrame(() => {
        const firstError = formRef.current?.querySelector('.field-error, .form-error')
        firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }

    onAnalyze({ exams: normalized, dailyMinutes })
    navigate('/analysis')
  }

  const dailyValue = Number(dailyInput)
  const dailyLabel = Number.isFinite(dailyValue)
    ? formatMinutes(Math.round(dailyValue * 60))
    : '尚未填写'
  const generalError = errors.exams ?? errors.dailyMinutes

  return (
    <div className="page shell">
      <StepIndicator current={1} />

      <header className="page-heading setup-heading">
        <p className="eyebrow">STEP 01 / 期末诊断</p>
        <h1>建立你的期末状态</h1>
        <p>
          不需要精确。用 2 分钟，把最影响决策的信息填进来：考试时间、掌握程度、
          薄弱章节和你每天真正能投入的时间。
        </p>
      </header>

      <div className="setup-output-strip">
        <span>完成后你将得到</span>
        <div>
          <strong>期末准备度</strong>
          <small>0—100 状态分</small>
        </div>
        <div>
          <strong>主要风险</strong>
          <small>先救哪门</small>
        </div>
        <div>
          <strong>7 天行动</strong>
          <small>每天做什么</small>
        </div>
        <em>约 2 分钟</em>
      </div>

      <form id="setup-form" ref={formRef} onSubmit={handleSubmit} noValidate>
        {generalError && (
          <div className="form-error" role="alert">
            {generalError}
          </div>
        )}

        <div className="section-heading">
          <div>
            <span className="section-kicker">考试清单</span>
            <h2>你正在准备哪些考试？</h2>
          </div>
          <span className="section-count">{exams.length} 门</span>
        </div>

        <div className="exam-list">
          {exams.map((exam, index) => (
            <ExamEditor
              key={exam.id}
              exam={exam}
              index={index}
              today={today}
              errors={errors}
              onChange={updateExam}
              onRemove={removeExam}
            />
          ))}
        </div>

        {exams.length === 0 && (
          <div className="empty-exams">
            <p>还没有考试。先添加一门，才能开始分析。</p>
          </div>
        )}

        <button className="add-exam-button" type="button" onClick={addExam}>
          <Plus size={17} />
          添加一门考试
        </button>

        <section className="daily-budget-card" aria-labelledby="daily-budget-title">
          <div className="budget-copy">
            <span className="section-kicker">时间边界</span>
            <h2 id="daily-budget-title">每天可以用于复习的总时间</h2>
            <p>系统会把它当作硬性上限。无论任务多紧，都不会超过这个数。</p>
            {errors.dailyMinutes && (
              <p className="field-error" role="alert">
                {errors.dailyMinutes}
              </p>
            )}
          </div>

          <div className="budget-control">
            <div className="stepper">
              <button
                type="button"
                onClick={() => stepDaily(-0.5)}
                aria-label="减少半小时"
                className="stepper-button"
              >
                <Minus size={16} />
              </button>
              <label className="budget-input-wrap">
                <input
                  aria-label="每天可复习小时数"
                  aria-invalid={Boolean(errors.dailyMinutes)}
                  type="number"
                  min="0.5"
                  max="16"
                  step="0.5"
                  inputMode="decimal"
                  value={dailyInput}
                  onChange={(event) => setDailyHours(event.target.value)}
                />
                <span>小时</span>
              </label>
              <button
                type="button"
                onClick={() => stepDaily(0.5)}
                aria-label="增加半小时"
                className="stepper-button"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="budget-presets">
              {[2, 2.5, 3, 4].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  className={Number(dailyInput) === hours ? 'is-selected' : ''}
                  onClick={() => setDailyHours(String(hours))}
                >
                  {hours}h
                </button>
              ))}
            </div>
            <p className="budget-preview">
              每天最多 {dailyLabel}，未来 7 天最多{' '}
              {Number.isFinite(dailyValue) ? formatMinutes(Math.round(dailyValue * 60 * 7)) : '待计算'}
            </p>
          </div>
        </section>

        <div className="analysis-assumptions">
          <span className="section-kicker">风险计算会同时考虑</span>
          <div className="assumption-chips">
            <span>距考试时间</span>
            <span>当前掌握程度</span>
            <span>薄弱章节数量</span>
            <span>考试重要程度</span>
          </div>
          <p>不会简单按考试日期排序，也不会把低优先级科目直接删掉。</p>
        </div>

        <div className="action-dock">
          <div className="action-dock-copy">
            <span>下一步 / 期末诊断</span>
            <strong>
              {exams.length} 门考试 · 每天 {dailyLabel}
            </strong>
            <small>生成期末准备度、主要风险与 7 天时间分配</small>
          </div>
          <button className="button button-primary" type="submit">
            生成我的期末诊断
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </div>
  )
}

function ExamEditor({
  exam,
  index,
  today,
  errors,
  onChange,
  onRemove,
}: {
  exam: Exam
  index: number
  today: string
  errors: Record<string, string>
  onChange: (id: string, patch: Partial<Exam>) => void
  onRemove: (id: string) => void
}) {
  const dateError = errors[`${exam.id}.date`]
  const nameError = errors[`${exam.id}.name`]
  const weakError = errors[`${exam.id}.weakChapters`]
  const chapterList = parseWeakChapters(exam.weakChapters)
  const masteryLabel =
    MASTERY_OPTIONS.find((option) => option.value === exam.mastery)?.label ?? '一般'

  return (
    <article className={`exam-editor${nameError || dateError ? ' has-error' : ''}`}>
      <div className="exam-editor-head">
        <div className="exam-title-line">
          <span className="exam-index">考试 {String(index + 1).padStart(2, '0')}</span>
          <span className="exam-date-hint">
            {exam.examDate
              ? `${monthDayLabel(exam.examDate)} · ${relativeExamLabel(
                  Math.max(0, diffCalendarDays(today, exam.examDate)),
                )}`
              : '尚未选择日期'}
          </span>
        </div>
        <button
          className="icon-button danger"
          type="button"
          onClick={() => onRemove(exam.id)}
          aria-label={`删除考试 ${index + 1}`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="field">
        <label htmlFor={`name-${exam.id}`}>科目名称</label>
        <input
          id={`name-${exam.id}`}
          type="text"
          value={exam.name}
          placeholder="例如：高等数学"
          maxLength={24}
          autoComplete="off"
          aria-invalid={Boolean(nameError)}
          onChange={(event) => onChange(exam.id, { name: event.target.value })}
        />
        {nameError && (
          <p className="field-error" role="alert">
            {nameError}
          </p>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`date-${exam.id}`}>考试日期</label>
          <input
            id={`date-${exam.id}`}
            type="date"
            value={exam.examDate}
            min={today}
            max={addDays(today, 730)}
            aria-invalid={Boolean(dateError)}
            onChange={(event) => onChange(exam.id, { examDate: event.target.value })}
          />
          {dateError && (
            <p className="field-error" role="alert">
              {dateError}
            </p>
          )}
        </div>
        <div className="field compact-field">
          <label>距考试</label>
          <div className="read-only-value">
            {exam.examDate
              ? relativeExamLabel(Math.max(0, diffCalendarDays(today, exam.examDate)))
              : '待选择'}
          </div>
        </div>
      </div>

      <fieldset className="field fieldset-reset">
        <legend>
          当前掌握程度
          <span className="field-value">{exam.mastery} · {masteryLabel}</span>
        </legend>
        <div className="choice-scale" role="radiogroup" aria-label="当前掌握程度">
          {MASTERY_OPTIONS.map((option) => {
            const selected = exam.mastery === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? 'is-selected' : ''}
                onClick={() => onChange(exam.id, { mastery: option.value as Mastery })}
              >
                <span className="choice-number">{option.value}</span>
                <span className="choice-label">{option.short}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="field fieldset-reset">
        <legend>考试重要程度</legend>
        <div className="choice-row importance-row" role="radiogroup" aria-label="考试重要程度">
          {IMPORTANCE_OPTIONS.map((option) => {
            const selected = exam.importance === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? 'is-selected' : ''}
                onClick={() => onChange(exam.id, { importance: option.value as Importance })}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor={`weak-${exam.id}`}>薄弱章节</label>
        <input
          id={`weak-${exam.id}`}
          type="text"
          value={exam.weakChapters}
          placeholder="例如：极限、级数、微分方程"
          maxLength={240}
          autoComplete="off"
          aria-invalid={Boolean(weakError)}
          onChange={(event) => onChange(exam.id, { weakChapters: event.target.value })}
        />
        {weakError ? (
          <p className="field-error" role="alert">
            {weakError}
          </p>
        ) : (
          <div className="chapter-hint">
            {chapterList.length > 0 ? (
              <>
                <span>识别为 {chapterList.length} 个章节</span>
                <span className="chapter-chips">
                  {chapterList.slice(0, 4).map((chapter) => (
                    <span key={chapter}>{chapter}</span>
                  ))}
                  {chapterList.length > 4 && <span>+{chapterList.length - 4}</span>}
                </span>
              </>
            ) : (
              <span>用逗号或顿号分隔；留空也可以，系统会安排整体回顾。</span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
