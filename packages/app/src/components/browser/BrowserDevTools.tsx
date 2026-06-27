import { createSignal, createMemo, For, Show, type JSX } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"

// ── Types ──

type LogLevel = "error" | "warning" | "info" | "log"

type ConsoleEntry = {
  id: number
  level: LogLevel
  message: string
  timestamp: number
  stack?: string
}

type NetworkRequest = {
  id: number
  method: string
  url: string
  status: number
  statusText: string
  timing: number
  size: string
  timestamp: number
}

type ScreenshotEntry = {
  id: number
  dataUrl: string
  timestamp: number
  label?: string
}

type DOMNode = {
  tag: string
  id?: string
  classes?: string[]
  children: DOMNode[]
  attributes?: Record<string, string>
}

type LogEntry = {
  id: number
  message: string
  timestamp: number
  source: string
}

// ── DevTools Tab Config ──

type DevToolsTab = "console" | "network" | "screenshots" | "dom" | "logs"

const TABS: { id: DevToolsTab; label: string; icon: string }[] = [
  { id: "console", label: "Console", icon: "console" },
  { id: "network", label: "Network", icon: "server" },
  { id: "screenshots", label: "Screenshots", icon: "photo" },
  { id: "dom", label: "DOM", icon: "file-tree" },
  { id: "logs", label: "Logs", icon: "bullet-list" },
]

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: "text-text-danger-base",
  warning: "text-text-warning-base",
  info: "text-accent-base",
  log: "text-text-strong",
}

const LEVEL_BG: Record<LogLevel, string> = {
  error: "bg-red-500/10",
  warning: "bg-yellow-500/10",
  info: "bg-blue-500/10",
  log: "bg-surface-base",
}

const LEVEL_BADGE: Record<LogLevel, { bg: string; text: string }> = {
  error: { bg: "bg-text-danger-base", text: "text-white" },
  warning: { bg: "bg-text-warning-base", text: "text-white" },
  info: { bg: "bg-accent-base", text: "text-white" },
  log: { bg: "bg-text-weak", text: "text-white" },
}

// ── Console Panel ──

function ConsolePanel(props: {
  entries: ConsoleEntry[]
  filter: Record<LogLevel, boolean>
  onFilterChange: (level: LogLevel) => void
  onClear: () => void
}) {
  const [search, setSearch] = createSignal("")

  const filtered = createMemo(() => {
    let list = props.entries.filter((e) => props.filter[e.level])
    const q = search().toLowerCase()
    if (q) list = list.filter((e) => e.message.toLowerCase().includes(q))
    return list
  })

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`
  }

  return (
    <div class="size-full flex flex-col">
      {/* Toolbar */}
      <div class="flex items-center gap-1 px-2 py-1 border-b border-border-base bg-surface-base shrink-0">
        <For each={["error", "warning", "info", "log"] as LogLevel[]}>
          {(level) => {
            const count = props.entries.filter((e) => e.level === level).length
            const active = props.filter[level]
            return (
              <button
                type="button"
                class="flex items-center gap-1 px-2 py-0.5 rounded text-12-regular transition-colors"
                classList={{
                  "bg-surface-raised-base-hover text-text-strong": active,
                  "text-text-weaker hover:text-text-strong": !active,
                }}
                onClick={() => props.onFilterChange(level)}
              >
                <span class={`w-2 h-2 rounded-full ${level === "error" ? "bg-text-danger-base" : level === "warning" ? "bg-text-warning-base" : level === "info" ? "bg-accent-base" : "bg-text-weak"}`} />
                {level.charAt(0).toUpperCase() + level.slice(1)} ({count})
              </button>
            )
          }}
        </For>
        <div class="flex-1" />
        <input
          type="text"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          class="px-1.5 py-0.5 text-11-regular bg-surface-base border border-border-base rounded outline-none focus:border-accent-base text-text-weak w-28"
          placeholder="Filter..."
        />
        <button
          type="button"
          class="flex items-center gap-1 px-1.5 py-0.5 text-11-regular text-text-weaker hover:text-text-strong hover:bg-surface-raised-base-hover rounded transition-colors"
          onClick={props.onClear}
        >
          <Icon name="trash" size="small" />
          Clear
        </button>
      </div>
      {/* Entries */}
      <div class="flex-1 overflow-y-auto font-mono text-12-regular">
        <Show
          when={filtered().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full text-text-weak text-13-regular gap-2">
              <Icon name="console" size="large" class="text-icon-weaker opacity-40" />
              <span>No console messages</span>
            </div>
          }
        >
          <For each={filtered()}>
            {(entry) => (
              <div class={`flex items-start gap-2 px-3 py-1 border-b border-border-base hover:bg-surface-raised-base-hover ${LEVEL_BG[entry.level]}`}>
                <span class={`shrink-0 w-14 text-10-regular uppercase tracking-wider ${LEVEL_COLORS[entry.level]}`}>
                  {entry.level}
                </span>
                <span class="text-10-regular text-text-weaker shrink-0 w-16">{formatTime(entry.timestamp)}</span>
                <span class="text-text-strong flex-1 whitespace-pre-wrap break-all">{entry.message}</span>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}

// ── Network Panel ──

function NetworkPanel(props: { requests: NetworkRequest[] }) {
  const [search, setSearch] = createSignal("")
  const [statusFilter, setStatusFilter] = createSignal<string | null>(null)

  const filtered = createMemo(() => {
    let list = props.requests
    const q = search().toLowerCase()
    if (q) list = list.filter((r) => r.url.toLowerCase().includes(q))
    if (statusFilter()) list = list.filter((r) => String(r.status).startsWith(statusFilter()!))
    return list
  })

  const groupColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-text-success-base"
    if (status >= 300 && status < 400) return "text-accent-base"
    if (status >= 400 && status < 500) return "text-text-warning-base"
    if (status >= 500) return "text-text-danger-base"
    return "text-text-weak"
  }

  return (
    <div class="size-full flex flex-col">
      {/* Toolbar */}
      <div class="flex items-center gap-1 px-2 py-1 border-b border-border-base bg-surface-base shrink-0">
        {[
          { key: null, label: "All" },
          { key: "2", label: "2xx" },
          { key: "3", label: "3xx" },
          { key: "4", label: "4xx" },
          { key: "5", label: "5xx" },
        ].map((item) => (
          <button
            type="button"
            class="px-1.5 py-0.5 text-11-regular rounded transition-colors"
            classList={{
              "bg-accent-base text-white": statusFilter() === item.key,
              "text-text-weaker hover:text-text-strong": statusFilter() !== item.key,
            }}
            onClick={() => setStatusFilter(item.key as string | null)}
          >
            {item.label}
          </button>
        ))}
        <div class="flex-1" />
        <input
          type="text"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          class="px-1.5 py-0.5 text-11-regular bg-surface-base border border-border-base rounded outline-none focus:border-accent-base text-text-weak w-28"
          placeholder="Filter URL..."
        />
      </div>
      {/* Request list */}
      <div class="flex-1 overflow-y-auto">
        <Show
          when={filtered().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full text-text-weak text-13-regular gap-2">
              <Icon name="server" size="large" class="text-icon-weaker opacity-40" />
              <span>No network requests</span>
            </div>
          }
        >
          <For each={filtered()}>
            {(req) => (
              <div class="flex items-center gap-2 px-3 py-1 border-b border-border-base hover:bg-surface-raised-base-hover text-12-regular">
                <span class="shrink-0 w-14 text-11-medium text-text-weaker font-mono">{req.method}</span>
                <span class={`shrink-0 w-10 text-11-medium font-mono text-center ${groupColor(req.status)}`}>
                  {req.status}
                </span>
                <span class="flex-1 text-text-strong truncate min-w-0">{req.url}</span>
                <span class="shrink-0 text-11-regular text-text-weaker">{req.timing}ms</span>
                <span class="shrink-0 text-11-regular text-text-weaker w-14 text-right">{req.size}</span>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}

// ── Screenshots Panel ──

function ScreenshotsPanel(props: { screenshots: ScreenshotEntry[] }) {
  return (
    <div class="size-full overflow-y-auto">
      <Show
        when={props.screenshots.length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center h-full text-text-weak text-13-regular gap-2">
            <Icon name="photo" size="large" class="text-icon-weaker opacity-40" />
            <span>No screenshots captured</span>
          </div>
        }
      >
        <div class="flex flex-col gap-2 p-3">
          <For each={props.screenshots}>
            {(shot) => (
              <div class="border border-border-base rounded-lg overflow-hidden bg-surface-base">
                <div class="flex items-center justify-between px-2 py-1 border-b border-border-base text-11-regular text-text-weaker">
                  <span>{shot.label || `Screenshot ${shot.id}`}</span>
                  <span>{new Date(shot.timestamp).toLocaleTimeString()}</span>
                </div>
                <img
                  src={shot.dataUrl}
                  alt={shot.label || `Screenshot ${shot.id}`}
                  class="w-full object-contain max-h-60"
                />
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

// ── DOM Panel ──

function DOMNodeRow(props: { node: DOMNode; depth: number }) {
  const [expanded, setExpanded] = createSignal(true)
  const hasChildren = props.node.children.length > 0

  const attrs = () => {
    const parts: string[] = []
    if (props.node.id) parts.push(`#${props.node.id}`)
    if (props.node.classes && props.node.classes.length > 0) parts.push(`.${props.node.classes.join(".")}`)
    if (props.node.attributes) {
      for (const [k, v] of Object.entries(props.node.attributes)) {
        if (k !== "id" && k !== "class") parts.push(` ${k}="${v}"`)
      }
    }
    return parts.join("")
  }

  return (
    <div>
      <div
        class="flex items-center gap-1 px-1 py-0.5 hover:bg-surface-raised-base-hover rounded cursor-pointer text-12-regular font-mono"
        style={{ "padding-left": `${props.depth * 16 + 4}px` }}
        onClick={() => hasChildren && setExpanded(!expanded())}
      >
        <Show when={hasChildren}>
          <Icon name={expanded() ? "chevron-down" : "chevron-right"} size="small" class="text-icon-weak shrink-0" />
        </Show>
        <Show when={!hasChildren}>
          <span class="w-3.5 shrink-0" />
        </Show>
        <span class="text-text-strong">&lt;{props.node.tag}</span>
        <span class="text-text-weaker">{attrs()}</span>
        <span class="text-text-strong">&gt;</span>
      </div>
      <Show when={expanded() && hasChildren}>
        <For each={props.node.children}>
          {(child) => <DOMNodeRow node={child} depth={props.depth + 1} />}
        </For>
        <div
          class="flex items-center gap-1 px-1 py-0.5 text-12-regular font-mono text-text-strong"
          style={{ "padding-left": `${(props.depth + 1) * 16 + 4}px` }}
        >
          &lt;/{props.node.tag}&gt;
        </div>
      </Show>
    </div>
  )
}

function DOMPanel(props: { rootNode: DOMNode | null }) {
  return (
    <div class="size-full overflow-y-auto p-1">
      <Show
        when={props.rootNode}
        fallback={
          <div class="flex flex-col items-center justify-center h-full text-text-weak text-13-regular gap-2">
            <Icon name="file-tree" size="large" class="text-icon-weaker opacity-40" />
            <span>No DOM data</span>
          </div>
        }
      >
        <DOMNodeRow node={props.rootNode!} depth={0} />
      </Show>
    </div>
  )
}

// ── Logs Panel ──

function LogsPanel(props: { entries: LogEntry[] }) {
  return (
    <div class="size-full overflow-y-auto font-mono text-12-regular">
      <Show
        when={props.entries.length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center h-full text-text-weak text-13-regular gap-2">
            <Icon name="bullet-list" size="large" class="text-icon-weaker opacity-40" />
            <span>No log entries</span>
          </div>
        }
      >
        <For each={props.entries}>
          {(entry) => (
            <div class="flex items-start gap-2 px-3 py-1 border-b border-border-base hover:bg-surface-raised-base-hover">
              <span class="shrink-0 text-10-regular text-text-weaker w-16">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span class="shrink-0 text-10-regular text-accent-base uppercase tracking-wider w-16 truncate">
                [{entry.source}]
              </span>
              <span class="text-text-strong flex-1 whitespace-pre-wrap break-all">{entry.message}</span>
            </div>
          )}
        </For>
      </Show>
    </div>
  )
}

// ── Main DevTools Component ──

export type { LogLevel, ConsoleEntry, NetworkRequest, ScreenshotEntry, DOMNode, LogEntry }

export function BrowserDevTools(props: {
  consoleEntries: ConsoleEntry[]
  networkRequests: NetworkRequest[]
  screenshots: ScreenshotEntry[]
  domNode: DOMNode | null
  logEntries: LogEntry[]
  onClearConsole: () => void
  onClose?: () => void
  height?: number
}) {
  const [activeTab, setActiveTab] = createSignal<DevToolsTab>("console")
  const [consoleFilter, setConsoleFilter] = createSignal<Record<LogLevel, boolean>>({
    error: true,
    warning: true,
    info: true,
    log: true,
  })

  const toggleConsoleFilter = (level: LogLevel) => {
    setConsoleFilter((prev) => ({ ...prev, [level]: !prev[level] }))
  }

  const heightPx = () => props.height ?? 200

  return (
    <div
      class="border-t border-border-base bg-surface-base flex flex-col shrink-0"
      style={{ height: `${heightPx()}px` }}
    >
      {/* Tabs bar */}
      <div class="flex items-center justify-between border-b border-border-base bg-surface-base shrink-0" style={{ height: "32px" }}>
        <div class="flex items-center h-full">
          <For each={TABS}>
            {(tab) => (
              <button
                type="button"
                class="flex items-center gap-1 px-2.5 h-full text-11-medium whitespace-nowrap transition-colors"
                classList={{
                  "text-text-strong bg-surface-raised-base border-t border-t-accent-base": activeTab() === tab.id,
                  "text-text-weaker hover:text-text-strong": activeTab() !== tab.id,
                }}
                style={activeTab() === tab.id ? { "margin-top": "-1px" } : {}}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon name={tab.icon as any} size="small" />
                <span>{tab.label}</span>
              </button>
            )}
          </For>
        </div>
        <Show when={props.onClose}>
          <button
            type="button"
            class="flex items-center justify-center w-8 h-full text-text-weaker hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors"
            onClick={props.onClose}
            aria-label="Close DevTools"
          >
            <Icon name="close" size="small" />
          </button>
        </Show>
      </div>

      {/* Tab content */}
      <div class="flex-1 min-h-0 overflow-hidden">
        <Show when={activeTab() === "console"}>
          <ConsolePanel
            entries={props.consoleEntries}
            filter={consoleFilter()}
            onFilterChange={toggleConsoleFilter}
            onClear={props.onClearConsole}
          />
        </Show>
        <Show when={activeTab() === "network"}>
          <NetworkPanel requests={props.networkRequests} />
        </Show>
        <Show when={activeTab() === "screenshots"}>
          <ScreenshotsPanel screenshots={props.screenshots} />
        </Show>
        <Show when={activeTab() === "dom"}>
          <DOMPanel rootNode={props.domNode} />
        </Show>
        <Show when={activeTab() === "logs"}>
          <LogsPanel entries={props.logEntries} />
        </Show>
      </div>
    </div>
  )
}
