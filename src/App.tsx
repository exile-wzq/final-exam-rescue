import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import type { PersistedState } from './lib/storage'
import { loadState, saveState } from './lib/storage'
import { createBlankExam } from './lib/exams'
import { todayKey } from './lib/dates'
import { AppHeader } from './components/AppHeader'
import { HomePage } from './pages/HomePage'
import { SetupPage } from './pages/SetupPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { PlanPage } from './pages/PlanPage'

function createInitialState(): PersistedState {
  return {
    version: 1,
    exams: [createBlankExam(todayKey())],
    dailyMinutes: 180,
    plan: null,
  }
}

export default function App() {
  const [state, setState] = useState<PersistedState>(() => loadState() ?? createInitialState())

  useEffect(() => {
    saveState(state)
  }, [state])

  return (
    <HashRouter>
      <AppFrame state={state} setState={setState} />
    </HashRouter>
  )
}

function AppFrame({
  state,
  setState,
}: {
  state: PersistedState
  setState: Dispatch<SetStateAction<PersistedState>>
}) {
  const location = useLocation()

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': '期末急救站 · 你的时间还有多少余量？',
      '/setup': '期末诊断 · 期末急救站',
      '/analysis': '你的期末状态 · 期末急救站',
      '/plan': '未来 7 天 · 期末急救站',
    }
    document.title = titles[location.pathname] ?? '期末急救站'
  }, [location.pathname])

  return (
    <div className="app-shell">
      <ScrollToTop pathname={location.pathname} />
      <AppHeader hasPlan={Boolean(state.plan)} />
      <main>
        <Routes>
          <Route
            path="/"
            element={<HomePage plan={state.plan} examCount={state.exams.length} />}
          />
          <Route
            path="/setup"
            element={
              <SetupPage
                initialExams={state.exams}
                initialDailyMinutes={state.dailyMinutes}
                onAnalyze={(payload) => {
                  setState((current) => ({
                    ...current,
                    exams: payload.exams,
                    dailyMinutes: payload.dailyMinutes,
                    plan: null,
                  }))
                }}
              />
            }
          />
          <Route
            path="/analysis"
            element={
              hasUsableSetup(state) ? (
                <AnalysisPage
                  setup={{ exams: state.exams, dailyMinutes: state.dailyMinutes }}
                  onGenerate={(plan) => {
                    setState((current) => ({ ...current, plan }))
                  }}
                />
              ) : (
                <Navigate to="/setup" replace />
              )
            }
          />
          <Route
            path="/plan"
            element={
              state.plan ? (
                <PlanPage
                  plan={state.plan}
                  setup={{ exams: state.exams, dailyMinutes: state.dailyMinutes }}
                  onUpdatePlan={(plan) => {
                    setState((current) =>
                      current.plan?.id === plan.id ? { ...current, plan } : current,
                    )
                  }}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function hasUsableSetup(state: PersistedState): boolean {
  return (
    state.exams.length > 0 &&
    state.exams.every(
      (exam) => exam.name.trim().length > 0 && exam.examDate.length === 10,
    ) &&
    state.dailyMinutes >= 30
  )
}

function ScrollToTop({ pathname }: { pathname: string }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
