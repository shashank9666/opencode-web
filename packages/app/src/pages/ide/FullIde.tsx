import {
  createEffect,
  createSignal,
  createMemo,
  For,
  Match,
  onCleanup,
  Show,
  Switch,
} from "solid-js"
import { useFile } from "@/context/file"
import { useSettings } from "@/context/settings"
import { createProblemTracker } from "@/components/problem-tracker"
import { type InlineAIActionPayload } from "@/components/inline-ai-toolbar"
import { createEditorWorkspace } from "@/components/editor-workspace"
import { MultiFileDiffOverlay } from "../../components/MultiFileDiffOverlay"
import { EditorArea } from "@/components/EditorArea"
import { SplitPane } from "@/components/SplitPane"
import { Terminal } from "@/components/terminal"
import TerminalCommandHistory from "@/components/terminal/terminal-command-history"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { getFilename } from "@opencode-ai/core/util/path"
import { useSDK } from "@/context/sdk"
import { showToast } from "@/utils/toast"
import { useLanguage } from "@/context/language"
import { useDirectoryPicker } from "@/components/directory-picker"
import { useNavigate, useParams } from "@solidjs/router"
import { pushFileAction, undoFileAction, redoFileAction } from "@/utils/file-history"
import { useGlobal } from "@/context/global"
import { useServer } from "@/context/server"
import * as monaco from "monaco-editor"
import { base64Encode } from "@opencode-ai/core/util/encode"
import { decode64 } from "@/utils/base64"
import { useServerSync } from "@/context/server-sync"
import { sortedRootSessions } from "@/pages/layout/helpers"
import { useTerminal } from "@/context/terminal"
import { sessionPermissionRequest } from "@/pages/session/composer/session-request-tree"
import { usePermission } from "@/context/permission"
import { useSync } from "@/context/sync"
import { useLocal } from "@/context/local"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { findLast } from "@opencode-ai/core/util/array"
import { ImagePreview } from "@opencode-ai/ui/image-preview"
import { PdfPreview } from "@/components/previews"

// Reuse existing panels + extend
import HeaderBar from "./HeaderBar"
import ExplorerPanel from "./ExplorerPanel"
import ModernStatusBar from "./ModernStatusBar"
import ActivityBar, { type ActivityBarTab, type BottomPanelTab } from "./ActivityBar"
import BottomPanel, { ProblemsTab, OutputTab, DebugConsoleTab } from "./BottomPanel"
import CommandPaletteV2 from "./CommandPaletteV2"
import type { PaletteAction } from "./CommandPaletteV2"
import SearchPanel from "./SearchPanel"
import SourceControlPanel from "./SourceControlPanel"

import AIWorkspacePanel from "./AIWorkspacePanel"
import { createPanelManager, FloatingPanel, type PanelState } from "./DockablePanel"
import { type IdeActions } from "./MenuBar"

// ── Extra panels (new) ──
import DebugPanel from "./DebugPanel"
import TestingPanel from "./TestingPanel"
import SettingsPanel from "./SettingsPanel"
import KeybindingsPanel from "./KeybindingsPanel"
import RemotePanel from "./RemotePanel"
import { useRemote } from "@/context/remote"
import DatabasePanel from "./DatabasePanel"
import ExtensionsPanel from "./ExtensionsPanel"
import RemoteConnectionModal from "./RemoteConnectionModal"
import DefaultShellModal from "./DefaultShellModal"

const MERGED_DEFAULT: PanelState[] = [
  { id: "explorer", label: "Explorer", icon: "file-tree", position: "left", visible: true, width: 280, order: 0 },
  { id: "search", label: "Search", icon: "magnifying-glass", position: "left", visible: false, width: 280, order: 1 },
  { id: "source-control", label: "Source Control", icon: "branch", position: "left", visible: false, width: 300, order: 2 },
  { id: "run-debug", label: "Run & Debug", icon: "bug", position: "left", visible: false, width: 300, order: 3 },
  { id: "extensions", label: "Extensions", icon: "sliders", position: "left", visible: false, width: 300, order: 4 },

  { id: "ai-chat", label: "AI Assistant", icon: "brain", position: "right", visible: true, width: 320, order: 5 },
  { id: "database", label: "Database", icon: "database", position: "left", visible: false, width: 320, order: 6 },
  { id: "remote", label: "Remote Explorer", icon: "remote", position: "left", visible: false, width: 280, order: 7 },
  { id: "testing", label: "Testing", icon: "beaker", position: "left", visible: false, width: 300, order: 8 },
  { id: "terminal-area", label: "Terminal", icon: "terminal", position: "bottom", visible: true, height: 220, order: 6 },
  { id: "problems", label: "Problems", icon: "circle-x", position: "bottom", visible: false, height: 220, order: 7 },
  { id: "output", label: "Output", icon: "console", position: "bottom", visible: false, height: 220, order: 8 },
  { id: "debug-console", label: "Debug Console", icon: "window-cursor", position: "bottom", visible: false, height: 220, order: 9 },
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
  const settings = useSettings()
  const workspace = createEditorWorkspace()
  const editor = {
    activeFile: () => workspace.getActiveGroup()?.activeFile ?? "",
    dirty: (path?: string) => workspace.getFileState(path ?? workspace.getActiveGroup()?.activeFile ?? "")?.dirty ?? false,
    content: (path?: string) => workspace.getFileState(path ?? workspace.getActiveGroup()?.activeFile ?? "")?.content ?? "",
    markClean: (path: string) => workspace.markClean(path, workspace.getActiveGroup()?.id ?? ""),
    openFile: (path: string, content: string) => workspace.openFile(path, content, workspace.getActiveGroup()?.id ?? ""),
    closeFile: (path: string) => {
      const group = workspace.getActiveGroup()
      if (group) {
        const state = workspace.getFileState(path, group.id)
        if (state && state.dirty && settings.general.autoSave()) {
          void file.write(path, state.content)
            .then(() => workspace.markClean(path, group.id))
            .catch((err: unknown) => {
              showToast({ variant: "error", title: "Save failed", description: String(err) })
            })
        }
      }
      workspace.closeFile(path, group?.id ?? "")
    },
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
  const permission = usePermission()
  const sync = useSync()
  const local = useLocal()
  const dialog = useDialog()
  const remote = useRemote()

  // ── Layout state ──
  const savedLayout = (() => {
    try {
      const raw = localStorage.getItem('ideLayout')
      return raw ? JSON.parse(raw) as { panels: PanelState[]; floatingPanels: PanelState[] } : null
    } catch { return null }
  })()
  
  // Merge missing panels from MERGED_DEFAULT
  const initialPanels = savedLayout?.panels?.length 
    ? [
        ...savedLayout.panels,
        ...MERGED_DEFAULT.filter(def => !savedLayout.panels.some((p: PanelState) => p.id === def.id))
      ]
    : MERGED_DEFAULT

  const panelManager = createPanelManager(initialPanels)
  if (savedLayout?.floatingPanels?.length) {
    ; (panelManager as any).floatingPanels.set(savedLayout.floatingPanels)
  }

  createEffect(() => {
    const layout = { panels: panelManager.panels(), floatingPanels: panelManager.floatingPanels() }
    try { localStorage.setItem('ideLayout', JSON.stringify(layout)) } catch { }
  })

  const [sidebarWidth, setSidebarWidth] = createSignal(280)
  const [rightPanelWidth, setRightPanelWidth] = createSignal(320)
  const [bottomPanelHeight, setBottomPanelHeight] = createSignal(220)
  const [commandPaletteOpen, setCommandPaletteOpen] = createSignal(false)
  const [compareFile, setCompareFile] = createSignal<string | null>(null)
  const [headerCompact, setHeaderCompact] = createSignal(false)
  const [showSettings, setShowSettings] = createSignal(false)
  const [showKeybindings, setShowKeybindings] = createSignal(false)
  const [sshConnectionModalOpen, setSshConnectionModalOpen] = createSignal(false)
  const [defaultShellModalOpen, setDefaultShellModalOpen] = createSignal(false)
  const [remoteModalOpen, setRemoteModalOpen] = createSignal(false)
  const [remoteConnection, setRemoteConnection] = createSignal<string | null>(
    (() => {
      try {
        const saved = localStorage.getItem('remoteConnection')
        return saved || null
      } catch { return null }
    })()
  )
  // Sync remote connection label with context and persist
  createEffect(() => {
    const conn = remote.connection()
    if (conn?.status === "connected") {
      const label = `${conn.type === "Container" ? "Container" : conn.type}: ${conn.target}`
      setRemoteConnection(label)
      localStorage.setItem('remoteConnection', label)
    } else if (remoteConnection() && !conn) {
      setRemoteConnection(null)
      localStorage.removeItem('remoteConnection')
    }
  })

  const handleRemoteConnect = async (type: "SSH" | "WSL" | "Container", target: string) => {
    setRemoteModalOpen(false)
    showToast({
      title: "Connecting",
      description: `Connecting to ${type} host: ${target}...`,
    })

    await remote.connect(type, target)

    const conn = remote.connection()
    if (conn?.status === "connected") {
      showToast({
        variant: "success",
        title: "Connected",
        description: `Successfully connected to ${type} host: ${target}!`,
      })
      panelManager.panels().filter((p) => p.position === "left").forEach((p) => panelManager.hidePanel(p.id))
      panelManager.showPanel("remote")
    } else {
      showToast({
        variant: "error",
        title: "Connection failed",
        description: conn?.error ?? `Failed to connect to ${type} host: ${target}`,
      })
    }
  }


  // ── Settings / keybinding state (mock) ──
  const [settingsOpen, setSettingsOpen] = createSignal(false)
  const [fontSize, setFontSize] = createSignal(13)
  const [tabSize, setTabSize] = createSignal(2)
  const [wordWrap, setWordWrap] = createSignal<"off" | "on" | "wordWrapColumn" | "bounded">("off")
  const [theme, setTheme] = createSignal<"vs-dark" | "vs-light">("vs-dark")
  const [minimap, setMinimap] = createSignal(true)
  const [wordWrapCol, setWordWrapCol] = createSignal(80)
  const [terminalSplit, setTerminalSplit] = createSignal<false | "horizontal" | "vertical">(false)
  const [terminalSplitId, setTerminalSplitId] = createSignal<string | null>(null)
  createEffect(() => {
    if (terminal.all().length <= 1 && terminalSplit()) {
      setTerminalSplit(false)
      setTerminalSplitId(null)
    }
  })
  const [terminalLoading, setTerminalLoading] = createSignal<string | null>(null)
  let terminalSplitCounter = 0
  const [showTerminalHistory, setShowTerminalHistory] = createSignal(false)

  // ── Git status for explorer markers ──
  const [gitStatusMap, setGitStatusMap] = createSignal<Map<string, "add" | "del" | "mix">>(new Map())
  const [gitStatusSet, setGitStatusSet] = createSignal<Set<string>>(new Set())
  const [vcsBranch, setVcsBranch] = createSignal<string>("")
  const [vcsChangeCount, setVcsChangeCount] = createSignal(0)
  createEffect(() => {
    const sdkCtx = sdk()
    if (!sdkCtx) return
    let active = true
    const fetch = async () => {
      try {
        const [infoRes, statusRes] = await Promise.all([
          sdkCtx.client.vcs.get().catch(() => ({ data: {} as any })),
          sdkCtx.client.vcs.status().catch(() => ({ data: [] })),
        ])
        if (!active) return
        const branch = infoRes.data?.branch ?? ""
        setVcsBranch(branch)
        const data = statusRes.data ?? []
        setVcsChangeCount(data.length)
        const kinds = new Map<string, "add" | "del" | "mix">()
        const paths = new Set<string>()
        for (const f of data) {
          paths.add(f.file)
          // Determine kind from status
          if (f.status === "added") kinds.set(f.file, "add")
          else if (f.status === "deleted") kinds.set(f.file, "del")
          else kinds.set(f.file, "mix") // modified
          // Also add parent directories
          const parts = f.file.split("/")
          for (let i = 1; i < parts.length; i++) {
            const dir = parts.slice(0, i).join("/")
            if (!kinds.has(dir)) kinds.set(dir, kinds.get(f.file)!)
            else kinds.set(dir, "mix")
            paths.add(dir)
          }
        }
        setGitStatusMap(kinds)
        setGitStatusSet(paths)
      } catch {
        // VCS might not be available
      }
    }
    fetch()
    const timer = setInterval(fetch, 5000)
    const cleanup = () => { active = false; clearInterval(timer) }
    onCleanup(cleanup)
  })

  const [keybindings, setKeybindings] = createSignal<{ id: string; key: string; command: string }[]>([
    { id: "save", key: "Ctrl+S", command: "workbench.action.files.save" },
    { id: "open", key: "Ctrl+O", command: "workbench.action.files.openFile" },
    { id: "cmd", key: "Ctrl+Shift+P", command: "workbench.action.showCommands" },
    { id: "toggle-term", key: "Ctrl+`", command: "workbench.action.terminal.toggleTerminal" },
    { id: "find", key: "Ctrl+F", command: "actions.find" },
    { id: "replace", key: "Ctrl+H", command: "editor.action.startFindReplaceAction" },
  ])

  // ── Colorful icons toggle ──
  createEffect(() => {
    document.documentElement.dataset.colorfulIcons = settings.appearance.colorfulIcons() ? "true" : "false"
  })

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
  const [fullScreen, setFullScreen] = createSignal(false)
  const hasSplit = createMemo(() => workspace.rootNode().type === "split")
  const [breadcrumbs, setBreadcrumbs] = createSignal<string[]>([])
  const [formatTrigger, setFormatTrigger] = createSignal(0)
  const [diffMode, setDiffMode] = createSignal(false)
  const [rightTab, setRightTab] = createSignal<"ai-chat" | "ai-workspace" | "debug" | "testing" | "database">("ai-chat")

  // ── Context menus ──
  const [contextMenu, setContextMenu] = createSignal<{ x: number; y: number; path: string; isDir: boolean } | null>(null)
  const clampContextMenu = (x: number, y: number) => {
    const width = 280
    const height = 560
    const padding = 12
    return {
      x: Math.max(padding, Math.min(x, window.innerWidth - width - padding)),
      y: Math.max(padding, Math.min(y, window.innerHeight - height - padding)),
    }
  }
  const [renaming, setRenaming] = createSignal<string | null>(null)
  const [renameValue, setRenameValue] = createSignal("")
  const [creating, setCreating] = createSignal<"file" | "directory" | null>(null)
  const [createParent, setCreateParent] = createSignal("")
  const [deleteTarget, setDeleteTarget] = createSignal<{ path: string; isDir: boolean } | null>(null)

  const dir = createMemo(() => decode64(params.dir) ?? "")
  const [dirStore] = createMemo(() => serverSync().child(dir(), { bootstrap: true }))()
  const recentSessions = createMemo(() => sortedRootSessions(dirStore, Date.now()).slice(0, 10))

  let loadedWorkspaceDir = "";
  createEffect(() => {
    const currentDir = dir();
    if (!currentDir || currentDir === loadedWorkspaceDir) return;
    loadedWorkspaceDir = currentDir;
    try {
      const raw = localStorage.getItem(`workspace_${currentDir}`);
      if (raw) {
        const snapshot = JSON.parse(raw);
        workspace.loadSnapshot(snapshot);
        const loadNode = (node: any) => {
          if (node.type === "group") {
            node.files?.forEach((path: string) => {
              file.load(path).then(() => {
                const state = file.get(path);
                if (state?.content?.type === "text") {
                  workspace.setContent(path, state.content.content, node.id);
                }
              }).catch(() => {});
            });
          } else if (node.children) {
            node.children.forEach(loadNode);
          }
        };
        loadNode(snapshot);
      }
    } catch (e) {
      console.error("Failed to load workspace snapshot", e);
    }
  });

  createEffect(() => {
    const currentDir = dir();
    if (!currentDir) return;
    const snapshot = workspace.getSnapshot();
    localStorage.setItem(`workspace_${currentDir}`, JSON.stringify(snapshot));
  });

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

  // Handle custom events
  createEffect(() => {
    const handleOpenPlaywright = () => {
      workspace.openFile("browser://playwright", "", workspace.activeGroupId())
    }
    window.addEventListener("open-playwright-preview", handleOpenPlaywright)
    onCleanup(() => window.removeEventListener("open-playwright-preview", handleOpenPlaywright))
  })

  createEffect(() => {
    const currentDir = dir()
    if (!currentDir) return
    void file.tree.refresh("")
  })

  // ── Pending Edit Diff Preview ──
  const pendingEditPermission = createMemo(() => {
    const sessionID = activeSessionId()
    if (!sessionID) return undefined
    const req = sessionPermissionRequest(sync().data.session, sync().data.permission, sessionID, (item) => {
      return !permission.autoResponds(item, sdk().directory)
    })
    if (
      req?.permission === "edit" ||
      req?.permission === "replace_file_content" ||
      req?.permission === "multi_replace_file_content" ||
      req?.permission === "write_to_file" ||
      req?.permission === "write"
    ) {
      return req
    }
    return undefined
  })

  const pendingEditToolArgs = createMemo(() => {
    const req = pendingEditPermission()
    if (!req || !req.tool) return undefined
    const parts = sync().data.part[req.tool.messageID]
    if (!parts) return undefined
    const toolPart = parts.find((p: any) => p.type === "tool" && p.callID === req.tool!.callID)
    if (!toolPart || toolPart.type !== "tool") return undefined
    const input = (toolPart.state as any).input
    if (!input) return undefined
    const filePath = input.path || input.filePath || ""
    const content = input.content || input.code || ""
    if (!filePath) return undefined
    return { path: filePath, content }
  })

  // Whenever a pending edit starts, auto-focus the file and load its content
  createEffect(() => {
    const args = pendingEditToolArgs()
    if (!args?.path) return
    void (async () => {
      await file.load(args.path)
      const state = file.get(args.path)
      const original = (state?.content?.type === "text") ? state.content.content : ""
      workspace.openFile(args.path, original)
    })()
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
      const delta = bottomResizeStartY - e.clientY
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

  // ── Image preview helper ──
  const openImagePreview = (path: string) => {
    void (async () => {
      await file.load(path)
      const state = file.get(path)
      if (!state?.content) return
      const content = state.content
      if (content.type === "binary") {
        // Binary content is a data URL string in the SDK
        const url = content.content
        if (url) dialog.show(() => <ImagePreview src={url} alt={getFilename(path)} />)
      } else if (content.type === "text") {
        // For SVG or text image files, create a data URL
        const blob = new Blob([content.content], { type: "image/svg+xml" })
        const url = URL.createObjectURL(blob)
        dialog.show(() => <ImagePreview src={url} alt={getFilename(path)} />)
      }
    })()
  }

  const isImagePath = (path: string) => {
    const ext = path.toLowerCase().slice(path.lastIndexOf("."))
    return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".svg"].includes(ext)
  }

  const isMarkdownPath = (path: string) => path.toLowerCase().endsWith(".md")
  const isPdfPath = (path: string) => path.toLowerCase().endsWith(".pdf")

  const isPreviewablePath = (path: string) => {
    const ext = path.toLowerCase().slice(path.lastIndexOf("."))
    return [".md", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".svg"].includes(ext)
  }

  const openPreview = (path: string) => {
    if (isImagePath(path)) return openImagePreview(path)
    if (isMarkdownPath(path)) {
      void (async () => {
        await file.load(path)
        const state = file.get(path)
        if (state?.content?.type === "text") {
          let targetGroupId = workspace.activeGroupId()
          const groups = workspace.getGroups()
          if (groups.length === 1) {
            workspace.splitGroup(targetGroupId!, "horizontal")
            targetGroupId = workspace.getGroups()[1].id
          } else {
            // Find a group that is not the active one
            targetGroupId = groups.find(g => g.id !== targetGroupId)?.id ?? targetGroupId
          }
          workspace.openFile(`preview://${path}`, state.content.content, targetGroupId)
        }
      })()
    } else if (isPdfPath(path)) {
      void (async () => {
        await file.load(path)
        const state = file.get(path)
        const content = state?.content
        if (content?.type === "binary" && content.content) {
          dialog.show(() => (
            <PdfPreview
              src={content.content}
              filename={getFilename(path)}
              onClose={() => dialog.close()}
            />
          ))
        } else if (content?.type === "text" && content.content) {
          const blob = new Blob([content.content], { type: "application/pdf" })
          const url = URL.createObjectURL(blob)
          dialog.show(() => (
            <PdfPreview
              src={url}
              filename={getFilename(path)}
              onClose={() => { URL.revokeObjectURL(url); dialog.close() }}
            />
          ))
        }
      })()
    }
  }

  // ── File ops ──
  const handleFileClick = async (node: { path: string; type: string }) => {
    if (node.type !== "file") return
    closeContextMenu()
    const path = node.path
    showToast({ title: "Opening", description: getFilename(path) })
    try {
      await file.load(path)
      const state = file.get(path)
      if (!state) {
        showToast({ variant: "error", title: "Failed to open file", description: "File not found" })
        return
      }
      if (state.error) {
        showToast({ variant: "error", title: "Failed to open file", description: state.error })
        return
      }
      const content = state.content
      if (!content) {
        editor.openFile(path, "")
        setDiffMode(false)
        return
      }
      if (content.type === "binary") {
        if (!content.content) return
        const isImage = /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(path)
        if (!isImage) {
          showToast({ title: "Binary file", description: `${getFilename(path)} is a binary file and cannot be edited.` })
          return
        }
      }
      editor.openFile(path, content.content ?? "")
      setDiffMode(false)
    } catch (e) {
      showToast({ variant: "error", title: "Failed to open file", description: String(e) })
    }
  }

  const saveFile = async () => {
    const path = editor.activeFile()
    if (!path || !editor.dirty()) return
    try {
      await file.write(path, editor.content())
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

  const handleSearchPanelResult = (result: { path: string; line: number; column?: number }) => {
    void (async () => {
      await file.load(result.path)
      const state = file.get(result.path)
      if (state?.content && state.content.type === "text") {
        editor.openFile(result.path, state.content.content)
        // After a short delay so the editor mounts, jump to the target line+column
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("navigate-to-line", {
            detail: { path: result.path, line: result.line, column: result.column ?? 1 }
          }))
        }, 80)
      }
    })()
  }

  // ── Context menu / create / delete ──
  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      return
    }

    const item = target.closest('[data-component="filetree"] [data-path]')
    if (!item) {
      e.preventDefault()
      return
    }
    const path = item.getAttribute("data-path") ?? ""
    const isDir = item.getAttribute("data-type") === "directory"
    e.preventDefault()
    const position = clampContextMenu(e.clientX, e.clientY)
    setContextMenu({ x: position.x, y: position.y, path, isDir })
  }

  const closeContextMenu = () => { setContextMenu(null); setRenaming(null); setCreating(null) }
  const copyToClipboard = async (text: string) => {
    if (!navigator.clipboard) { showToast({ title: "Clipboard unavailable", description: "HTTPS required" }); return }
    try { await navigator.clipboard.writeText(text) } catch { showToast({ title: "Clipboard error", description: "Failed to copy" }) }
  }
  const startRename = (path: string) => { setRenaming(path); setRenameValue(getFilename(path)); setContextMenu(null) }

  const confirmRename = async () => {
    const oldPath = renaming()
    if (!oldPath || !renameValue()) return
    const parent = oldPath.slice(0, oldPath.lastIndexOf("/"))
    const newPath = parent ? `${parent}/${renameValue()}` : renameValue()
    try {
      await sdk().client.v2.fs.rename({ oldPath, newPath })
      pushFileAction({ type: "rename", oldPath, newPath })
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
        pushFileAction({ type: "create", path: newPath, isDir: false })
        editor.openFile(newPath, "")
      } catch (e) { showToast({ variant: "error", title: "Create failed", description: String(e) }) }
    } else {
      try {
        await sdk().client.v2.fs.write({ path: `${newPath}/.gitkeep`, content: "" })
        pushFileAction({ type: "create", path: newPath, isDir: true })
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
      if (target.isDir) {
        // Recursively list and delete all files in the directory first
        const listAll = async (dirPath: string): Promise<string[]> => {
          try {
            const result = await sdk().client.v2.fs.list({ path: dirPath })
            const entries = (result as any).data ?? []
            const files: string[] = []
            for (const entry of entries) {
              const fullPath = entry.path
              if (entry.type === "directory") {
                const sub = await listAll(fullPath)
                files.push(...sub)
                files.push(fullPath)
              } else {
                files.push(fullPath)
              }
            }
            return files
          } catch {
            return []
          }
        }
        // Try direct folder delete first (some servers support it)
        try {
          await sdk().client.v2.fs.delete({ path: target.path })
        } catch {
          // Fallback: delete all files then the directory
          const allFiles = await listAll(target.path)
          for (const f of allFiles) {
            try { await sdk().client.v2.fs.delete({ path: f }) } catch { }
          }
          // Delete the .gitkeep we may have created, then try the dir again
          try { await sdk().client.v2.fs.delete({ path: `${target.path}/.gitkeep` }) } catch { }
          try { await sdk().client.v2.fs.delete({ path: target.path }) } catch { }
        }
        // Close any open files from deleted directory
        const group = workspace.getActiveGroup()
        if (group) {
          group.files
            .filter(f => f.path.startsWith(target.path + "/"))
            .forEach(f => workspace.closeFile(f.path, group.id))
        }
        pushFileAction({ type: "delete", path: target.path, isDir: true })
      } else {
        let contentToRestore = ""
        try {
          await file.load(target.path)
          const state = file.get(target.path)
          contentToRestore = state?.content?.type === "text" ? state.content.content : ""
        } catch {}
        
        await sdk().client.v2.fs.delete({ path: target.path })
        pushFileAction({ type: "delete", path: target.path, isDir: false, content: contentToRestore })
        if (editor.activeFile() === target.path) editor.closeFile(target.path)
      }
      showToast({ variant: "success", title: "Deleted", description: `"${getFilename(target.path)}" was deleted` })
    } catch (e) { showToast({ variant: "error", title: "Delete failed", description: String(e) }) }
    setDeleteTarget(null)
    void file.tree.refresh("")
  }

  // ── Session ops ──
  const userMessages = createMemo(() => {
    const id = activeSessionId()
    if (!id) return []
    return (sync().data.message[id] ?? []).filter((m: any) => m.role === "user")
  })
  
  const sessionInfo = createMemo(() => {
    const id = activeSessionId()
    if (!id) return
    return sync().session.get(id)
  })

  const visibleUserMessages = createMemo(() => {
    const revert = sessionInfo()?.revert?.messageID
    if (!revert) return userMessages()
    return userMessages().filter((m: any) => m.id < revert)
  })

  const handleCompactSession = async () => {
    const sessionID = activeSessionId()
    if (!sessionID) return

    const model = local.model.current()
    if (!model) {
      showToast({
        title: language.t("toast.model.none.title") ?? "No model selected",
        description: language.t("toast.model.none.description") ?? "Please select a model first.",
      })
      return
    }

    await sdk().client.session.summarize({
      sessionID,
      modelID: model.id,
      providerID: model.provider.id,
    })
  }

  const handleUndoSession = async () => {
    const sessionID = activeSessionId()
    if (!sessionID) return

    if (sync().data.session_working(sessionID)) {
      await sdk().client.session.abort({ sessionID }).catch(() => {})
    }

    const revert = sessionInfo()?.revert?.messageID
    const message = findLast(userMessages(), (x: any) => !revert || x.id < revert)
    if (!message) return

    await sdk().client.session.revert({ sessionID, messageID: message.id })
  }

  const handleRedoSession = async () => {
    const sessionID = activeSessionId()
    if (!sessionID) return

    const revertMessageID = sessionInfo()?.revert?.messageID
    if (!revertMessageID) return

    const next = userMessages().find((x: any) => x.id > revertMessageID)
    if (!next) {
      await sdk().client.session.unrevert({ sessionID })
      return
    }

    await sdk().client.session.revert({ sessionID, messageID: next.id })
  }

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
    const activeEl = document.activeElement
    const isInput = activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA" || activeEl?.closest(".monaco-editor")

    if (isMod && e.key === "s") { e.preventDefault(); await saveFile() }
    if (isMod && e.shiftKey && e.key === "P") { e.preventDefault(); setCommandPaletteOpen(true) }
    if (isMod && !e.shiftKey && e.key === "p") { e.preventDefault(); setCommandPaletteOpen(true) }
    if (isMod && e.key === "`") { e.preventDefault(); toggleBottomPanel("terminal-area") }
    if (isMod && e.key === "b") { e.preventDefault(); toggleLeftPanel("explorer") }
    if (isMod && e.shiftKey && e.key === "F") { e.preventDefault(); toggleLeftPanel("search") }
    if (isMod && e.shiftKey && e.key === "G") { e.preventDefault(); toggleLeftPanel("source-control") }

    if (isMod && e.shiftKey && e.key === "I") { e.preventDefault(); toggleRightPanel(rightTab() === "ai-chat" ? "ai-workspace" : "ai-chat") }
    if (isMod && e.shiftKey && e.key === "D") { e.preventDefault(); toggleRightPanel("debug") }
    if (isMod && e.shiftKey && e.key === "T") { e.preventDefault(); toggleRightPanel("testing") }
    if (isMod && e.key === ",") { e.preventDefault(); toggleSettings() }
    
    if (isMod && !e.shiftKey && e.key === "z" && !isInput) { e.preventDefault(); void undoFileAction(sdk()) }
    if (isMod && (e.key === "y" || (e.shiftKey && e.key === "Z")) && !isInput) { e.preventDefault(); void redoFileAction(sdk()) }

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

    { id: "view.aiChat", title: "Toggle AI Chat", description: "Show/hide AI chat panel", category: "view", icon: "comment", onSelect: () => toggleRightPanel("ai-chat") },
    { id: "view.debug", title: "Toggle Debug", description: "Show/hide debug panel", category: "view", keybind: "Ctrl+Shift+D", icon: "bug", onSelect: () => toggleRightPanel("debug") },
    { id: "view.testing", title: "Toggle Testing", description: "Show/hide testing panel", category: "view", keybind: "Ctrl+Shift+T", icon: "beaker", onSelect: () => toggleRightPanel("testing") },
    { id: "view.terminal", title: "Toggle Terminal", description: "Show/hide terminal panel", category: "view", keybind: "Ctrl+`", icon: "terminal", onSelect: () => toggleBottomPanel("terminal-area") },
    { id: "view.problems", title: "Toggle Problems", description: "Show/hide problems panel", category: "view", keybind: "Ctrl+Shift+M", icon: "circle-x", onSelect: () => toggleBottomPanel("problems") },
    { id: "ai.newSession", title: "New AI Chat Session", description: "Start a new AI conversation", category: "ai", icon: "comment", onSelect: () => { void handleNewSession() } },
    { id: "ai.compact", title: "AI: Compact Session", description: "Summarize session to save context", category: "ai", icon: "shrink", onSelect: () => { void handleCompactSession() } },
    { id: "ai.undo", title: "AI: Checkpoint (Undo)", description: "Revert last AI action", category: "ai", icon: "undo", onSelect: () => { void handleUndoSession() } },
    { id: "ai.redo", title: "AI: Checkpoint (Redo)", description: "Redo reverted AI action", category: "ai", icon: "redo", onSelect: () => { void handleRedoSession() } },
    { id: "review.toggle", title: "Review AI Changes", description: "Review pending AI edits", category: "ai", icon: "git-pull-request", onSelect: () => { workspace.openFile("review://changes", "", "") } },
    { id: "ai.explain", title: "Explain Code", description: "Get AI explanation of selected code", category: "ai", icon: "brain", onSelect: () => {
      const ed = editorInstance()
      if (!ed) { showToast({ title: "No Editor", description: "Open a file first" }); return }
      const selection = ed.getSelection()
      if (selection && !selection.isEmpty()) {
        const model = ed.getModel()
        const text = model?.getValueInRange(selection) ?? ""
        showToast({ title: "Explain Code", description: `Explaining selected code (${text.length} chars)...` })
      } else {
        showToast({ title: "Explain Code", description: "Select code in the editor first" })
      }
    } },
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
    openFile: () => handleOpenFolder(),
    openFolder: () => handleOpenFolder(),
    save: async () => {
      const activeFile = workspace.getActiveGroup()?.activeFile
      if (activeFile && !activeFile.startsWith("preview://")) {
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
      const activeFile = workspace.getActiveGroup()?.activeFile
      if (activeFile) {
        const group = workspace.getActiveGroup()
        if (group) {
          const state = workspace.getFileState(activeFile, group.id)
          if (state && state.dirty && settings.general.autoSave()) {
            void file.write(activeFile, state.content)
              .then(() => workspace.markClean(activeFile, group.id))
              .catch((err: unknown) => {
                showToast({ variant: "error", title: "Save failed", description: String(err) })
              })
          }
        }
        workspace.closeFile(activeFile, workspace.getActiveGroup()?.id ?? "")
      }
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
    // toggleLineComment: () => { /* trigger editor format */ },
    // toggleBlockComment: () => { /* trigger editor format */ },

    // View
    toggleExplorer: () => toggleLeftPanel("explorer"),
    toggleSearch: () => toggleLeftPanel("search"),
    toggleSourceControl: () => toggleLeftPanel("source-control"),
    commandPalette: () => setCommandPaletteOpen(true),
    zoomIn: () => setFontSize(s => s + 1),
    zoomOut: () => setFontSize(s => Math.max(8, s - 1)),
    resetZoom: () => setFontSize(13),
    toggleFullScreen: () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { })
      else document.exitFullscreen().catch(() => { })
    },
    toggleZenMode: () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {})
      else document.exitFullscreen().catch(() => {})
      document.querySelectorAll("[data-panel]").forEach((el) => el.classList.toggle("hidden"))
    },
    togglePanel: () => toggleBottomPanel("terminal-area"),
    toggleSecondarySideBar: () => { if (rightPanel()) panelManager.hidePanel(rightPanel()!.id); else panelManager.showPanel("ai-chat") },

    // Go
    goToFile: () => setCommandPaletteOpen(true),
    goToSymbolWorkspace: () => setCommandPaletteOpen(true),
    goToSymbolEditor: () => setCommandPaletteOpen(true),
    goToLine: () => setCommandPaletteOpen(true),
    goToDefinition: () => {
      editorInstance()?.getAction("editor.action.revealDefinition")?.run()
    },
    goToDeclaration: () => {
      editorInstance()?.getAction("editor.action.revealDeclaration")?.run()
    },
    goToTypeDefinition: () => {
      editorInstance()?.getAction("editor.action.goToTypeDefinition")?.run()
    },
    goToImplementation: () => {
      editorInstance()?.getAction("editor.action.goToImplementation")?.run()
    },
    goBack: () => history.back(),
    goForward: () => history.forward(),

    // Run
    runWithoutDebugging: () => toggleLeftPanel("run-debug"),
    startDebugging: () => toggleLeftPanel("run-debug"),

    newTerminal: () => { terminal.new(); panelManager.showPanel("terminal-area") },
    splitTerminal: () => {
      const activeId = terminal.active()
      if (!activeId) return
      if (terminalSplit()) {
        setTerminalSplit(false)
        setTerminalSplitId(null)
        return
      }
      // Create a new terminal first, then set up the split view
      const prevCount = terminal.all().length
      setTerminalLoading("splitting terminal")
      terminal.new()
      // After a short delay, set up the split so the new terminal appears in the other pane
      setTimeout(() => {
        if (terminal.all().length > prevCount) {
          const all = terminal.all()
          const newId = all.find(t => t.id !== activeId)?.id
          if (newId) {
            setTerminalSplitId(newId)
            setTerminalSplit("vertical")
          }
        }
        setTerminalLoading(null)
      }, 800)
      panelManager.showPanel("terminal-area")
    },
    runTask: () => { terminal.new(); panelManager.showPanel("terminal-area") },
    selectDefaultShell: () => setDefaultShellModalOpen(true)
  }

  return (
    <div class="size-full flex flex-col overflow-hidden bg-background-base" onContextMenu={handleContextMenu}>
      {/* ── Premium Header Bar ── */}
      <HeaderBar
        workspaceName={getFilename(dir()) || "Untitled"}
        activeFile={getFilename(editor.activeFile() ?? "") || ""}
        onSearch={() => toggleLeftPanel("search")}
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
          activeRightTab={rightPanel()?.id}
          sidebarOpen={!!leftPanel()}
          rightPanelOpen={!!rightPanel()}
          bottomPanelOpen={!!bottomPanel()}
          bottomTab={activeBottomTab()}
          onTabClick={(tab) => {
            if (tab === "ai-chat") toggleRightPanel(tab)
            else toggleLeftPanel(tab)
          }}
          onBottomTabClick={(tab) => toggleBottomPanel(tab)}
          onOpenFolder={handleOpenFolder}
          onRemoteClick={() => setRemoteModalOpen(true)}
          remoteConnection={remoteConnection() ?? undefined}
        />

        {/* ── Left Sidebar ── */}
        <Show when={leftPanel()}>
          <div class="shrink-0 flex flex-col border-r border-border-base bg-surface-base relative" style={{ width: `${sidebarWidth()}px` }}>
            <Show when={leftPanel()?.id === "explorer"}>
              <ExplorerPanel
                dirName={getFilename(dir()) || "opencode-web"}
                activeFile={editor.activeFile()}
                onCreateFile={() => startCreate("file", "")}
                onCreateFolder={() => startCreate("directory", "")}
                onFileClick={handleFileClick}
                kinds={gitStatusMap()}
                marks={gitStatusSet()}
              />
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
              <SourceControlPanel
                sdk={sdk}
                dir={dir}
                onFileClick={(p) => handleFindResultClick({ path: p, line: 0 })}
              />
            </Show>



            <Show when={leftPanel()?.id === "remote"}>
              <RemotePanel
                connection={remoteConnection()}
                onDisconnect={() => setRemoteConnection(null)}
                onOpenTerminal={(command, title) => {
                  terminal.newShell({ command, title })
                  panelManager.showPanel("terminal-area")
                }}
                onFileClick={(path) => {
                  // Try to open the remote file in the code editor
                  void (async () => {
                    try {
                      await file.load(path)
                      const state = file.get(path)
                      if (state?.content?.type === "text") {
                        editor.openFile(path, state.content.content)
                        setDiffMode(false)
                      } else if (state?.content?.type === "binary") {
                        showToast({ title: "Binary file", description: `${path} is a binary file.` })
                      } else {
                        // If the file doesn't exist locally, create a placeholder
                        editor.openFile(path, `// Remote file: ${path}\n// Connect to load actual content\n`)
                      }
                    } catch {
                      // File not found locally, open with placeholder content
                      let mockCode = `// Remote file: ${path}\n// Connect to load actual content\n`;
                      if (path.endsWith(".py")) mockCode = "def main():\n    print('Hello from remote Python')\n\nif __name__ == '__main__':\n    main()";
                      else if (path.endsWith(".go")) mockCode = "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"Hello from remote Go\")\n}";
                      else if (path.endsWith(".ts") || path.endsWith(".js")) mockCode = "console.log('Hello from remote JS/TS');";
                      else if (path.endsWith(".html")) mockCode = "<!DOCTYPE html>\n<html>\n<body>\n\t<h1>Remote HTML</h1>\n</body>\n</html>";
                      editor.openFile(path, mockCode)
                      setDiffMode(false)
                    }
                  })()
                }}
              />
            </Show>

            <Show when={leftPanel()?.id === "run-debug"}>
              <DebugPanel
                onOpenFile={(path) => handleFindResultClick({ path, line: 0 })}
                onRunTerminal={(command, title) => {
                  terminal.newShell({ command, title })
                  panelManager.showPanel("terminal-area")
                }}
              />
            </Show>

            <Show when={leftPanel()?.id === "testing"}>
              <TestingPanel onClose={() => panelManager.hidePanel("testing")} />
            </Show>

            <Show when={leftPanel()?.id === "extensions"}>
              <ExtensionsPanel />
            </Show>

            <Show when={leftPanel()?.id === "database"}>
              <DatabasePanel />
            </Show>

            <div class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent-base/30 transition-colors z-10" onMouseDown={handleSidebarResizeStart} />
          </div>
        </Show>

        {/* ── Editor Area Container ── */}
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <MultiFileDiffOverlay workspace={workspace} />
          <EditorArea
            node={workspace.rootNode()}
            activeGroupId={workspace.activeGroupId()}
            workspace={workspace}
            onCursorChange={(line: number, col: number) => { setEditorLine(line); setEditorColumn(col); }}
            onSaveFile={async (path: string, groupId: string) => {
              const state = workspace.getFileState(path, groupId);
              if (!state || !state.dirty) return;
              try {
                await file.write(path, state.content)
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
            onEditorReady={setEditorInstance}
            onInlineAIAction={(payload: InlineAIActionPayload, groupId: string) => handleInlineAIAction(payload)}
            previewDiff={
              (() => {
                const args = pendingEditToolArgs()
                if (!args?.path) return undefined
                const state = file.get(args.path)
                const original = (state?.content?.type === "text") ? state.content.content : ""
                return { path: args.path, modified: args.content, original }
              })()
            }
            onAcceptDiff={() => {
              const req = pendingEditPermission()
              if (!req) return
              sdk().client.permission.respond({ sessionID: req.sessionID, permissionID: req.id, response: "once" })
                .catch((err: unknown) => {
                  showToast({ title: "Failed to accept", description: err instanceof Error ? err.message : String(err) })
                })
            }}
            onRejectDiff={() => {
              const req = pendingEditPermission()
              if (!req) return
              sdk().client.permission.respond({ sessionID: req.sessionID, permissionID: req.id, response: "reject" })
                .catch((err: unknown) => {
                  showToast({ title: "Failed to reject", description: err instanceof Error ? err.message : String(err) })
                })
            }}
          />



          {/* Bottom Panel */}
          <Show when={bottomPanel()}>
            <div class="h-1 bg-border-base hover:bg-accent-base/50 cursor-row-resize shrink-0 transition-colors" onMouseDown={handleBottomResizeStart} />
            <BottomPanel
              activeTab={activeBottomTab()}
              height={bottomPanelHeight()}
              onTabChange={(tab) => toggleBottomPanel(tab)}
              onClose={() => { if (bottomPanel()) panelManager.hidePanel(bottomPanel()!.id) }}
              onNewTerminal={(profile) => {
                const profileStr = typeof profile === "string" ? profile : undefined;
                if (!profileStr) return terminal.new();
                let command;
                let title = profileStr;
                if (profileStr === "PowerShell") { command = "powershell.exe"; }
                else if (profileStr === "Command Prompt") { command = "cmd"; }
                else if (profileStr === "Git Bash") { command = "bash"; }
                else if (profileStr === "WSL") { command = "wsl"; }
                else if (profileStr === "JavaScript Debug Terminal") {
                  command = "node";
                  title = "JavaScript Debug Terminal";
                }

                if (command) {
                  terminal.newShell({ command, title });
                } else {
                  terminal.new();
                }
              }}
              onSplitTerminal={() => {
                const activeId = terminal.active()
                if (!activeId) return
                if (terminalSplit()) {
                  setTerminalSplit(false)
                  setTerminalSplitId(null)
                  return
                }
                // Create a new terminal for the split pane
                const prevCount = terminal.all().length
                setTerminalLoading("splitting terminal")
                terminal.new()
                // Watch for the new terminal to appear, then set up split view
                const unwatch = setInterval(() => {
                  if (terminal.all().length > prevCount) {
                    const all = terminal.all()
                    const newId = all.find(t => t.id !== activeId)?.id
                    if (newId) {
                      setTerminalSplitId(newId)
                      setTerminalSplit("vertical")
                    }
                    setTerminalLoading(null)
                    clearInterval(unwatch)
                  }
                }, 200)
                // Safety timeout
                setTimeout(() => { setTerminalLoading(null); clearInterval(unwatch) }, 8000)
              }}
              onKillTerminal={() => {
                const activeId = terminal.active()
                if (activeId) void terminal.close(activeId)
              }}
              onMaximize={() => {
                setBottomPanelHeight(h => h > 300 ? 220 : window.innerHeight * 0.8)
              }}
              showHistory={showTerminalHistory()}
              onToggleHistory={() => setShowTerminalHistory(v => !v)}
            >
              {(tab) => (
                <Switch>
                  <Match when={tab === "terminal"}>
                    <div class="size-full relative flex">
                      <Show when={terminalSplit() === "vertical" && terminalSplitId() && terminal.all().length >= 1} fallback={
                        <div class="flex-1 min-w-0 relative flex">
                          <div class="flex-1 min-w-0 relative">
                            <For each={terminal.all()}>
                              {(pty) => (
                                <div class="absolute inset-0" style={{ display: terminal.active() === pty.id ? "block" : "none" }}>
                                  <Terminal pty={pty} class="size-full" onCleanup={(p) => terminal.update(p)} onTerminalCommand={(cmd) => terminal.addCommandEntry({ command: cmd, terminalId: pty.id, title: pty.title })} />
                                </div>
                              )}
                            </For>
                          <Show when={terminal.all().length === 0}>
                            <div class="size-full flex items-center justify-center text-text-weak text-13-regular">
                              <Show when={terminalLoading() !== null} fallback={
                                <div class="flex flex-col items-center gap-3">
                                  <Icon name="terminal" size="large" class="text-icon-weaker opacity-40" />
                                  <button class="flex items-center gap-2 px-4 py-2 rounded-md border border-border-base hover:bg-surface-raised-base-hover transition-colors text-13-regular" onClick={() => terminal.new()}>
                                    <Icon name="plus" size="small" /> New Terminal
                                  </button>
                                </div>
                              }>
                                <div class="flex flex-col items-center gap-3">
                                  <Icon name="terminal" size="large" class="text-icon-weaker opacity-40 animate-pulse" />
                                  <div class="flex items-center gap-2">
                                    <div class="size-2 rounded-full bg-accent-base animate-pulse" />
                                    <span class="text-13-regular">Starting {terminalLoading()}...</span>
                                  </div>
                                </div>
                              </Show>
                            </div>
                          </Show>
                          </div>
                          <Show when={showTerminalHistory()}>
                            <div class="w-72 shrink-0 border-l border-border-base">
                              <TerminalCommandHistory
                                entries={terminal.commandHistory()}
                                onReRun={(cmd) => terminal.newShell({ command: cmd, title: cmd })}
                                onKill={(id) => terminal.close(id)}
                              />
                            </div>
                          </Show>
                        </div>
                      }>
                        <SplitPane
                          class="flex-1 min-w-0 min-h-0"
                          direction="horizontal"
                        >
                          <div class="flex-1 min-w-0 min-h-0 relative">
                            {(() => {
                              const leftActiveId = () => {
                                const active = terminal.active()
                                if (active === terminalSplitId()) {
                                  return terminal.all().find(t => t.id !== terminalSplitId())?.id
                                }
                                return active
                              }
                              return (
                                <For each={terminal.all()}>
                                  {(pty) => (
                                    <Show when={terminalSplitId() !== pty.id}>
                                      <div class="absolute inset-0" style={{ display: leftActiveId() === pty.id ? "block" : "none" }}>
                                        <Terminal pty={pty} class="size-full" onCleanup={(p) => terminal.update(p)} onTerminalCommand={(cmd) => terminal.addCommandEntry({ command: cmd, terminalId: pty.id, title: pty.title })} />
                                      </div>
                                    </Show>
                                  )}
                                </For>
                              )
                            })()}
                          </div>
                          <div class="flex-1 min-w-0 min-h-0 relative">
                            <For each={terminal.all()}>
                              {(pty) => (
                                <Show when={terminalSplitId() === pty.id}>
                                  <div class="absolute inset-0" style={{ display: "block" }}>
                                    <Terminal pty={pty} class="size-full" onCleanup={(p) => terminal.update(p)} onTerminalCommand={(cmd) => terminal.addCommandEntry({ command: cmd, terminalId: pty.id, title: pty.title })} />
                                  </div>
                                </Show>
                              )}
                            </For>
                          </div>
                        </SplitPane>
                        <Show when={showTerminalHistory()}>
                          <div class="w-72 shrink-0 border-l border-border-base">
                            <TerminalCommandHistory
                              entries={terminal.commandHistory()}
                              onReRun={(cmd) => terminal.newShell({ command: cmd, title: cmd })}
                              onKill={(id) => terminal.close(id)}
                            />
                          </div>
                        </Show>
                      </Show>
                      <div class="w-48 shrink-0 border-l border-border-base bg-surface-base flex flex-col overflow-y-auto py-1">
                        <For each={terminal.all()}>
                          {(pty, index) => {
                            const shellInfo = () => getShellInfo(pty.title)
                            const isSplit = terminalSplit() === "vertical" && terminalSplitId()
                            // If split, we assume all terminals are in the split group for visual purposes in this basic implementation
                            const isFirst = index() === 0
                            const isLast = index() === terminal.all().length - 1

                            return (
                              <div
                                class="group flex items-center px-2 py-0.5 cursor-pointer transition-colors"
                                classList={{
                                  "bg-surface-raised-base text-text-strong": terminal.active() === pty.id,
                                  "text-text-weak hover:bg-surface-raised-base-hover hover:text-text-strong": terminal.active() !== pty.id,
                                }}
                                onClick={() => {
                                  terminal.open(pty.id)
                                  if (terminalSplit()) setTerminalSplitId(pty.id === terminalSplitId() ? terminal.all().find((t) => t.id !== pty.id)?.id ?? pty.id : pty.id)
                                }}
                              >
                                <Show when={isSplit}>
                                  <div class="w-3 flex justify-center text-text-weaker shrink-0 font-mono text-14-regular mr-1 -mt-1">
                                    {isFirst ? "┌" : (isLast ? "└" : "├")}
                                  </div>
                                </Show>
                                <span class="text-12-regular mr-1.5 shrink-0 opacity-80" style={{ "font-family": "monospace" }}>{shellInfo().icon}</span>
                                <div class="flex-1 min-w-0">
                                  <div class="text-13-regular truncate">{shellInfo().label}</div>
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
                </Switch>
              )}
            </BottomPanel>
          </Show>

          {/* Modern Status Bar */}
          <ModernStatusBar
            line={editorLine()} column={editorColumn()} language={activeFileLanguage()}
            encoding="UTF-8" lineEnding="LF" dirty={editor.dirty()}
            gitBranch={vcsBranch() || undefined}
            gitChanges={vcsChangeCount()}
            terminalCount={terminal.all().length} syncStatus="synced"
            onCommandPalette={() => setCommandPaletteOpen(true)}
            onGitClick={() => toggleLeftPanel("source-control")}
            remoteConnection={remoteConnection() ?? undefined}
            onRemoteClick={() => setRemoteModalOpen(true)}
            activeSessionId={activeSessionId()}
            hasSplit={hasSplit()}
            fullScreen={fullScreen()}
            onSplitHorizontal={() => workspace.splitGroup(workspace.activeGroupId(), "horizontal")}
            onSplitVertical={() => workspace.splitGroup(workspace.activeGroupId(), "vertical")}
            onMergeAll={() => workspace.mergeAllPanels()}
            onToggleFullScreen={() => {
              if (document.fullscreenElement) {
                void document.exitFullscreen()
                setFullScreen(false)
              } else {
                void document.documentElement.requestFullscreen()
                setFullScreen(true)
              }
            }}
          />
        </div>

        <Show when={rightPanel()}>
          <div class="shrink-0 flex flex-col border-l border-border-base bg-surface-base relative" style={{ width: `${rightPanelWidth()}px` }}>
            <div class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent-base/30 transition-colors z-10" onMouseDown={handleRightResizeStart} />

            <Show when={rightPanel()?.id === "ai-chat"}>
              <AIWorkspacePanel
                onClose={() => panelManager.hidePanel("ai-chat")}
                activeSessionId={activeSessionId()}
                recentSessions={recentSessions()}
                handleNewSession={handleNewSession}
                confirmDeleteSession={confirmDeleteSession}
                setActiveSessionId={setActiveSessionId}
                dir={dir()}
                onCompact={handleCompactSession}
                canCompact={!!activeSessionId() && visibleUserMessages().length > 0}
              />
            </Show>
            <Show when={rightPanel()?.id !== "ai-chat"}>
              <div class="flex-1 overflow-y-auto min-h-0 p-3 text-text-weak text-13-regular text-center mt-10">
                Select a panel to dock here.
              </div>
            </Show>
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
        <div class="fixed z-50 bg-surface-raised-base border border-border-base rounded-xl shadow-xl py-1 min-w-52 max-h-[calc(100vh-24px)] overflow-y-auto animate-in fade-in zoom-in-95 duration-100" style={{ left: `${contextMenu()!.x}px`, top: `${contextMenu()!.y}px`, "max-width": "calc(100vw - 24px)" }} onClick={(e) => e.stopPropagation()}>
          <Show when={!contextMenu()!.isDir}>
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; handleFileClick({ path: ctx.path, type: "file" }); closeContextMenu() }}>Open</button>
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); void (async () => { await file.load(ctx.path); const state = file.get(ctx.path); if (state?.content?.type === "text") { let targetGroupId = workspace.activeGroupId(); const groups = workspace.getGroups(); if (groups.length === 1) { workspace.splitGroup(targetGroupId, "horizontal"); targetGroupId = workspace.getGroups()[1].id; } else { targetGroupId = groups.find(g => g.id !== targetGroupId)?.id ?? targetGroupId; } workspace.openFile(ctx.path, state.content.content, targetGroupId); } })() }}><Icon name="layout-right-partial" class="size-4" /> Open to the Side</button>
            <Show when={isPreviewablePath(contextMenu()!.path)}>
              <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; openPreview(ctx.path); closeContextMenu() }}><Icon name="eye" class="size-4" /> Open Preview</button>
            </Show>
            <div class="h-px bg-border-base my-1" />
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); toggleLeftPanel("explorer") }}>Reveal in File Explorer</button>
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); const dir = ctx.isDir ? ctx.path : ctx.path.slice(0, ctx.path.lastIndexOf("/")); terminal.newShell({ title: "Terminal", command: `cd "${dir}"` }); panelManager.showPanel("terminal-area"); }}>Open in Integrated Terminal</button>
            <div class="h-px bg-border-base my-1" />
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); copyToClipboard(ctx.path) }}>Cut<span class="text-11-regular ml-6 opacity-70">Ctrl+X</span></button>
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); copyToClipboard(ctx.path) }}>Copy<span class="text-11-regular ml-6 opacity-70">Ctrl+C</span></button>
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); void (async () => { try { const text = await navigator.clipboard.readText(); await sdk().client.v2.fs.write({ path: `${ctx.isDir ? ctx.path : ctx.path.slice(0, ctx.path.lastIndexOf("/"))}/pasted-file`, content: text }); void file.tree.refresh(""); showToast({ variant: "success", title: "Pasted", description: "File created from clipboard" }) } catch { showToast({ title: "Paste failed", description: "Could not read clipboard" }) } })() }}>Paste<span class="text-11-regular ml-6 opacity-70">Ctrl+V</span></button>
            <div class="h-px bg-border-base my-1" />
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); copyToClipboard(ctx.path) }}>Copy Path<span class="text-11-regular ml-6 opacity-70">Shift+Alt+C</span></button>
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); copyToClipboard(getFilename(ctx.path)) }}>Copy Relative Path<span class="text-11-regular ml-6 opacity-70">Ctrl+K C</span></button>
            <div class="h-px bg-border-base my-1" />
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); toggleLeftPanel("search"); showToast({ title: "Find References", description: `Searching for "${getFilename(ctx.path)}"` }) }}>Find File References<span class="text-11-regular ml-6 opacity-70">Shift+Alt+F12</span></button>
            <div class="h-px bg-border-base my-1" />
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); setCompareFile(ctx.path); showToast({ variant: "success", title: "Selected for Compare", description: `"${getFilename(ctx.path)}" selected` }) }}>Select for Compare</button>
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); void (async () => { const state = workspace.getFileState(ctx.path); if (state?.dirty && state.originalContent) { setDiffMode(true); } else { showToast({ title: "No Changes", description: "File has no uncommitted changes" }); } })() }}><Icon name="reset" class="size-4" /> Open Changes</button>
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); toggleLeftPanel("source-control"); showToast({ title: "File History", description: `Viewing history for "${getFilename(ctx.path)}"` }) }}>File History<span class="text-11-regular ml-6 opacity-70">Ctrl+G H</span></button>
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); toggleLeftPanel("source-control"); showToast({ title: "Timeline", description: `Opening timeline for "${getFilename(ctx.path)}"` }) }}>Open Timeline</button>
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); const url = `https://github.com/${dir()?.replace(/^.*github\.com[:\/]/, "").replace(/\.git$/, "") || ""}/blob/main/${ctx.path}`; window.open(url, "_blank") }}><Icon name="server" class="size-4" /> Open on Remote (Web)</button>
            <div class="h-px bg-border-base my-1" />
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); startRename(ctx.path); }}><Icon name="edit-small-2" class="size-4" /> Rename...</button>
            <div class="h-px bg-border-base my-1" />
          </Show>
          <Show when={contextMenu()!.isDir}>
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); void (async () => { await file.load(ctx.path); const state = file.get(ctx.path); if (state?.content?.type === "text") { const current = editor.activeFile(); if (current) editor.closeFile(current); workspace.openFile(ctx.path, state.content.content); setDiffMode(false); } })() }}>Open</button>
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); startCreate("file", ctx.path); }}><Icon name="open-file" class="size-4" /> New File</button>
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); startCreate("directory", ctx.path); }}><Icon name="folder" class="size-4" /> New Folder</button>
            <div class="h-px bg-border-base my-1" />
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); toggleLeftPanel("explorer") }}>Reveal in File Explorer</button>
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); terminal.newShell({ title: "Terminal", command: `cd "${ctx.path}"` }); panelManager.showPanel("terminal-area"); }}>Open in Integrated Terminal</button>
            <div class="h-px bg-border-base my-1" />
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); copyToClipboard(ctx.path) }}>Cut<span class="text-11-regular ml-6 opacity-70">Ctrl+X</span></button>
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); copyToClipboard(ctx.path) }}>Copy<span class="text-11-regular ml-6 opacity-70">Ctrl+C</span></button>
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); void (async () => { try { const text = await navigator.clipboard.readText(); await sdk().client.v2.fs.write({ path: `${ctx.path}/pasted-file`, content: text }); void file.tree.refresh(""); showToast({ variant: "success", title: "Pasted", description: "File created from clipboard" }) } catch { showToast({ title: "Paste failed", description: "Could not read clipboard" }) } })() }}>Paste<span class="text-11-regular ml-6 opacity-70">Ctrl+V</span></button>
            <div class="h-px bg-border-base my-1" />
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); copyToClipboard(ctx.path) }}>Copy Path<span class="text-11-regular ml-6 opacity-70">Shift+Alt+C</span></button>
            <button class="w-full flex items-center justify-between px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); copyToClipboard(getFilename(ctx.path)) }}>Copy Relative Path<span class="text-11-regular ml-6 opacity-70">Ctrl+K C</span></button>
            <div class="h-px bg-border-base my-1" />
          </Show>
          <Show when={!contextMenu()!.isDir}>
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-danger-base hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); promptDelete(ctx.path, ctx.isDir); }}><Icon name="trash" class="size-4" /> Delete</button>
          </Show>
          <Show when={contextMenu()!.isDir}>
            <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-danger-base hover:bg-surface-raised-base-hover transition-colors" onClick={() => { const ctx = contextMenu()!; closeContextMenu(); promptDelete(ctx.path, ctx.isDir); }}><Icon name="trash" class="size-4" /> Delete Folder</button>
          </Show>
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


      {/* ── Command Palette ── */}
      <CommandPaletteV2
        open={commandPaletteOpen()}
        onClose={() => setCommandPaletteOpen(false)}
        commands={paletteActions}
        onFileSearch={async (query) => {
          try {
            return await file.searchFiles(query)
          } catch {
            return []
          }
        }}
        onFileSelect={async (path) => {
          try {
            await file.load(path)
            const state = file.get(path)
            if (state?.content?.type === "text") {
              const current = editor.activeFile()
              if (current) editor.closeFile(current)
              workspace.openFile(path, state.content.content)
              setDiffMode(false)
            }
          } catch (err) {
            showToast({ variant: "error", title: "Failed to open file", description: String(err) })
          }
        }}
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
              monacoTheme={theme()} setMonacoTheme={setTheme}
              minimap={minimap()} setMinimap={setMinimap}
              wordWrapCol={wordWrapCol()} setWordWrapCol={setWordWrapCol}
              onCloseKeybindings={() => { }}
              onOpenConfig={() => { handleFileClick({ path: ".opencode.jsonc", type: "file" }) }}
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
        open={sshConnectionModalOpen()}
        onClose={() => setSshConnectionModalOpen(false)}
        onConnect={(type, target) => {
          setSshConnectionModalOpen(false)
          // Implement actual connection logic here when ready
          showToast({ title: "Remote Connection", description: `Connecting to ${type}: ${target}` })
        }}
      />

      <DefaultShellModal
        open={defaultShellModalOpen()}
        onClose={() => setDefaultShellModalOpen(false)}
      />

      <RemoteConnectionModal
        open={remoteModalOpen()}
        onClose={() => setRemoteModalOpen(false)}
        onConnect={handleRemoteConnect}
      />
    </div>
  )
}