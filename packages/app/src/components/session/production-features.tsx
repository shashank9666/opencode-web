import { createMemo, createSignal, For, Show } from "solid-js"
import { useProduction, type AgentLogEntry, type FailedTool, type WorkspaceChange, type SessionRestorePoint } from "@/context/production"
import { Icon } from "@opencode-ai/ui/icon"
import { Button } from "@opencode-ai/ui/button"
import { Accordion } from "@opencode-ai/ui/accordion"
import { StickyAccordionHeader } from "@opencode-ai/ui/sticky-accordion-header"
import { ScrollView } from "@opencode-ai/ui/scroll-view"
import { useLanguage } from "@/context/language"

type Tab = "search" | "history" | "metrics" | "logs" | "fallback" | "retry" | "restore"

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "search", label: "Search", icon: "magnifying-glass" },
  { id: "history", label: "History", icon: "reset" },
  { id: "metrics", label: "Metrics", icon: "sliders" },
  { id: "logs", label: "Agent Logs", icon: "console" },
  { id: "fallback", label: "Model Fallback", icon: "models" },
  { id: "retry", label: "Retry Failed", icon: "warning" },
  { id: "restore", label: "Session Restore", icon: "reset" },
]

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function logLevelIcon(level: AgentLogEntry["level"]) {
  if (level === "error") return { name: "circle-ban-sign" as const, cls: "text-icon-danger" }
  if (level === "warn") return { name: "warning" as const, cls: "text-icon-warning" }
  return { name: "check-small" as const, cls: "text-icon-success" }
}

export function ProductionFeatures() {
  const production = useProduction()
  const [activeTab, setActiveTab] = createSignal<Tab>("search")
  const [searchQuery, setSearchQuery] = createSignal("")
  const [logSearch, setLogSearch] = createSignal("")
  const [historyFilter, setHistoryFilter] = createSignal<string>("")

  const searchResults = createMemo(() => {
    const q = searchQuery()
    if (!q.trim()) return []
    return production.conversationSearch()(q)
  })

  const filteredLogs = createMemo(() => {
    const q = logSearch().toLowerCase().trim()
    if (!q) return production.logs
    return production.logs.filter(
      (log) =>
        log.message.toLowerCase().includes(q) ||
        log.source.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q),
    )
  })

  const filteredHistory = createMemo(() => {
    const filter = historyFilter()
    let items = [...production.workspaceChanges] as WorkspaceChange[]
    if (filter) items = items.filter((c) => c.type === filter)
    return items.sort((a, b) => b.time - a.time)
  })

  const usd = createMemo(
    () =>
      new Intl.NumberFormat(useLanguage().intl(), {
        style: "currency",
        currency: "USD",
      }),
  )

  const costDisplay = createMemo(() => usd().format(production.metrics.totalCost))

  return (
    <div class="flex flex-col h-full contain-strict">
      <div class="flex items-center gap-1 px-3 pt-3 pb-2 overflow-x-auto shrink-0">
        <For each={tabs}>
          {(tab) => (
            <Button
              type="button"
              variant={activeTab() === tab.id ? "primary" : "ghost"}
              size="small"
              icon={tab.icon as any}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          )}
        </For>
      </div>

      <ScrollView class="flex-1">
        <div class="px-3 pb-6">
          <Show when={activeTab() === "search"}>
            <SearchSection
              query={searchQuery()}
              onQuery={setSearchQuery}
              results={searchResults()}
            />
          </Show>

          <Show when={activeTab() === "history"}>
            <HistorySection
              changes={filteredHistory()}
              filter={historyFilter()}
              onFilter={setHistoryFilter}
            />
          </Show>

          <Show when={activeTab() === "metrics"}>
            <MetricsSection m={production.metrics} cost={costDisplay()} />
          </Show>

          <Show when={activeTab() === "logs"}>
            <LogsSection logs={filteredLogs()} search={logSearch()} onSearch={setLogSearch} />
          </Show>

          <Show when={activeTab() === "fallback"}>
            <ModelFallbackSection
              fallback={production.modelFallback}
              onClear={() => production.clearModelFallback()}
            />
          </Show>

          <Show when={activeTab() === "retry"}>
            <RetrySection
              tools={production.failedTools}
              onRetry={(id) => production.retryTool(id)}
            />
          </Show>

          <Show when={activeTab() === "restore"}>
            <RestoreSection
              points={production.restorePoints}
              onRestore={(id) => production.restoreSession(id)}
            />
          </Show>
        </div>
      </ScrollView>
    </div>
  )
}

function SearchSection(props: {
  query: string
  onQuery: (q: string) => void
  results: { sessionID: string; message: string; time: number }[]
}) {
  return (
    <div class="flex flex-col gap-3">
      <h3 class="text-13-medium text-text-strong">Conversation Search</h3>
      <div class="relative">
        <div class="absolute left-3 top-1/2 -translate-y-1/2 text-icon-weak pointer-events-none flex items-center justify-center">
          <Icon name="magnifying-glass" size="small" />
        </div>
        <input
          type="text"
          value={props.query}
          onInput={(e) => props.onQuery(e.currentTarget.value)}
          placeholder="Search conversations..."
          class="w-full h-8 pl-8 pr-3 text-13-regular text-text-strong bg-surface-base rounded-md border border-border-base outline-none placeholder:text-text-weaker"
        />
      </div>
      <Show
        when={props.results.length > 0}
        fallback={
          <div class="text-12-regular text-text-weak text-center pt-4">
            {props.query ? "No matching conversations" : "Type a query to search"}
          </div>
        }
      >
        <div class="flex flex-col gap-1">
          <For each={props.results}>
            {(result) => (
              <div class="flex items-start gap-2 px-2.5 py-2 rounded-md bg-surface-raised-base">
                <Icon name="comment" size="small" class="mt-0.5 shrink-0 text-icon-weak" />
                <div class="min-w-0 flex-1">
                  <div class="text-12-regular text-text-strong truncate">{result.sessionID}</div>
                  <div class="text-11-regular text-text-weaker truncate">{result.message}</div>
                </div>
                <span class="text-11-regular text-text-weaker tabular-nums shrink-0">{fmtTime(result.time)}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

function HistorySection(props: {
  changes: WorkspaceChange[]
  filter: string
  onFilter: (f: string) => void
}) {
  const filters = [
    { value: "", label: "All" },
    { value: "session", label: "Sessions" },
    { value: "file-edit", label: "Edits" },
    { value: "tool", label: "Tools" },
    { value: "config", label: "Config" },
  ]

  return (
    <div class="flex flex-col gap-3">
      <h3 class="text-13-medium text-text-strong">Workspace History</h3>
      <div class="flex gap-1 flex-wrap">
        <For each={filters}>
          {(f) => (
            <Button
              type="button"
              variant={props.filter === f.value ? "primary" : "ghost"}
              size="small"
              onClick={() => props.onFilter(f.value)}
            >
              {f.label}
            </Button>
          )}
        </For>
      </div>
      <Show
        when={props.changes.length > 0}
        fallback={<div class="text-12-regular text-text-weak text-center pt-4">No history entries</div>}
      >
        <Accordion multiple>
          <For each={props.changes}>
            {(change) => (
              <Accordion.Item value={change.id}>
                <StickyAccordionHeader>
                  <Accordion.Trigger>
                    <div class="flex items-center justify-between gap-2 w-full px-1">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-12-regular text-text-strong truncate">{change.description}</span>
                        <span class="text-11-regular text-text-weaker capitalize shrink-0">{change.type}</span>
                      </div>
                      <span class="text-11-regular text-text-weaker tabular-nums shrink-0">{fmtDate(change.time)}</span>
                    </div>
                  </Accordion.Trigger>
                </StickyAccordionHeader>
                <Accordion.Content>
                  <div class="px-3 py-2 text-12-regular text-text-weak">
                    Session: {change.sessionID ?? "N/A"}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            )}
          </For>
        </Accordion>
      </Show>
    </div>
  )
}

function MetricsSection(props: {
  m: {
    totalCost: number
    totalInputTokens: number
    totalOutputTokens: number
    totalReasoningTokens: number
    totalCacheReadTokens: number
    totalCacheWriteTokens: number
    apiCalls: number
    avgResponseTime: number
    lastUpdated: number
  }
  cost: string
}) {
  return (
    <div class="flex flex-col gap-3">
      <h3 class="text-13-medium text-text-strong">Metrics Dashboard</h3>
      <div class="grid grid-cols-2 gap-2">
        <MetricCard label="Total Cost" value={props.cost} icon="sliders" />
        <MetricCard label="API Calls" value={String(props.m.apiCalls)} icon="console" />
        <MetricCard label="Avg Response" value={`${props.m.avgResponseTime.toFixed(0)}ms`} icon="dash" />
        <MetricCard label="Input Tokens" value={props.m.totalInputTokens.toLocaleString()} icon="brain" />
        <MetricCard label="Output Tokens" value={props.m.totalOutputTokens.toLocaleString()} icon="brain" />
        <MetricCard label="Reasoning Tokens" value={props.m.totalReasoningTokens.toLocaleString()} icon="brain" />
        <MetricCard label="Cache Read" value={props.m.totalCacheReadTokens.toLocaleString()} icon="server" />
        <MetricCard label="Cache Write" value={props.m.totalCacheWriteTokens.toLocaleString()} icon="server" />
      </div>
      <Show when={props.m.lastUpdated > 0}>
        <div class="text-11-regular text-text-weaker text-right">Last updated: {fmtDate(props.m.lastUpdated)}</div>
      </Show>
    </div>
  )
}

function MetricCard(props: { label: string; value: string; icon: string }) {
  return (
    <div class="flex items-center gap-2 px-3 py-2.5 rounded-md bg-surface-raised-base">
      <Icon name={props.icon as any} size="small" class="text-icon-weak shrink-0" />
      <div class="min-w-0">
        <div class="text-11-regular text-text-weaker truncate">{props.label}</div>
        <div class="text-13-medium text-text-strong tabular-nums">{props.value}</div>
      </div>
    </div>
  )
}

function LogsSection(props: {
  logs: AgentLogEntry[]
  search: string
  onSearch: (s: string) => void
}) {
  return (
    <div class="flex flex-col gap-3">
      <h3 class="text-13-medium text-text-strong">Agent Logs</h3>
      <div class="relative">
        <div class="absolute left-3 top-1/2 -translate-y-1/2 text-icon-weak pointer-events-none flex items-center justify-center">
          <Icon name="magnifying-glass" size="small" />
        </div>
        <input
          type="text"
          value={props.search}
          onInput={(e) => props.onSearch(e.currentTarget.value)}
          placeholder="Search logs..."
          class="w-full h-8 pl-8 pr-3 text-13-regular text-text-strong bg-surface-base rounded-md border border-border-base outline-none placeholder:text-text-weaker"
        />
      </div>
      <Show
        when={props.logs.length > 0}
        fallback={
          <div class="text-12-regular text-text-weak text-center pt-4">
            {props.search ? "No logs match your search" : "No log entries"}
          </div>
        }
      >
        <div class="flex flex-col gap-0.5">
          <For each={props.logs.slice().reverse()}>
            {(log) => (
              <div class="flex items-start gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-raised-base-hover transition-colors">
                <Icon name={logLevelIcon(log.level).name} size="small" class={`mt-0.5 shrink-0 ${logLevelIcon(log.level).cls}`} />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-12-medium text-text-strong">{log.source}</span>
                    <span class="text-11-regular text-text-weaker">{log.action}</span>
                  </div>
                  <div class="text-12-regular text-text-weak truncate">{log.message}</div>
                </div>
                <span class="text-11-regular text-text-weaker tabular-nums shrink-0">{fmtTime(log.time)}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

function ModelFallbackSection(props: {
  fallback: {
    primaryModel: string
    fallbackModel: string
    active: boolean
    lastTriggered?: number
    reason?: string
  }
  onClear: () => void
}) {
  return (
    <div class="flex flex-col gap-3">
      <h3 class="text-13-medium text-text-strong">Model Fallback</h3>
      <Show
        when={props.fallback.active}
        fallback={
          <div class="flex items-center gap-2 px-3 py-3 rounded-md bg-surface-raised-base">
            <Icon name="check" size="small" class="text-icon-success" />
            <span class="text-13-regular text-text-strong">No fallback active — primary model in use</span>
          </div>
        }
      >
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-md bg-surface-raised-base">
            <Icon name="warning" size="small" class="text-icon-warning" />
            <div class="min-w-0 flex-1">
              <div class="text-12-regular text-text-weaker">Primary</div>
              <div class="text-13-medium text-text-strong">{props.fallback.primaryModel}</div>
            </div>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-md bg-surface-raised-base">
            <Icon name="models" size="small" class="text-icon-weak" />
            <div class="min-w-0 flex-1">
              <div class="text-12-regular text-text-weaker">Fallback</div>
              <div class="text-13-medium text-text-strong">{props.fallback.fallbackModel}</div>
            </div>
          </div>
          <Show when={props.fallback.lastTriggered}>
            <div class="text-12-regular text-text-weaker">Triggered: {fmtDate(props.fallback.lastTriggered!)}</div>
          </Show>
          <Show when={props.fallback.reason}>
            <div class="text-12-regular text-text-weaker">Reason: {props.fallback.reason}</div>
          </Show>
          <Button type="button" variant="ghost" size="small" onClick={props.onClear}>
            Clear Fallback
          </Button>
        </div>
      </Show>
    </div>
  )
}

function RetrySection(props: {
  tools: FailedTool[]
  onRetry: (id: string) => void
}) {
  return (
    <div class="flex flex-col gap-3">
      <h3 class="text-13-medium text-text-strong">Retry Failed Tools</h3>
      <Show
        when={props.tools.length > 0}
        fallback={
          <div class="text-12-regular text-text-weak text-center pt-4">No failed tool calls</div>
        }
      >
        <div class="flex flex-col gap-1">
          <For each={props.tools.slice().reverse()}>
            {(tool) => (
              <div class="flex items-start gap-2 px-2.5 py-2 rounded-md bg-surface-raised-base">
                <Icon name="circle-ban-sign" size="small" class="mt-0.5 shrink-0 text-icon-danger" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-12-medium text-text-strong">{tool.tool}</span>
                    <span class="text-11-regular text-text-weaker">x{tool.retryCount}</span>
                  </div>
                  <div class="text-12-regular text-text-weak truncate">{tool.error}</div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <span class="text-11-regular text-text-weaker tabular-nums">{fmtTime(tool.time)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    icon="reset"
                    onClick={() => props.onRetry(tool.id)}
                  />
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

function RestoreSection(props: {
  points: SessionRestorePoint[]
  onRestore: (id: string) => void
}) {
  return (
    <div class="flex flex-col gap-3">
      <h3 class="text-13-medium text-text-strong">Session Restore</h3>
      <Show
        when={props.points.length > 0}
        fallback={
          <div class="text-12-regular text-text-weak text-center pt-4">No recoverable sessions</div>
        }
      >
        <div class="flex flex-col gap-1">
          <For each={props.points.slice().reverse()}>
            {(point) => (
              <div class="flex items-center gap-2 px-2.5 py-2 rounded-md bg-surface-raised-base">
                <Icon name="reset" size="small" class="text-icon-weak shrink-0" />
                <div class="min-w-0 flex-1">
                  <div class="text-12-medium text-text-strong truncate">{point.label}</div>
                  <div class="text-11-regular text-text-weaker truncate">{point.sessionID}</div>
                </div>
                <span class="text-11-regular text-text-weaker tabular-nums shrink-0">{fmtDate(point.time)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  icon="enter"
                  onClick={() => props.onRestore(point.id)}
                />
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
