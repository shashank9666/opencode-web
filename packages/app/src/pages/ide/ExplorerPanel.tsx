import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import FileTree from "@/components/file-tree"
import { useFile } from "@/context/file"

export interface ExplorerPanelProps {
  dirName: string
  activeFile: string | undefined
  onCreateFile: () => void
  onCreateFolder: () => void
  onFileClick: (node: { path: string; type: string }) => void
}

export default function ExplorerPanel(props: ExplorerPanelProps) {
  const file = useFile()

  return (
    <>
      <div class="flex items-center justify-between px-4 py-2 border-b border-border-base shrink-0 group/header">
        <span class="text-11-regular text-text-weak uppercase tracking-wider">Explorer</span>
        <div class="flex items-center opacity-0 group-hover/header:opacity-100 transition-opacity">
        </div>
      </div>
      <div class="flex-1 flex flex-col overflow-hidden min-h-0">
        <div class="flex-1 overflow-y-auto min-h-0 relative">
          {/* Workspace Root Section */}
          <div class="flex items-center justify-between px-1 py-1 hover:bg-surface-raised-base-hover cursor-pointer sticky top-0 bg-surface-base z-10 border-b border-border-base/50 group/root">
            <div class="flex items-center gap-1 min-w-0 px-2" onClick={() => file.tree.refresh("")}>
              <span class="text-11-bold text-text-strong uppercase truncate">{props.dirName}</span>
            </div>
            <div class="flex items-center opacity-0 group-hover/root:opacity-100 transition-opacity">
              <IconButton icon="plus" variant="ghost" size="small" class="size-6 text-text-weaker hover:text-text-strong" onClick={(e) => { e.stopPropagation(); props.onCreateFile() }} aria-label="New File" />
              <IconButton icon="folder" variant="ghost" size="small" class="size-6 text-text-weaker hover:text-text-strong" onClick={(e) => { e.stopPropagation(); props.onCreateFolder() }} aria-label="New Folder" />
              <IconButton icon="reset" variant="ghost" size="small" class="size-6 text-text-weaker hover:text-text-strong" onClick={(e) => { e.stopPropagation(); file.tree.refresh("") }} aria-label="Refresh Explorer" />
              <IconButton icon="collapse" variant="ghost" size="small" class="size-6 text-text-weaker hover:text-text-strong" onClick={(e) => { e.stopPropagation(); file.tree.collapseAll() }} aria-label="Collapse All" />
            </div>
          </div>
          <FileTree path="" active={props.activeFile} onFileClick={props.onFileClick} />
        </div>
      </div>
    </>
  )
}
