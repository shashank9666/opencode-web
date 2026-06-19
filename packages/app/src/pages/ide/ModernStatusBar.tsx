import { Show, createSignal } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import WorkspacePresets from "./WorkspacePresets"

export default function ModernStatusBar(props: {
  line: number
  column: number
  language: string
  encoding: string
  lineEnding: string
  dirty: boolean
  gitBranch?: string
  gitChanges?: number
  providerName?: string
  modelName?: string
  terminalCount?: number
  problemsCount?: number
  warningsCount?: number
  syncStatus?: "synced" | "syncing" | "error"
  remoteConnection?: string
  onLanguageClick?: () => void
  onGitClick?: () => void
  onProblemsClick?: () => void
  onCommandPalette?: () => void
  onRemoteClick?: () => void
}) {
  const [expanded, setExpanded] = createSignal(false)

  return (
    <div
      class="flex items-center justify-between px-3 text-12-regular bg-surface-base text-text-weak border-t border-border-base shrink-0 select-none"
      style={{ height: "26px" }}
    >
      {/* Left section */}
      <div class="flex items-center gap-0 h-full">
        {/* Remote indicator */}
        <button
          type="button"
          class="flex items-center justify-center gap-1.5 px-3.5 h-full text-white bg-accent-base hover:bg-accent-base-hover transition-colors font-medium cursor-pointer mr-2"
          onClick={props.onRemoteClick}
          title={props.remoteConnection ? `Connected to ${props.remoteConnection}` : "Open Remote Window"}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-3.5">
            <path d="M5 4L1.5 7.5L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M11 4L14.5 7.5L11 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <Show when={props.remoteConnection}>
            <span class="text-11-medium ml-1">{props.remoteConnection}</span>
          </Show>
        </button>

        {/* Git branch */}
        <Show when={props.gitBranch}>
          <Tooltip value={`Git: ${props.gitBranch}${props.gitChanges ? ` (${props.gitChanges} changes)` : ""}`} placement="top">
            <button
              type="button"
              class="flex items-center gap-1 px-2 h-full hover:bg-surface-raised-base-hover transition-colors cursor-pointer"
              onClick={props.onGitClick}
            >
              <Icon name="branch" size="small" class="size-3" />
              <span class="truncate max-w-28">{props.gitBranch}</span>
              <Show when={props.gitChanges && props.gitChanges > 0}>
                <span class="text-text-strong ml-0.5">{props.gitChanges}</span>
              </Show>
            </button>
          </Tooltip>
        </Show>

        {/* Problems */}
        <button
          type="button"
          class="flex items-center gap-1.5 px-2 h-full hover:bg-surface-raised-base-hover transition-colors cursor-pointer"
          onClick={props.onProblemsClick}
        >
          <Icon name="circle-x" size="small" class="size-3 text-text-danger-base" />
          <span>{props.problemsCount ?? 0}</span>
          <Icon name="warning" size="small" class="size-3 text-text-warning-base" />
          <span>{props.warningsCount ?? 0}</span>
        </button>

        {/* Dirty indicator */}
        <Show when={props.dirty}>
          <div class="flex items-center gap-1 px-2 text-text-warning-base">
            <span class="size-2 rounded-full bg-text-warning-base animate-pulse" />
            <span>unsaved</span>
          </div>
        </Show>

        {/* Sync status */}
        <Show when={props.syncStatus}>
          <Tooltip value={`Sync: ${props.syncStatus}`} placement="top">
            <div class="flex items-center gap-1 px-2">
              <div
                class="size-2 rounded-full"
                classList={{
                  "bg-icon-diff-add-base": props.syncStatus === "synced",
                  "bg-accent-base animate-pulse": props.syncStatus === "syncing",
                  "bg-text-danger-base": props.syncStatus === "error",
                }}
              />
            </div>
          </Tooltip>
        </Show>
      </div>

      {/* Right section */}
      <div class="flex items-center gap-0 h-full">
        {/* Terminal count */}
        <Show when={props.terminalCount && props.terminalCount > 0}>
          <button
            type="button"
            class="flex items-center gap-1 px-2 h-full hover:bg-surface-raised-base-hover transition-colors cursor-pointer"
          >
            <Icon name="terminal" size="small" class="size-3" />
            <span>{props.terminalCount}</span>
          </button>
        </Show>

        {/* Line/Column */}
        <button
          type="button"
          class="flex items-center gap-1 px-2 h-full hover:bg-surface-raised-base-hover transition-colors cursor-pointer"
        >
          <span>Ln {props.line}, Col {props.column}</span>
        </button>

        {/* Encoding */}
        <Tooltip value={`Encoding: ${props.encoding}`} placement="top">
          <button
            type="button"
            class="px-2 h-full hover:bg-surface-raised-base-hover transition-colors cursor-pointer"
          >
            <span>{props.encoding}</span>
          </button>
        </Tooltip>

        {/* Line ending */}
        <Tooltip value={`Line Ending: ${props.lineEnding}`} placement="top">
          <button
            type="button"
            class="px-2 h-full hover:bg-surface-raised-base-hover transition-colors cursor-pointer"
          >
            <span>{props.lineEnding}</span>
          </button>
        </Tooltip>

        {/* Language */}
        <Tooltip value="Select Language Mode" placement="top">
          <button
            type="button"
            class="px-2 h-full hover:bg-surface-raised-base-hover transition-colors cursor-pointer"
            onClick={props.onLanguageClick}
          >
            <span>{props.language}</span>
          </button>
        </Tooltip>

        {/* Spacer */}
        <div class="flex-1" />

        {/* Menu & Layout Actions */}
        <Tooltip value="Command Palette (Ctrl+Shift+P)" placement="top">
          <button
            type="button"
            class="px-2 h-full hover:bg-surface-raised-base-hover transition-colors cursor-pointer"
            onClick={props.onCommandPalette}
          >
            <Icon name="keyboard" size="small" class="size-3" />
          </button>
        </Tooltip>
        <WorkspacePresetsButton />
      </div>
    </div>
  )
}

function WorkspacePresetsButton() {
  const [open, setOpen] = createSignal(false)
  return (
    <>
        <Tooltip value="Workspace Layouts" placement="top">
          <button
            type="button"
            class="px-2 h-full hover:bg-surface-raised-base-hover transition-colors cursor-pointer"
            onClick={() => setOpen(true)}
          >
            <Icon name="layout-left" size="small" class="size-3" />
          </button>
        </Tooltip>
      <WorkspacePresets open={open()} onClose={() => setOpen(false)} onSelect={() => {}} activePreset="" />
    </>
  )
}
