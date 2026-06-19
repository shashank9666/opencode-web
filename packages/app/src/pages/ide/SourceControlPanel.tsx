import { createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"

interface GitFile {
  path: string
  status: "modified" | "added" | "deleted" | "renamed" | "untracked"
}

export default function SourceControlPanel(props: {
  branch?: string
  changes: number
  stagedFiles: GitFile[]
  unstagedFiles: GitFile[]
  onCommit?: (message: string) => Promise<void>
  onStage?: (path: string) => void
  onUnstage?: (path: string) => void
  onDiscard?: (path: string) => void
  onPull?: () => void
  onPush?: () => void
  onFetch?: () => void
  onFileClick?: (path: string) => void
}) {
  const [commitMessage, setCommitMessage] = createSignal("")
  const [committing, setCommitting] = createSignal(false)
  const [showMoreActions, setShowMoreActions] = createSignal(false)

  const statusIcon = (status: string) => {
    switch (status) {
      case "modified": return { icon: "edit-small-2" as const, color: "text-text-warning-base" }
      case "added": return { icon: "plus-small" as const, color: "text-icon-diff-add-base" }
      case "deleted": return { icon: "close-small" as const, color: "text-icon-diff-delete-base" }
      case "renamed": return { icon: "edit" as const, color: "text-accent-base" }
      case "untracked": return { icon: "plus" as const, color: "text-icon-diff-add-base" }
      default: return { icon: "edit-small-2" as const, color: "text-text-weak" }
    }
  }

  const handleCommit = async () => {
    const msg = commitMessage().trim()
    if (!msg || !props.onCommit) return
    setCommitting(true)
    try {
      await props.onCommit(msg)
      setCommitMessage("")
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div class="size-full flex flex-col">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-base shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-12-medium text-text-weak uppercase tracking-wider">SOURCE CONTROL</span>
          <Show when={props.branch}>
            <span class="text-12-regular text-accent-base truncate max-w-24">{props.branch}</span>
          </Show>
        </div>
        <div class="flex items-center gap-1">
          <Tooltip value="Fetch" placement="bottom">
            <IconButton
              icon="reset"
              variant="ghost"
              size="small"
              class="size-6 rounded-md"
              onClick={props.onFetch}
              aria-label="Fetch"
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
        <span>{props.changes > 0 ? `${props.changes} change${props.changes !== 1 ? "s" : ""}` : "No changes"}</span>
      </div>

      {/* Commit area */}
      <div class="p-2 border-b border-border-base shrink-0">
        <textarea
          class="w-full px-2 py-1.5 text-13-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong resize-none"
          placeholder="Message (Ctrl+Enter to commit)"
          rows={3}
          value={commitMessage()}
          onInput={(e) => setCommitMessage(e.currentTarget.value)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleCommit() }}
        />
        <div class="flex justify-end mt-1">
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

      {/* Staged files */}
      <Show when={props.stagedFiles.length > 0}>
        <div class="px-3 py-1.5 text-12-medium text-text-weaker uppercase tracking-wider border-b border-border-base shrink-0 bg-surface-base/50">
          Staged Changes
        </div>
        <div class="overflow-y-auto min-h-0">
          <For each={props.stagedFiles}>
            {(file) => {
              const info = statusIcon(file.status)
              return (
                <div class="flex items-center gap-2 px-3 py-1 hover:bg-surface-raised-base-hover transition-colors cursor-pointer group" onClick={() => props.onFileClick?.(file.path)}>
                  <Icon name={info.icon} size="small" class={info.color + " shrink-0"} />
                  <span class="flex-1 text-13-regular text-text-strong truncate">{file.path}</span>
                  <IconButton
                    icon="reset"
                    variant="ghost"
                    size="small"
                    class="size-5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e: MouseEvent) => { e.stopPropagation(); props.onUnstage?.(file.path) }}
                    aria-label="Unstage"
                  />
                </div>
              )
            }}
          </For>
        </div>
      </Show>

      {/* Unstaged files */}
      <div class="px-3 py-1.5 text-12-medium text-text-weaker uppercase tracking-wider border-b border-border-base shrink-0 bg-surface-base/50">
        Changes
      </div>
      <div class="flex-1 overflow-y-auto min-h-0">
        <Show
          when={props.unstagedFiles.length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center py-6 text-13-regular text-text-weaker gap-2">
              <Icon name="circle-check" size="large" class="text-icon-weaker opacity-40" />
              <span>No changes yet</span>
            </div>
          }
        >
          <For each={props.unstagedFiles}>
            {(file) => {
              const info = statusIcon(file.status)
              return (
                <div class="flex items-center gap-2 px-3 py-1 hover:bg-surface-raised-base-hover transition-colors cursor-pointer group" onClick={() => props.onFileClick?.(file.path)}>
                  <Icon name={info.icon} size="small" class={info.color + " shrink-0"} />
                  <span class="flex-1 text-13-regular text-text-strong truncate">{file.path}</span>
                  <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton
                      icon="plus-small"
                      variant="ghost"
                      size="small"
                      class="size-5 rounded shrink-0"
                      onClick={(e: MouseEvent) => { e.stopPropagation(); props.onStage?.(file.path) }}
                      aria-label="Stage"
                    />
                    <IconButton
                      icon="circle-ban-sign"
                      variant="ghost"
                      size="small"
                      class="size-5 rounded shrink-0"
                      onClick={(e: MouseEvent) => { e.stopPropagation(); props.onDiscard?.(file.path) }}
                      aria-label="Discard"
                    />
                  </div>
                </div>
              )
            }}
          </For>
        </Show>
      </div>

      {/* More actions popup */}
      <Show when={showMoreActions()}>
        <div class="fixed inset-0 z-50" onClick={() => setShowMoreActions(false)} />
        <div class="absolute bottom-0 left-0 right-0 z-50 bg-surface-raised-base border border-border-base rounded-t-xl shadow-xl p-2">
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
            onClick={() => { props.onPull?.(); setShowMoreActions(false) }}
          >
            <Icon name="download" size="small" />
            Pull
          </button>
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
            onClick={() => { props.onPush?.(); setShowMoreActions(false) }}
          >
            <Icon name="share" size="small" />
            Push
          </button>
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
            onClick={() => { props.onFetch?.(); setShowMoreActions(false) }}
          >
            <Icon name="reset" size="small" />
            Fetch
          </button>
        </div>
      </Show>
    </div>
  )
}
