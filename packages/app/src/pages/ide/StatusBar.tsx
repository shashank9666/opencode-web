import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { Show } from "solid-js"

export default function StatusBar(props: {
  line: number
  column: number
  language: string
  encoding: string
  lineEnding: string
  dirty: boolean
  gitBranch?: string
  gitChanges?: number
  providerName?: string
  workspaceName?: string
  onLanguageClick?: () => void
  onEncodingClick?: () => void
  onLineEndingClick?: () => void
  onGitClick?: () => void
  onProviderClick?: () => void
}) {
  return (
    <div class="flex items-center justify-between px-3 text-12-regular bg-accent-base/10 text-text-weak border-t border-border-base shrink-0 select-none" style={{ height: "24px" }}>
      <div class="flex items-center gap-0 h-full">
        {/* Git branch */}
        <Show when={props.gitBranch}>
          <Tooltip value={`Git branch: ${props.gitBranch}${props.gitChanges ? ` (${props.gitChanges} changes)` : ""}`} placement="top">
            <button
              type="button"
              class="flex items-center gap-1 px-2 h-full hover:bg-accent-base/20 transition-colors cursor-pointer"
              onClick={props.onGitClick}
            >
              <Icon name="branch" size="small" class="size-3" />
              <span class="truncate max-w-24">{props.gitBranch}</span>
              <Show when={props.gitChanges && props.gitChanges > 0}>
                <span class="text-text-strong">{(props.gitChanges ?? 0) > 99 ? "99+" : props.gitChanges}</span>
              </Show>
            </button>
          </Tooltip>
        </Show>

        {/* Problems indicator */}
        <button
          type="button"
          class="flex items-center gap-1 px-2 h-full hover:bg-accent-base/20 transition-colors cursor-pointer"
        >
          <Icon name="circle-x" size="small" class="size-3 text-text-danger-base" />
          <span>0</span>
          <Icon name="warning" size="small" class="size-3 text-text-warning-base" />
          <span>0</span>
        </button>

        {/* Dirty indicator */}
        <Show when={props.dirty}>
          <span class="flex items-center gap-1 px-2 text-text-warning-base">
            <span>●</span>
            <span>unsaved</span>
          </span>
        </Show>
      </div>

      <div class="flex items-center gap-0 h-full">
        {/* Line/Column */}
        <button
          type="button"
          class="flex items-center gap-1 px-2 h-full hover:bg-accent-base/20 transition-colors cursor-pointer"
        >
          <span>Ln {props.line}, Col {props.column}</span>
        </button>

        {/* Encoding */}
        <Tooltip value="File Encoding" placement="top">
          <button
            type="button"
            class="px-2 h-full hover:bg-accent-base/20 transition-colors cursor-pointer"
            onClick={props.onEncodingClick}
          >
            <span>{props.encoding}</span>
          </button>
        </Tooltip>

        {/* Line Ending */}
        <Tooltip value="Line Ending" placement="top">
          <button
            type="button"
            class="px-2 h-full hover:bg-accent-base/20 transition-colors cursor-pointer"
            onClick={props.onLineEndingClick}
          >
            <span>{props.lineEnding}</span>
          </button>
        </Tooltip>

        {/* Language */}
        <Tooltip value="Select Language Mode" placement="top">
          <button
            type="button"
            class="px-2 h-full hover:bg-accent-base/20 transition-colors cursor-pointer"
            onClick={props.onLanguageClick}
          >
            <span>{props.language}</span>
          </button>
        </Tooltip>

        {/* AI Provider */}
        <Show when={props.providerName}>
          <Tooltip value={`AI: ${props.providerName}`} placement="top">
            <button
              type="button"
              class="flex items-center gap-1 px-2 h-full hover:bg-accent-base/20 transition-colors cursor-pointer"
              onClick={props.onProviderClick}
            >
              <Icon name="brain" size="small" class="size-3" />
              <span class="truncate max-w-20">{props.providerName}</span>
            </button>
          </Tooltip>
        </Show>
      </div>
    </div>
  )
}
