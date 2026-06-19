import { type JSX, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import type { BottomPanelTab } from "./ActivityBar"

export { type BottomPanelTab } from "./ActivityBar"

type TabConfig = {
  id: BottomPanelTab
  label: string
  icon: string
}

const TABS: TabConfig[] = [
  { id: "terminal", label: "TERMINAL", icon: "terminal" },
  { id: "problems", label: "PROBLEMS", icon: "circle-x" },
  { id: "output", label: "OUTPUT", icon: "console" },
  { id: "debug-console", label: "DEBUG CONSOLE", icon: "window-cursor" },
  { id: "ai-logs", label: "AI LOGS", icon: "brain" },
]

export default function BottomPanel(props: {
  activeTab: BottomPanelTab
  height: number
  onTabChange: (tab: BottomPanelTab) => void
  onClose: () => void
  onNewTerminal?: () => void
  onSplitTerminal?: () => void
  onKillTerminal?: () => void
  onMaximize?: () => void
  children: (tab: BottomPanelTab) => JSX.Element
}) {
  return (
    <div
      class="flex flex-col bg-surface-base border-t border-border-base shrink-0"
      style={{ height: `${props.height}px` }}
    >
      {/* Tabs bar */}
      <div class="flex items-center justify-between border-b border-border-base bg-surface-base shrink-0" style={{ height: "36px" }}>
        <div class="flex items-center h-full">
          <For each={TABS}>
            {(tab) => (
              <button
                type="button"
                class="flex items-center gap-1.5 px-3 h-full text-11-medium whitespace-nowrap transition-colors relative tracking-wide uppercase"
                classList={{
                  "text-text-strong border-t border-t-accent-base": props.activeTab === tab.id,
                  "text-text-weaker hover:text-text-strong border-t border-transparent": props.activeTab !== tab.id,
                }}
                style={props.activeTab === tab.id ? { "margin-top": "-1px" } : {}}
                onClick={() => props.onTabChange(tab.id)}
              >
                <Show when={tab.icon !== "terminal" && tab.icon !== "circle-x" && tab.icon !== "console" && tab.icon !== "window-cursor" && tab.icon !== "brain"}>
                  <Icon name={tab.icon as any} size="small" />
                </Show>
                <span>{tab.label}</span>
              </button>
            )}
          </For>
        </div>
        <div class="flex items-center gap-1 pr-2 text-text-weaker">
          <Show when={props.activeTab === "terminal"}>
            <Tooltip value="New Terminal" placement="top">
              <IconButton icon="plus" variant="ghost" size="small" class="size-6 rounded hover:bg-surface-raised-base-hover hover:text-text-strong" onClick={props.onNewTerminal} />
            </Tooltip>
            <div class="w-px h-4 bg-border-base mx-0.5" />
            <Tooltip value="Split Terminal" placement="top">
              <IconButton icon="layout-right" variant="ghost" size="small" class="size-6 rounded hover:bg-surface-raised-base-hover hover:text-text-strong" onClick={props.onSplitTerminal} />
            </Tooltip>
            <Tooltip value="Kill Terminal" placement="top">
              <IconButton icon="trash" variant="ghost" size="small" class="size-6 rounded hover:bg-surface-raised-base-hover hover:text-text-strong" onClick={props.onKillTerminal} />
            </Tooltip>
            <div class="w-px h-4 bg-border-base mx-0.5" />
          </Show>
          <Tooltip value="Maximize Panel Size" placement="top">
            <IconButton icon="arrow-up" variant="ghost" size="small" class="size-6 rounded hover:bg-surface-raised-base-hover hover:text-text-strong" onClick={props.onMaximize} />
          </Tooltip>
          <Tooltip value="Close Panel" placement="top">
            <IconButton
              icon="close"
              variant="ghost"
              size="small"
              class="size-6 rounded hover:bg-surface-raised-base-hover hover:text-text-strong"
              onClick={props.onClose}
              aria-label="Close Panel"
            />
          </Tooltip>
        </div>
      </div>

      {/* Content area */}
      <div class="flex-1 min-h-0 overflow-auto">
        {props.children(props.activeTab)}
      </div>
    </div>
  )
}

export function ProblemsTab(props: {
  problems: Array<{ file: string; line: number; column: number; message: string; severity: "error" | "warning" | "info"; code?: string }>
  counts: { errors: number; warnings: number; info: number }
  filter: { errors: boolean; warnings: boolean; info: boolean }
  onFilterChange: (filter: { errors: boolean; warnings: boolean; info: boolean }) => void
  onProblemClick?: (problem: { file: string; line: number }) => void
}) {
  return (
    <div class="size-full flex flex-col">
      {/* Filter bar */}
      <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border-base bg-surface-base shrink-0">
        <button
          type="button"
          class="flex items-center gap-1 px-2 py-0.5 rounded text-12-regular transition-colors"
          classList={{
            "bg-surface-raised-base-hover text-text-strong": props.filter.errors,
            "text-text-weaker hover:text-text-strong": !props.filter.errors,
          }}
          onClick={() => props.onFilterChange({ ...props.filter, errors: !props.filter.errors })}
        >
          <span class="w-2 h-2 rounded-full bg-text-danger-base" />
          {props.counts.errors} Errors
        </button>
        <button
          type="button"
          class="flex items-center gap-1 px-2 py-0.5 rounded text-12-regular transition-colors"
          classList={{
            "bg-surface-raised-base-hover text-text-strong": props.filter.warnings,
            "text-text-weaker hover:text-text-strong": !props.filter.warnings,
          }}
          onClick={() => props.onFilterChange({ ...props.filter, warnings: !props.filter.warnings })}
        >
          <span class="w-2 h-2 rounded-full bg-text-warning-base" />
          {props.counts.warnings} Warnings
        </button>
        <button
          type="button"
          class="flex items-center gap-1 px-2 py-0.5 rounded text-12-regular transition-colors"
          classList={{
            "bg-surface-raised-base-hover text-text-strong": props.filter.info,
            "text-text-weaker hover:text-text-strong": !props.filter.info,
          }}
          onClick={() => props.onFilterChange({ ...props.filter, info: !props.filter.info })}
        >
          <span class="w-2 h-2 rounded-full bg-accent-base" />
          {props.counts.info} Info
        </button>
        <div class="flex-1" />
        <Show when={props.problems.length > 0}>
          <span class="text-12-regular text-text-weaker">{props.problems.length} shown</span>
        </Show>
      </div>
      <div class="flex-1 overflow-auto p-2">
        <Show
          when={props.problems.length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full text-text-weak text-13-regular gap-2">
              <Icon name="circle-check" size="large" class="text-icon-weaker opacity-40" />
              <span>No problems detected</span>
            </div>
          }
        >
          <For each={props.problems}>
            {(problem) => (
              <button
                type="button"
                class="w-full flex items-start gap-2 px-2 py-1 text-13-regular hover:bg-surface-raised-base-hover rounded-md text-left transition-colors"
                onClick={() => props.onProblemClick?.(problem)}
              >
                <Icon
                  name={problem.severity === "error" ? "circle-x" : problem.severity === "warning" ? "warning" : "comment"}
                  size="small"
                  classList={{
                    "text-text-danger-base shrink-0 mt-0.5": problem.severity === "error",
                    "text-text-warning-base shrink-0 mt-0.5": problem.severity === "warning",
                    "text-accent-base shrink-0 mt-0.5": problem.severity === "info",
                  }}
                />
                <div class="flex-1 min-w-0">
                  <span class="text-text-strong">{problem.message}</span>
                  <div class="text-12-regular text-text-weaker truncate">
                    {problem.file}:{problem.line}:{problem.column}
                    {problem.code ? ` [${problem.code}]` : ""}
                  </div>
                </div>
              </button>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}

export function OutputTab(props: {
  lines: string[]
}) {
  return (
    <div class="size-full overflow-auto p-3 font-mono text-13-regular">
      <Show
        when={props.lines.length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center h-full text-text-weak gap-2">
            <Icon name="console" size="large" class="text-icon-weaker opacity-40" />
            <span>No output</span>
          </div>
        }
      >
        <For each={props.lines}>
          {(line) => (
            <div class="text-text-strong whitespace-pre-wrap break-all">{line}</div>
          )}
        </For>
      </Show>
    </div>
  )
}

export function DebugConsoleTab(props: {
  lines: string[]
}) {
  return (
    <div class="size-full flex flex-col">
      <div class="flex items-center px-3 py-1 border-b border-border-base bg-surface-base shrink-0">
        <input
          type="text"
          class="flex-1 px-2 py-1 text-13-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong"
          placeholder="Type expression to evaluate..."
        />
      </div>
      <div class="flex-1 overflow-auto p-3 font-mono text-13-regular">
        <For each={props.lines}>
          {(line) => (
            <div class="text-text-strong whitespace-pre-wrap break-all">{line}</div>
          )}
        </For>
      </div>
    </div>
  )
}

export function AILogsTab(props: {
  logs: Array<{ timestamp: string; level: string; message: string }>
}) {
  return (
    <div class="size-full overflow-auto p-3 font-mono text-13-regular">
      <Show
        when={props.logs.length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center h-full text-text-weak gap-2">
            <Icon name="brain" size="large" class="text-icon-weaker opacity-40" />
            <span>No AI logs yet</span>
          </div>
        }
      >
        <For each={props.logs}>
          {(log) => (
            <div class="flex items-start gap-2 py-0.5">
              <span class="text-text-weaker shrink-0">{log.timestamp}</span>
              <span
                classList={{
                  "text-accent-base shrink-0": log.level === "info",
                  "text-text-warning-base shrink-0": log.level === "warn",
                  "text-text-danger-base shrink-0": log.level === "error",
                }}
              >
                [{log.level.toUpperCase()}]
              </span>
              <span class="text-text-strong">{log.message}</span>
            </div>
          )}
        </For>
      </Show>
    </div>
  )
}
