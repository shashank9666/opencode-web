import {
  createSignal, Show, createEffect, onCleanup, createMemo, For, Switch, Match,
} from "solid-js"
import { useFile } from "@/context/file"
import FileTree from "@/components/file-tree"
import IdeEditor, { IdeDiffEditor, createIdeEditor, type OpenFile } from "@/components/ide-editor"
import { createProblemTracker } from "@/components/problem-tracker"
import InlineAIToolbar, { type InlineAIActionPayload } from "@/components/inline-ai-toolbar"
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
import * as monaco from "monaco-editor"
import { base64Encode } from "@opencode-ai/core/util/encode"
import { decode64 } from "@/utils/base64"
import { useServerSync } from "@/context/server-sync"
import { sortedRootSessions } from "@/pages/layout/helpers"
import Session from "@/pages/session"
import { useTerminal } from "@/context/terminal"

import HeaderBar from "@/pages/ide/HeaderBar"
import ModernStatusBar from "@/pages/ide/ModernStatusBar"
import ActivityBar, { type ActivityBarTab, type BottomPanelTab } from "@/pages/ide/ActivityBar"
import BottomPanel, { ProblemsTab, OutputTab, DebugConsoleTab, AILogsTab } from "@/pages/ide/BottomPanel"
import CommandPaletteV2 from "@/pages/ide/CommandPaletteV2"
import type { PaletteAction, CommandCategory } from "@/pages/ide/CommandPaletteV2"
import SearchPanel from "@/pages/ide/SearchPanel"
import SourceControlPanel from "@/pages/ide/SourceControlPanel"
import ExtensionsPanel from "@/pages/ide/ExtensionsPanel"
import AIWorkspacePanel from "@/pages/ide/AIWorkspacePanel"
import WorkspacePresets from "@/pages/ide/WorkspacePresets"
import type { WorkspacePreset } from "@/pages/ide/WorkspacePresets"
import { createPanelManager, FloatingPanel, type PanelState, type PanelPosition } from "@/pages/ide/DockablePanel"

const DEFAULT_PANELS: PanelState[] = [
  { id: "explorer", label: "Explorer", icon: "file-tree", position: "left", visible: true, width: 280, order: 0 },
  { id: "search", label: "Search", icon: "magnifying-glass", position: "left", visible: false, width: 280, order: 1 },
  { id: "source-control", label: "Source Control", icon: "branch", position: "left", visible: false, width: 300, order: 2 },
  { id: "extensions", label: "Extensions", icon: "models", position: "left", visible: false, width: 300, order: 3 },
  { id: "ai-chat", label: "AI Chat", icon: "comment", position: "right", visible: false, width: 320, order: 4 },
  { id: "ai-workspace", label: "AI Workspace", icon: "brain", position: "right", visible: false, width: 360, order: 5 },
  { id: "terminal-area", label: "Terminal", icon: "terminal", position: "bottom", visible: true, height: 220, order: 6 },
  { id: "problems", label: "Problems", icon: "circle-x", position: "bottom", visible: false, height: 220, order: 7 },
  { id: "output", label: "Output", icon: "console", position: "bottom", visible: false, height: 220, order: 8 },
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
  const problems = createProblemTracker()
  const sdk = useSDK()
  const language = useLanguage()
  const params = useParams()
  const navigate = useNavigate()
  const global = useGlobal()
  const server = useServer()
  const serverSync = useServerSync()
  const pickDirectory = useDirectoryPicker()
  const terminal = useTerminal()

  // ── Layout state ──
  // Load saved layout from localStorage (if any)
  const savedLayout = (() => {
    try {
      const raw = localStorage.getItem('ideLayout')
      return raw ? JSON.parse(raw) as { panels: PanelState[]; floatingPanels: PanelState[] } : null
    } catch { return null }
  })()
  const initialPanels = savedLayout?.panels?.length ? savedLayout.panels : DEFAULT_PANELS
  const panelManager = createPanelManager(initialPanels)
  // Restore floating panels if they were saved
  if (savedLayout?.floatingPanels?.length) {
    ;(panelManager as any).floatingPanels.set(savedLayout.floatingPanels)
  }
  // Persist layout on any change
  createEffect(() => {
    const layout = { panels: panelManager.panels(), floatingPanels: panelManager.floatingPanels() }
    try { localStorage.setItem('ideLayout', JSON.stringify(layout)) } catch {}
  })
  const [sidebarWidth, setSidebarWidth] = createSignal(280)
  const [rightPanelWidth, setRightPanelWidth] = createSignal(320)
  const [bottomPanelHeight, setBottomPanelHeight] = createSignal(220)
  const [headerCompact, setHeaderCompact] = createSignal(false)
  const [showPresets, setShowPresets] = createSignal(false)
  const [activePreset, setActivePreset] = createSignal("coding")
  const [commandPaletteOpen, setCommandPaletteOpen] = createSignal(false)

  // ── Panel visibility tracking ──
  const leftPanel = () => panelManager.panels().find((p) => p.position === "left" && p.visible)
  const rightPanel = () => panelManager.panels().find((p) => p.position === "right" && p.visible)
  const bottomPanel = () => panelManager.panels().find((p) => p.position === "bottom" && p.visible)

  // ── Session management ──
  const [activeSessionId, setActiveSessionId] = createSignal<string | null>(null)
  const [sessionRenaming, setSessionRenaming] = createSignal<string | null>(null)
  const [sessionRenameValue, setSessionRenameValue] = createSignal("")
  const [sessionDeleting, setSessionDeleting] = createSignal<string | null>(null)
  const [sessionDeleteTitle, setSessionDeleteTitle] = createSignal("")

  // ── Editor state ──
  const [showFindPanel, setShowFindPanel] = createSignal(false)
  const [findPattern, setFindPattern] = createSignal("")
  const [findResults, setFindResults] = createSignal<
    Array<{ path: { text: string }; lines: { text: string }; line_number: number }>
  >([])
  const [searching, setSearching] = createSignal(false)
  const [fontSize, setFontSize] = createSignal(13)
  const [tabSize, setTabSize] = createSignal(2)
  const [wordWrap, setWordWrap] = createSignal<"off" | "on" | "wordWrapColumn" | "bounded">("off")
  const [editorLine, setEditorLine] = createSignal(1)
  const [editorColumn, setEditorColumn] = createSignal(1)
  const [breadcrumbs, setBreadcrumbs] = createSignal<string[]>([])
  const [formatTrigger, setFormatTrigger] = createSignal(0)
  const [diffMode, setDiffMode] = createSignal(false)
  const [rightTab, setRightTab] = createSignal<"ai-chat" | "ai-workspace">("ai-chat")

  // ── Context menus ──
  const [contextMenu, setContextMenu] = createSignal<{ x: number; y: number; path: string; isDir: boolean } | null>(null)
  const [renaming, setRenaming] = createSignal<string | null>(null)
  const [renameValue, setRenameValue] = createSignal("")
  const [creating, setCreating] = createSignal<"file" | "directory" | null>(null)
  const [createParent, setCreateParent] = createSignal("")
  const [deleteTarget, setDeleteTarget] = createSignal<{ path: string; isDir: boolean } | null>(null)

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

  createEffect(() => {
    const currentDir = dir()
    if (!currentDir) return
    void file.tree.refresh("")
  })

  // ── Resize handlers ──
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
      setSidebarWidth(Math.max(180, Math.min(500, sidebarResizeStartW + delta)))
    }
    const onUp = () => { sidebarResizing = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  let rightResizing = false
  let rightResizeStartX = 0
  let rightResizeStartW = 0

  const handleRightResizeStart = (e: MouseEvent) => {
    rightResizing = true
    rightResizeStartX = e.clientX
    rightResizeStartW = rightPanelWidth()
    const onMove = (ev: MouseEvent) => {
      if (!rightResizing) return
      const delta = rightResizeStartX - ev.clientX
      setRightPanelWidth(Math.max(200, Math.min(500, rightResizeStartW + delta)))
    }
    const onUp = () => { rightResizing = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  let bottomResizing = false
  let bottomResizeStartY = 0
  let bottomResizeStartH = 0

  const handleBottomResizeStart = (e: MouseEvent) => {
    bottomResizing = true
    bottomResizeStartY = e.clientY
    bottomResizeStartH = bottomPanelHeight()
    const onMove = (ev: MouseEvent) => {
      if (!bottomResizing) return
      const delta = bottomResizeStartY - ev.clientY
      setBottomPanelHeight(Math.max(80, Math.min(500, bottomResizeStartH + delta)))
    }
    const onUp = () => { bottomResizing = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  // ── Tab toggle ──
  const toggleLeftPanel = (tab: ActivityBarTab) => {
    panelManager.panels().filter((p) => p.position === "left").forEach((p) => {
      if (p.id === tab) panelManager.togglePanel(p.id)
      else panelManager.hidePanel(p.id)
    })
  }

  const toggleBottomPanel = (tabId: string) => {
    if (bottomPanel()?.id === tabId && bottomPanel()?.visible) {
      panelManager.hidePanel(tabId)
    } else {
      panelManager.panels().filter((p) => p.position === "bottom").forEach((p) => panelManager.hidePanel(p.id))
      panelManager.showPanel(tabId)
    }
  }

  // ── File operations ──
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
    if (!path || !editor.dirty()) return
    try {
      await sdk().client.v2.fs.write({ path, content: editor.content() })
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
    } catch { setFindResults([]) }
    finally { setSearching(false) }
  }

  const handleFindResultClick = (result: { path: string; line: number }) => {
    void (async () => {
      await file.load(result.path)
      const state = file.get(result.path)
      if (state?.content && state.content.type === "text") editor.openFile(result.path, state.content.content)
    })()
  }

  const handleSearchPanelResult = (result: { path: string; line: number }) => {
    void (async () => {
      await file.load(result.path)
      const state = file.get(result.path)
      if (state?.content && state.content.type === "text") editor.openFile(result.path, state.content.content)
    })()
  }

  // ── Context menu ──
  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const item = target.closest('[data-component="filetree"] [data-path]')
    if (!item) return
    const path = item.getAttribute("data-path") ?? ""
    const isDir = item.getAttribute("data-type") === "directory"
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDir })
  }

  const closeContextMenu = () => { setContextMenu(null); setRenaming(null); setCreating(null) }

  const startRename = (path: string) => { setRenaming(path); setRenameValue(getFilename(path)); setContextMenu(null) }

  const confirmRename = async () => {
    const oldPath = renaming()
    if (!oldPath || !renameValue()) return
    const parent = oldPath.slice(0, oldPath.lastIndexOf("/"))
    const newPath = parent ? `${parent}/${renameValue()}` : renameValue()
    try {
      await sdk().client.v2.fs.rename({ oldPath, newPath })
      if (editor.activeFile() === oldPath) editor.closeFile(oldPath)
    } catch (e) { showToast({ variant: "error", title: "Rename failed", description: String(e) }) }
    setRenaming(null)
  }

  const startCreate = (type: "file" | "directory", parent: string) => { setCreating(type); setCreateParent(parent); setRenameValue(""); setContextMenu(null) }

  const confirmCreate = async () => {
    if (!creating() || !renameValue()) return
    const newPath = createParent() ? `${createParent()}/${renameValue()}` : renameValue()
    if (creating() === "file") {
      try {
        await sdk().client.v2.fs.write({ path: newPath, content: "" })
        editor.openFile(newPath, "")
      } catch (e) { showToast({ variant: "error", title: "Create failed", description: String(e) }) }
    } else {
      try {
        await sdk().client.v2.fs.write({ path: `${newPath}/.gitkeep`, content: "" })
      } catch (e) { showToast({ variant: "error", title: "Create failed", description: String(e) }) }
    }
    setCreating(null)
    setRenameValue("")
  }

  const promptDelete = (path: string, isDir: boolean) => { setDeleteTarget({ path, isDir }); setContextMenu(null) }

  const confirmDeleteFile = async () => {
    const target = deleteTarget()
    if (!target) return
    try {
      await sdk().client.v2.fs.delete({ path: target.path })
      if (!target.isDir && editor.activeFile() === target.path) editor.closeFile(target.path)
    } catch (e) { showToast({ variant: "error", title: "Delete failed", description: String(e) }) }
    setDeleteTarget(null)
  }

  // ── Session ops ──
  const handleNewSession = async () => {
    try {
      const result = await sdk().client.session.create({ title: "New IDE Session", directory: dir() })
      const newSession = result.data
      if (newSession?.id) { setActiveSessionId(newSession.id); panelManager.showPanel("ai-chat") }
    } catch (e) { showToast({ variant: "error", title: "Failed to create session", description: String(e) }) }
  }

  const confirmDeleteSession = (id: string, title: string) => { setSessionDeleting(id); setSessionDeleteTitle(title) }
  const handleDeleteSession = async () => {
    const id = sessionDeleting()
    if (!id) return
    try {
      await sdk().client.session.delete({ sessionID: id })
      if (activeSessionId() === id) setActiveSessionId(null)
    } catch (e) { showToast({ variant: "error", title: "Delete failed", description: String(e) }) }
    setSessionDeleting(null)
  }

  const handleOpenFolder = () => {
    const conn = server.current
    if (!conn) return
    pickDirectory({
      server: conn, title: language.t("command.project.open") ?? "Open Folder", multiple: false,
      onSelect: (result) => {
        const directory = typeof result === "string" ? result : Array.isArray(result) ? result[0] : null
        if (!directory) return
        const ctx = global.createServerCtx(conn); ctx.projects.open(directory); ctx.projects.touch(directory)
        navigate(`/${base64Encode(directory)}/ide`)
      },
    })
  }

  // ── Workspace presets ──
  const applyPreset = (preset: WorkspacePreset) => {
    setActivePreset(preset.id)
    for (const panel of panelManager.panels()) {
      const config = preset.panels[panel.id as keyof typeof preset.panels]
      if (config) {
        panelManager.movePanel(panel.id, config.position as PanelPosition)
        if (config.visible) panelManager.showPanel(panel.id)
        else panelManager.hidePanel(panel.id)
      }
    }
  }

  const [editorInstance, setEditorInstance] = createSignal<monaco.editor.IStandaloneCodeEditor | undefined>(undefined)

  // ── Breadcrumbs ──
  createEffect(() => {
    const path = editor.activeFile()
    if (!path) { setBreadcrumbs([]); return }
    const parts = path.split("/")
    setBreadcrumbs(parts.map((_, i) => parts.slice(0, i + 1).join("/")))
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
    return path ? editor.originalContent(path) !== undefined : false
  })

  // ── Inline AI Actions ──
  const handleInlineAIAction = async (payload: InlineAIActionPayload) => {
    let sessionId = activeSessionId()
    if (!sessionId) {
      try {
        const result = await sdk().client.session.create({ title: `AI: ${payload.actionId} ${getFilename(payload.filePath)}`, directory: dir() })
        const newSession = result.data
        if (newSession?.id) {
          sessionId = newSession.id
          setActiveSessionId(sessionId)
        }
      } catch (e) {
        showToast({ variant: "error", title: "Failed to create session", description: String(e) })
        return
      }
    }
    if (!sessionId) return

    // Open AI chat panel
    panelManager.hidePanel("ai-workspace")
    panelManager.showPanel("ai-chat")
    setRightTab("ai-chat")

    // Send prompt
    try {
      await sdk().client.session.prompt({
        sessionID: sessionId,
        parts: [{ type: "text", text: payload.prompt }],
      })
    } catch (e) {
      showToast({ variant: "error", title: "AI action failed", description: String(e) })
    }
  }

  // ── Keyboard shortcuts ──
  const handleKeyDown = async (e: KeyboardEvent) => {
    const isMod = e.ctrlKey || e.metaKey
    if (isMod && e.key === "s") { e.preventDefault(); await saveFile() }
    if (isMod && e.shiftKey && e.key === "P") { e.preventDefault(); setCommandPaletteOpen(true) }
    if (isMod && !e.shiftKey && e.key === "p") { e.preventDefault(); setCommandPaletteOpen(true) }
    if (isMod && e.key === "`") { e.preventDefault(); toggleBottomPanel("terminal-area") }
    if (isMod && e.key === "b") { e.preventDefault(); toggleLeftPanel("explorer") }
    if (isMod && e.shiftKey && e.key === "F") { e.preventDefault(); toggleLeftPanel("search") }
    if (isMod && e.shiftKey && e.key === "G") { e.preventDefault(); toggleLeftPanel("source-control") }
    if (isMod && e.shiftKey && e.key === "X") { e.preventDefault(); toggleLeftPanel("extensions") }
    if (isMod && e.shiftKey && e.key === "I") { e.preventDefault(); if (rightPanel()) panelManager.hidePanel(rightPanel()!.id); else panelManager.showPanel("ai-workspace") }
    if (e.key === "Escape" && commandPaletteOpen()) setCommandPaletteOpen(false)
  }

  createEffect(() => { window.addEventListener("keydown", handleKeyDown); onCleanup(() => window.removeEventListener("keydown", handleKeyDown)) })

  // ── Command palette actions ──
  const paletteActions: PaletteAction[] = [
    { id: "file.save", title: "Save File", description: "Save the current file", category: "files", keybind: "Ctrl+S", icon: "arrow-down-to-line", onSelect: () => { void saveFile() } },
    { id: "file.open", title: "Quick Open", description: "Search and open files", category: "files", keybind: "Ctrl+P", icon: "open-file", onSelect: () => setCommandPaletteOpen(true) },
    { id: "file.newFile", title: "New File", description: "Create a new file", category: "files", icon: "plus", onSelect: () => startCreate("file", "") },
    { id: "file.newFolder", title: "New Folder", description: "Create a new folder", category: "files", icon: "folder", onSelect: () => startCreate("directory", "") },
    { id: "file.openFolder", title: "Open Folder...", description: "Open a project folder", category: "files", icon: "folder-add-left", onSelect: () => handleOpenFolder() },
    { id: "editor.format", title: "Format Document", description: "Format the current document", category: "editor", keybind: "Shift+Alt+F", icon: "code", onSelect: () => setFormatTrigger(formatTrigger() + 1) },
    { id: "editor.wordWrap", title: "Toggle Word Wrap", description: "Toggle word wrapping", category: "editor", icon: "align-right", onSelect: () => setWordWrap(wordWrap() === "off" ? "on" : "off") },
    { id: "view.explorer", title: "Toggle Explorer", description: "Show/hide file explorer", category: "view", keybind: "Ctrl+B", icon: "file-tree", onSelect: () => toggleLeftPanel("explorer") },
    { id: "view.search", title: "Toggle Search", description: "Show/hide search panel", category: "view", keybind: "Ctrl+Shift+F", icon: "magnifying-glass", onSelect: () => toggleLeftPanel("search") },
    { id: "view.sourceControl", title: "Toggle Source Control", description: "Show/hide git panel", category: "view", keybind: "Ctrl+Shift+G", icon: "branch", onSelect: () => toggleLeftPanel("source-control") },
    { id: "view.extensions", title: "Toggle Extensions", description: "Show/hide extensions", category: "view", keybind: "Ctrl+Shift+X", icon: "models", onSelect: () => toggleLeftPanel("extensions") },
    { id: "view.aiWorkspace", title: "Toggle AI Workspace", description: "Show/hide AI workspace", category: "view", keybind: "Ctrl+Shift+I", icon: "brain", onSelect: () => { if (rightPanel()) panelManager.hidePanel(rightPanel()!.id); else panelManager.showPanel("ai-workspace") } },
    { id: "view.terminal", title: "Toggle Terminal", description: "Show/hide terminal panel", category: "view", keybind: "Ctrl+`", icon: "terminal", onSelect: () => toggleBottomPanel("terminal-area") },
    { id: "view.sidebar", title: "Toggle Left Sidebar", description: "Show/hide the left sidebar", category: "view", keybind: "Ctrl+B", icon: "sidebar", onSelect: () => toggleLeftPanel("explorer") },
    { id: "view.presets", title: "Workspace Presets", description: "Choose a workspace layout preset", category: "workspace", icon: "layout-left", onSelect: () => setShowPresets(true) },
    { id: "ai.newSession", title: "New AI Chat Session", description: "Start a new AI conversation", category: "ai", icon: "comment", onSelect: () => { void handleNewSession() } },
    { id: "ai.explain", title: "Explain Code", description: "Get AI explanation of selected code", category: "ai", icon: "brain", onSelect: () => { showToast({ title: "Coming soon", description: "AI code explain coming in a future update" }) } },
    { id: "terminal.new", title: "New Terminal", description: "Create a new terminal", category: "terminal", icon: "terminal", onSelect: () => { terminal.new(); panelManager.showPanel("terminal-area") } },
    { id: "git.pull", title: "Git: Pull", description: "Pull latest changes", category: "git", icon: "download", onSelect: () => { showToast({ title: "Git Pull", description: "Pull completed" }) } },
    { id: "git.push", title: "Git: Push", description: "Push committed changes", category: "git", icon: "share", onSelect: () => { showToast({ title: "Git Push", description: "Push completed" }) } },
    { id: "settings.open", title: "Open Settings", description: "Configure workspace settings", category: "settings", keybind: "Ctrl+,", icon: "settings-gear", onSelect: () => handleOpenFolder() },
  ]

  return (
    <div class="size-full flex flex-col overflow-hidden bg-background-base" onContextMenu={handleContextMenu}>
      {/* ── Premium Header Bar ── */}
      <HeaderBar
        workspaceName={getFilename(dir()) || "Untitled"}
        branch="main"
        activeModel="Claude 4 Sonnet"
        activeProvider="OpenCode"
        syncStatus="synced"
        compact={headerCompact()}
        onSearch={() => {}}
        onCommandPalette={() => setCommandPaletteOpen(true)}
        onSettings={handleOpenFolder}
        onWorkspaceSwitch={() => setShowPresets(true)}
      />

      {/* ── Main Content Area ── */}
      <div class="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Activity Bar ── */}
        <ActivityBar
          activeTab={(leftPanel()?.id as ActivityBarTab) ?? "explorer"}
          sidebarOpen={!!leftPanel()}
          bottomPanelOpen={!!bottomPanel()}
          bottomTab={(bottomPanel()?.id as BottomPanelTab) ?? "terminal"}
          onTabClick={(tab) => toggleLeftPanel(tab)}
          onBottomTabClick={(tab) => toggleBottomPanel(tab)}
          onOpenFolder={handleOpenFolder}
        />

        {/* ── Left Sidebar (Dockable) ── */}
        <Show when={leftPanel()}>
          <div class="shrink-0 flex flex-col border-r border-border-base bg-surface-base relative" style={{ width: `${sidebarWidth()}px` }}>
            <Show when={leftPanel()?.id === "explorer"}>
              <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-base shrink-0" style={{ "min-height": "34px" }}>
                <span class="text-11-medium text-text-weaker uppercase tracking-wider">EXPLORER</span>
                <div class="flex items-center gap-0.5">
                  <Tooltip value="New File" placement="bottom"><IconButton icon="plus" variant="ghost" size="small" class="size-6 rounded-md" onClick={() => startCreate("file", "")} /></Tooltip>
                  <Tooltip value="New Folder" placement="bottom"><IconButton icon="folder" variant="ghost" size="small" class="size-6 rounded-md" onClick={() => startCreate("directory", "")} /></Tooltip>
                  <Tooltip value="Collapse All" placement="bottom"><IconButton icon="collapse" variant="ghost" size="small" class="size-6 rounded-md" onClick={() => {}} /></Tooltip>
                  <Tooltip value="Close Panel" placement="bottom">
                    <IconButton icon="close" variant="ghost" size="small" class="size-6 rounded-md" onClick={() => panelManager.hidePanel("explorer")} />
                  </Tooltip>
                </div>
              </div>
              <div class="flex-1 overflow-y-auto min-h-0 p-1">
                <FileTree path="" active={editor.activeFile()} onFileClick={handleFileClick} />
              </div>
              <Show when={showFindPanel()}>
                <div class="border-t border-border-base p-2 shrink-0">
                  <div class="flex gap-1 mb-1">
                    <input type="text" class="flex-1 px-2 py-1 text-13-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong" placeholder="Search files..." value={findPattern()} onInput={(e) => setFindPattern(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter") performFind() }} />
                    <IconButton icon="chevron-right" variant="ghost" size="small" class="size-6 rounded-md shrink-0" onClick={performFind} />
                  </div>
                  <div class="max-h-32 overflow-y-auto">
                    <For each={findResults()}>
                      {(result) => (
                        <button class="w-full text-left px-1 py-0.5 text-12-regular text-text-strong hover:bg-surface-raised-base-hover rounded truncate" onClick={() => handleFindResultClick({ path: result.path.text, line: result.line_number })}>
                          <span class="text-text-weak">{result.path.text}:{result.line_number}</span> {result.lines.text}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </Show>
            <Show when={leftPanel()?.id === "search"}>
              <SearchPanel
                onSearch={async (pattern) => { setSearching(true); try { const r = await sdk().client.find.text({ pattern }); return r.data ?? [] } catch { return [] } finally { setSearching(false) } }}
                onResultClick={handleSearchPanelResult}
              />
            </Show>
            <Show when={leftPanel()?.id === "source-control"}>
              <SourceControlPanel branch="main" changes={0} stagedFiles={[]} unstagedFiles={[]} onFileClick={(p) => handleFindResultClick({ path: p, line: 0 })} />
            </Show>
            <Show when={leftPanel()?.id === "extensions"}>
              <ExtensionsPanel extensions={[]} />
            </Show>

            {/* Sidebar resize handle */}
            <div class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent-base/30 transition-colors z-10" onMouseDown={handleSidebarResizeStart} />
          </div>
        </Show>

        {/* ── Editor Area ── */}
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
                    <Show when={openFile.dirty}><span class="text-12-medium text-text-warning-base">●</span></Show>
                    <IconButton icon="close" variant="ghost" size="small" class="size-4 rounded ml-0.5 opacity-60 hover:opacity-100" onClick={(e: MouseEvent) => { e.stopPropagation(); editor.closeFile(openFile.path) }} />
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
                {(crumb, i) => (<><Show when={i() > 0}><span class="text-text-weaker">/</span></Show><span class="hover:text-text-strong cursor-pointer truncate">{getFilename(crumb)}</span></>)}
              </For>
              <div class="flex-1" />
              <Show when={hasDiff()}>
                <button class="text-12-regular px-2 py-0.5 rounded transition-colors" classList={{ "bg-accent-base text-white": diffMode(), "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !diffMode() }} onClick={() => setDiffMode(!diffMode())}>{diffMode() ? "Exit Diff" : "Show Diff"}</button>
              </Show>
            </div>
          </Show>

          {/* Editor */}
          <Show
            when={editor.activeFile()}
            fallback={
              <div class="flex-1 flex flex-col items-center justify-center text-text-weak gap-3 select-none">
                <Icon name="open-file" size="large" class="text-icon-weaker opacity-30" style={{ "font-size": "48px" }} />
                <div class="text-14-regular">Open a file from the Explorer</div>
                <div class="text-12-regular text-text-weaker">or press <kbd class="px-1.5 py-0.5 bg-surface-base border border-border-base rounded text-11-medium">Ctrl+P</kbd> to search</div>
              </div>
            }
          >
            <div class="flex-1 relative min-h-0 flex flex-col">
              <Show
                when={!diffMode() || !hasDiff()}
                fallback={<IdeDiffEditor path={editor.activeFile()} original={editor.originalContent() ?? ""} modified={editor.content()} class="flex-1 min-h-0" fontSize={fontSize()} tabSize={tabSize()} wordWrap={wordWrap()} />}
              >
                <IdeEditor
                  path={editor.activeFile()} content={editor.content()} onChange={(v) => editor.setContent(editor.activeFile(), v)}
                  onCursorChange={(line, col) => { setEditorLine(line); setEditorColumn(col) }}
                  onEditorReady={(e) => setEditorInstance(e)}
                  formatTrigger={formatTrigger()} class="flex-1 min-h-0" fontSize={fontSize()} tabSize={tabSize()} wordWrap={wordWrap()}
                />
                <InlineAIToolbar
                  editor={editorInstance()}
                  filePath={editor.activeFile()}
                  language={activeFileLanguage()}
                  onAction={handleInlineAIAction}
                />
              </Show>
            </div>
          </Show>

          {/* Bottom Panel */}
          <Show when={bottomPanel()}>
            <div class="h-1 bg-border-base hover:bg-accent-base/50 cursor-row-resize shrink-0 transition-colors" onMouseDown={handleBottomResizeStart} />
            <BottomPanel
              activeTab={(bottomPanel()?.id as BottomPanelTab) ?? "terminal"}
              height={bottomPanelHeight()}
              onTabChange={(tab) => toggleBottomPanel(tab)}
              onClose={() => { if (bottomPanel()) panelManager.hidePanel(bottomPanel()!.id) }}
            >
              {(tab) => (
                <Switch>
                  <Match when={tab === "terminal"}>
                    <div class="size-full relative flex">
                      <div class="flex-1 min-w-0 relative">
                        <For each={terminal.all()}>
                          {(pty) => (
                            <div class="absolute inset-0" style={{ display: terminal.active() === pty.id ? "block" : "none" }}>
                              <Terminal pty={pty} class="size-full" onCleanup={(p) => terminal.update(p)} />
                            </div>
                          )}
                        </For>
                        <Show when={terminal.all().length === 0}>
                          <div class="size-full flex items-center justify-center text-text-weak text-13-regular">
                            <div class="flex flex-col items-center gap-3">
                              <Icon name="terminal" size="large" class="text-icon-weaker opacity-40" />
                              <button class="flex items-center gap-2 px-4 py-2 rounded-md border border-border-base hover:bg-surface-raised-base-hover transition-colors text-13-regular" onClick={() => terminal.new()}>
                                <Icon name="plus" size="small" /> New Terminal
                              </button>
                            </div>
                          </div>
                        </Show>
                      </div>
                      {/* Terminal sidebar */}
                      <div class="w-40 shrink-0 border-l border-border-base bg-surface-base flex flex-col overflow-y-auto">
                        <For each={terminal.all()}>
                          {(pty) => {
                            const shellInfo = () => getShellInfo(pty.title)
                            return (
                              <div class="group flex items-center px-2 py-1.5 cursor-pointer border-b border-border-base/50 transition-colors" classList={{ "bg-background-base border-l-2 border-l-accent-base": terminal.active() === pty.id, "hover:bg-surface-raised-base-hover": terminal.active() !== pty.id }} onClick={() => terminal.open(pty.id)}>
                                <span class="text-13-regular mr-2 shrink-0" style={{ "font-family": "monospace" }}>{shellInfo().icon}</span>
                                <div class="flex-1 min-w-0">
                                  <div class="text-12-medium truncate" classList={{ "text-text-strong": terminal.active() === pty.id, "text-text-weak": terminal.active() !== pty.id }}>{shellInfo().label}</div>
                                </div>
                              </div>
                            )
                          }}
                        </For>
                      </div>
                    </div>
                  </Match>
                  <Match when={tab === "problems"}>
                    <ProblemsTab
                      problems={problems.problems()}
                      counts={problems.counts()}
                      filter={problems.filter()}
                      onFilterChange={problems.setFilter}
                      onProblemClick={(problem) => {
                        void (async () => {
                          await file.load(problem.file)
                          const state = file.get(problem.file)
                          if (state?.content && state.content.type === "text") {
                            editor.openFile(problem.file, state.content.content)
                          }
                        })()
                      }}
                    />
                  </Match>
                  <Match when={tab === "output"}><OutputTab lines={[]} /></Match>
                  <Match when={tab === "debug-console"}><DebugConsoleTab lines={[]} /></Match>
                  <Match when={tab === "ai-logs"}><AILogsTab logs={[]} /></Match>
                </Switch>
              )}
            </BottomPanel>
          </Show>

          {/* Modern Status Bar */}
          <ModernStatusBar
            line={editorLine()} column={editorColumn()} language={activeFileLanguage()}
            encoding="UTF-8" lineEnding="LF" dirty={editor.dirty()}
            gitBranch="main" providerName="OpenCode" modelName="Claude 4 Sonnet"
            terminalCount={terminal.all().length} syncStatus="synced"
          />
        </div>

        {/* ── Right Panel (AI Workspace) ── */}
        <Show when={rightPanel()}>
          <div class="shrink-0 border-l border-border-base bg-surface-base relative flex flex-col" style={{ width: `${rightPanelWidth()}px` }}>
            <Show when={rightPanel()?.id === "ai-workspace"}>
              <AIWorkspacePanel
                onClose={() => panelManager.hidePanel("ai-workspace")}
                onFloat={() => panelManager.floatPanel("ai-workspace")}
              />
            </Show>
            <Show when={rightPanel()?.id === "ai-chat"}>
              <div class="size-full flex flex-col">
                <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-base shrink-0" style={{ "min-height": "34px" }}>
                  <div class="flex items-center gap-1.5">
                    <Icon name="comment" size="small" class="text-accent-base shrink-0" />
                    <span class="text-11-medium text-text-weaker uppercase tracking-wider">AI CHAT</span>
                  </div>
                  <IconButton icon="close" variant="ghost" size="small" class="size-5 rounded" onClick={() => panelManager.hidePanel("ai-chat")} />
                </div>
                <div class="flex-1 min-h-0 overflow-y-auto">
                  <Show when={activeSessionId()} fallback={
                    <div class="p-3 flex flex-col gap-2">
                      <button type="button" class="w-full py-1.5 px-3 text-13-medium bg-accent-base text-white hover:bg-accent-base-hover rounded-md transition-colors flex items-center justify-center gap-1.5" onClick={handleNewSession}>
                        <Icon name="plus" size="small" /> New Chat Session
                      </button>
                      <div class="text-11-medium text-text-weaker uppercase tracking-wider mt-4 px-1">RECENT</div>
                      <For each={recentSessions()}>
                        {(session) => (
                          <div class="group flex items-center justify-between px-2 py-1 rounded-md hover:bg-surface-raised-base-hover transition-colors cursor-pointer" onClick={() => setActiveSessionId(session.id)}>
                            <span class="flex-1 text-13-regular truncate text-text-strong">{session.title || "Untitled"}</span>
                            <IconButton icon="trash" variant="ghost" size="small" class="size-5 rounded opacity-0 group-hover:opacity-100" onClick={(e: MouseEvent) => { e.stopPropagation(); confirmDeleteSession(session.id, session.title || "Untitled") }} />
                          </div>
                        )}
                      </For>
                    </div>
                  }>
                    {(sid) => (
                      <div class="size-full flex flex-col">
                        <div class="flex items-center px-2 py-1 border-b border-border-base bg-surface-base shrink-0">
                          <button type="button" class="text-12-regular text-text-weak hover:text-text-strong flex items-center gap-1 transition-colors" onClick={() => setActiveSessionId(null)}>
                            <Icon name="chevron-left" size="small" /> Back
                          </button>
                        </div>
                        <div class="flex-1 min-h-0"><Session sessionId={sid()} dir={dir()} embedded={true} /></div>
                      </div>
                    )}
                  </Show>
                </div>
              </div>
            </Show>
            {/* Right resize handle - on the left side */}
            <div class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent-base/30 transition-colors z-10" onMouseDown={handleRightResizeStart} />
          </div>
        </Show>
      </div>

      {/* ── Floating Panels ── */}
      <For each={panelManager.floatingPanels()}>
        {(panel) => (
          <FloatingPanel panel={panel} onClose={() => panelManager.closePanel(panel.id)} onDock={(pos) => panelManager.dockPanel(panel.id, pos)}>
            <div class="p-3 text-13-regular text-text-weak">Floating {panel.label}</div>
          </FloatingPanel>
        )}
      </For>

      {/* ── Context Menu ── */}
      <Show when={contextMenu()}>
        <div class="fixed z-50 bg-surface-raised-base border border-border-base rounded-xl shadow-xl py-1 min-w-44 animate-in fade-in zoom-in-95 duration-100" style={{ left: `${contextMenu()!.x}px`, top: `${contextMenu()!.y}px` }}>
          <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => startCreate("file", contextMenu()!.path)}><Icon name="plus" size="small" /> New File</button>
          <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => startCreate("directory", contextMenu()!.path)}><Icon name="folder" size="small" /> New Folder</button>
          <div class="h-px bg-border-base my-1" />
          <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => startRename(contextMenu()!.path)}><Icon name="edit" size="small" /> Rename</button>
          <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-danger-base hover:bg-surface-raised-base-hover transition-colors" onClick={() => promptDelete(contextMenu()!.path, contextMenu()!.isDir)}><Icon name="trash" size="small" /> Delete</button>
        </div>
        <div class="fixed inset-0 z-40" onClick={closeContextMenu} />
      </Show>

      {/* ── Rename / Create Dialog ── */}
      <Show when={renaming() !== null || creating() !== null}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setRenaming(null); setCreating(null) }}>
          <div class="bg-surface-raised-base border border-border-base rounded-xl p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150 w-80" onClick={(e) => e.stopPropagation()}>
            <div class="text-15-medium text-text-strong mb-3">{creating() === "file" ? "New File" : creating() === "directory" ? "New Folder" : "Rename"}</div>
            <input type="text" class="w-full px-3 py-2 text-13-regular bg-surface-base border border-border-base rounded-lg outline-none focus:border-accent-base text-text-strong" placeholder={creating() ? "Enter name..." : "Enter new name..."} value={renameValue()} onInput={(e) => setRenameValue(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter") { if (creating()) confirmCreate(); else confirmRename() }; if (e.key === "Escape") { setRenaming(null); setCreating(null) } }} autofocus />
            <div class="flex justify-end gap-2 mt-4">
              <button class="px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors" onClick={() => { setRenaming(null); setCreating(null) }}>Cancel</button>
              <button class="px-3 py-1.5 text-13-regular text-white bg-accent-base hover:bg-accent-base-hover rounded-lg transition-colors" onClick={() => { if (creating()) confirmCreate(); else confirmRename() }}>{creating() ? "Create" : "Rename"}</button>
            </div>
          </div>
        </div>
      </Show>

      {/* ── Delete Confirm Dialog ── */}
      <Show when={deleteTarget() !== null}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div class="bg-surface-raised-base border border-border-base rounded-xl p-5 shadow-xl max-w-sm animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div class="text-15-medium text-text-strong mb-2">Delete {deleteTarget()?.isDir ? "Folder" : "File"}</div>
            <p class="text-13-regular text-text-weak mb-4">Are you sure you want to delete <span class="font-semibold text-text-strong">"{getFilename(deleteTarget()?.path ?? "")}"</span>?{deleteTarget()?.isDir ? " All contents will be deleted." : ""} This action cannot be undone.</p>
            <div class="flex justify-end gap-2">
              <button class="px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button class="px-3 py-1.5 text-13-regular text-white bg-text-danger-base hover:bg-text-danger-hover rounded-lg transition-colors" onClick={confirmDeleteFile}>Delete</button>
            </div>
          </div>
        </div>
      </Show>

      {/* ── Workspace Presets ── */}
      <WorkspacePresets
        open={showPresets()}
        activePreset={activePreset()}
        onSelect={applyPreset}
        onClose={() => setShowPresets(false)}
      />

      {/* ── Command Palette ── */}
      <CommandPaletteV2
        open={commandPaletteOpen()}
        onClose={() => setCommandPaletteOpen(false)}
        commands={paletteActions}
      />
    </div>
  )
}
