import { Show, For } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"

type ConnectionStatus = "idle" | "loading" | "connected" | "error"

type SessionCardProps = {
  url: string
  status: ConnectionStatus
  duration: number | null
  viewportWidth: number
  viewportHeight: number
  actionsCount: number
  pageTitle: string
  loadTime: number | null
  onClose: () => void
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—"
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}

const statusConfig: Record<ConnectionStatus, { color: string; label: string; icon: string }> = {
  idle: { color: "text-text-weak", label: "Idle", icon: "browser" },
  loading: { color: "text-text-warning-base", label: "Loading", icon: "reset" },
  connected: { color: "text-text-success-base", label: "Connected", icon: "circle-check" },
  error: { color: "text-text-danger-base", label: "Error", icon: "circle-x" },
}

export function BrowserSessionCard(props: SessionCardProps) {
  const status = statusConfig[props.status]

  return (
    <div class="border-b border-border-base bg-surface-raised-base">
      <div class="flex items-center justify-between px-3 py-2">
        <div class="flex items-center gap-2">
          <Icon name={status.icon as any} size="small" class={status.color} />
          <span class="text-13-medium text-text-strong">Session Info</span>
        </div>
        <button
          type="button"
          class="size-5 flex items-center justify-center rounded hover:bg-surface-base text-text-weaker hover:text-text-strong transition-colors"
          onClick={props.onClose}
          aria-label="Close session card"
        >
          <Icon name="close-small" size="small" />
        </button>
      </div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 px-3 pb-2 text-12-regular">
        <div class="flex items-center gap-1.5">
          <Icon name="link" size="small" class="text-icon-weak shrink-0" />
          <span class="text-text-weaker">URL:</span>
          <span class="text-text-strong truncate min-w-0">{props.url || "—"}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <Icon name="browser" size="small" class="text-icon-weak shrink-0" />
          <span class="text-text-weaker">Viewport:</span>
          <span class="text-text-strong">{props.viewportWidth}x{props.viewportHeight}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <Icon name="circle-check" size="small" class="text-icon-weak shrink-0" />
          <span class="text-text-weaker">Status:</span>
          <span class={`${status.color} flex items-center gap-1`}>
            <span class={`w-1.5 h-1.5 rounded-full ${status.color.replace("text-", "bg-")}`} />
            {status.label}
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <Icon name="arrow-right" size="small" class="text-icon-weak shrink-0" />
          <span class="text-text-weaker">Duration:</span>
          <span class="text-text-strong">{formatDuration(props.duration)}</span>
        </div>
        <Show when={props.pageTitle}>
          <div class="flex items-center gap-1.5 col-span-2">
            <Icon name="comment" size="small" class="text-icon-weak shrink-0" />
            <span class="text-text-weaker">Title:</span>
            <span class="text-text-strong truncate">{props.pageTitle}</span>
          </div>
        </Show>
        <Show when={props.loadTime !== null}>
          <div class="flex items-center gap-1.5">
            <Icon name="arrow-right" size="small" class="text-icon-weak shrink-0" />
            <span class="text-text-weaker">Load time:</span>
            <span class="text-text-strong">
              {props.loadTime! < 1000 ? `${props.loadTime}ms` : `${(props.loadTime! / 1000).toFixed(1)}s`}
            </span>
          </div>
        </Show>
        <div class="flex items-center gap-1.5">
          <Icon name="bullet-list" size="small" class="text-icon-weak shrink-0" />
          <span class="text-text-weaker">Actions:</span>
          <span class="text-text-strong">{props.actionsCount}</span>
        </div>
      </div>
    </div>
  )
}
