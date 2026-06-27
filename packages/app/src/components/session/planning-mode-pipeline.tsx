import { For, Show, createMemo, createSignal, type Component } from "solid-js"
import { Icon, type IconProps } from "@opencode-ai/ui/icon"
import { Button } from "@opencode-ai/ui/button"
import { usePlanning, type PlanningContextType, type PlanningStep, type StepState } from "@/context/planning"

const STEP_CONFIG: { key: PlanningStep; icon: IconProps["name"]; label: string }[] = [
  { key: "goal", icon: "brain", label: "Goal" },
  { key: "analysis", icon: "magnifying-glass", label: "Analysis" },
  { key: "plan", icon: "checklist", label: "Plan" },
  { key: "approval", icon: "review", label: "Approval" },
  { key: "execute", icon: "play", label: "Execute" },
  { key: "verify", icon: "circle-check", label: "Verify" },
  { key: "summary", icon: "speech-bubble", label: "Summary" },
]

function StepIcon(props: { status: StepState["status"]; active: boolean }) {
  if (props.status === "completed") return <Icon name="check" size="small" />
  if (props.status === "failed" || props.status === "rejected") return <Icon name="circle-ban-sign" size="small" />
  if (props.active) return <Icon name="chevron-right" size="small" />
  return <Icon name="dash" size="small" />
}

function ExpandedStep(props: { expanded: PlanningStep; planning: PlanningContextType }) {
  return (
    <div class="mt-3 pt-3 border-t border-border-weaker-base">
      <div class="flex items-center gap-2 mb-2">
        <Icon name={STEP_CONFIG.find((s) => s.key === props.expanded)!.icon} size="small" class="text-icon-base" />
        <span class="text-13-medium text-text-strong">{STEP_CONFIG.find((s) => s.key === props.expanded)!.label}</span>
        <span
          class="text-[10px] px-1.5 py-0.5 rounded-full"
          classList={{
            "bg-warning-base text-white": props.planning.state.steps[props.expanded].status === "active",
            "bg-success-base text-white": props.planning.state.steps[props.expanded].status === "completed",
            "bg-critical-base text-white": props.planning.state.steps[props.expanded].status === "failed" || props.planning.state.steps[props.expanded].status === "rejected",
            "bg-surface-raised-base text-text-weak": props.planning.state.steps[props.expanded].status === "pending",
          }}
        >
          {props.planning.state.steps[props.expanded].status}
        </span>
      </div>
      <Show when={props.planning.state.steps[props.expanded].details}>
        <p class="text-12-regular text-text-base whitespace-pre-wrap">{props.planning.state.steps[props.expanded].details}</p>
      </Show>
      <Show when={props.expanded === "approval" && props.planning.state.steps.approval.status === "active"}>
        <div class="flex items-center gap-2 mt-3">
          <Button variant="primary" size="small" onClick={() => props.planning.approve()}>
            <Icon name="check-small" size="small" />
            Accept Plan
          </Button>
          <Button variant="secondary" size="small" onClick={() => props.planning.reject()}>
            <Icon name="close-small" size="small" />
            Reject Plan
          </Button>
        </div>
      </Show>
    </div>
  )
}

export const PlanningModePipeline: Component = () => {
  const planning = usePlanning()
  const [expanded, setExpanded] = createSignal<PlanningStep | null>(null)

  const toggleExpanded = (step: PlanningStep) => {
    setExpanded((prev) => (prev === step ? null : step))
  }

  return (
    <div data-component="planning-pipeline" class="w-full px-4 md:px-5 py-3">
      <div class="rounded-lg border border-border-weak-base bg-background-stronger overflow-hidden">
        <div class="flex items-center gap-2 px-3 py-2 border-b border-border-weaker-base">
          <Icon name="brain" size="small" class="text-icon-interactive-base" />
          <span class="text-12-medium text-text-strong">Planning Mode</span>
        </div>
        <div class="p-3">
          <div class="flex items-center gap-1">
            <For each={STEP_CONFIG}>
              {(config, index) => {
                const stepState = createMemo(() => planning.state.steps[config.key])
                const isCurrent = createMemo(() => planning.state.currentStep === config.key)
                const isCompleted = createMemo(() => stepState().status === "completed")
                const isFailed = createMemo(() => stepState().status === "failed" || stepState().status === "rejected")
                const isLast = createMemo(() => index() === STEP_CONFIG.length - 1)

                return (
                  <>
                    <div class="flex flex-col items-center gap-1 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(config.key)}
                        class="flex items-center justify-center size-7 rounded-full transition-colors"
                        classList={{
                          "bg-icon-interactive-base text-white": isCurrent() && !isCompleted(),
                          "bg-success-base text-white": isCompleted(),
                          "bg-critical-base text-white": isFailed(),
                          "bg-surface-raised-base text-icon-weak border border-border-weaker-base":
                            !isCurrent() && !isCompleted() && !isFailed(),
                          "hover:bg-surface-raised-hover": !isCurrent() && !isCompleted() && !isFailed(),
                        }}
                        aria-label={config.label}
                      >
                        <StepIcon status={stepState().status} active={isCurrent()} />
                      </button>
                      <span
                        class="text-[10px] leading-tight text-center truncate max-w-full px-0.5"
                        classList={{
                          "text-text-strong font-medium": isCurrent() || isCompleted(),
                          "text-text-weak": !isCurrent() && !isCompleted(),
                        }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <Show when={!isLast()}>
                      <div
                        class="h-px flex-1 min-w-[8px] mb-4"
                        classList={{
                          "bg-success-base": planning.state.steps[config.key].status === "completed",
                          "bg-border-weaker-base": planning.state.steps[config.key].status !== "completed",
                        }}
                      />
                    </Show>
                  </>
                )
              }}
            </For>
          </div>

          <Show when={expanded()}>
            <ExpandedStep expanded={expanded() as PlanningStep} planning={planning} />
          </Show>
        </div>
      </div>
    </div>
  )
}
