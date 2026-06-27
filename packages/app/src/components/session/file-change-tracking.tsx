import { For, Show, createMemo } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { getDirectory, getFilename } from "@opencode-ai/core/util/path"
import { DiffViewerActions, DiffViewerBatchActions } from "@opencode-ai/ui/diff-viewer-actions"

interface FileChange {
  file: string
  patch?: string
  additions: number
  deletions: number
  status?: "added" | "deleted" | "modified"
}

interface FileChangeTrackingProps {
  diffs: FileChange[]
  onAccept: (file: string) => void
  onReject: (file: string) => void
  onViewDiff: (file: string) => void
  onEdit: (file: string) => void
  onAcceptAll?: () => void
  onRejectAll?: () => void
  class?: string
}

const statusLabel: Record<string, string> = {
  modified: "M",
  added: "C",
  deleted: "D",
}

const statusColor: Record<string, string> = {
  modified: "text-[var(--diff-mod-text,#ff9800)] bg-[var(--diff-mod-line-bg,rgba(255,152,0,0.1))]",
  added: "text-[var(--diff-add-text,#4caf50)] bg-[var(--diff-add-line-bg,rgba(76,175,80,0.1))]",
  deleted: "text-[var(--diff-remove-text,#f44336)] bg-[var(--diff-remove-line-bg,rgba(244,67,54,0.1))]",
}

function sortStatus(a: string, b: string) {
  const order = ["modified", "added", "deleted"]
  return order.indexOf(a) - order.indexOf(b)
}

export function FileChangeTracking(props: FileChangeTrackingProps) {
  const groups = createMemo(() => {
    const map = new Map<string, FileChange[]>()
    for (const diff of props.diffs) {
      const status = diff.status ?? "modified"
      if (!map.has(status)) map.set(status, [])
      map.get(status)!.push(diff)
    }
    const sorted = [...map.entries()].sort(([a], [b]) => sortStatus(a, b))
    return sorted
  })

  const totalCount = () => props.diffs.length

  return (
    <div data-component="file-change-tracking" class={props.class}>
      <div data-slot="fct-header" class="flex items-center justify-between px-3 py-2 border-b border-border-weak-base">
        <span data-slot="fct-title" class="text-13-medium text-text-base">
          Changes ({totalCount()} file{totalCount() !== 1 ? "s" : ""})
        </span>
        <DiffViewerBatchActions
          onAcceptAll={props.onAcceptAll}
          onRejectAll={props.onRejectAll}
          visible={totalCount() > 1}
        />
      </div>
      <div data-slot="fct-groups" class="divide-y divide-border-weak-base">
        <For each={groups()}>
          {([status, diffs]) => (
            <div data-slot="fct-group" data-status={status}>
              <div
                data-slot="fct-group-header"
                class="sticky top-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-background-stronger/90 backdrop-blur-sm border-b border-border-weak-base"
              >
                <span class="text-11-medium uppercase tracking-wide text-text-weak">
                  {status === "modified" ? "Modified" : status === "added" ? "Created" : "Deleted"}
                </span>
                <span class="text-11-regular text-text-weak">({diffs.length})</span>
              </div>
              <For each={diffs}>
                {(diff) => {
                  const s = diff.status ?? "modified"
                  return (
                    <div
                      data-slot="fct-file"
                      data-file={diff.file}
                      class="flex items-center gap-2 px-3 py-1.5 hover:bg-background-stronger/50 border-b border-border-weaker-base last:border-b-0"
                    >
                      <span
                        data-slot="fct-badge"
                        class={`shrink-0 w-5 h-5 flex items-center justify-center rounded text-10-medium ${statusColor[s]}`}
                      >
                        {statusLabel[s]}
                      </span>
                      <FileIcon node={{ path: diff.file, type: "file" }} />
                      <div data-slot="fct-file-name" class="flex-1 min-w-0">
                        <Show when={diff.file.includes("/")}>
                          <span data-slot="fct-directory" class="text-text-weak text-11-medium">
                            {getDirectory(diff.file)}
                          </span>
                        </Show>
                        <span data-slot="fct-filename" class="text-13-medium text-text-base">
                          {getFilename(diff.file)}
                        </span>
                      </div>
                      <div data-slot="fct-actions" class="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          data-slot="fct-view-diff"
                          class="h-6 w-6 flex items-center justify-center rounded text-icon-weak hover:text-icon-base hover:bg-surface-raised-base-hover"
                          onClick={() => props.onViewDiff(diff.file)}
                          aria-label="View diff"
                        >
                          <Icon name="diff" size="small" />
                        </button>
                        <DiffViewerActions
                          file={diff.file}
                          onAccept={props.onAccept}
                          onReject={props.onReject}
                          onEditManually={props.onEdit}
                        />
                      </div>
                    </div>
                  )
                }}
              </For>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
