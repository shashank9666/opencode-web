import { createSignal, createEffect, createMemo, For, Show, onCleanup, type Accessor } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { showToast } from "@/utils/toast"
import type { VcsFileStatus, VcsInfo } from "@opencode-ai/sdk/v2/client"

// ── Git Diff Viewer ──

type DiffFile = {
  file: string
  patch?: string
  additions: number
  deletions: number
  status?: "added" | "deleted" | "modified"
}

function DiffLineType(line: string) {
  if (line.startsWith("+") && !line.startsWith("+++")) return "add"
  if (line.startsWith("-") && !line.startsWith("---")) return "del"
  if (line.startsWith("@@")) return "hunk"
  return "context"
}

function DiffViewer(props: { file: DiffFile; onClose: () => void }) {
  const lines = createMemo(() => {
    if (!props.file.patch) return []
    return props.file.patch.split("\n")
  })

  return (
    <div class="size-full flex flex-col bg-surface-base">
      <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-base shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <IconButton icon="arrow-left" variant="ghost" size="small" class="size-5" onClick={props.onClose} />
          <span class="text-12-medium text-text-strong truncate">{props.file.file}</span>
          <span class="text-11-regular text-text-success-base">+{props.file.additions}</span>
          <span class="text-11-regular text-text-danger-base">-{props.file.deletions}</span>
        </div>
      </div>
      <div class="flex-1 overflow-auto font-mono text-12-regular p-2">
        <For each={lines()}>
          {(line) => {
            const type = DiffLineType(line)
            return (
              <div
                class="px-2 py-px whitespace-pre-wrap break-all leading-5"
                classList={{
                  "bg-[var(--color-diff-add-bg,#e6ffec)]": type === "add",
                  "bg-[var(--color-diff-del-bg,#ffebe9)]": type === "del",
                  "bg-[var(--color-diff-hunk-bg,#ddf4ff)]": type === "hunk",
                  "text-text-strong": type === "context",
                  "text-[#116329]": type === "add",
                  "text-[#cf222e]": type === "del",
                  "text-[#0550ae]": type === "hunk",
                }}
              >
                <span class="inline-block w-6 text-right text-text-weaker select-none mr-2 text-11-regular">
                  {type === "add" ? "+" : type === "del" ? "-" : ""}
                </span>
                {line}
              </div>
            )
          }}
        </For>
        <Show when={lines().length === 0}>
          <div class="flex flex-col items-center justify-center py-8 text-text-weaker gap-2">
            <Icon name="code" size="large" />
            <span class="text-12-regular">No diff available</span>
          </div>
        </Show>
      </div>
    </div>
  )
}

// ── Git Commit Message Templates ──

const COMMIT_TEMPLATES = [
  { label: "feat", prefix: "feat: ", description: "New feature" },
  { label: "fix", prefix: "fix: ", description: "Bug fix" },
  { label: "docs", prefix: "docs: ", description: "Documentation" },
  { label: "style", prefix: "style: ", description: "Code style" },
  { label: "refactor", prefix: "refactor: ", description: "Refactor" },
  { label: "test", prefix: "test: ", description: "Tests" },
  { label: "chore", prefix: "chore: ", description: "Maintenance" },
]

// ── Main Panel ──

export interface SourceControlPanelProps {
  sdk?: Accessor<any>
  dir?: Accessor<string>
  onFileClick?: (path: string) => void
}

export default function SourceControlPanel(props: SourceControlPanelProps) {
  const [commitMessage, setCommitMessage] = createSignal("")
  const [committing, setCommitting] = createSignal(false)
  const [showMoreActions, setShowMoreActions] = createSignal(false)
  const [showTemplates, setShowTemplates] = createSignal(false)
  const [diffFile, setDiffFile] = createSignal<DiffFile | null>(null)
  const [vcsInfo, setVcsInfo] = createSignal<VcsInfo>({})
  const [files, setFiles] = createSignal<VcsFileStatus[]>([])
  const [loading, setLoading] = createSignal(true)
  const [fetching, setFetching] = createSignal(false)
  const [pushing, setPushing] = createSignal(false)
  const [pulling, setPulling] = createSignal(false)

  // Fetch VCS data
  const refresh = async () => {
    const sdkCtx = props.sdk?.()
    if (!sdkCtx) return
    setLoading(true)
    try {
      const [infoRes, statusRes] = await Promise.all([
        sdkCtx.client.v2.vcs.get().catch(() => ({ data: {} })),
        sdkCtx.client.v2.vcs.status().catch(() => ({ data: [] })),
      ])
      setVcsInfo(infoRes.data ?? {})
      setFiles(statusRes.data ?? [])
    } catch {
      // VCS might not be available (no git repo)
    } finally {
      setLoading(false)
    }
  }

  createEffect(() => {
    // Re-fetch when SDK is available
    props.sdk?.()
    refresh()
  })

  // Poll for changes every 5 seconds
  let pollTimer: ReturnType<typeof setInterval> | undefined
  createEffect(() => {
    if (props.sdk?.()) {
      pollTimer = setInterval(refresh, 5000)
    }
  })
  onCleanup(() => { if (pollTimer) clearInterval(pollTimer) })

  // Derived state
  const branch = createMemo(() => vcsInfo().branch ?? "detached")
  const stagedFiles = createMemo(() => files().filter(f => f.status === "modified" || f.status === "added" || f.status === "deleted"))
  const totalChanges = createMemo(() => files().length)
  const totalAdditions = createMemo(() => files().reduce((sum, f) => sum + f.additions, 0))
  const totalDeletions = createMemo(() => files().reduce((sum, f) => sum + f.deletions, 0))

  const statusIcon = (status: string | undefined) => {
    switch (status) {
      case "modified": return { icon: "edit-small-2" as const, color: "text-text-warning-base" }
      case "added": return { icon: "plus-small" as const, color: "text-icon-diff-add-base" }
      case "deleted": return { icon: "close-small" as const, color: "text-icon-diff-delete-base" }
      default: return { icon: "edit-small-2" as const, color: "text-text-weak" }
    }
  }

  // Commit via shell (no backend commit API, so we show a toast)
  const handleCommit = async () => {
    const msg = commitMessage().trim()
    if (!msg) return
    setCommitting(true)
    try {
      // No commit API exists in the server — show the user instructions
      showToast({
        title: "Commit via Terminal",
        description: `Run: git commit -m "${msg}"`,
      })
      setCommitMessage("")
    } finally {
      setCommitting(false)
    }
  }

  const handleFetch = async () => {
    setFetching(true)
    try {
      showToast({ title: "Fetch", description: "Fetching latest changes..." })
      // No fetch API exposed in SDK v2 — show instruction
      showToast({ title: "Fetch via Terminal", description: "Run: git fetch --all --prune" })
    } finally {
      setFetching(false)
    }
  }

  const handlePush = async () => {
    setPushing(true)
    try {
      showToast({ title: "Push via Terminal", description: "Run: git push" })
    } finally {
      setPushing(false)
    }
  }

  const handlePull = async () => {
    setPulling(true)
    try {
      showToast({ title: "Pull via Terminal", description: "Run: git pull" })
    } finally {
      setPulling(false)
    }
  }

  // If viewing a diff, show diff viewer
  if (diffFile()) {
    return <DiffViewer file={diffFile()!} onClose={() => setDiffFile(null)} />
  }

  return (
    <div class="size-full flex flex-col">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-base shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-12-medium text-text-weak uppercase tracking-wider">SOURCE CONTROL</span>
          <Show when={!loading()}>
            <span class="text-12-regular text-accent-base truncate max-w-24">{branch()}</span>
          </Show>
          <Show when={loading()}>
            <span class="text-12-regular text-text-weaker">Loading...</span>
          </Show>
        </div>
        <div class="flex items-center gap-1">
          <Tooltip value="Refresh" placement="bottom">
            <IconButton
              icon="reset"
              variant="ghost"
              size="small"
              class="size-6 rounded-md"
              onClick={refresh}
              aria-label="Refresh"
            />
          </Tooltip>
          <Tooltip value="More Actions..." placement="bottom">
            <IconButton
              icon="bullet-list"
              variant="ghost"
              size="small"
              class="size-6 rounded-md"
              onClick={() => setShowMoreActions(!showMoreActions())}
              aria-label="More Actions"
            />
          </Tooltip>
        </div>
      </div>

      {/* Changes summary */}
      <div class="px-3 py-1.5 text-12-medium text-text-weak border-b border-border-base flex items-center gap-2 shrink-0">
        <Icon name="branch" size="small" class="text-icon-weak" />
        <span>{totalChanges() > 0 ? `${totalChanges()} change${totalChanges() !== 1 ? "s" : ""}` : "No changes"}</span>
        <Show when={totalAdditions() > 0}>
          <span class="text-text-success-base">+{totalAdditions()}</span>
        </Show>
        <Show when={totalDeletions() > 0}>
          <span class="text-text-danger-base">-{totalDeletions()}</span>
        </Show>
      </div>

      {/* Commit area */}
      <div class="p-2 border-b border-border-base shrink-0">
        <div class="relative">
          <textarea
            class="w-full px-2 py-1.5 text-13-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong resize-none"
            placeholder="Message (Ctrl+Enter to commit)"
            rows={3}
            value={commitMessage()}
            onInput={(e) => setCommitMessage(e.currentTarget.value)}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleCommit() }}
          />
          {/* Commit template chips */}
          <div class="flex flex-wrap gap-1 mt-1.5">
            <For each={COMMIT_TEMPLATES}>
              {(tmpl) => (
                <button
                  type="button"
                  class="px-1.5 py-0.5 text-11-medium bg-surface-raised-base border border-border-base rounded text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors"
                  onClick={() => {
                    setCommitMessage((prev) => {
                      // If already has a conventional commit prefix, replace it
                      const replaced = prev.replace(/^(feat|fix|docs|style|refactor|test|chore|ci|perf|build)(\(.+\))?:\s*/, "")
                      return tmpl.prefix + replaced
                    })
                  }}
                >
                  {tmpl.label}
                </button>
              )}
            </For>
          </div>
        </div>
        <div class="flex justify-end mt-1.5">
          <button
            type="button"
            class="px-3 py-1 text-13-medium bg-accent-base text-white rounded-md hover:bg-accent-base-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!commitMessage().trim() || committing()}
            onClick={handleCommit}
          >
            {committing() ? "Committing..." : "Commit"}
          </button>
        </div>
      </div>

      {/* File list */}
      <Show
        when={totalChanges() > 0}
        fallback={
          <div class="flex-1 flex flex-col items-center justify-center py-6 text-13-regular text-text-weaker gap-2">
            <Icon name="circle-check" size="large" class="text-icon-weaker opacity-40" />
            <span>No changes in working tree</span>
            <Show when={branch() !== "detached"}>
              <span class="text-11-regular text-text-weaker">Branch: {branch()}</span>
            </Show>
          </div>
        }
      >
        <div class="flex-1 overflow-y-auto min-h-0">
          <For each={files()}>
            {(file) => {
              const info = statusIcon(file.status)
              return (
                <div
                  class="flex items-center gap-2 px-3 py-1 hover:bg-surface-raised-base-hover transition-colors cursor-pointer group"
                  onClick={() => {
                    // Open diff view for the file
                    setDiffFile(file)
                  }}
                >
                  <Icon name={info.icon} size="small" class={info.color + " shrink-0"} />
                  <span class="flex-1 text-13-regular text-text-strong truncate">{file.file}</span>
                  <span class="text-11-regular text-text-success-base shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">+{file.additions}</span>
                  <span class="text-11-regular text-text-danger-base shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">-{file.deletions}</span>
                  <IconButton
                    icon="reset"
                    variant="ghost"
                    size="small"
                    class="size-5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation()
                      props.onFileClick?.(file.file)
                    }}
                    aria-label="Open file"
                  />
                </div>
              )
            }}
          </For>
        </div>
      </Show>

      {/* More actions popup */}
      <Show when={showMoreActions()}>
        <div class="fixed inset-0 z-50" onClick={() => setShowMoreActions(false)} />
        <div class="absolute bottom-0 left-0 right-0 z-50 bg-surface-raised-base border border-border-base rounded-t-xl shadow-xl p-2">
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
            onClick={() => { handlePull(); setShowMoreActions(false) }}
          >
            <Icon name="download" size="small" />
            Pull
          </button>
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
            onClick={() => { handlePush(); setShowMoreActions(false) }}
          >
            <Icon name="share" size="small" />
            Push
          </button>
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
            onClick={() => { handleFetch(); setShowMoreActions(false) }}
          >
            <Icon name="reset" size="small" />
            Fetch
          </button>
          <div class="h-px bg-border-base my-1" />
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
            onClick={() => {
              showToast({ title: "Git History", description: "Run: git log --oneline -20 in terminal" })
              setShowMoreActions(false)
            }}
          >
            <Icon name="reset" size="small" />
            View History
          </button>
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
            onClick={() => {
              showToast({ title: "Git Branches", description: "Run: git branch in terminal" })
              setShowMoreActions(false)
            }}
          >
            <Icon name="branch" size="small" />
            Branches
          </button>
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
            onClick={() => {
              showToast({ title: "Stash", description: "Run: git stash in terminal" })
              setShowMoreActions(false)
            }}
          >
            <Icon name="archive" size="small" />
            Stash Changes
          </button>
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
            onClick={() => {
              showToast({ title: "Discard All", description: "Run: git checkout -- . in terminal" })
              setShowMoreActions(false)
            }}
          >
            <Icon name="circle-ban-sign" size="small" class="text-text-danger-base" />
            <span class="text-text-danger-base">Discard All Changes</span>
          </button>
        </div>
      </Show>
    </div>
  )
}
