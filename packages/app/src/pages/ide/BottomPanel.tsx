import { type JSX, For, Show, createSignal, createMemo } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { DropdownMenu } from "@opencode-ai/ui/dropdown-menu"
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
]

export default function BottomPanel(props: {
  activeTab: BottomPanelTab
  height: number
  onTabChange: (tab: BottomPanelTab) => void
  onClose: () => void
  onNewTerminal?: (profile?: string) => void
  onSplitTerminal?: () => void
  onKillTerminal?: () => void
  isTerminalSplit?: boolean
  onMaximize?: () => void
  children: (tab: BottomPanelTab) => JSX.Element
}) {
  return (
    <div
      class="bottom-panel flex flex-col bg-surface-base border-t border-border-base shrink-0"
      data-testid="bottom-panel"
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
                <Show when={tab.icon !== "terminal" && tab.icon !== "circle-x" && tab.icon !== "console" && tab.icon !== "window-cursor"}>
                  <Icon name={tab.icon as any} size="small" />
                </Show>
                <span>{tab.label}</span>
              </button>
            )}
          </For>
        </div>
        <div class="flex items-center gap-1 pr-2 text-text-weaker">
          <Show when={props.activeTab === "terminal"}>
            <DropdownMenu placement="bottom-end">
              <Tooltip value="New Terminal" placement="top">
                <DropdownMenu.Trigger as="div">
                  <IconButton icon="plus" variant="ghost" size="small" class="size-6 rounded hover:bg-surface-raised-base-hover hover:text-text-strong" />
                </DropdownMenu.Trigger>
              </Tooltip>
              <DropdownMenu.Portal>
                <DropdownMenu.Content class="min-w-[200px]">
                  <DropdownMenu.Item onSelect={() => props.onNewTerminal?.()}>
                    <DropdownMenu.ItemLabel>New Terminal</DropdownMenu.ItemLabel>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => props.onSplitTerminal?.()}>
                    <DropdownMenu.ItemLabel>Split Terminal</DropdownMenu.ItemLabel>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item onSelect={() => props.onNewTerminal?.("PowerShell")}>
                    <DropdownMenu.ItemLabel>PowerShell</DropdownMenu.ItemLabel>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => props.onNewTerminal?.("Command Prompt")}>
                    <DropdownMenu.ItemLabel>Command Prompt</DropdownMenu.ItemLabel>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => props.onNewTerminal?.("Git Bash")}>
                    <DropdownMenu.ItemLabel>Git Bash</DropdownMenu.ItemLabel>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => props.onNewTerminal?.("WSL")}>
                    <DropdownMenu.ItemLabel>WSL</DropdownMenu.ItemLabel>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => props.onNewTerminal?.("JavaScript Debug Terminal")}>
                    <DropdownMenu.ItemLabel>JavaScript Debug Terminal</DropdownMenu.ItemLabel>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu>
            <div class="w-px h-4 bg-border-base mx-0.5" />
            <Tooltip value={props.isTerminalSplit ? "Unsplit Terminal" : "Split Terminal"} placement="top">
              <IconButton icon={props.isTerminalSplit ? "collapse" : "layout-right"} fallbackIcon="collapse" variant="ghost" size="small" class="size-6 rounded hover:bg-surface-raised-base-hover hover:text-text-strong" onClick={props.onSplitTerminal} />
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
  onProblemClick?: (problem: { file: string; line: number; column: number }) => void
}) {
  const [collapsedFiles, setCollapsedFiles] = createSignal<Set<string>>(new Set())

  const toggleFile = (file: string) => {
    const next = new Set(collapsedFiles())
    if (next.has(file)) next.delete(file)
    else next.add(file)
    setCollapsedFiles(next)
  }

  const groupedProblems = createMemo(() => {
    const groups: Record<string, typeof props.problems> = {}
    let filtered = props.problems
    
    // Apply filters
    filtered = filtered.filter(p => {
      if (p.severity === "error" && !props.filter.errors) return false
      if (p.severity === "warning" && !props.filter.warnings) return false
      if (p.severity === "info" && !props.filter.info) return false
      return true
    })

    for (const p of filtered) {
      if (!groups[p.file]) groups[p.file] = []
      groups[p.file].push(p)
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  })

  return (
    <div class="size-full flex flex-col font-sans">
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
      </div>
      <div class="flex-1 overflow-auto p-0">
        <Show
          when={groupedProblems().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full text-text-weak text-13-regular gap-2">
              <Icon name="circle-check" size="large" class="text-icon-weaker opacity-40" />
              <span>No problems detected</span>
            </div>
          }
        >
          <div class="py-1">
            <For each={groupedProblems()}>
              {([file, problems]) => {
                const isCollapsed = collapsedFiles().has(file)
                const fileErrors = problems.filter(p => p.severity === "error").length
                const fileWarnings = problems.filter(p => p.severity === "warning").length
                return (
                  <div>
                    {/* File Header */}
                    <div 
                      class="flex items-center gap-1.5 px-2 py-1 text-13-regular hover:bg-surface-raised-base-hover cursor-pointer transition-colors"
                      onClick={() => toggleFile(file)}
                    >
                      <Icon 
                        name={isCollapsed ? "chevron-right" : "chevron-down"} 
                        size="small" 
                        class="text-icon-weak shrink-0" 
                      />
                      <Icon name="file-tree" size="small" class="text-icon-weak shrink-0" />
                      <div class="flex items-baseline gap-2 min-w-0 flex-1">
                        <span class="text-text-strong font-medium truncate">{file.split('/').pop()}</span>
                        <span class="text-text-weak text-12-regular truncate">{file.substring(0, file.lastIndexOf('/'))}</span>
                      </div>
                      <div class="flex items-center gap-2 shrink-0 pr-2">
                        <Show when={fileErrors > 0}>
                          <div class="flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-text-danger-base" />
                            <span class="text-12-regular text-text-weak">{fileErrors}</span>
                          </div>
                        </Show>
                        <Show when={fileWarnings > 0}>
                          <div class="flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-text-warning-base" />
                            <span class="text-12-regular text-text-weak">{fileWarnings}</span>
                          </div>
                        </Show>
                      </div>
                    </div>
                    {/* File Problems */}
                    <Show when={!isCollapsed}>
                      <For each={problems}>
                        {(problem) => (
                          <div
                            class="flex items-start gap-2 pl-8 pr-2 py-1 text-13-regular hover:bg-surface-raised-base-hover cursor-pointer transition-colors border-l border-transparent hover:border-accent-base"
                            onClick={() => props.onProblemClick?.(problem)}
                          >
                            <Icon
                              name={problem.severity === "error" ? "circle-x" : problem.severity === "warning" ? "warning" : "comment"}
                              size="small"
                              classList={{
                                "text-text-danger-base shrink-0 mt-[3px]": problem.severity === "error",
                                "text-text-warning-base shrink-0 mt-[3px]": problem.severity === "warning",
                                "text-accent-base shrink-0 mt-[3px]": problem.severity === "info",
                              }}
                            />
                            <div class="flex-1 min-w-0">
                              <span class="text-text-strong mr-2">{problem.message}</span>
                              <span class="text-text-weak whitespace-nowrap">
                                <Show when={problem.code}>
                                  <span class="mr-2">ts({problem.code})</span>
                                </Show>
                                <span>[Ln {problem.line}, Col {problem.column}]</span>
                              </span>
                            </div>
                          </div>
                        )}
                      </For>
                    </Show>
                  </div>
                )
              }}
            </For>
          </div>
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

