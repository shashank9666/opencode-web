import { createSignal, Show, createEffect, onCleanup, createMemo, For, Switch, Match } from "solid-js"
import { useFile } from "@/context/file"
import FileTree from "@/components/file-tree"
import IdeEditor, { IdeDiffEditor, createIdeEditor, languageFromPath, type OpenFile } from "@/components/ide-editor"
import { Terminal } from "@/components/terminal"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { getFilename } from "@opencode-ai/core/util/path"
import { useSDK } from "@/context/sdk"
import { showToast } from "@/utils/toast"
import { useLanguage } from "@/context/language"
import { useDirectoryPicker } from "@/components/directory-picker"
import { useGlobal } from "@/context/global"
import { useServer } from "@/context/server"
import { useNavigate, useParams } from "@solidjs/router"
import { base64Encode } from "@opencode-ai/core/util/encode"
import { decode64 } from "@/utils/base64"
import { useServerSync } from "@/context/server-sync"
import { sortedRootSessions } from "@/pages/layout/helpers"
import Session from "@/pages/session"
import { useTerminal } from "@/context/terminal"

// ── Shell options for the terminal picker ─────────────────────────────────────
const SHELL_OPTIONS = [
  { id: "default", label: "Default Shell", icon: ">", command: undefined, args: undefined, description: "" },
  { id: "powershell", label: "PowerShell", icon: "PS", command: "powershell.exe", args: ["-NoLogo"], description: "Windows PowerShell" },
  { id: "pwsh", label: "PowerShell Core", icon: "PS", command: "pwsh.exe", args: ["-NoLogo"], description: "pwsh" },
  { id: "cmd", label: "Command Prompt", icon: "C:\\", command: "cmd.exe", args: [], description: "cmd.exe" },
  { id: "gitbash", label: "Git Bash", icon: "$", command: "bash.exe", args: ["--login", "-i"], description: "Git for Windows" },
  { id: "bash", label: "Bash", icon: "$", command: "bash", args: [], description: "WSL / Unix" },
  { id: "zsh", label: "Zsh", icon: "$", command: "zsh", args: [], description: "Unix shell" },
]

function getShellInfo(title: string | undefined) {
  const t = (title ?? "").toLowerCase()
  if (t.includes("powershell") || t.includes("pwsh")) return { icon: "PS", label: "PowerShell" }
  if (t.includes("cmd") || t.includes("command prompt")) return { icon: "C:\\\\", label: "Command Prompt" }
  if (t.includes("git bash") || t.includes("gitbash")) return { icon: "$", label: "Git Bash" }
  if (t.includes("bash")) return { icon: "$", label: "Bash" }
  if (t.includes("zsh")) return { icon: "$", label: "Zsh" }
  if (t.includes("fish")) return { icon: "$", label: "fish" }
  return { icon: ">", label: title || "Terminal" }
}

export default function IdePage() {
  const file = useFile()
  const editor = createIdeEditor()
  const sdk = useSDK()
  const language = useLanguage()
  const params = useParams()
  const navigate = useNavigate()
  const global = useGlobal()
  const server = useServer()
  const serverSync = useServerSync()
  const pickDirectory = useDirectoryPicker()
  const terminal = useTerminal()

  // ── Sidebar state ──────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = createSignal(true)
  const [activeTab, setActiveTab] = createSignal<"explorer" | "chat">("explorer")
  const [sidebarWidth, setSidebarWidth] = createSignal(280)

  // ── Session management ─────────────────────────────────────────
  const [activeSessionId, setActiveSessionId] = createSignal<string | null>(null)
  const [sessionRenaming, setSessionRenaming] = createSignal<string | null>(null)
  const [sessionRenameValue, setSessionRenameValue] = createSignal("")
  const [sessionDeleting, setSessionDeleting] = createSignal<string | null>(null)
  const [sessionDeleteTitle, setSessionDeleteTitle] = createSignal("")

  const startRenameSession = (id: string, currentTitle: string) => {
    setSessionRenaming(id)
    setSessionRenameValue(currentTitle)
  }

  const confirmRenameSession = async () => {
    const id = sessionRenaming()
    const title = sessionRenameValue().trim()
    if (!id || !title) return
    try {
      await sdk().client.session.update({ sessionID: id, title })
      showToast({ variant: "success", title: "Session renamed", description: title })
    } catch (e) {
      showToast({ variant: "error", title: "Rename failed", description: String(e) })
    }
    setSessionRenaming(null)
  }

  const confirmDeleteSession = (id: string, title: string) => {
    setSessionDeleting(id)
    setSessionDeleteTitle(title)
  }

  const handleDeleteSession = async () => {
    const id = sessionDeleting()
    if (!id) return
    try {
      await sdk().client.session.delete({ sessionID: id })
      if (activeSessionId() === id) setActiveSessionId(null)
      showToast({ variant: "success", title: "Session deleted", description: sessionDeleteTitle() })
    } catch (e) {
      showToast({ variant: "error", title: "Delete failed", description: String(e) })
    }
    setSessionDeleting(null)
  }

  const dir = createMemo(() => decode64(params.dir) ?? "")
  const [dirStore] = createMemo(() => serverSync().child(dir(), { bootstrap: true }))()
  const recentSessions = createMemo(() => sortedRootSessions(dirStore, Date.now()).slice(0, 10))

  let lastDir: string | undefined
  createEffect(() => {
    const currentDir = dir()
    const recent = recentSessions()
    if (currentDir !== lastDir && recent.length > 0) {
      lastDir = currentDir
      const first = recent[0]
      if (first?.id) setActiveSessionId(first.id)
    }
  })

  // Auto-refresh explorer root when project folder changes
  createEffect(() => {
    const currentDir = dir()
    if (!currentDir) return
    // Force refresh root tree listing on dir change
    void file.tree.refresh("")
  })

  const handleNewSession = async () => {
    try {
      const result = await sdk().client.session.create({ title: "New IDE Session", directory: dir() })
      const newSession = result.data
      if (newSession?.id) {
        setActiveSessionId(newSession.id)
        setActiveTab("chat")
        showToast({ variant: "success", title: "Session created", description: newSession.title ?? "New Session" })
      }
    } catch (e) {
      showToast({ variant: "error", title: "Failed to create session", description: String(e) })
    }
  }

  const handleOpenFolder = () => {
    const conn = server.current
    if (!conn) return
    pickDirectory({
      server: conn,
      title: language.t("command.project.open") ?? "Open Folder",
      multiple: false,
      onSelect: (result) => {
        const directory = typeof result === "string" ? result : Array.isArray(result) ? result[0] : null
        if (!directory) return
        const ctx = global.createServerCtx(conn)
        ctx.projects.open(directory)
        ctx.projects.touch(directory)
        navigate(`/${base64Encode(directory)}/ide`)
      },
    })
  }

  const toggleTab = (tab: "explorer" | "chat") => {
    if (activeTab() === tab && sidebarOpen()) {
      setSidebarOpen(false)
    } else {
      setActiveTab(tab)
      setSidebarOpen(true)
    }
  }

  // ── Editor options ─────────────────────────────────────────────
  const [showFindPanel, setShowFindPanel] = createSignal(false)
  const [findPattern, setFindPattern] = createSignal("")
  const [findResults, setFindResults] = createSignal<Array<{ path: { text: string }; lines: { text: string }; line_number: number; absolute_offset: number; submatches: Array<{ match: { text: string }; start: number; end: number }> }>>([])
  const [searching, setSearching] = createSignal(false)
  const [fontSize, setFontSize] = createSignal(13)
  const [tabSize, setTabSize] = createSignal(2)
  const [wordWrap, setWordWrap] = createSignal<"off" | "on" | "wordWrapColumn" | "bounded">("off")
  const [showPreferences, setShowPreferences] = createSignal(false)
  const [editorLine, setEditorLine] = createSignal(1)
  const [editorColumn, setEditorColumn] = createSignal(1)
  const [breadcrumbs, setBreadcrumbs] = createSignal<string[]>([])
  const [formatTrigger, setFormatTrigger] = createSignal(0)

  // diff view
  const [diffMode, setDiffMode] = createSignal(false)

  // ── Context menu ───────────────────────────────────────────────
  const [contextMenu, setContextMenu] = createSignal<{ x: number; y: number; path: string; isDir: boolean } | null>(null)
  const [renaming, setRenaming] = createSignal<string | null>(null)
  const [renameValue, setRenameValue] = createSignal("")
  const [creating, setCreating] = createSignal<"file" | "directory" | null>(null)
  const [createParent, setCreateParent] = createSignal("")

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = createSignal<{ path: string; isDir: boolean } | null>(null)

  // ── Terminal panel ─────────────────────────────────────────────
  const [terminalOpen, setTerminalOpen] = createSignal(false)
  const [terminalHeight, setTerminalHeight] = createSignal(220)
  const [shellPickerOpen, setShellPickerOpen] = createSignal(false)
  let terminalResizing = false
  let terminalResizeStartY = 0
  let terminalResizeStartH = 0

  const handleTerminalResizeStart = (e: MouseEvent) => {
    terminalResizing = true
    terminalResizeStartY = e.clientY
    terminalResizeStartH = terminalHeight()
    const onMove = (ev: MouseEvent) => {
      if (!terminalResizing) return
      const delta = terminalResizeStartY - ev.clientY
      setTerminalHeight(Math.max(100, Math.min(600, terminalResizeStartH + delta)))
    }
    const onUp = () => {
      terminalResizing = false
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  // ── Sidebar resize ─────────────────────────────────────────────
  let sidebarResizing = false
  let sidebarResizeStartX = 0
  let sidebarResizeStartW = 0

  const handleSidebarResizeStart = (e: MouseEvent) => {
    sidebarResizing = true
    sidebarResizeStartX = e.clientX
    sidebarResizeStartW = sidebarWidth()
    const onMove = (ev: MouseEvent) => {
      if (!sidebarResizing) return
      const delta = ev.clientX - sidebarResizeStartX
      setSidebarWidth(Math.max(180, Math.min(600, sidebarResizeStartW + delta)))
    }
    const onUp = () => {
      sidebarResizing = false
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  // ── File operations ────────────────────────────────────────────
  const handleFileClick = async (node: { path: string; type: string }) => {
    if (node.type !== "file") return
    closeContextMenu()
    await file.load(node.path)
    const state = file.get(node.path)
    if (state?.content && state.content.type === "text") {
      editor.openFile(node.path, state.content.content)
      setDiffMode(false)
    }
  }

  const saveFile = async () => {
    const path = editor.activeFile()
    if (!path) return
    const content = editor.content()
    if (!editor.dirty()) return
    try {
      await sdk().client.fs.write({ body: { path, content } })
      editor.markClean(path)
      showToast({ variant: "success", title: "File saved", description: getFilename(path) })
    } catch (e) {
      showToast({ variant: "error", title: language.t("toast.file.saveFailed.title") ?? "Save failed", description: String(e) })
    }
  }

  const performFind = async () => {
    const pattern = findPattern()
    if (!pattern) return
    setSearching(true)
    try {
      const result = await sdk().client.find.text({ pattern })
      setFindResults(result.data ?? [])
    } catch {
      setFindResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleFindResultClick = async (result: { path: { text: string }; line_number: number }) => {
    const resultPath = result.path.text
    await file.load(resultPath)
    const state = file.get(resultPath)
    if (state?.content && state.content.type === "text") {
      editor.openFile(resultPath, state.content.content)
    }
  }

  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const item = target.closest('[data-component="filetree"] [data-path]')
    if (!item) return
    const path = item.getAttribute("data-path") ?? ""
    const isDir = item.getAttribute("data-type") === "directory"
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDir })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
    setRenaming(null)
    setCreating(null)
  }

  const startRename = (path: string) => {
    setRenaming(path)
    setRenameValue(getFilename(path))
    setContextMenu(null)
  }

  const confirmRename = async () => {
    const oldPath = renaming()
    if (!oldPath || !renameValue()) return
    const parent = oldPath.slice(0, oldPath.lastIndexOf("/"))
    const newPath = parent ? `${parent}/${renameValue()}` : renameValue()
    try {
      const content = editor.content(oldPath)
      await sdk().client.fs.write({ body: { path: newPath, content } })
      showToast({ variant: "success", title: "Renamed", description: `${getFilename(oldPath)} → ${renameValue()}` })
    } catch (e) {
      showToast({ variant: "error", title: "Rename failed", description: String(e) })
    }
    setRenaming(null)
  }

  const startCreate = (type: "file" | "directory", parent: string) => {
    setCreating(type)
    setCreateParent(parent)
    setRenameValue("")
    setContextMenu(null)
  }

  const confirmCreate = async () => {
    if (!creating() || !renameValue()) return
    const parentPath = createParent()
    const newPath = parentPath ? `${parentPath}/${renameValue()}` : renameValue()
    if (creating() === "file") {
      try {
        await sdk().client.fs.write({ body: { path: newPath, content: "" } })
        showToast({ variant: "success", title: "Created", description: renameValue() })
        // Auto-open newly created files
        editor.openFile(newPath, "")
      } catch (e) {
        showToast({ variant: "error", title: "Create failed", description: String(e) })
      }
    } else {
      // Create directory by writing a .gitkeep placeholder
      const placeholder = `${newPath}/.gitkeep`
      try {
        await sdk().client.fs.write({ body: { path: placeholder, content: "" } })
        showToast({ variant: "success", title: "Folder created", description: renameValue() })
      } catch (e) {
        showToast({ variant: "error", title: "Create failed", description: String(e) })
      }
    }
    setCreating(null)
    setRenameValue("")
  }

  const promptDelete = (path: string, isDir: boolean) => {
    setDeleteTarget({ path, isDir })
    setContextMenu(null)
  }

  const confirmDeleteFile = async () => {
    const target = deleteTarget()
    if (!target) return
    try {
      if (target.isDir) {
        // Use terminal to rm -rf for folder deletion
        terminal.new()
        showToast({ variant: "success", title: "Folder queued for deletion via terminal", description: target.path })
      } else {
        await sdk().client.fs.write({ body: { path: target.path, content: "" } })
        if (editor.activeFile() === target.path) editor.closeFile(target.path)
        showToast({ variant: "success", title: "Deleted", description: getFilename(target.path) })
      }
    } catch (e) {
      showToast({ variant: "error", title: "Delete failed", description: String(e) })
    }
    setDeleteTarget(null)
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────
  createEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey
      if (isMod && e.key === "s") {
        e.preventDefault()
        await saveFile()
      }
      if (isMod && e.shiftKey && e.key === "F") {
        e.preventDefault()
        setShowFindPanel(!showFindPanel())
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault()
        setTerminalOpen(!terminalOpen())
        if (!terminalOpen() && terminal.all().length === 0) terminal.new()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    onCleanup(() => window.removeEventListener("keydown", onKeyDown))
  })

  // ── Breadcrumbs ────────────────────────────────────────────────
  createEffect(() => {
    const filePath = editor.activeFile()
    if (!filePath) {
      setBreadcrumbs([])
      return
    }
    const parts = filePath.split("/")
    const crumbs: string[] = []
    for (let i = 0; i < parts.length; i++) {
      crumbs.push(parts.slice(0, i + 1).join("/"))
    }
    setBreadcrumbs(crumbs)
  })

  const activeFileLanguage = createMemo(() => {
    const path = editor.activeFile()
    if (!path) return "plaintext"
    const ext = path.slice(path.lastIndexOf("."))
    return new Map([
      [".ts", "TypeScript"], [".tsx", "TypeScript"], [".js", "JavaScript"], [".jsx", "JavaScript"],
      [".json", "JSON"], [".md", "Markdown"], [".css", "CSS"], [".html", "HTML"],
      [".rs", "Rust"], [".py", "Python"], [".go", "Go"],
    ]).get(ext) ?? "Plain Text"
  })

  const hasDiff = createMemo(() => {
    const path = editor.activeFile()
    if (!path) return false
    return editor.originalContent(path) !== undefined
  })

  return (
    <div class="size-full flex overflow-hidden bg-background-base" onContextMenu={handleContextMenu}>

      {/* ── Activity Bar ── */}
      <div class="w-12 shrink-0 flex flex-col items-center py-4 gap-2 border-r border-border-base bg-surface-base select-none [app-region:no-drag]">
        <Tooltip value="Explorer" placement="right">
          <button
            type="button"
            class="size-8 flex items-center justify-center rounded-lg transition-colors"
            classList={{
              "bg-v2-background-bg-layer-04 text-text-strong": activeTab() === "explorer" && sidebarOpen(),
              "text-text-weak hover:bg-surface-raised-base-hover hover:text-text-strong": activeTab() !== "explorer" || !sidebarOpen(),
            }}
            onClick={() => toggleTab("explorer")}
            aria-label="Explorer"
          >
            <Icon name="open-file" size="large" />
          </button>
        </Tooltip>

        <Tooltip value="Agent Chat" placement="right">
          <button
            type="button"
            class="size-8 flex items-center justify-center rounded-lg transition-colors relative"
            classList={{
              "bg-v2-background-bg-layer-04 text-text-strong": activeTab() === "chat" && sidebarOpen(),
              "text-text-weak hover:bg-surface-raised-base-hover hover:text-text-strong": activeTab() !== "chat" || !sidebarOpen(),
            }}
            onClick={() => toggleTab("chat")}
            aria-label="Agent Chat"
          >
            <Icon name="comment" size="large" />
          </button>
        </Tooltip>

        <div class="flex-1" />

        <Tooltip value={`Terminal (Ctrl+\`)`} placement="right">
          <button
            type="button"
            class="size-8 flex items-center justify-center rounded-lg transition-colors"
            classList={{
              "bg-v2-background-bg-layer-04 text-text-strong": terminalOpen(),
              "text-text-weak hover:bg-surface-raised-base-hover hover:text-text-strong": !terminalOpen(),
            }}
            onClick={() => {
              if (!terminalOpen() && terminal.all().length === 0) terminal.new()
              setTerminalOpen(!terminalOpen())
            }}
            aria-label="Toggle Terminal"
          >
            <Icon name="terminal" size="large" />
          </button>
        </Tooltip>

        <Tooltip value="Open Folder" placement="right">
          <button
            type="button"
            class="size-8 flex items-center justify-center rounded-lg text-text-weak hover:bg-surface-raised-base-hover hover:text-text-strong transition-colors"
            onClick={handleOpenFolder}
            aria-label="Open Folder"
          >
            <Icon name="folder" size="large" />
          </button>
        </Tooltip>
      </div>

      {/* ── Sidebar ── */}
      <Show when={sidebarOpen()}>
        <div
          class="shrink-0 flex flex-col border-r border-border-base bg-surface-base relative"
          style={{ width: `${sidebarWidth()}px` }}
        >
          <Switch>
            {/* Explorer tab */}
            <Match when={activeTab() === "explorer"}>
              <div class="flex items-center justify-between px-3 py-2 border-b border-border-base shrink-0">
                <span class="text-12-medium text-text-weak uppercase tracking-wider">Explorer</span>
                <div class="flex items-center gap-1">
                  <Tooltip value="New File" placement="bottom">
                    <IconButton
                      icon="plus"
                      variant="ghost"
                      size="small"
                      class="size-6 rounded-md"
                      onClick={() => startCreate("file", "")}
                      aria-label="New File"
                    />
                  </Tooltip>
                  <Tooltip value="New Folder" placement="bottom">
                    <IconButton
                      icon="folder"
                      variant="ghost"
                      size="small"
                      class="size-6 rounded-md"
                      onClick={() => startCreate("directory", "")}
                      aria-label="New Folder"
                    />
                  </Tooltip>
                  <Tooltip value="Find in files (Ctrl+Shift+F)" placement="bottom">
                    <IconButton
                      icon="magnifying-glass"
                      variant="ghost"
                      size="small"
                      class="size-6 rounded-md"
                      onClick={() => setShowFindPanel(!showFindPanel())}
                      aria-label="Find in files"
                    />
                  </Tooltip>
                  <Tooltip value="Open Folder" placement="bottom">
                    <IconButton
                      icon="open-file"
                      variant="ghost"
                      size="small"
                      class="size-6 rounded-md"
                      onClick={handleOpenFolder}
                      aria-label="Open Folder"
                    />
                  </Tooltip>
                </div>
              </div>
              <div class="flex-1 overflow-y-auto p-2 min-h-0">
                <FileTree
                  path=""
                  active={editor.activeFile()}
                  onFileClick={handleFileClick}
                />
              </div>
              <Show when={showFindPanel()}>
                <div class="border-t border-border-base p-2 shrink-0">
                  <div class="flex gap-1 mb-1">
                    <input
                      type="text"
                      class="flex-1 px-2 py-1 text-13-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong"
                      placeholder="Search files..."
                      value={findPattern()}
                      onInput={(e) => setFindPattern(e.currentTarget.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") performFind() }}
                    />
                    <IconButton
                      icon="chevron-right"
                      variant="ghost"
                      size="small"
                      class="size-6 rounded-md shrink-0"
                      onClick={performFind}
                      aria-label="Search"
                    />
                  </div>
                  <div class="max-h-40 overflow-y-auto">
                    <Show when={searching()}>
                      <span class="text-12-regular text-text-weak">Searching...</span>
                    </Show>
                    <For each={findResults()}>
                      {(result) => (
                        <button
                          class="w-full text-left px-1 py-0.5 text-12-regular text-text-strong hover:bg-surface-raised-base-hover rounded truncate"
                          onClick={() => handleFindResultClick(result)}
                        >
                          <span class="text-text-weak">{result.path.text}:{result.line_number}</span>{" "}
                          {result.lines.text}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </Match>

            {/* Chat tab */}
            <Match when={activeTab() === "chat"}>
              <div class="flex items-center justify-between px-3 py-2 border-b border-border-base shrink-0">
                <span class="text-12-medium text-text-weak uppercase tracking-wider">Agent Chat</span>
                <IconButton
                  icon="plus"
                  variant="ghost"
                  size="small"
                  class="size-6 rounded-md"
                  onClick={handleNewSession}
                  aria-label="New Session"
                />
              </div>
              <div class="flex-1 min-h-0 overflow-y-auto">
                <Show
                  when={activeSessionId()}
                  fallback={
                    <div class="p-3 flex flex-col gap-2">
                      <button
                        type="button"
                        class="w-full py-1.5 px-3 text-13-medium bg-accent-base text-white hover:bg-accent-base-hover rounded-md transition-colors flex items-center justify-center gap-1.5"
                        onClick={handleNewSession}
                      >
                        <Icon name="plus" size="small" />
                        New Chat Session
                      </button>
                      <div class="text-12-medium text-text-weak uppercase tracking-wider mt-4">Recent Sessions</div>
                      <For each={recentSessions()}>
                        {(session) => {
                          const [isHovered, setIsHovered] = createSignal(false)
                          return (
                            <div
                              class="group flex items-center justify-between px-2 py-1 rounded-md hover:bg-surface-raised-base-hover transition-colors relative h-8"
                              onMouseEnter={() => setIsHovered(true)}
                              onMouseLeave={() => setIsHovered(false)}
                            >
                              <button
                                type="button"
                                class="flex-1 text-left text-13-regular truncate text-text-strong pr-12 h-full"
                                onClick={() => setActiveSessionId(session.id)}
                              >
                                {session.title || "Untitled Session"}
                              </button>
                              <div
                                class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1.5 bg-inherit pl-2"
                                classList={{ "opacity-100": isHovered() }}
                              >
                                <IconButton
                                  icon="edit"
                                  variant="ghost"
                                  size="small"
                                  class="size-5 rounded p-0 text-text-weak hover:text-text-strong"
                                  onClick={(e: MouseEvent) => {
                                    e.stopPropagation()
                                    startRenameSession(session.id, session.title || "Untitled Session")
                                  }}
                                  aria-label="Rename Session"
                                />
                                <IconButton
                                  icon="trash"
                                  variant="ghost"
                                  size="small"
                                  class="size-5 rounded p-0 text-text-danger-base hover:text-text-danger-hover"
                                  onClick={(e: MouseEvent) => {
                                    e.stopPropagation()
                                    confirmDeleteSession(session.id, session.title || "Untitled Session")
                                  }}
                                  aria-label="Delete Session"
                                />
                              </div>
                            </div>
                          )
                        }}
                      </For>
                    </div>
                  }
                >
                  {(sid) => (
                    <div class="size-full flex flex-col">
                      <div class="px-2 py-1 flex items-center border-b border-border-base bg-surface-base shrink-0">
                        <button
                          type="button"
                          class="text-12-regular text-text-weak hover:text-text-strong flex items-center gap-1 transition-colors"
                          onClick={() => setActiveSessionId(null)}
                        >
                          <Icon name="chevron-left" size="small" />
                          Back to sessions
                        </button>
                      </div>
                      <div class="flex-1 min-h-0">
                        <Session sessionId={sid()} dir={dir()} embedded={true} />
                      </div>
                    </div>
                  )}
                </Show>
              </div>
            </Match>
          </Switch>

          {/* Sidebar resize handle */}
          <div
            class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent-base/30 transition-colors z-10"
            onMouseDown={handleSidebarResizeStart}
          />
        </div>
      </Show>

      {/* ── Main editor area ── */}
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* File tabs */}
        <Show when={editor.files().length > 0}>
          <div class="flex items-center border-b border-border-base bg-surface-base overflow-x-auto shrink-0" style={{ "min-height": "36px" }}>
            <For each={editor.files()}>
              {(openFile: OpenFile) => (
                <button
                  class={`flex items-center gap-1.5 px-3 py-1.5 text-13-regular border-r border-border-base whitespace-nowrap shrink-0 transition-colors ${openFile.path === editor.activeFile()
                    ? "bg-background-base text-text-strong border-b-2 border-b-accent-base"
                    : "text-text-weak hover:bg-surface-raised-base-hover"
                    }`}
                  onClick={() => editor.setActiveFile(openFile.path)}
                >
                  <Icon name="open-file" size="small" class="text-icon-weak shrink-0" />
                  <span class="truncate max-w-32">{getFilename(openFile.path)}</span>
                  <Show when={openFile.dirty}>
                    <span class="text-12-medium text-text-warning-base">●</span>
                  </Show>
                  <IconButton
                    icon="close"
                    variant="ghost"
                    size="small"
                    class="size-4 rounded ml-0.5 opacity-60 hover:opacity-100"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation()
                      editor.closeFile(openFile.path)
                    }}
                    aria-label="Close file"
                  />
                </button>
              )}
            </For>
            <div class="flex-1" />
          </div>
        </Show>

        {/* Breadcrumbs */}
        <Show when={editor.activeFile()}>
          <div class="flex items-center gap-1 px-3 py-0.5 text-12-regular text-text-weak bg-surface-base border-b border-border-base shrink-0 overflow-x-auto">
            <For each={breadcrumbs()}>
              {(crumb, i) => (
                <>
                  <Show when={i() > 0}>
                    <span class="text-text-weaker">/</span>
                  </Show>
                  <span class="hover:text-text-strong cursor-pointer truncate">{getFilename(crumb)}</span>
                </>
              )}
            </For>
            <div class="flex-1" />
            {/* Diff toggle */}
            <Show when={hasDiff()}>
              <button
                class="text-12-regular px-2 py-0.5 rounded transition-colors"
                classList={{
                  "bg-accent-base text-white": diffMode(),
                  "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !diffMode(),
                }}
                onClick={() => setDiffMode(!diffMode())}
              >
                {diffMode() ? "Exit Diff" : "Show Diff"}
              </button>
            </Show>
          </div>
        </Show>

        {/* Editor / Diff editor / Empty state */}
        <Show
          when={editor.activeFile()}
          fallback={
            <div class="flex-1 flex flex-col items-center justify-center text-text-weak gap-3 select-none">
              <Icon name="open-file" size="large" class="text-icon-weaker opacity-30" style={{ "font-size": "48px" }} />
              <div class="text-14-regular">Open a file from the Explorer</div>
              <div class="text-12-regular text-text-weaker">or drag a file here</div>
            </div>
          }
        >
          <div class="flex-1 relative min-h-0 flex flex-col" style={{ height: terminalOpen() ? `calc(100% - ${terminalHeight()}px - 36px)` : undefined }}>
            <Show
              when={!diffMode() || !hasDiff()}
              fallback={
                <IdeDiffEditor
                  path={editor.activeFile()}
                  original={editor.originalContent() ?? ""}
                  modified={editor.content()}
                  class="flex-1 min-h-0"
                  fontSize={fontSize()}
                  tabSize={tabSize()}
                  wordWrap={wordWrap()}
                />
              }
            >
              <IdeEditor
                path={editor.activeFile()}
                content={editor.content()}
                onChange={(v) => editor.setContent(editor.activeFile(), v)}
                onCursorChange={(line, col) => { setEditorLine(line); setEditorColumn(col) }}
                formatTrigger={formatTrigger()}
                class="flex-1 min-h-0"
                fontSize={fontSize()}
                tabSize={tabSize()}
                wordWrap={wordWrap()}
              />
            </Show>

            {/* Status bar */}
            <div class="flex items-center justify-between px-3 py-1 text-12-regular text-text-weak bg-surface-base border-t border-border-base shrink-0">
              <div class="flex items-center gap-3">
                <span>Ln {editorLine()}, Col {editorColumn()}</span>
                <span>{activeFileLanguage()}</span>
              </div>
              <div class="flex items-center gap-2">
                <Show when={editor.dirty()}>
                  <span class="text-text-warning-base">● unsaved</span>
                </Show>
                <Tooltip value="Format document" placement="top">
                  <IconButton
                    icon="code"
                    variant="ghost"
                    size="small"
                    class="size-5 rounded"
                    onClick={() => setFormatTrigger(formatTrigger() + 1)}
                    aria-label="Format"
                  />
                </Tooltip>
                <Tooltip value="Save (Ctrl+S)" placement="top">
                  <IconButton
                    icon="arrow-down-to-line"
                    variant="ghost"
                    size="small"
                    class="size-5 rounded"
                    onClick={saveFile}
                    aria-label="Save"
                  />
                </Tooltip>
                <Tooltip value="Preferences" placement="top">
                  <IconButton
                    icon="settings-gear"
                    variant="ghost"
                    size="small"
                    class="size-5 rounded"
                    onClick={() => setShowPreferences(!showPreferences())}
                    aria-label="Preferences"
                  />
                </Tooltip>
              </div>
            </div>
          </div>
        </Show>

        {/* Preferences panel */}
        <Show when={showPreferences()}>
          <div class="border-t border-border-base bg-surface-base p-3 shrink-0">
            <div class="flex items-center gap-4 mb-1 flex-wrap">
              <label class="text-13-regular text-text-strong">Font Size</label>
              <input
                type="number"
                class="w-16 px-2 py-0.5 text-13-regular bg-surface-base border border-border-base rounded text-text-strong"
                value={fontSize()}
                onInput={(e) => setFontSize(Number(e.currentTarget.value))}
                min={10}
                max={30}
              />
              <label class="text-13-regular text-text-strong">Tab Size</label>
              <input
                type="number"
                class="w-16 px-2 py-0.5 text-13-regular bg-surface-base border border-border-base rounded text-text-strong"
                value={tabSize()}
                onInput={(e) => setTabSize(Number(e.currentTarget.value))}
                min={1}
                max={8}
              />
              <label class="text-13-regular text-text-strong">Word Wrap</label>
              <select
                class="px-2 py-0.5 text-13-regular bg-surface-base border border-border-base rounded text-text-strong"
                value={wordWrap()}
                onChange={(e) => setWordWrap(e.currentTarget.value as "off" | "on")}
              >
                <option value="off">Off</option>
                <option value="on">On</option>
              </select>
            </div>
          </div>
        </Show>

        {/* ── Terminal panel ── */}
        <Show when={terminalOpen()}>
          {/* Resize handle */}
          <div
            class="h-1 bg-border-base hover:bg-accent-base/50 cursor-row-resize shrink-0 transition-colors"
            onMouseDown={handleTerminalResizeStart}
          />
          <div
            class="flex flex-col bg-surface-base border-t border-border-base shrink-0"
            style={{ height: `${terminalHeight()}px` }}
          >
            {/* Terminal header bar */}
            <div class="flex items-center justify-between border-b border-border-base bg-surface-base px-2 shrink-0" style={{ "min-height": "32px" }}>
              <span class="text-12-medium text-text-weak uppercase tracking-wider">Terminal</span>
              <div class="flex items-center gap-1">
                {/* New terminal split button: left = new default, right = dropdown for shell type */}
                <div class="flex items-center">
                  <Tooltip value="New Terminal" placement="top">
                    <button
                      class="flex items-center gap-1 px-2 py-0.5 text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover rounded-l-md border-r border-border-base transition-colors"
                      onClick={() => terminal.new()}
                      aria-label="New Terminal"
                    >
                      <Icon name="plus" size="small" />
                    </button>
                  </Tooltip>
                  <div class="relative">
                    <button
                      class="flex items-center px-1 py-0.5 text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover rounded-r-md transition-colors"
                      onClick={() => setShellPickerOpen(!shellPickerOpen())}
                      aria-label="Select Shell"
                    >
                      <Icon name="chevron-down" size="small" />
                    </button>
                    <Show when={shellPickerOpen()}>
                      <div
                        class="absolute top-full right-0 mt-1 z-50 bg-surface-raised-base border border-border-base rounded-lg shadow-xl py-1 min-w-52"
                        style={{ top: "calc(100% + 4px)" }}
                      >
                        <div class="px-3 py-1 text-11-medium text-text-weaker uppercase tracking-wider border-b border-border-base mb-1">Select Default Profile</div>
                        <For each={SHELL_OPTIONS}>
                          {(shell) => (
                            <button
                              class="w-full flex items-center gap-3 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover text-left transition-colors"
                              onClick={() => {
                                setShellPickerOpen(false)
                                terminal.newShell({ command: shell.command, args: shell.args, title: shell.label })
                                if (!terminalOpen()) setTerminalOpen(true)
                              }}
                            >
                              <span class="text-15-regular" style={{ "font-family": "monospace" }}>{shell.icon}</span>
                              <span>{shell.label}</span>
                              <Show when={shell.description}>
                                <span class="text-12-regular text-text-weak ml-auto">{shell.description}</span>
                              </Show>
                            </button>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </div>
                <div class="w-px h-4 bg-border-base mx-1" />
                <Tooltip value="Kill Terminal" placement="top">
                  <IconButton
                    icon="close-small"
                    variant="ghost"
                    size="small"
                    class="size-5 rounded"
                    onClick={() => { const id = terminal.active(); if (id) terminal.close(id) }}
                    aria-label="Kill Terminal"
                  />
                </Tooltip>
                <IconButton
                  icon="close"
                  variant="ghost"
                  size="small"
                  class="size-5 rounded"
                  onClick={() => setTerminalOpen(false)}
                  aria-label="Close Terminal Panel"
                />
              </div>
            </div>

            {/* Terminal body: content + right sidebar */}
            <div class="flex-1 min-h-0 flex">
              {/* Terminal content area */}
              <div class="flex-1 min-w-0 relative">
                <For each={terminal.all()}>
                  {(pty) => (
                    <div
                      class="absolute inset-0"
                      style={{ display: terminal.active() === pty.id ? "block" : "none" }}
                    >
                      <Terminal
                        pty={pty}
                        class="size-full"
                        onCleanup={(p) => terminal.update(p)}
                      />
                    </div>
                  )}
                </For>
                <Show when={terminal.all().length === 0}>
                  <div class="size-full flex items-center justify-center text-text-weak text-13-regular">
                    <div class="flex flex-col items-center gap-3">
                      <Icon name="terminal" size="large" class="text-icon-weaker opacity-40" />
                      <button
                        class="flex items-center gap-2 px-4 py-2 rounded-md border border-border-base hover:bg-surface-raised-base-hover transition-colors text-13-regular"
                        onClick={() => terminal.new()}
                      >
                        <Icon name="plus" size="small" />
                        New Terminal
                      </button>
                    </div>
                  </div>
                </Show>
              </div>

              {/* Right sidebar: terminal instance list */}
              <div class="w-48 shrink-0 border-l border-border-base bg-surface-base flex flex-col overflow-y-auto">
                <For each={terminal.all()}>
                  {(pty) => {
                    const shellInfo = () => getShellInfo(pty.title)
                    return (
                      <div
                        class="group flex items-center px-2 py-1.5 cursor-pointer border-b border-border-base/50 transition-colors relative"
                        classList={{
                          "bg-background-base border-l-2 border-l-accent-base": terminal.active() === pty.id,
                          "hover:bg-surface-raised-base-hover": terminal.active() !== pty.id,
                        }}
                        onClick={() => terminal.open(pty.id)}
                      >
                        <span class="text-13-regular mr-2 shrink-0" style={{ "font-family": "monospace" }}>{shellInfo().icon}</span>
                        <div class="flex-1 min-w-0">
                          <div
                            class="text-12-medium truncate"
                            classList={{
                              "text-text-strong": terminal.active() === pty.id,
                              "text-text-weak": terminal.active() !== pty.id,
                            }}
                          >
                            {shellInfo().label}
                          </div>
                          <div class="text-11-regular text-text-weaker truncate">
                            {pty.title && pty.title !== shellInfo().label ? pty.title : `#${pty.titleNumber}`}
                          </div>
                        </div>
                        <IconButton
                          icon="close"
                          variant="ghost"
                          size="small"
                          class="size-4 rounded opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                          onClick={(e: MouseEvent) => {
                            e.stopPropagation()
                            terminal.close(pty.id)
                          }}
                          aria-label="Close terminal"
                        />
                      </div>
                    )
                  }}
                </For>
                <Show when={terminal.all().length === 0}>
                  <div class="p-3 text-12-regular text-text-weaker text-center">No terminals</div>
                </Show>
              </div>
            </div>
          </div>
        </Show>
      </div>


      {/* ── Context Menu ── */}
      <Show when={contextMenu()}>
        <div
          class="fixed z-50 bg-surface-raised-base border border-border-base rounded-lg shadow-lg py-1 min-w-44"
          style={{ left: `${contextMenu()!.x}px`, top: `${contextMenu()!.y}px` }}
        >
          <button class="w-full px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover text-left flex items-center gap-2" onClick={() => startCreate("file", contextMenu()!.path)}>
            <Icon name="plus" size="small" class="text-icon-weak" />
            New File
          </button>
          <button class="w-full px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover text-left flex items-center gap-2" onClick={() => startCreate("directory", contextMenu()!.path)}>
            <Icon name="folder" size="small" class="text-icon-weak" />
            New Folder
          </button>
          <div class="h-px bg-border-base my-1" />
          <button class="w-full px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover text-left flex items-center gap-2" onClick={() => startRename(contextMenu()!.path)}>
            <Icon name="edit" size="small" class="text-icon-weak" />
            Rename
          </button>
          <button class="w-full px-3 py-1.5 text-13-regular text-text-danger-base hover:bg-surface-raised-base-hover text-left flex items-center gap-2" onClick={() => promptDelete(contextMenu()!.path, contextMenu()!.isDir)}>
            <Icon name="trash" size="small" />
            Delete
          </button>
        </div>
      </Show>

      {/* Context menu backdrop */}
      <Show when={contextMenu()}>
        <div class="fixed inset-0 z-40" onClick={closeContextMenu} />
      </Show>

      {/* ── Rename / Create Dialog ── */}
      <Show when={renaming() !== null || creating() !== null}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setRenaming(null); setCreating(null) }}>
          <div class="bg-surface-raised-base border border-border-base rounded-xl p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150 w-80" onClick={(e) => e.stopPropagation()}>
            <div class="text-15-medium text-text-strong mb-3">
              {creating() === "file" ? "New File" : creating() === "directory" ? "New Folder" : "Rename"}
            </div>
            <input
              type="text"
              class="w-full px-3 py-2 text-13-regular bg-surface-base border border-border-base rounded-lg outline-none focus:border-accent-base text-text-strong"
              placeholder={creating() ? "Enter name..." : "Enter new name..."}
              value={renameValue()}
              onInput={(e) => setRenameValue(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { if (creating()) confirmCreate(); else confirmRename() }
                if (e.key === "Escape") { setRenaming(null); setCreating(null) }
              }}
              autofocus
            />
            <div class="flex justify-end gap-2 mt-4">
              <button class="px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors" onClick={() => { setRenaming(null); setCreating(null) }}>
                Cancel
              </button>
              <button class="px-3 py-1.5 text-13-regular text-white bg-accent-base hover:bg-accent-base-hover rounded-lg transition-colors" onClick={() => { if (creating()) confirmCreate(); else confirmRename() }}>
                {creating() ? "Create" : "Rename"}
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* ── Delete Confirm Dialog ── */}
      <Show when={deleteTarget() !== null}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div class="bg-surface-raised-base border border-border-base rounded-xl p-5 shadow-xl max-w-sm animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div class="text-15-medium text-text-strong mb-2">
              Delete {deleteTarget()?.isDir ? "Folder" : "File"}
            </div>
            <p class="text-13-regular text-text-weak mb-4">
              Are you sure you want to delete <span class="font-semibold text-text-strong">"{getFilename(deleteTarget()?.path ?? "")}"</span>?
              {deleteTarget()?.isDir ? " All contents will be deleted." : ""} This action cannot be undone.
            </p>
            <div class="flex justify-end gap-2">
              <button class="px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button class="px-3 py-1.5 text-13-regular text-white bg-text-danger-base hover:bg-text-danger-hover rounded-lg transition-colors" onClick={confirmDeleteFile}>
                Delete
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* ── Session Rename Modal ── */}
      <Show when={sessionRenaming() !== null}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSessionRenaming(null)}>
          <div class="bg-surface-raised-base border border-border-base rounded-xl p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150 w-80" onClick={(e) => e.stopPropagation()}>
            <div class="text-15-medium text-text-strong mb-3">Rename Session</div>
            <input
              type="text"
              class="w-full px-3 py-2 text-13-regular bg-surface-base border border-border-base rounded-lg outline-none focus:border-accent-base text-text-strong"
              placeholder="Enter session name..."
              value={sessionRenameValue()}
              onInput={(e) => setSessionRenameValue(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRenameSession()
                if (e.key === "Escape") setSessionRenaming(null)
              }}
              autofocus
            />
            <div class="flex justify-end gap-2 mt-4">
              <button class="px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors" onClick={() => setSessionRenaming(null)}>Cancel</button>
              <button class="px-3 py-1.5 text-13-regular text-white bg-accent-base hover:bg-accent-base-hover rounded-lg transition-colors" onClick={confirmRenameSession}>Rename</button>
            </div>
          </div>
        </div>
      </Show>

      {/* ── Session Delete Modal ── */}
      <Show when={sessionDeleting() !== null}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSessionDeleting(null)}>
          <div class="bg-surface-raised-base border border-border-base rounded-xl p-5 shadow-xl max-w-sm animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div class="text-15-medium text-text-strong mb-2">Delete Session</div>
            <p class="text-13-regular text-text-weak mb-4">
              Are you sure you want to delete session <span class="font-semibold text-text-strong">"{sessionDeleteTitle()}"</span>? This action cannot be undone.
            </p>
            <div class="flex justify-end gap-2">
              <button class="px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors" onClick={() => setSessionDeleting(null)}>Cancel</button>
              <button class="px-3 py-1.5 text-13-regular text-white bg-text-danger-base hover:bg-text-danger-hover rounded-lg transition-colors" onClick={handleDeleteSession}>Delete</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
