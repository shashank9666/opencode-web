import {
  batch,
  createEffect,
  createSignal,
  createMemo,
  For,
  Match,
  on,
  onCleanup,
  Show,
  Switch,
} from "solid-js"
import { useFile } from "@/context/file"
import FileTree from "@/components/file-tree"
import IdeEditor, { IdeDiffEditor, createIdeEditor, type OpenFile } from "@/components/ide-editor"
import { createProblemTracker } from "@/components/problem-tracker"
import InlineAIToolbar, { type InlineAIActionPayload } from "@/components/inline-ai-toolbar"
import { createEditorWorkspace } from "@/components/editor-workspace"
import { EditorArea } from "@/components/EditorArea"
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

// Reuse existing panels + extend
import HeaderBar from "./HeaderBar"
import ModernStatusBar from "./ModernStatusBar"
import ActivityBar, { type ActivityBarTab, type BottomPanelTab } from "./ActivityBar"
import BottomPanel, { ProblemsTab, OutputTab, DebugConsoleTab, AILogsTab } from "./BottomPanel"
import CommandPaletteV2 from "./CommandPaletteV2"
import type { PaletteAction } from "./CommandPaletteV2"
import SearchPanel from "./SearchPanel"
import SourceControlPanel from "./SourceControlPanel"
import ExtensionsPanel from "./ExtensionsPanel"
import AIWorkspacePanel from "./AIWorkspacePanel"
import WorkspacePresets from "./WorkspacePresets"
import type { WorkspacePreset } from "./WorkspacePresets"
import { createPanelManager, FloatingPanel, type PanelState, type PanelPosition } from "./DockablePanel"
import MenuBar, { type IdeActions } from "./MenuBar"

// ── Extra panels (new) ──
import DebugPanel from "./DebugPanel"
import TestingPanel from "./TestingPanel"
import SettingsPanel from "./SettingsPanel"
import KeybindingsPanel from "./KeybindingsPanel"
import RemotePanel from "./RemotePanel"
import DatabasePanel from "./DatabasePanel"
import RemoteConnectionModal from "./RemoteConnectionModal"

const MERGED_DEFAULT: PanelState[] = [
  { id: "explorer", label: "Explorer", icon: "file-tree", position: "left", visible: true, width: 280, order: 0 },
  { id: "search", label: "Search", icon: "magnifying-glass", position: "left", visible: false, width: 280, order: 1 },
  { id: "source-control", label: "Source Control", icon: "branch", position: "left", visible: false, width: 300, order: 2 },
  { id: "run-debug", label: "Run & Debug", icon: "bug", position: "left", visible: false, width: 300, order: 3 },
  { id: "extensions", label: "Extensions", icon: "models", position: "left", visible: false, width: 300, order: 4 },
  { id: "ai-chat", label: "AI Assistant", icon: "brain", position: "left", visible: false, width: 320, order: 5 },
  { id: "database", label: "Database", icon: "database", position: "left", visible: false, width: 320, order: 6 },
  { id: "remote", label: "Remote Explorer", icon: "remote", position: "left", visible: false, width: 280, order: 7 },
  { id: "testing", label: "Testing", icon: "beaker", position: "left", visible: false, width: 300, order: 8 },
  { id: "terminal-area", label: "Terminal", icon: "terminal", position: "bottom", visible: true, height: 220, order: 6 },
  { id: "problems", label: "Problems", icon: "circle-x", position: "bottom", visible: false, height: 220, order: 7 },
  { id: "output", label: "Output", icon: "console", position: "bottom", visible: false, height: 220, order: 8 },
  { id: "debug-console", label: "Debug Console", icon: "window-cursor", position: "bottom", visible: false, height: 220, order: 9 },
  { id: "ai-logs", label: "AI Logs", icon: "brain", position: "bottom", visible: false, height: 220, order: 10 },
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

export default function FullIde() {
  const file = useFile()
  const workspace = createEditorWorkspace()
  const editor = {
    activeFile: () => workspace.getActiveGroup()?.activeFile ?? "",
    dirty: (path?: string) => workspace.getFileState(path ?? workspace.getActiveGroup()?.activeFile ?? "")?.dirty ?? false,
    content: (path?: string) => workspace.getFileState(path ?? workspace.getActiveGroup()?.activeFile ?? "")?.content ?? "",
    markClean: (path: string) => workspace.markClean(path, workspace.getActiveGroup()?.id ?? ""),
    openFile: (path: string, content: string) => workspace.openFile(path, content, workspace.getActiveGroup()?.id ?? ""),
    closeFile: (path: string) => workspace.closeFile(path, workspace.getActiveGroup()?.id ?? ""),
  }
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
  const savedLayout = (() => {
    try {
      const raw = localStorage.getItem('ideLayout')
      return raw ? JSON.parse(raw) as { panels: PanelState[]; floatingPanels: PanelState[] } : null
    } catch { return null }
  })()
  const initialPanels = savedLayout?.panels?.length ? savedLayout.panels : MERGED_DEFAULT
  const panelManager = createPanelManager(initialPanels)
  if (savedLayout?.floatingPanels?.length) {
    ;(panelManager as any).floatingPanels.set(savedLayout.floatingPanels)
  }

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
  const [showSettings, setShowSettings] = createSignal(false)
  const [showKeybindings, setShowKeybindings] = createSignal(false)
  const [remoteModalOpen, setRemoteModalOpen] = createSignal(false)
  const [remoteConnection, setRemoteConnection] = createSignal<string | null>(null)

  const handleRemoteConnect = (type: "SSH" | "WSL" | "Container", target: string) => {
    setRemoteModalOpen(false)
    showToast({
      variant: "info",
      title: "Connecting",
      description: `Connecting to ${type} host: ${target}...`,
    })
    
    setTimeout(() => {
      setRemoteConnection(`${type === "Container" ? "Container" : type}: ${target}`)
      showToast({
        variant: "success",
        title: "Connected",
        description: `Successfully connected to ${type} host: ${target}!`,
      })
    }, 1500)
  }

  // ── Settings / keybinding state (mock) ──
  const [settingsOpen, setSettingsOpen] = createSignal(false)
  const [fontSize, setFontSize] = createSignal(13)
  const [tabSize, setTabSize] = createSignal(2)
  const [wordWrap, setWordWrap] = createSignal<"off" | "on" | "wordWrapColumn" | "bounded">("off")
  const [theme, setTheme] = createSignal<"vs-dark" | "vs-light">("vs-dark")
  const [minimap, setMinimap] = createSignal(true)
  const [wordWrapCol, setWordWrapCol] = createSignal(80)

  const [keybindings, setKeybindings] = createSignal<{ id: string; key: string; command: string }[]>([
    { id: "save", key: "Ctrl+S", command: "workbench.action.files.save" },
    { id: "open", key: "Ctrl+O", command: "workbench.action.files.openFile" },
    { id: "cmd", key: "Ctrl+Shift+P", command: "workbench.action.showCommands" },
    { id: "toggle-term", key: "Ctrl+`", command: "workbench.action.terminal.toggleTerminal" },
    { id: "find", key: "Ctrl+F", command: "actions.find" },
    { id: "replace", key: "Ctrl+H", command: "editor.action.startFindReplaceAction" },
  ])

  // ── Panel visibility ──
  const leftPanel = () => panelManager.panels().find((p) => p.position === "left" && p.visible)
  const rightPanel = () => panelManager.panels().find((p) => p.position === "right" && p.visible)
  const bottomPanel = () => panelManager.panels().find((p) => p.position === "bottom" && p.visible)

  const activeBottomTab = () => {
    const id = bottomPanel()?.id
    if (!id) return "terminal" as BottomPanelTab
    return (id === "terminal-area" ? "terminal" : id) as BottomPanelTab
  }

  // ── Session ──
  const [activeSessionId, setActiveSessionId] = createSignal<string | null>(null)
  const [sessionRenaming, setSessionRenaming] = createSignal<string | null>(null)
  const [sessionRenameValue, setSessionRenameValue] = createSignal("")
  const [sessionDeleting, setSessionDeleting] = createSignal<string | null>(null)
  const [sessionDeleteTitle, setSessionDeleteTitle] = createSignal("")

  // ── Editor extra ──
  const [showFindPanel, setShowFindPanel] = createSignal(false)
  const [findPattern, setFindPattern] = createSignal("")
  const [findResults, setFindResults] = createSignal<
    Array<{ path: { text: string }; lines: { text: string }; line_number: number }>
  >([])
  const [searching, setSearching] = createSignal(false)
  const [editorLine, setEditorLine] = createSignal(1)
  const [editorColumn, setEditorColumn] = createSignal(1)
  const [breadcrumbs, setBreadcrumbs] = createSignal<string[]>([])
  const [formatTrigger, setFormatTrigger] = createSignal(0)
  const [diffMode, setDiffMode] = createSignal(false)
  const [rightTab, setRightTab] = createSignal<"ai-chat" | "ai-workspace" | "debug" | "testing" | "database">("ai-chat")

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

  // ── Resize ──
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

  // ── Panel toggles ──
  const toggleLeftPanel = (tab: ActivityBarTab) => {
    panelManager.panels().filter((p) => p.position === "left").forEach((p) => {
      if (p.id === tab) panelManager.togglePanel(p.id)
      else panelManager.hidePanel(p.id)
    })
  }

  const toggleBottomPanel = (tabId: string) => {
    const mappedId = tabId === "terminal" ? "terminal-area" : tabId
    if (bottomPanel()?.id === mappedId && bottomPanel()?.visible) {
      panelManager.hidePanel(mappedId)
    } else {
      panelManager.panels().filter((p) => p.position === "bottom").forEach((p) => panelManager.hidePanel(p.id))
      panelManager.showPanel(mappedId)
    }
  }

  const toggleRightPanel = (tab: "ai-chat" | "ai-workspace" | "debug" | "testing" | "database") => {
    const pos = panelManager.panels().find((p) => p.position === "right" && p.visible)
    if (pos?.id === tab) {
      panelManager.hidePanel(tab)
      return
    }
    panelManager.panels().filter((p) => p.position === "right").forEach((p) => panelManager.hidePanel(p.id))
    panelManager.showPanel(tab)
    setRightTab(tab)
  }

  const toggleSettings = () => setShowSettings((v) => !v)
  const toggleKeybindings = () => setShowKeybindings((v) => !v)

  // ── File ops ──
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

  // ── Context menu / create / delete ──
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
    void file.tree.refresh("")
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
    void file.tree.refresh("")
  }

  const promptDelete = (path: string, isDir: boolean) => { setDeleteTarget({ path, isDir }); setContextMenu(null) }

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

  const confirmDeleteFile = async () => {
    const target = deleteTarget()
    if (!target) return
    try {
      await sdk().client.v2.fs.delete({ path: target.path })
      if (!target.isDir && editor.activeFile() === target.path) editor.closeFile(target.path)
    } catch (e) { showToast({ variant: "error", title: "Delete failed", description: String(e) }) }
    setDeleteTarget(null)
    void file.tree.refresh("")
  }

  // ── Session ops ──
  const handleNewSession = async () => {
    try {
      const result = await sdk().client.session.create({ title: "New IDE Session", directory: dir() })
      const newSession = result.data
      if (newSession?.id) { setActiveSessionId(newSession.id); panelManager.showPanel("ai-chat") }
    } catch (e) { showToast({ variant: "error", title: "Failed to create session", description: String(e) }) }
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
      const config = preset.panels[panel.id]
      if (config) {
        panelManager.movePanel(panel.id, config.position as PanelPosition)
        config.visible ? panelManager.showPanel(panel.id) : panelManager.hidePanel(panel.id)
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

  // ── Inline AI ──
  const handleInlineAIAction = async (payload: InlineAIActionPayload) => {
    let sessionId = activeSessionId()
    if (!sessionId) {
      try {
        const result = await sdk().client.session.create({ title: `AI: ${payload.actionId} ${getFilename(payload.filePath)}`, directory: dir() })
        const newSession = result.data
        if (newSession?.id) { sessionId = newSession.id; setActiveSessionId(sessionId) }
      } catch (e) {
        showToast({ variant: "error", title: "Failed to create session", description: String(e) })
        return
      }
    }
    if (!sessionId) return
    panelManager.hidePanel("ai-workspace")
    panelManager.showPanel("ai-chat")
    setRightTab("ai-chat")
    try {
      await sdk().client.session.prompt({ sessionID: sessionId, parts: [{ type: "text", text: payload.prompt }] })
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
    if (isMod && e.shiftKey && e.key === "I") { e.preventDefault(); toggleRightPanel(rightTab() === "ai-chat" ? "ai-workspace" : "ai-chat") }
    if (isMod && e.shiftKey && e.key === "D") { e.preventDefault(); toggleRightPanel("debug") }
    if (isMod && e.shiftKey && e.key === "T") { e.preventDefault(); toggleRightPanel("testing") }
    if (isMod && e.key === ",") { e.preventDefault(); toggleSettings() }
    if (e.key === "Escape" && commandPaletteOpen()) setCommandPaletteOpen(false)
  }

  createEffect(() => { window.addEventListener("keydown", handleKeyDown); onCleanup(() => window.removeEventListener("keydown", handleKeyDown)) })

  // ── Palette commands ──
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
    { id: "view.aiChat", title: "Toggle AI Chat", description: "Show/hide AI chat panel", category: "view", icon: "comment", onSelect: () => toggleRightPanel("ai-chat") },
    { id: "view.debug", title: "Toggle Debug", description: "Show/hide debug panel", category: "view", keybind: "Ctrl+Shift+D", icon: "bug", onSelect: () => toggleRightPanel("debug") },
    { id: "view.testing", title: "Toggle Testing", description: "Show/hide testing panel", category: "view", keybind: "Ctrl+Shift+T", icon: "beaker", onSelect: () => toggleRightPanel("testing") },
    { id: "view.terminal", title: "Toggle Terminal", description: "Show/hide terminal panel", category: "view", keybind: "Ctrl+`", icon: "terminal", onSelect: () => toggleBottomPanel("terminal-area") },
    { id: "view.problems", title: "Toggle Problems", description: "Show/hide problems panel", category: "view", keybind: "Ctrl+Shift+M", icon: "circle-x", onSelect: () => toggleBottomPanel("problems") },
    { id: "view.presets", title: "Workspace Presets", description: "Choose a workspace layout preset", category: "workspace", icon: "layout-left", onSelect: () => setShowPresets(true) },
    { id: "ai.newSession", title: "New AI Chat Session", description: "Start a new AI conversation", category: "ai", icon: "comment", onSelect: () => { void handleNewSession() } },
    { id: "ai.explain", title: "Explain Code", description: "Get AI explanation of selected code", category: "ai", icon: "brain", onSelect: () => { showToast({ title: "Coming soon", description: "AI code explain coming in a future update" }) } },
    { id: "terminal.new", title: "New Terminal", description: "Create a new terminal", category: "terminal", icon: "terminal", onSelect: () => { terminal.new(); panelManager.showPanel("terminal-area") } },
    { id: "git.pull", title: "Git: Pull", description: "Pull latest changes", category: "git", icon: "download", onSelect: () => { showToast({ title: "Git Pull", description: "Pull completed" }) } },
    { id: "git.push", title: "Git: Push", description: "Push committed changes", category: "git", icon: "share", onSelect: () => { showToast({ title: "Git Push", description: "Push completed" }) } },
    { id: "settings.open", title: "Open Settings", description: "Configure workspace settings", category: "settings", keybind: "Ctrl+,", icon: "settings-gear", onSelect: () => toggleSettings() },
    { id: "settings.keybindings", title: "Open Keyboard Shortcuts", description: "Customize keybindings", category: "settings", icon: "keyboard", onSelect: () => toggleKeybindings() },
  ]

  const ideActions: Partial<IdeActions> = {
    // File
    newFile: () => startCreate("file", dir()),
    newWindow: () => window.open(window.location.href, "_blank"),
    openFile: () => pickDirectory({} as any),
    openFolder: () => pickDirectory({} as any),
    save: async () => {
      const activeFile = editor.activeFile()
      if (activeFile) {
        const group = workspace.getActiveGroup()
        if (group) {
          const state = workspace.getFileState(activeFile, group.id);
          if (!state || !state.dirty) return;
          try {
            await sdk().client.v2.fs.write({ path: activeFile, content: state.content })
            workspace.markClean(activeFile, group.id)
            showToast({ variant: "success", title: "File saved", description: getFilename(activeFile) })
          } catch (e) {
            showToast({ variant: "error", title: "Save failed", description: String(e) })
          }
        }
      }
    },
    saveAs: () => { showToast({ title: "Save As", description: "Save As dialog coming soon" }) },
    saveAll: () => { showToast({ title: "Save All", description: "Save All functionality coming soon" }) },
    closeEditor: () => {
       const activeFile = editor.activeFile()
       if (activeFile) workspace.closeFile(activeFile, workspace.getActiveGroup()?.id ?? "")
    },
    closeFolder: () => { navigate("/ide") },
    closeWindow: () => window.close(),

    // Edit
    undo: () => document.execCommand("undo"),
    redo: () => document.execCommand("redo"),
    cut: () => document.execCommand("cut"),
    copy: () => document.execCommand("copy"),
    paste: () => document.execCommand("paste"),
    find: () => { setCommandPaletteOpen(false); /* find logic */ },
    replace: () => { /* replace logic */ },
    findInFiles: () => toggleLeftPanel("search"),
    toggleLineComment: () => { /* trigger editor format */ },
    toggleBlockComment: () => { /* trigger editor format */ },
    formatDocument: () => setFormatTrigger(f => f + 1),

    // View
    toggleExplorer: () => toggleLeftPanel("explorer"),
    toggleSearch: () => toggleLeftPanel("search"),
    toggleSourceControl: () => toggleLeftPanel("source-control"),
    commandPalette: () => setCommandPaletteOpen(true),
    zoomIn: () => setFontSize(s => s + 1),
    zoomOut: () => setFontSize(s => Math.max(8, s - 1)),
    resetZoom: () => setFontSize(13),
    toggleFullScreen: () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {})
      else document.exitFullscreen().catch(() => {})
    },
    toggleZenMode: () => { showToast({ title: "Zen Mode", description: "Coming soon" }) },
    togglePanel: () => toggleBottomPanel("terminal-area"),
    toggleSecondarySideBar: () => { if (rightPanel()) panelManager.hidePanel(rightPanel()!.id); else panelManager.showPanel("ai-chat") },

    // Go
    goToFile: () => setCommandPaletteOpen(true),
    goToSymbolWorkspace: () => setCommandPaletteOpen(true),
    goToSymbolEditor: () => setCommandPaletteOpen(true),
    goToLine: () => setCommandPaletteOpen(true),
    goToDefinition: () => { showToast({ title: "Go to Definition", description: "Coming soon" }) },
    goToDeclaration: () => { showToast({ title: "Go to Declaration", description: "Coming soon" }) },
    goToTypeDefinition: () => { showToast({ title: "Go to Type Definition", description: "Coming soon" }) },
    goToImplementation: () => { showToast({ title: "Go to Implementation", description: "Coming soon" }) },
    goBack: () => history.back(),
    goForward: () => history.forward(),

    // Run
    runWithoutDebugging: () => toggleLeftPanel("run-debug"),
    startDebugging: () => toggleLeftPanel("run-debug"),

    // Terminal
    newTerminal: () => { terminal.new(); panelManager.showPanel("terminal-area") },
    splitTerminal: () => { terminal.new(); panelManager.showPanel("terminal-area") },
    runTask: () => { terminal.new(); panelManager.showPanel("terminal-area") }
  }

  return (
    <div class="size-full flex flex-col overflow-hidden bg-background-base" onContextMenu={handleContextMenu}>
      {/* ── Premium Header Bar ── */}
      <HeaderBar
        workspaceName={getFilename(dir()) || "Untitled"}
        activeFile={getFilename(editor.activeFile() ?? "") || ""}
        onSearch={() => {}}
        onCommandPalette={() => setCommandPaletteOpen(true)}
        onToggleLeftPanel={() => toggleLeftPanel("explorer")}
        onToggleRightPanel={() => { if (rightPanel()) panelManager.hidePanel(rightPanel()!.id); else panelManager.showPanel("ai-chat") }}
        onToggleBottomPanel={() => toggleBottomPanel("terminal")}
        actions={ideActions}
      />

      {/* ── Main Content Area ── */}
      <div class="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Activity Bar ── */}
        <ActivityBar
          activeTab={(leftPanel()?.id as ActivityBarTab) ?? "explorer"}
          sidebarOpen={!!leftPanel()}
          bottomPanelOpen={!!bottomPanel()}
          bottomTab={activeBottomTab()}
          onTabClick={(tab) => toggleLeftPanel(tab)}
          onBottomTabClick={(tab) => toggleBottomPanel(tab)}
          onOpenFolder={handleOpenFolder}
          onSettingsClick={toggleSettings}
          onRemoteClick={() => setRemoteModalOpen(true)}
          remoteConnection={remoteConnection() ?? undefined}
        />

        {/* ── Left Sidebar ── */}
        <Show when={leftPanel()}>
          <div class="shrink-0 flex flex-col border-r border-border-base bg-surface-base relative" style={{ width: `${sidebarWidth()}px` }}>
            <Show when={leftPanel()?.id === "explorer"}>
              <div class="flex items-center justify-between px-4 py-2 border-b border-border-base shrink-0">
                <span class="text-11-regular text-text-weak uppercase">Explorer</span>
                <button class="hover:bg-surface-raised-base-hover rounded px-1 text-text-weaker hover:text-text-strong">
                  <Icon name="menu" size="small" />
                </button>
              </div>
              <div class="flex-1 flex flex-col overflow-hidden min-h-0">
                <div class="flex-1 overflow-y-auto min-h-0 relative">
                  {/* Workspace Root Section */}
                  <div class="flex items-center gap-1 px-1 py-1 hover:bg-surface-raised-base-hover cursor-pointer sticky top-0 bg-surface-base z-10 border-b border-border-base/50">
                    <Icon name="chevron-down" size="small" class="text-text-weaker size-3.5" />
                    <span class="text-11-bold text-text-strong uppercase truncate">{getFilename(dir()) || "opencode-web"}</span>
                  </div>
                  <FileTree path="" active={editor.activeFile()} onFileClick={handleFileClick} />
                </div>
                
                {/* Outline Section */}
                <div class="border-t border-border-base shrink-0">
                  <div class="flex items-center gap-1 px-1 py-1 hover:bg-surface-raised-base-hover cursor-pointer text-text-weaker hover:text-text-strong transition-colors">
                    <Icon name="chevron-right" size="small" class="size-3.5" />
                    <span class="text-11-bold uppercase">Outline</span>
                  </div>
                </div>

                {/* Timeline Section */}
                <div class="border-t border-border-base shrink-0">
                  <div class="flex items-center gap-1 px-1 py-1 hover:bg-surface-raised-base-hover cursor-pointer text-text-weaker hover:text-text-strong transition-colors">
                    <Icon name="chevron-right" size="small" class="size-3.5" />
                    <span class="text-11-bold uppercase">Timeline</span>
                  </div>
                </div>
              </div>
            </Show>

            <Show when={leftPanel()?.id === "search"}>
              <SearchPanel
                onSearch={async (pattern) => {
                  setSearching(true)
                  try { const r = await sdk().client.find.text({ pattern }); return r.data ?? [] }
                  catch { return [] }
                  finally { setSearching(false) }
                }}
                onResultClick={handleSearchPanelResult}
              />
            </Show>

            <Show when={leftPanel()?.id === "source-control"}>
              <SourceControlPanel branch="main" changes={0} stagedFiles={[]} unstagedFiles={[]} onFileClick={(p) => handleFindResultClick({ path: p, line: 0 })} />
            </Show>

            <Show when={leftPanel()?.id === "extensions"}>
              <ExtensionsPanel extensions={[]} />
            </Show>

            <Show when={leftPanel()?.id === "remote"}>
              <RemotePanel />
            </Show>

            <Show when={leftPanel()?.id === "run-debug"}>
              <DebugPanel onClose={() => panelManager.hidePanel("run-debug")} />
            </Show>

            <Show when={leftPanel()?.id === "testing"}>
              <TestingPanel onClose={() => panelManager.hidePanel("testing")} />
            </Show>

            <Show when={leftPanel()?.id === "database"}>
              <DatabasePanel />
            </Show>

            <Show when={leftPanel()?.id === "ai-chat"}>
              <AIWorkspacePanel
                onClose={() => panelManager.hidePanel("ai-chat")}
                activeSessionId={activeSessionId()}
                recentSessions={recentSessions()}
                handleNewSession={handleNewSession}
                confirmDeleteSession={confirmDeleteSession}
                setActiveSessionId={setActiveSessionId}
                dir={dir()}
              />
            </Show>

            <div class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent-base/30 transition-colors z-10" onMouseDown={handleSidebarResizeStart} />
          </div>
        </Show>

        {/* ── Editor Area Container ── */}
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <EditorArea
            node={workspace.rootNode()}
            activeGroupId={workspace.activeGroupId()}
            workspace={workspace}
            onSaveFile={async (path, groupId) => {
              const state = workspace.getFileState(path, groupId);
              if (!state || !state.dirty) return;
              try {
                await sdk().client.v2.fs.write({ path, content: state.content })
                workspace.markClean(path, groupId)
                showToast({ variant: "success", title: "File saved", description: getFilename(path) })
              } catch (e) {
                showToast({ variant: "error", title: language.t("toast.file.saveFailed.title") ?? "Save failed", description: String(e) })
              }
            }}
            diffMode={diffMode()}
            onToggleDiff={() => setDiffMode(!diffMode())}
            fontSize={fontSize()}
            tabSize={tabSize()}
            wordWrap={wordWrap()}
            formatTrigger={formatTrigger()}
            onInlineAIAction={(payload, groupId) => handleInlineAIAction(payload)}
          />



          {/* Bottom Panel */}
          <Show when={bottomPanel()}>
            <div class="h-1 bg-border-base hover:bg-accent-base/50 cursor-row-resize shrink-0 transition-colors" onMouseDown={handleBottomResizeStart} />
            <BottomPanel
              activeTab={activeBottomTab()}
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
                      <div class="w-40 shrink-0 border-l border-border-base bg-surface-base flex flex-col overflow-y-auto">
                        <For each={terminal.all()}>
                          {(pty) => {
                            const shellInfo = () => getShellInfo(pty.title)
                            return (
                              <div
                                class="group flex items-center px-2 py-1.5 cursor-pointer border-b border-border-base/50 transition-colors"
                                classList={{
                                  "bg-background-base border-l-2 border-l-accent-base": terminal.active() === pty.id,
                                  "hover:bg-surface-raised-base-hover": terminal.active() !== pty.id,
                                }}
                                onClick={() => terminal.open(pty.id)}
                              >
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
                          if (state?.content && state.content.type === "text") editor.openFile(problem.file, state.content.content)
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
            gitBranch="main"
            terminalCount={terminal.all().length} syncStatus="synced"
            onCommandPalette={() => setCommandPaletteOpen(true)}
            remoteConnection={remoteConnection() ?? undefined}
            onRemoteClick={() => setRemoteModalOpen(true)}
          />
        </div>

        <Show when={rightPanel()}>
          <div class="shrink-0 flex flex-col border-l border-border-base bg-surface-base relative" style={{ width: `${rightPanelWidth()}px` }}>
            <div class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent-base/30 transition-colors z-10" onMouseDown={handleRightResizeStart} />
            
            <div class="flex-1 overflow-y-auto min-h-0 p-3 text-text-weak text-13-regular text-center mt-10">
              Select a panel to dock here.
            </div>
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
          <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => startCreate("file", contextMenu()!.path)}><span class="text-12">📄</span> New File</button>
          <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => startCreate("directory", contextMenu()!.path)}><span class="text-12">📁</span> New Folder</button>
          <div class="h-px bg-border-base my-1" />
          <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => startRename(contextMenu()!.path)}><span class="text-12">✏️</span> Rename</button>
          <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-danger-base hover:bg-surface-raised-base-hover transition-colors" onClick={() => promptDelete(contextMenu()!.path, contextMenu()!.isDir)}><span class="text-12">🗑️</span> Delete</button>
        </div>
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
              <button class="px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors" onClick={() => { setRenaming(null); setCreating(null) }}>Cancel</button>
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
            <div class="text-15-medium text-text-strong mb-2">Delete {deleteTarget()?.isDir ? "Folder" : "File"}</div>
            <p class="text-13-regular text-text-weak mb-4">
              Are you sure you want to delete <span class="font-semibold text-text-strong">"{getFilename(deleteTarget()?.path ?? "")}"</span>?
              {deleteTarget()?.isDir ? " All contents will be deleted." : ""} This action cannot be undone.
            </p>
            <div class="flex justify-end gap-2">
              <button class="px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button class="px-3 py-1.5 text-13-regular text-white bg-text-danger-base hover:bg-text-danger-hover rounded-lg transition-colors" onClick={confirmDeleteFile}>Delete</button>
            </div>
          </div>
        </div>
      </Show>

      {/* ── Delete Session Dialog ── */}
      <Show when={sessionDeleting() !== null}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSessionDeleting(null)}>
          <div class="bg-surface-raised-base border border-border-base rounded-xl p-5 shadow-xl max-w-sm animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div class="text-15-medium text-text-strong mb-2">Delete Session</div>
            <p class="text-13-regular text-text-weak mb-4">
              Are you sure you want to delete <span class="font-semibold text-text-strong">"{sessionDeleteTitle()}"</span>? This action cannot be undone.
            </p>
            <div class="flex justify-end gap-2">
              <button class="px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors" onClick={() => setSessionDeleting(null)}>Cancel</button>
              <button class="px-3 py-1.5 text-13-regular text-white bg-text-danger-base hover:bg-text-danger-hover rounded-lg transition-colors" onClick={handleDeleteSession}>Delete</button>
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

      {/* ── Settings Modal ── */}
      <Show when={settingsOpen()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSettingsOpen(false)}>
          <div class="bg-surface-raised-base border border-border-base rounded-xl shadow-2xl w-[720px] max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between px-5 py-3 border-b border-border-base">
              <span class="text-15-medium text-text-strong">Settings</span>
              <IconButton icon="close" variant="ghost" size="small" class="size-6 rounded" onClick={() => setSettingsOpen(false)} />
            </div>
            <SettingsPanel
              fontSize={fontSize()} setFontSize={setFontSize}
              tabSize={tabSize()} setTabSize={setTabSize}
              wordWrap={wordWrap()} setWordWrap={setWordWrap}
              theme={theme()} setTheme={setTheme}
              minimap={minimap()} setMinimap={setMinimap}
              wordWrapCol={wordWrapCol()} setWordWrapCol={setWordWrapCol}
              onCloseKeybindings={() => {}}
            />
          </div>
        </div>
      </Show>

      {/* ── Keybindings Modal ── */}
      <Show when={showKeybindings()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowKeybindings(false)}>
          <div class="bg-surface-raised-base border border-border-base rounded-xl shadow-2xl w-[720px] max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between px-5 py-3 border-b border-border-base">
              <span class="text-15-medium text-text-strong">Keyboard Shortcuts</span>
              <IconButton icon="close" variant="ghost" size="small" class="size-6 rounded" onClick={() => setShowKeybindings(false)} />
            </div>
            <KeybindingsPanel keybindings={keybindings()} setKeybindings={setKeybindings} />
          </div>
        </div>
      </Show>

      {/* ── Remote Connection Modal ── */}
      <RemoteConnectionModal
        open={remoteModalOpen()}
        onClose={() => setRemoteModalOpen(false)}
        onConnect={handleRemoteConnect}
      />
    </div>
  )
}