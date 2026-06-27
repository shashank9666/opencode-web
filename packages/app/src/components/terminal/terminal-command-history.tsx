import { createSignal, createMemo, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import type { CommandHistoryEntry } from "@/context/terminal"

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {})
}

type Props = {
  entries: CommandHistoryEntry[]
  onReRun: (command: string) => void
  onKill: (terminalId: string) => void
}

export default function TerminalCommandHistory(props: Props) {
  const [search, setSearch] = createSignal("")

  const filtered = createMemo(() => {
    const q = search().toLowerCase()
    if (!q) return props.entries
    return props.entries.filter((e) => e.command.toLowerCase().includes(q))
  })

  return (
    <div class="size-full flex flex-col bg-surface-base">
      <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border-base shrink-0">
        <Icon name="history" size="small" class="text-icon-weak" />
        <span class="text-12-medium text-text-weak uppercase tracking-wide">History</span>
        <span class="text-11-regular text-text-weaker">({props.entries.length})</span>
      </div>
      <div class="px-3 py-1.5 border-b border-border-base shrink-0">
        <input
          type="text"
          class="w-full px-2 py-1 text-13-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong"
          placeholder="Search commands..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />
      </div>
      <div class="flex-1 overflow-y-auto">
        <For each={filtered()} fallback={
          <div class="flex items-center justify-center h-full text-text-weak text-13-regular py-8">
            No commands found
          </div>
        }>
          {(entry) => (
            <div class="group flex items-center gap-2 px-3 py-2 hover:bg-surface-raised-base-hover transition-colors border-b border-border-base/50">
              <div class="flex-1 min-w-0">
                <div class="font-mono text-13-regular text-text-strong truncate">
                  {entry.command || "(interactive shell)"}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span
                    class="inline-flex items-center px-1 py-0.5 text-11-semibold rounded font-mono"
                    classList={{
                      "bg-success-alpha text-success-base": entry.exitCode === 0,
                      "bg-danger-alpha text-danger-base": entry.exitCode !== undefined && entry.exitCode !== 0,
                      "text-text-weaker": entry.exitCode === undefined,
                    }}
                  >
                    {entry.exitCode !== undefined ? `exit ${entry.exitCode}` : "running"}
                  </span>
                  <Show when={entry.duration !== undefined}>
                    <span class="text-12-regular text-text-weaker">{formatDuration(entry.duration!)}</span>
                  </Show>
                  <span class="text-12-regular text-text-weaker">{formatTimestamp(entry.startTime)}</span>
                  <Show when={entry.title}>
                    <span class="text-12-regular text-text-weaker">• {entry.title}</span>
                  </Show>
                </div>
              </div>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Tooltip value="Copy command" placement="top">
                  <button
                    type="button"
                    class="size-6 flex items-center justify-center rounded hover:bg-surface-raised-base-hover text-text-weaker hover:text-text-strong transition-colors"
                    onClick={() => copyToClipboard(entry.command)}
                  >
                    <Icon name="copy" size="small" />
                  </button>
                </Tooltip>
                <Tooltip value="Re-run" placement="top">
                  <button
                    type="button"
                    class="size-6 flex items-center justify-center rounded hover:bg-surface-raised-base-hover text-text-weaker hover:text-text-strong transition-colors"
                    onClick={() => props.onReRun(entry.command)}
                  >
                    <Icon name="play" size="small" />
                  </button>
                </Tooltip>
                <Show when={entry.exitCode === undefined}>
                  <Tooltip value="Kill terminal" placement="top">
                    <button
                      type="button"
                      class="size-6 flex items-center justify-center rounded hover:bg-surface-raised-base-hover text-text-weaker hover:text-danger-base transition-colors"
                      onClick={() => props.onKill(entry.terminalId)}
                    >
                      <Icon name="close" size="small" />
                    </button>
                  </Tooltip>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
