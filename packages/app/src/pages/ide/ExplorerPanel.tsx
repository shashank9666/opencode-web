import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import FileTree from "@/components/file-tree"
import { useFile } from "@/context/file"
import { createSignal, createEffect, Show } from "solid-js"

export interface ExplorerPanelProps {
  dirName: string
  activeFile: string | undefined
  onCreateFile: () => void
  onCreateFolder: () => void
  onFileClick: (node: { path: string; type: string }) => void
  onFileContextMenu?: (e: MouseEvent, node: { path: string; type: string }) => void
  kinds?: Map<string, "add" | "del" | "mix">
  marks?: Set<string>
  openFiles?: string[]
}

// Recently opened files persistence
const RECENT_FILES_KEY = "opencode-explorer-recent"
function loadRecentFiles(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_FILES_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}
function saveRecentFiles(files: string[]) {
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files.slice(0, 10)))
}

export default function ExplorerPanel(props: ExplorerPanelProps) {
  const file = useFile()
  const [recentFiles, setRecentFiles] = createSignal<string[]>(loadRecentFiles())
  const [showRecent, setShowRecent] = createSignal(true)
  const [sortMode, setSortMode] = createSignal<"name" | "type" | "modified">("name")

  // Track recently opened files
  createEffect(() => {
    const active = props.activeFile
    if (!active) return
    setRecentFiles(prev => {
      const next = [active, ...prev.filter(f => f !== active)].slice(0, 10)
      saveRecentFiles(next)
      return next
    })
  })

  const removeRecentFile = (path: string) => {
    setRecentFiles((prev) => {
      const next = prev.filter((item) => item !== path)
      saveRecentFiles(next)
      return next
    })
  }

  const getFilename = (path: string) => path.split("/").pop() ?? path
  const getFileIcon = (path: string) => {
    const ext = path.split(".").pop()?.toLowerCase() ?? ""
    const iconMap: Record<string, string> = {
      ts: "code", tsx: "code", js: "code", jsx: "code",
      json: "bullet-list", md: "comment", css: "code",
      html: "globe", py: "code", go: "code", rs: "code",
      svg: "image", png: "image", jpg: "image", gif: "image",
      gitignore: "branch", yaml: "bullet-list", yml: "bullet-list",
    }
    return iconMap[ext] ?? "open-file"
  }

  return (
    <>
      <div class="flex items-center justify-between px-4 py-2 border-b border-border-base shrink-0 group/header">
        <span class="text-11-regular text-text-weak uppercase tracking-wider">Explorer</span>
        <div class="flex items-center opacity-0 group-hover/header:opacity-100 transition-opacity">
          <IconButton icon="plus" variant="ghost" size="small" class="size-6 text-text-weaker hover:text-text-strong" onClick={() => props.onCreateFile()} aria-label="New File" />
          <IconButton icon="folder" variant="ghost" size="small" class="size-6 text-text-weaker hover:text-text-strong" onClick={() => props.onCreateFolder()} aria-label="New Folder" />
        </div>
      </div>
      <div class="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Recently Opened Files */}
        <Show when={recentFiles().length > 0}>
          <div class="border-b border-border-base/50">
            <button
              type="button"
              class="w-full flex items-center gap-1.5 px-2 py-1 text-11-medium text-text-weaker uppercase tracking-wider hover:bg-surface-raised-base-hover cursor-pointer transition-colors"
              onClick={() => setShowRecent(!showRecent())}
            >
              <Icon name={showRecent() ? "chevron-down" : "chevron-right"} size="small" />
              <span>Recently Opened</span>
              <span class="ml-auto text-10-regular text-text-weaker/60">{recentFiles().length}</span>
            </button>
            <Show when={showRecent()}>
              <div class="max-h-48 overflow-y-auto">
                {recentFiles().map((filePath) => (
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 px-3 py-1 text-12-regular text-text-weak hover:bg-surface-raised-base-hover hover:text-text-strong cursor-pointer transition-colors group"
                    onClick={() => {
                      const node = { path: filePath, type: "file" }
                      props.onFileClick(node)
                    }}
                  >
                    <Icon name={getFileIcon(filePath) as any} size="small" class="text-icon-weaker shrink-0" />
                    <span class="truncate flex-1 text-left">{getFilename(filePath)}</span>
                    <span class="text-10-regular text-text-weaker/60 truncate max-w-24 shrink-0 text-right">
                      {filePath.split("/").slice(-2, -1).join("")}
                    </span>
                    <IconButton
                      icon="close"
                      variant="ghost"
                      size="small"
                      class="size-5 shrink-0 opacity-0 group-hover:opacity-100 text-text-weaker hover:text-text-strong"
                      aria-label={`Remove ${getFilename(filePath)} from recent files`}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        removeRecentFile(filePath)
                      }}
                    />
                  </button>
                ))}
              </div>
            </Show>
          </div>
        </Show>

        {/* Sort controls */}
        <div class="flex items-center gap-1 px-2 py-1 border-b border-border-base/30 shrink-0">
          <span class="text-10-regular text-text-weaker/60 mr-1">Sort:</span>
          <button
            type="button"
            class="text-10-medium px-1.5 py-0.5 rounded transition-colors"
            classList={{
              "bg-accent-base/10 text-accent-base": sortMode() === "name",
              "text-text-weaker hover:text-text-weak": sortMode() !== "name",
            }}
            onClick={() => setSortMode("name")}
          >
            Name
          </button>
          <button
            type="button"
            class="text-10-medium px-1.5 py-0.5 rounded transition-colors"
            classList={{
              "bg-accent-base/10 text-accent-base": sortMode() === "type",
              "text-text-weaker hover:text-text-weak": sortMode() !== "type",
            }}
            onClick={() => setSortMode("type")}
          >
            Type
          </button>
        </div>

        <div class="flex-1 overflow-y-auto min-h-0 relative">
          {/* Workspace Root Section */}
          <div class="flex items-center justify-between px-1 py-1 hover:bg-surface-raised-base-hover cursor-pointer sticky top-0 bg-surface-base z-10 border-b border-border-base/50 group/root">
            <div class="flex items-center gap-1 min-w-0 px-2" onClick={() => file.tree.refresh("")}>
              <span class="text-11-bold text-text-strong uppercase truncate">{props.dirName}</span>
            </div>
            <div class="flex items-center opacity-0 group-hover/root:opacity-100 transition-opacity">
              <IconButton icon="plus" variant="ghost" size="small" class="size-6 text-text-weaker hover:text-text-strong" onClick={(e) => { e.stopPropagation(); props.onCreateFile() }} aria-label="New File" />
              <IconButton icon="folder" variant="ghost" size="small" class="size-6 text-text-weaker hover:text-text-strong" onClick={(e) => { e.stopPropagation(); props.onCreateFolder() }} aria-label="New Folder" />
              <IconButton icon="reset" variant="ghost" size="small" class="size-6 text-text-weaker hover:text-text-strong" onClick={(e) => { e.stopPropagation(); file.tree.refreshAll() }} aria-label="Refresh Explorer" />
              <IconButton icon="collapse" variant="ghost" size="small" class="size-6 text-text-weaker hover:text-text-strong" onClick={(e) => { e.stopPropagation(); file.tree.collapseAll() }} aria-label="Collapse All" />
            </div>
          </div>
          <FileTree
            path=""
            active={props.activeFile}
            onFileClick={props.onFileClick}
            onContextMenu={props.onFileContextMenu}
            kinds={props.kinds}
            marks={props.marks}
          />
        </div>
      </div>
    </>
  )
}
