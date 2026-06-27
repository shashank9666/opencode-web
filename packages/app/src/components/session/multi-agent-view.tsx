import { For, Show, createSignal } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Progress } from "@opencode-ai/ui/progress"

export type SubAgentStatus = "queued" | "running" | "completed" | "failed"

export type SubAgent = {
  id: string
  name: string
  role: string
  status: SubAgentStatus
  assignedTask: string
  progress: number
  outputSummary: string
  details?: string[]
  time?: number
}

export type MasterMergeStatus = "idle" | "merging" | "completed" | "conflict"

const roleIcon = (role: string) => {
  if (role === "backend") return { name: "server" as const, cls: "text-accent-base" }
  if (role === "frontend") return { name: "browser" as const, cls: "text-accent-base" }
  if (role === "testing") return { name: "check" as const, cls: "text-icon-success" }
  if (role === "documentation") return { name: "console" as const, cls: "text-icon-weak" }
  if (role === "refactor") return { name: "code" as const, cls: "text-icon-warning" }
  return { name: "brain" as const, cls: "text-accent-base" }
}

const statusDot = (status: SubAgentStatus) => {
  if (status === "running") return "bg-icon-warning animate-pulse"
  if (status === "completed") return "bg-icon-success"
  if (status === "failed") return "bg-icon-danger"
  return "bg-icon-weaker"
}

const mergeStatusLabel = (status: MasterMergeStatus) => {
  if (status === "idle") return "Awaiting agents..."
  if (status === "merging") return "Merging results..."
  if (status === "completed") return "All changes merged"
  if (status === "conflict") return "Merge conflicts detected"
  return ""
}

const mergeIcon = (status: MasterMergeStatus) => {
  if (status === "completed") return "check-small" as const
  if (status === "conflict") return "warning" as const
  if (status === "merging") return "play" as const
  return "dash" as const
}

function AgentCard(props: { agent: SubAgent }) {
  const [expanded, setExpanded] = createSignal(false)

  return (
    <div class="flex flex-col rounded-lg border border-border-base bg-surface-base overflow-hidden">
      <div class="flex items-center gap-2 px-3 py-2 border-b border-border-base">
        <div class={`size-2 rounded-full shrink-0 ${statusDot(props.agent.status)}`} />
        <Icon name={roleIcon(props.agent.role).name} size="small" class={`shrink-0 ${roleIcon(props.agent.role).cls}`} />
        <div class="min-w-0 flex-1">
          <div class="text-13-medium text-text-strong truncate">{props.agent.name}</div>
          <div class="text-11-regular text-text-weak truncate capitalize">{props.agent.role}</div>
        </div>
        <Show when={props.agent.time}>
          <span class="text-11-regular text-text-weaker tabular-nums shrink-0">
            {props.agent.time}s
          </span>
        </Show>
      </div>

      <div class="px-3 py-2 flex flex-col gap-1.5">
        <div class="text-12-regular text-text-weak line-clamp-2">{props.agent.assignedTask}</div>

        <Progress value={props.agent.progress} maxValue={100} class="w-full" hideLabel>
          <span />
        </Progress>

        <div class="text-11-regular text-text-weaker truncate">{props.agent.outputSummary}</div>

        <Show when={props.agent.details && props.agent.details.length > 0}>
          <button
            type="button"
            class="flex items-center gap-1 text-11-regular text-accent-base hover:text-accent-base-hover transition-colors self-start"
            onClick={() => setExpanded(!expanded())}
          >
            <Icon name={expanded() ? "chevron-down" : "chevron-right"} size="small" />
            {expanded() ? "Hide details" : `${props.agent.details!.length} details`}
          </button>

          <Show when={expanded()}>
            <div class="flex flex-col gap-0.5 pl-1 border-l border-border-base ml-[5px]">
              <For each={props.agent.details}>
                {(detail) => (
                  <div class="text-11-regular text-text-weak py-0.5">{detail}</div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  )
}

export function MultiAgentView(props: {
  agents: SubAgent[]
  mergeStatus: MasterMergeStatus
}) {
  return (
    <div class="flex flex-col gap-3 size-full px-3 py-3">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-fr">
        <For each={props.agents}>
          {(agent) => <AgentCard agent={agent} />}
        </For>
      </div>

      <Show when={props.agents.length > 0}>
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-base bg-surface-base">
          <Icon name={mergeIcon(props.mergeStatus)} size="small" classList={{
            "text-icon-success": props.mergeStatus === "completed",
            "text-icon-warning": props.mergeStatus === "conflict",
            "text-icon-warning animate-pulse": props.mergeStatus === "merging",
            "text-icon-weak": props.mergeStatus === "idle",
          }} />
          <span class="text-13-regular text-text-strong">{mergeStatusLabel(props.mergeStatus)}</span>
        </div>
      </Show>
    </div>
  )
}
