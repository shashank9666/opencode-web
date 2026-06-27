import { createSignal, createMemo, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { showToast } from "@/utils/toast"
import {
  getExtensions,
  installExtension,
  uninstallExtension,
  toggleExtension,
  type ThirdPartyExtension,
} from "@/utils/extensions"

// ── Extension types ──

interface Extension {
  id: string
  name: string
  description: string
  publisher: string
  version: string
  downloads: number
  rating: number
  installed: boolean
  enabled: boolean
  category: string
  icon?: string
  readme?: string
  lastUpdated?: string
  isThirdParty?: boolean
}

type ExtensionCategory = "all" | "ui" | "git" | "debug" | "language" | "linting" | "ai" | "theme" | "third-party"

// ── Convert third-party extensions to Extension format ──

function thirdPartyToExtension(tp: ThirdPartyExtension): Extension {
  return {
    id: tp.id,
    name: tp.name,
    description: tp.description,
    publisher: tp.publisher,
    version: tp.version,
    downloads: Math.floor(Math.random() * 50000) + 1000,
    rating: 4.0 + Math.random() * 0.9,
    installed: tp.installed,
    enabled: tp.enabled,
    category: tp.category,
    isThirdParty: true,
  }
}

// ── Built-in extensions ──

const BUILT_IN_EXTENSIONS: Extension[] = [
  {
    id: "builtin-explorer", name: "File Explorer", description: "Full-featured file explorer with create, rename, delete, and context menus",
    publisher: "OpenCode", version: "1.0.0", downloads: 100000, rating: 4.8, installed: true, enabled: true, category: "ui",
  },
  {
    id: "builtin-search", name: "Search Explorer", description: "Advanced search with regex, case-sensitive, whole-word, include/exclude patterns",
    publisher: "OpenCode", version: "1.0.0", downloads: 95000, rating: 4.7, installed: true, enabled: true, category: "ui",
  },
  {
    id: "builtin-git", name: "Git Integration", description: "Source control management with git status, diff view, commit, and branch management",
    publisher: "OpenCode", version: "1.0.0", downloads: 90000, rating: 4.9, installed: true, enabled: true, category: "git",
  },
  {
    id: "builtin-terminal", name: "Integrated Terminal", description: "Terminal emulator with split view, multiple shell profiles, and PTY support",
    publisher: "OpenCode", version: "1.0.0", downloads: 92000, rating: 4.8, installed: true, enabled: true, category: "ui",
  },
  {
    id: "builtin-problems", name: "Problems Panel", description: "Shows errors, warnings, and information from LSP and linters",
    publisher: "OpenCode", version: "1.0.0", downloads: 88000, rating: 4.6, installed: true, enabled: true, category: "ui",
  },
  {
    id: "builtin-editor-tabs", name: "Editor Tabs", description: "Multi-tab editor with split groups and drag-and-drop",
    publisher: "OpenCode", version: "1.0.0", downloads: 91000, rating: 4.7, installed: true, enabled: true, category: "ui",
  },
  {
    id: "builtin-cmdpalette", name: "Command Palette", description: "Quick access to all commands, files, and settings",
    publisher: "OpenCode", version: "1.0.0", downloads: 93000, rating: 4.8, installed: true, enabled: true, category: "ui",
  },
  {
    id: "builtin-prettier", name: "Prettier", description: "Code formatter for JavaScript, TypeScript, CSS, HTML, and more",
    publisher: "OpenCode", version: "1.0.0", downloads: 87000, rating: 4.5, installed: true, enabled: true, category: "linting",
  },
  {
    id: "builtin-eslint", name: "ESLint", description: "JavaScript/TypeScript linting with auto-fix support",
    publisher: "OpenCode", version: "1.0.0", downloads: 86000, rating: 4.5, installed: true, enabled: true, category: "linting",
  },
  {
    id: "builtin-tailwind", name: "Tailwind IntelliSense", description: "Tailwind CSS autocomplete, linting, and hover previews",
    publisher: "OpenCode", version: "1.0.0", downloads: 82000, rating: 4.6, installed: true, enabled: true, category: "language",
  },
  {
    id: "builtin-path-intel", name: "Path IntelliSense", description: "Autocompletes filenames and paths in your code",
    publisher: "OpenCode", version: "1.0.0", downloads: 80000, rating: 4.4, installed: true, enabled: true, category: "language",
  },
  {
    id: "builtin-error-lens", name: "Error Lens", description: "Inline error/warning display in the editor gutter and inline",
    publisher: "OpenCode", version: "1.0.0", downloads: 78000, rating: 4.7, installed: true, enabled: true, category: "ui",
  },
  {
    id: "builtin-ai-chat", name: "AI Chat", description: "AI-powered coding assistant with multi-provider LLM support",
    publisher: "OpenCode", version: "1.0.0", downloads: 95000, rating: 4.9, installed: true, enabled: true, category: "ai",
  },
  {
    id: "builtin-ai-completion", name: "AI Completion", description: "Intelligent code completion powered by AI models",
    publisher: "OpenCode", version: "1.0.0", downloads: 94000, rating: 4.8, installed: true, enabled: true, category: "ai",
  },
  {
    id: "builtin-ai-actions", name: "AI Actions", description: "Context-aware AI actions: explain, refactor, fix, test, document",
    publisher: "OpenCode", version: "1.0.0", downloads: 89000, rating: 4.7, installed: true, enabled: true, category: "ai",
  },
  {
    id: "builtin-git-graph", name: "Git Graph", description: "Visual git history graph with branch and commit visualization",
    publisher: "OpenCode", version: "1.0.0", downloads: 75000, rating: 4.5, installed: true, enabled: true, category: "git",
  },
  {
    id: "builtin-npm-scripts", name: "NPM Scripts", description: "Run, debug, and manage npm scripts from the sidebar",
    publisher: "OpenCode", version: "1.0.0", downloads: 71000, rating: 4.3, installed: true, enabled: true, category: "ui",
  },
  // Marketplace extensions (not installed)
  {
    id: "ext-import-cost", name: "Import Cost", description: "Display the size of imported packages inline in the editor",
    publisher: "Wix", version: "3.0.0", downloads: 45000, rating: 4.4, installed: false, enabled: false, category: "language",
  },
  {
    id: "ext-npm-intellisense", name: "npm Intellisense", description: "Autocompletes npm modules in import statements",
    publisher: "Christian Kohler", version: "1.4.0", downloads: 52000, rating: 4.5, installed: false, enabled: false, category: "language",
  },
  {
    id: "ext-rainbow-csv", name: "Rainbow CSV", description: "Highlight CSV/TSV/PSV files with per-column colors",
    publisher: "mechatroner", version: "3.0.0", downloads: 38000, rating: 4.3, installed: false, enabled: false, category: "language",
  },
  {
    id: "ext-color-highlight", name: "Color Highlight", description: "Highlight colors in the editor with inline color previews",
    publisher: "sergiirocks", version: "2.6.0", downloads: 41000, rating: 4.2, installed: false, enabled: false, category: "ui",
  },
  {
    id: "ext-auto-rename-tag", name: "Auto Rename Tag", description: "Auto rename paired HTML/XML tag",
    publisher: "Jun Han", version: "1.0.0", downloads: 48000, rating: 4.6, installed: false, enabled: false, category: "language",
  },
  {
    "id": "ext-bracket-pair", name: "Bracket Pair Colorizer", description: "Colorize matching brackets for easier code reading",
    publisher: "CoenraadS", version: "1.0.0", downloads: 43000, rating: 4.3, installed: false, enabled: false, category: "ui",
  },
  {
    id: "ext-gitlens", name: "GitLens", description: "Supercharge Git with blame, history, and code authorship insights",
    publisher: "GitKraken", version: "14.0.0", downloads: 62000, rating: 4.8, installed: false, enabled: false, category: "git",
  },
  {
    id: "ext-copilot", name: "GitHub Copilot", description: "AI pair programmer with code suggestions and chat",
    publisher: "GitHub", version: "1.0.0", downloads: 58000, rating: 4.7, installed: false, enabled: false, category: "ai",
  },
  {
    id: "ext-python", name: "Python", description: "Python language support with IntelliSense, linting, and debugging",
    publisher: "Microsoft", version: "2024.0.0", downloads: 65000, rating: 4.8, installed: false, enabled: false, category: "language",
  },
  {
    id: "ext-go", name: "Go", description: "Go language support with gopls, debugging, and testing",
    publisher: "Google", version: "1.0.0", downloads: 54000, rating: 4.7, installed: false, enabled: false, category: "language",
  },
  {
    id: "ext-rust-analyzer", name: "rust-analyzer", description: "Rust language support with advanced code analysis",
    publisher: "rust-lang", version: "1.0.0", downloads: 49000, rating: 4.8, installed: false, enabled: false, category: "language",
  },
]

const CATEGORIES: { id: ExtensionCategory; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "grid" },
  { id: "ui", label: "UI", icon: "window" },
  { id: "git", label: "Git", icon: "branch" },
  { id: "debug", label: "Debug", icon: "bug" },
  { id: "language", label: "Language", icon: "code" },
  { id: "linting", label: "Linting", icon: "circle-check" },
  { id: "ai", label: "AI", icon: "brain" },
  { id: "theme", label: "Theme", icon: "paint-bucket" },
  { id: "third-party", label: "Third Party", icon: "box" },
]

// ── Installed state (persisted) ──

const STORAGE_KEY = "opencode-extensions"

function loadInstalled(): Record<string, { installed: boolean; enabled: boolean }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function saveInstalled(state: Record<string, { installed: boolean; enabled: boolean }>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// ── Main Panel ──

export default function ExtensionsPanel() {
  const [searchQuery, setSearchQuery] = createSignal("")
  const [selectedCategory, setSelectedCategory] = createSignal<ExtensionCategory>("all")
  const [showInstalled, setShowInstalled] = createSignal(false)
  const [selectedExt, setSelectedExt] = createSignal<Extension | null>(null)
  const [extensionState, setExtensionState] = createSignal(loadInstalled())

  const getExtState = (id: string) => extensionState()[id]

  const filtered = createMemo(() => {
    const cat = selectedCategory()
    let list: Extension[]

    if (cat === "third-party") {
      // Show third-party extensions from the registry
      list = getExtensions().map(thirdPartyToExtension)
    } else {
      list = BUILT_IN_EXTENSIONS
      if (cat !== "all") list = list.filter(e => e.category === cat)
    }

    const q = searchQuery().toLowerCase().trim()
    const installed = showInstalled()

    if (installed) list = list.filter(e => {
      const state = getExtState(e.id)
      return state?.installed ?? e.installed
    })
    if (q) {
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.publisher.toLowerCase().includes(q)
      )
    }
    return list
  })

  const installedCount = createMemo(() =>
    BUILT_IN_EXTENSIONS.filter(e => {
      const state = getExtState(e.id)
      return state?.installed ?? e.installed
    }).length
  )

  const toggleInstall = (ext: Extension) => {
    if (ext.isThirdParty) {
      // Third-party extensions use the dedicated system
      const tp = getExtensions().find(e => e.id === ext.id)
      if (tp) {
        if (tp.installed) {
          uninstallExtension(ext.id)
          showToast({ title: "Extension Uninstalled", description: `${ext.name} has been uninstalled.` })
        } else {
          installExtension(ext.id)
          showToast({ title: "Extension Installed", description: `${ext.name} has been installed successfully.` })
        }
      }
      return
    }

    const current = getExtState(ext.id)
    const wasInstalled = current?.installed ?? ext.installed
    const newState = { ...extensionState() }

    if (wasInstalled) {
      newState[ext.id] = { installed: false, enabled: false }
      showToast({ title: "Extension Uninstalled", description: `${ext.name} has been uninstalled.` })
    } else {
      newState[ext.id] = { installed: true, enabled: true }
      showToast({ title: "Extension Installed", description: `${ext.name} has been installed successfully.` })
    }

    setExtensionState(newState)
    saveInstalled(newState)
  }

  const toggleEnabled = (ext: Extension) => {
    if (ext.isThirdParty) {
      const tp = getExtensions().find(e => e.id === ext.id)
      if (tp?.installed) {
        toggleExtension(ext.id)
        showToast({
          title: tp.enabled ? "Extension Enabled" : "Extension Disabled",
          description: `${ext.name} has been ${tp.enabled ? "enabled" : "disabled"}.`,
        })
      }
      return
    }

    const current = getExtState(ext.id)
    const isInstalled = current?.installed ?? ext.installed
    if (!isInstalled) return

    const newState = { ...extensionState() }
    const wasEnabled = current?.enabled ?? ext.enabled
    newState[ext.id] = { installed: true, enabled: !wasEnabled }
    setExtensionState(newState)
    saveInstalled(newState)

    showToast({
      title: wasEnabled ? "Extension Disabled" : "Extension Enabled",
      description: `${ext.name} has been ${wasEnabled ? "disabled" : "enabled"}.`,
    })
  }

  const formatDownloads = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return String(n)
  }

  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= Math.round(rating) ? "★" : "☆")
    }
    return stars.join("")
  }

  return (
    <div class="size-full flex flex-col">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-base shrink-0">
        <div class="flex items-center gap-2">
          <span class="text-12-medium text-text-weak uppercase tracking-wider">EXTENSIONS</span>
          <span class="text-11-regular text-text-weaker">({installedCount()} installed)</span>
        </div>
        <div class="flex items-center gap-1">
          <Tooltip value="Show Installed" placement="bottom">
            <IconButton
              icon="circle-check"
              variant={showInstalled() ? "primary" : "ghost"}
              size="small"
              class="size-6 rounded-md"
              onClick={() => setShowInstalled(!showInstalled())}
              aria-label="Show Installed"
            />
          </Tooltip>
        </div>
      </div>

      {/* Search */}
      <div class="p-2 border-b border-border-base shrink-0">
        <div class="relative">
          <input
            type="text"
            class="w-full pl-7 pr-2 py-1.5 text-13-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong"
            placeholder="Search extensions..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
          <Icon name="magnifying-glass" size="small" class="absolute left-2 top-1/2 -translate-y-1/2 text-icon-weak pointer-events-none" />
        </div>
      </div>

      {/* Category tabs */}
      <div class="flex items-center gap-0.5 px-2 py-1.5 border-b border-border-base shrink-0 overflow-x-auto">
        <For each={CATEGORIES}>
          {(cat) => (
            <button
              type="button"
              class="px-2 py-1 text-11-medium rounded transition-colors shrink-0"
              classList={{
                "bg-accent-base text-white": selectedCategory() === cat.id,
                "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": selectedCategory() !== cat.id,
              }}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          )}
        </For>
      </div>

      {/* Extension detail view */}
      <Show when={selectedExt()}>
        {(ext) => (
          <div class="flex-1 flex flex-col min-h-0">
            <div class="flex items-center justify-between px-3 py-2 border-b border-border-base shrink-0">
              <div class="flex items-center gap-2 min-w-0">
                <IconButton icon="arrow-left" variant="ghost" size="small" class="size-5" onClick={() => setSelectedExt(null)} />
                <span class="text-13-medium text-text-strong truncate">{ext().name}</span>
                <span class="text-11-regular text-text-weaker">{ext().publisher}</span>
              </div>
              <div class="flex items-center gap-1">
                <Show when={(getExtState(ext().id)?.installed ?? ext().installed)}>
                  <Tooltip value={(getExtState(ext().id)?.enabled ?? ext().enabled) ? "Disable" : "Enable"} placement="bottom">
                    <IconButton
                      icon={(getExtState(ext().id)?.enabled ?? ext().enabled) ? "circle-check" : "circle-ban-sign"}
                      variant="ghost"
                      size="small"
                      class="size-6 rounded"
                      onClick={() => toggleEnabled(ext())}
                      aria-label={(getExtState(ext().id)?.enabled ?? ext().enabled) ? "Disable" : "Enable"}
                    />
                  </Tooltip>
                </Show>
                <button
                  type="button"
                  class="px-3 py-1 text-13-medium rounded transition-colors"
                  classList={{
                    "bg-accent-base text-white hover:bg-accent-base-hover": !(getExtState(ext().id)?.installed ?? ext().installed),
                    "bg-text-danger-base/10 text-text-danger-base hover:bg-text-danger-base/20": (getExtState(ext().id)?.installed ?? ext().installed),
                  }}
                  onClick={() => toggleInstall(ext())}
                >
                  {(getExtState(ext().id)?.installed ?? ext().installed) ? "Uninstall" : "Install"}
                </button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto p-3 space-y-3">
              <div class="flex items-center gap-4 text-12-regular text-text-weaker">
                <span class="text-text-warning-base">{renderStars(ext().rating)}</span>
                <span>{formatDownloads(ext().downloads)} downloads</span>
                <span>v{ext().version}</span>
              </div>
              <p class="text-13-regular text-text-weak">{ext().description}</p>
              <div class="text-12-regular text-text-weaker">
                <span class="text-text-weak">Category: </span>
                <span class="text-text-strong capitalize">{ext().category}</span>
              </div>
            </div>
          </div>
        )}
      </Show>

      {/* Extension list */}
      <Show when={!selectedExt()}>
        <div class="flex-1 overflow-y-auto min-h-0">
          <Show
            when={filtered().length > 0}
            fallback={
              <div class="flex flex-col items-center justify-center py-8 text-13-regular text-text-weaker gap-2 px-4 text-center">
                <Icon name="sliders" size="large" class="text-icon-weaker opacity-40" />
                <span>No extensions found</span>
                <Show when={searchQuery()}>
                  <span class="text-12-regular">Try a different search term</span>
                </Show>
              </div>
            }
          >
            <For each={filtered()}>
              {(ext) => {
                const state = () => getExtState(ext.id)
                const isInstalled = () => state()?.installed ?? ext.installed
                const isEnabled = () => state()?.enabled ?? ext.enabled

                return (
                  <div
                    class="flex items-start gap-3 px-3 py-2 hover:bg-surface-raised-base-hover transition-colors cursor-pointer border-b border-border-base/50"
                    onClick={() => setSelectedExt(ext)}
                  >
                    <div
                      class="size-10 shrink-0 rounded-md flex items-center justify-center text-15-medium font-bold"
                      classList={{
                        "bg-accent-base/10 text-accent-base": ext.category === "ai",
                        "bg-[#f97316]/10 text-[#f97316]": ext.category === "git",
                        "bg-[#3b82f6]/10 text-[#3b82f6]": ext.category === "ui",
                        "bg-[#8b5cf6]/10 text-[#8b5cf6]": ext.category === "language",
                        "bg-[#10b981]/10 text-[#10b981]": ext.category === "linting",
                        "bg-[#ef4444]/10 text-[#ef4444]": ext.category === "debug",
                        "bg-[#f59e0b]/10 text-[#f59e0b]": ext.category === "theme",
                      }}
                    >
                      {ext.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-13-medium text-text-strong truncate">{ext.name}</span>
                        <Show when={isInstalled()}>
                          <span class="text-10-medium text-text-success-base bg-text-success-base/10 px-1.5 py-0.5 rounded">Installed</span>
                        </Show>
                      </div>
                      <div class="text-12-regular text-text-weaker truncate">{ext.publisher} · v{ext.version}</div>
                      <div class="text-12-regular text-text-weak line-clamp-2 mt-0.5">{ext.description}</div>
                      <div class="flex items-center gap-3 mt-1 text-11-regular text-text-weaker">
                        <span class="text-text-warning-base">{renderStars(ext.rating)}</span>
                        <span>{formatDownloads(ext.downloads)}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Show when={isInstalled()}>
                        <Tooltip value={isEnabled() ? "Disable" : "Enable"} placement="bottom">
                          <IconButton
                            icon={isEnabled() ? "circle-check" : "circle-ban-sign"}
                            variant="ghost"
                            size="small"
                            class="size-6 rounded"
                            onClick={() => toggleEnabled(ext)}
                            aria-label={isEnabled() ? "Disable" : "Enable"}
                          />
                        </Tooltip>
                        <Tooltip value="Uninstall" placement="bottom">
                          <IconButton
                            icon="trash"
                            variant="ghost"
                            size="small"
                            class="size-6 rounded"
                            onClick={() => toggleInstall(ext)}
                            aria-label="Uninstall"
                          />
                        </Tooltip>
                      </Show>
                      <Show when={!isInstalled()}>
                        <button
                          type="button"
                          class="px-3 py-1 text-12-medium bg-accent-base text-white rounded-md hover:bg-accent-base-hover transition-colors"
                          onClick={() => toggleInstall(ext)}
                        >
                          Install
                        </button>
                      </Show>
                    </div>
                  </div>
                )
              }}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  )
}
