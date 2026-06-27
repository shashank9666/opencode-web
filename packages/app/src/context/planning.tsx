import { createContext, type ParentProps, onCleanup, useContext } from "solid-js"
import { createStore } from "solid-js/store"
import { createSignal } from "solid-js"

export type PlanningStep = "goal" | "analysis" | "plan" | "approval" | "execute" | "verify" | "summary"

export type StepStatus = "pending" | "active" | "completed" | "failed" | "rejected"

export interface StepState {
  status: StepStatus
  details?: string
}

export interface PlanningState {
  active: boolean
  currentStep: PlanningStep
  steps: Record<PlanningStep, StepState>
  planContent: string
  approved: boolean | null
}

const initStep = (): StepState => ({ status: "pending" })

const initSteps = (): Record<PlanningStep, StepState> => ({
  goal: initStep(),
  analysis: initStep(),
  plan: initStep(),
  approval: initStep(),
  execute: initStep(),
  verify: initStep(),
  summary: initStep(),
})

const stepOrder: PlanningStep[] = ["goal", "analysis", "plan", "approval", "execute", "verify", "summary"]

function createPlanningState() {
  const [state, setState] = createStore<PlanningState>({
    active: false,
    currentStep: "goal",
    steps: initSteps(),
    planContent: "",
    approved: null,
  })
  const [active, setActive] = createSignal(false)

  const start = () => {
    setActive(true)
    setState("active", true)
    setState("currentStep", "goal")
    setState("steps", initSteps())
    setState("steps", "goal", "status", "active")
    setState("planContent", "")
    setState("approved", null)
  }

  const stop = () => {
    setActive(false)
    setState("active", false)
    setState("currentStep", "goal")
    setState("steps", initSteps())
    setState("planContent", "")
    setState("approved", null)
  }

  const advance = (step: PlanningStep) => {
    setState("currentStep", step)
    for (const key of Object.keys(state.steps) as PlanningStep[]) {
      if (key === step) setState("steps", key, "status", "active")
    }
  }

  const complete = (step: PlanningStep) => {
    setState("steps", step, "status", "completed")
    const idx = stepOrder.indexOf(step)
    const next = stepOrder[idx + 1]
    if (next) {
      setState("currentStep", next)
      setState("steps", next, "status", "active")
    }
  }

  const fail = (step: PlanningStep) => {
    setState("steps", step, "status", "failed")
  }

  const approve = () => {
    setState("approved", true)
    complete("approval")
  }

  const reject = () => {
    setState("approved", false)
    setState("steps", "approval", "status", "rejected")
  }

  const setPlanContent = (content: string) => {
    setState("planContent", content)
  }

  const setStepDetails = (step: PlanningStep, details: string) => {
    setState("steps", step, "details", details)
  }

  return { state, active, setActive, start, stop, advance, complete, fail, approve, reject, setPlanContent, setStepDetails }
}

export type PlanningContextType = ReturnType<typeof createPlanningState>

const PlanningContext = createContext<PlanningContextType>()

export function PlanningProvider(props: ParentProps) {
  const value = createPlanningState()

  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail
    if (detail?.mode === "planning") value.start()
    else value.stop()
  }

  window.addEventListener("agent-mode-change", handler)
  onCleanup(() => window.removeEventListener("agent-mode-change", handler))

  return <PlanningContext.Provider value={value}>{props.children}</PlanningContext.Provider>
}

export function usePlanning(): PlanningContextType {
  const ctx = useContext(PlanningContext)
  if (!ctx) throw new Error("usePlanning must be used within a PlanningProvider")
  return ctx
}
