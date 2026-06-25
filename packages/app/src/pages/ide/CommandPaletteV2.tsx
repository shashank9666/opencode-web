import { createEffect, createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"

type CommandCategory = "files" | "editor" | "view" | "ai" | "git" | "terminal" | "settings" | "workspace" | "recent"

interface PaletteAction {
  id: string
  title: string
  description?: string
  category: CommandCategory
  keybind?: string
  icon?: string
  onSelect: () => void
}

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  files: "Files",
  editor: "Editor",
  view: "View",
  ai: "AI",
  git: "Git",
  terminal: "Terminal",
  settings: "Settings",
  workspace: "Workspace",
  recent: "Recently Used",
}

const CATEGORY_ICONS: Record<CommandCategory, string> = {
  files: "open-file",
  editor: "code",
  view: "sidebar",
  ai: "brain",
  git: "branch",
  terminal: "terminal",
  settings: "settings-gear",
  workspace: "layout-left",
  recent: "clock",
}

// Recent commands persistence
const RECENT_KEY = "opencode-palette-recent"
function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}
function saveRecent(ids: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 20)))
}

export default function CommandPaletteV2(props: {
  open: boolean
  onClose: () => void
  commands: PaletteAction[]
  onSearch?: (query: string) => void
  onFileSearch?: (query: string) => Promise<string[]>
  onFileSelect?: (path: string) => void
  onGoToLine?: (line: number) => void
}) {
  const [query, setQuery] = createSignal("")
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [mode, setMode] = createSignal<"commands" | "files">("commands")
  const [fileResults, setFileResults] = createSignal<string[]>([])
  const [searching, setSearching] = createSignal(false)
  const [pinned, setPinned] = createSignal<Set<string>>(new Set())
  const [recentIds, setRecentIds] = createSignal<string[]>(loadRecent())
  let inputRef: HTMLInputElement | undefined
  let listRef: HTMLDivElement | undefined
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  createEffect(() => {
    try {
      const raw = localStorage.getItem("opencode-palette-pins")
      if (raw) setPinned(new Set(JSON.parse(raw) as string[]))
    } catch {}
  })

  // Track recently used commands
  const trackRecent = (id: string) => {
    setRecentIds(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, 20)
      saveRecent(next)
      return next
    })
  }

  const togglePin = (id: string) => {
    setPinned((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem("opencode-palette-pins", JSON.stringify([...next]))
      return next
    })
  }

  const filtered = createMemo(() => {
    if (mode() === "files") return []
    const q = query().toLowerCase().trim()

    // Detect line number mode: ":42", "#42", or just "42"
    const lineMatch = query().trim().match(/^[:#]?(\d+)$/)
    if (lineMatch && props.onGoToLine) {
      const lineNum = parseInt(lineMatch[1], 10)
      const goLine: PaletteAction = {
        id: "goToLine",
        title: `Go to Line ${lineNum}`,
        description: `Navigate to line ${lineNum} in the active editor`,
        category: "editor" as CommandCategory,
        icon: "arrow-down",
        onSelect: () => props.onGoToLine!(lineNum),
      }
      return [goLine]
    }

    // Filter out "goToLine" when not in line mode
    const baseCmds = props.commands.filter(cmd => cmd.id !== "goToLine")

    const cmds = !q ? baseCmds : baseCmds.filter((cmd) => {
      const title = cmd.title.toLowerCase()
      const desc = cmd.description?.toLowerCase() ?? ""
      const cat = CATEGORY_LABELS[cmd.category].toLowerCase()
      return title.includes(q) || desc.includes(q) || cat.includes(q)
    })

    // When no query, show recent commands first
    if (!q) {
      const recentSet = new Set(recentIds())
      const recentCmds = baseCmds.filter(cmd => recentSet.has(cmd.id)).slice(0, 5)
      if (recentCmds.length > 0) {
        return [...recentCmds, ...cmds.filter(cmd => !recentSet.has(cmd.id))]
      }
    }

    return cmds.slice(0, 50)
  })

  const grouped = createMemo(() => {
    const pinSet = pinned()
    const recentSet = new Set(recentIds())
    const pinGroup: PaletteAction[] = []
    const recentGroup: PaletteAction[] = []
    const normalGroups = new Map<CommandCategory, PaletteAction[]>()
    const q = query().toLowerCase().trim()
    const lineMatch = query().trim().match(/^[:#]?(\d+)$/)

    for (const cmd of filtered()) {
      if (lineMatch) {
        // Go-to-line mode: flat list, no grouping
        const existing = normalGroups.get(cmd.category) ?? []
        existing.push(cmd)
        normalGroups.set(cmd.category, existing)
      } else if (pinSet.has(cmd.id)) {
        pinGroup.push(cmd)
      } else if (!q && recentSet.has(cmd.id)) {
        recentGroup.push(cmd)
      } else {
        const existing = normalGroups.get(cmd.category) ?? []
        existing.push(cmd)
        normalGroups.set(cmd.category, existing)
      }
    }
    const result: [string, CommandCategory, PaletteAction[]][] = []
    if (pinGroup.length > 0) result.push(["Pinned", "files" as CommandCategory, pinGroup])
    if (recentGroup.length > 0 && q) result.push(["Recently Used", "recent" as CommandCategory, recentGroup])
    for (const [cat, cmds] of normalGroups) {
      result.push([CATEGORY_LABELS[cat], cat, cmds])
    }
    return result
  })

  const executeSelected = () => {
    if (mode() === "commands") {
      const cmd = filtered()[selectedIndex()]
      if (cmd) {
        trackRecent(cmd.id)
        props.onClose()
        cmd.onSelect()
      }
    }
  }

  createEffect(() => {
    if (props.open) {
      setSelectedIndex(0)
      setQuery("")
      setMode("commands")
      setFileResults([])
      setTimeout(() => inputRef?.focus(), 50)
    }
  })

  createEffect(() => {
    const idx = selectedIndex()
    if (!listRef) return
    const items = listRef.querySelectorAll("[data-command-item]")
    const el = items[idx] as HTMLElement | undefined
    if (el) el.scrollIntoView({ block: "nearest" })
  })

  const handleQueryInput = (value: string) => {
    setQuery(value)
    setSelectedIndex(0)
    props.onSearch?.(value)

    // Detect line number mode: ":42" or "42"
    const lineMatch = value.trim().match(/^[:#]?(\d+)$/)
    if (lineMatch && props.onGoToLine) {
      // Stay in commands mode, show a "Go to Line" item
      setMode("commands")
      setFileResults([])
      return
    }

    if (mode() !== "files" || !props.onFileSearch) return

    clearTimeout(searchTimer)
    if (!value.trim()) {
      setFileResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    searchTimer = setTimeout(async () => {
      try {
        const results = await props.onFileSearch!(value)
        if (query() === value) {
          setFileResults(results)
        }
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    }, 150)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const maxIndex = mode() === "files" ? fileResults().length - 1 : filtered().length - 1
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(Math.min(selectedIndex() + 1, maxIndex < 0 ? 0 : maxIndex))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(Math.max(selectedIndex() - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (mode() === "files") {
        const file = fileResults()[selectedIndex()]
        if (file) {
          props.onClose()
          props.onFileSelect?.(file)
        }
      } else {
        executeSelected()
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      props.onClose()
    }
  }

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/40"
        onClick={props.onClose}
      >
        <div
          class="w-[640px] max-w-[90vw] bg-surface-raised-base border border-border-base rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 ease-out"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search header */}
          <div class="flex items-center gap-3 px-4 py-3 border-b border-border-base">
            <Icon name="magnifying-glass-menu" size="normal" class="text-icon-weak shrink-0" />
            <input
              ref={inputRef}
              type="text"
              class="flex-1 bg-transparent text-14-regular text-text-strong outline-none placeholder:text-text-weaker"
              placeholder={mode() === "files" ? "Search files by name..." : "Search commands, files, symbols..."}
              value={query()}
              onInput={(e) => handleQueryInput(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
            />
            <Show when={query()}>
              <button
                type="button"
                class="size-6 flex items-center justify-center rounded-md hover:bg-surface-raised-base-hover transition-colors"
                onClick={() => setQuery("")}
              >
                <Icon name="close" size="small" class="text-icon-weak" />
              </button>
            </Show>
          </div>

          {/* Mode switcher */}
          <div class="flex items-center gap-1 px-3 py-1.5 border-b border-border-base bg-surface-base/50">
            <button
              type="button"
              class="px-2.5 py-1 text-12-regular rounded-md transition-colors"
              classList={{
                "bg-background-base text-text-strong": mode() === "commands",
                "text-text-weaker hover:text-text-weak": mode() !== "commands",
              }}
              onClick={() => { setMode("commands"); setQuery(""); setFileResults([]) }}
            >
              Commands
            </button>
            <button
              type="button"
              class="px-2.5 py-1 text-12-regular rounded-md transition-colors"
              classList={{
                "bg-background-base text-text-strong": mode() === "files",
                "text-text-weaker hover:text-text-weak": mode() !== "files",
              }}
              onClick={() => { setMode("files"); setQuery(""); setFileResults([]) }}
            >
              Files
            </button>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            class="max-h-[420px] overflow-y-auto py-2"
            onKeyDown={handleKeyDown}
          >
            <Show
              when={mode() === "files" ? fileResults().length > 0 : filtered().length > 0}
              fallback={
                <div class="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <Icon name="magnifying-glass-menu" size="large" class="text-icon-weaker opacity-30" />
                  <div class="text-13-regular text-text-weaker">
                    {mode() === "files"
                      ? (query() ? (searching() ? "Searching..." : "No matching files") : "Type a file name to search")
                      : (query() ? "No matching commands" : "Type a command name")}
                  </div>
                </div>
              }
            >
              <Switch>
                <Match when={mode() === "files"}>
                  <For each={fileResults()}>
                    {(file, i) => {
                      const isSelected = () => i() === selectedIndex()
                      return (
                        <div
                          data-command-item
                          class="flex items-center gap-3 px-4 py-2 mx-2 rounded-lg cursor-pointer transition-colors"
                          classList={{
                            "bg-accent-base/10 text-text-strong": isSelected(),
                            "text-text-base hover:bg-surface-raised-base-hover": !isSelected(),
                          }}
                          onClick={() => {
                            setSelectedIndex(i())
                            props.onClose()
                            props.onFileSelect?.(file)
                          }}
                        >
                          <Icon name="open-file" size="small" class="text-icon-weak shrink-0" />
                          <div class="flex-1 min-w-0">
                            <div class="text-13-regular truncate">{file.split("/").pop()}</div>
                            <div class="text-11-regular text-text-weaker truncate">{file}</div>
                          </div>
                        </div>
                      )
                    }}
                  </For>
                </Match>
                <Match when={mode() === "commands"}>
                  <For each={grouped()}>
                    {([label, category, cmds]) => (
                      <div class="pb-1">
                        <div class="flex items-center gap-1.5 px-4 py-1.5 text-11-medium text-text-weaker uppercase tracking-wider">
                          <Icon name={CATEGORY_ICONS[category] as any} size="small" class="text-icon-weaker" />
                          {label}
                        </div>
                        <For each={cmds}>
                          {(cmd, i) => {
                            const globalIndex = () => {
                              let count = 0
                              for (const [, , group] of grouped()) {
                                for (const item of group) {
                                  if (item === cmd) return count
                                  count++
                                }
                              }
                              return -1
                            }
                            const isSelected = () => globalIndex() === selectedIndex()
                            const isPinned = () => pinned().has(cmd.id)
                            return (
                              <div
                                data-command-item
                                class="flex items-center gap-3 px-4 py-2 mx-2 rounded-lg cursor-pointer transition-colors group"
                                classList={{
                                  "bg-accent-base/10 text-text-strong": isSelected(),
                                  "text-text-base hover:bg-surface-raised-base-hover": !isSelected(),
                                }}
                                onClick={() => {
                                  const idx = globalIndex()
                                  if (idx === selectedIndex()) executeSelected()
                                  else setSelectedIndex(idx)
                                }}
                                onDblClick={executeSelected}
                              >
                                <Show when={cmd.icon}>
                                  <Icon name={cmd.icon as any} size="small" class="text-icon-weak shrink-0" />
                                </Show>
                                <div class="flex-1 min-w-0">
                                  <div class="text-13-regular truncate">{cmd.title}</div>
                                  <Show when={cmd.description}>
                                    <div class="text-11-regular text-text-weaker truncate">{cmd.description}</div>
                                  </Show>
                                </div>
                                <Show when={cmd.keybind}>
                                  <div class="flex items-center gap-1 shrink-0">
                                    <span class="px-1.5 py-0.5 text-11-medium text-text-weaker bg-surface-base border border-border-base rounded-md font-mono">{cmd.keybind}</span>
                                  </div>
                                </Show>
                                <button
                                  type="button"
                                  class="shrink-0 size-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-base"
                                  classList={{ "opacity-100": isPinned() }}
                                  onClick={(e) => { e.stopPropagation(); togglePin(cmd.id) }}
                                  title={isPinned() ? "Unpin" : "Pin"}
                                >
                                  <Icon name={isPinned() ? "pin-filled" : "pin"} size="small" class={isPinned() ? "text-accent-base" : "text-icon-weaker"} />
                                </button>
                              </div>
                            )
                          }}
                        </For>
                      </div>
                    )}
                  </For>
                </Match>
              </Switch>
            </Show>
          </div>

          {/* Footer hints */}
          <div class="flex items-center gap-3 px-4 py-2 border-t border-border-base bg-surface-base/50 text-11-regular text-text-weaker">
            <span><kbd class="px-1 py-0.5 bg-surface-base border border-border-base rounded text-11-medium">↑↓</kbd> Navigate</span>
            <span><kbd class="px-1 py-0.5 bg-surface-base border border-border-base rounded text-11-medium">↵</kbd> Select</span>
            <Show when={props.onGoToLine}>
              <span><kbd class="px-1 py-0.5 bg-surface-base border border-border-base rounded text-11-medium">:42</kbd> Go to Line</span>
            </Show>
            <span><kbd class="px-1 py-0.5 bg-surface-base border border-border-base rounded text-11-medium">Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </Show>
  )
}

export type { PaletteAction, CommandCategory }
