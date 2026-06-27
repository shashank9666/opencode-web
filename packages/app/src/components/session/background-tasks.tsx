import { For, Show, createSignal } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { Progress } from "@opencode-ai/ui/progress"
import { useBackgroundTasks, type BackgroundTask } from "@/context/background-tasks"

function fmtDuration(ms: number | undefined): string {
  if (typeof ms !== "number") return ""
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.round((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const typeConfig: Record<string, { icon: string; label: string }> = {
  indexing: { icon: "magnifying-glass", label: "Indexing" },
  testing: { icon: "check", label: "Testing" },
  documentation: { icon: "console", label: "Documentation" },
  refactoring: { icon: "code", label: "Refactoring" },
  search: { icon: "magnifying-glass-menu", label: "Search" },
}

const statusIcon = (status: string) => {
  if (status === "running") return { name: "play" as const, cls: "text-icon-warning" }
  if (status === "completed") return { name: "check-small" as const, cls: "text-icon-success" }
  if (status === "failed") return { name: "circle-ban-sign" as const, cls: "text-icon-danger" }
  return { name: "dash" as const, cls: "text-icon-weak" }
}

function TaskRow(props: { task: BackgroundTask; onCancel: (id: string) => void }) {
  const config = () => typeConfig[props.task.type] ?? { icon: "task", label: props.task.name }

  return (
    <div class="flex items-start gap-2.5 px-3 py-2 rounded-md hover:bg-surface-raised-base-hover transition-colors">
      <Icon name={config().icon as any} size="small" class="shrink-0 mt-0.5 text-icon-weak" />
      <div class="min-w-0 flex-1 flex flex-col gap-1">
        <div class="flex items-center justify-between gap-2">
          <span class="text-13-medium text-text-strong truncate">{props.task.name}</span>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="text-11-regular text-text-weaker tabular-nums">
              {fmtTime(props.task.startTime)}
            </span>
            <Show when={props.task.duration}>
              <span class="text-11-regular text-text-weaker tabular-nums">{fmtDuration(props.task.duration)}</span>
            </Show>
            <Icon name={statusIcon(props.task.status).name} size="small" class={`shrink-0 ${statusIcon(props.task.status).cls}`} />
            <Show when={props.task.status === "running"}>
              <Tooltip value="Cancel task" placement="top">
                <IconButton
                  icon="close-small"
                  variant="ghost"
                  size="small"
                  class="size-5 rounded hover:bg-surface-raised-base-hover text-text-weaker hover:text-text-strong"
                  onClick={() => props.onCancel(props.task.id)}
                />
              </Tooltip>
            </Show>
          </div>
        </div>
        <Progress value={props.task.progress} maxValue={100} class="w-full" hideLabel>
          <span />
        </Progress>
        <Show when={props.task.error}>
          <span class="text-11-regular text-text-danger-base truncate">{props.task.error}</span>
        </Show>
      </div>
    </div>
  )
}

export function BackgroundTasksPanel() {
  const bg = useBackgroundTasks()
  const [minimized, setMinimized] = createSignal(false)
  const count = () => bg.runningCount()

  return (
    <div class="flex flex-col size-full">
      <button
        type="button"
        class="flex items-center justify-between gap-2 px-3 py-1.5 text-12-medium text-text-strong sticky top-0 bg-surface-base border-b border-border-base cursor-pointer hover:bg-surface-raised-base-hover transition-colors shrink-0"
        onClick={() => setMinimized(!minimized())}
      >
        <div class="flex items-center gap-2">
          <Icon name={minimized() ? "chevron-right" : "chevron-down"} size="small" class="text-icon-weak" />
          <span>Background Tasks</span>
          <Show when={count() > 0}>
            <span class="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent-base text-10-bold text-white tabular-nums">
              {count()}
            </span>
          </Show>
        </div>
      </button>

      <Show when={!minimized()}>
        <div class="flex-1 overflow-auto py-1">
          <Show
            when={bg.tasks.length > 0}
            fallback={
              <div class="flex flex-col items-center justify-center h-full text-text-weak text-13-regular gap-2 px-4">
                <Icon name="checklist" size="large" class="text-icon-weaker opacity-40" />
                <span>No background tasks</span>
              </div>
            }
          >
            <For each={[...bg.tasks].reverse()}>
              {(task) => <TaskRow task={task} onCancel={(id) => bg.cancelTask(id)} />}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  )
}
