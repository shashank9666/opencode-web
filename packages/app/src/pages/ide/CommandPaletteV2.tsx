import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"

type CommandCategory = "files" | "editor" | "view" | "ai" | "git" | "terminal" | "settings" | "workspace"

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
}

export default function CommandPaletteV2(props: {
  open: boolean
  onClose: () => void
  commands: PaletteAction[]
  onSearch?: (query: string) => void
}) {
  const [query, setQuery] = createSignal("")
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [mode, setMode] = createSignal<"commands" | "files">("commands")
  let inputRef: HTMLInputElement | undefined
  let listRef: HTMLDivElement | undefined

  const filtered = createMemo(() => {
    const q = query().toLowerCase().trim()
    if (!q) return props.commands.slice(0, 50)
    return props.commands
      .filter((cmd) => {
        const title = cmd.title.toLowerCase()
        const desc = cmd.description?.toLowerCase() ?? ""
        const cat = CATEGORY_LABELS[cmd.category].toLowerCase()
        return title.includes(q) || desc.includes(q) || cat.includes(q)
      })
      .slice(0, 50)
  })

  const grouped = createMemo(() => {
    const groups = new Map<CommandCategory, PaletteAction[]>()
    for (const cmd of filtered()) {
      const existing = groups.get(cmd.category) ?? []
      existing.push(cmd)
      groups.set(cmd.category, existing)
    }
    return [...groups.entries()]
  })

  const executeSelected = () => {
    const cmd = filtered()[selectedIndex()]
    if (cmd) {
      props.onClose()
      cmd.onSelect()
    }
  }

  createEffect(() => {
    if (props.open) {
      setSelectedIndex(0)
      setQuery("")
      setMode("commands")
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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(Math.min(selectedIndex() + 1, filtered().length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(Math.max(selectedIndex() - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      executeSelected()
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
              placeholder="Search commands, files, symbols..."
              value={query()}
              onInput={(e) => { setQuery(e.currentTarget.value); setSelectedIndex(0); props.onSearch?.(e.currentTarget.value) }}
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
              onClick={() => setMode("commands")}
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
              onClick={() => setMode("files")}
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
              when={filtered().length > 0}
              fallback={
                <div class="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <Icon name="magnifying-glass-menu" size="large" class="text-icon-weaker opacity-30" />
                  <div class="text-13-regular text-text-weaker">
                    {query() ? "No matching commands" : "Type a command name"}
                  </div>
                </div>
              }
            >
              <For each={grouped()}>
                {([category, cmds]) => (
                  <div class="pb-1">
                    <div class="flex items-center gap-1.5 px-4 py-1.5 text-11-medium text-text-weaker uppercase tracking-wider">
                      <Icon name={CATEGORY_ICONS[category] as any} size="small" class="text-icon-weaker" />
                      {CATEGORY_LABELS[category]}
                    </div>
                    <For each={cmds}>
                      {(cmd, i) => {
                        const globalIndex = () => {
                          let count = 0
                          for (const [, group] of grouped()) {
                            for (const item of group) {
                              if (item === cmd) return count
                              count++
                            }
                          }
                          return -1
                        }
                        const isSelected = () => globalIndex() === selectedIndex()
                        return (
                          <div
                            data-command-item
                            class="flex items-center gap-3 px-4 py-2 mx-2 rounded-lg cursor-pointer transition-colors"
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
                          </div>
                        )
                      }}
                    </For>
                  </div>
                )}
              </For>
            </Show>
          </div>

          {/* Footer hints */}
          <div class="flex items-center gap-3 px-4 py-2 border-t border-border-base bg-surface-base/50 text-11-regular text-text-weaker">
            <span><kbd class="px-1 py-0.5 bg-surface-base border border-border-base rounded text-11-medium">↑↓</kbd> Navigate</span>
            <span><kbd class="px-1 py-0.5 bg-surface-base border border-border-base rounded text-11-medium">↵</kbd> Select</span>
            <span><kbd class="px-1 py-0.5 bg-surface-base border border-border-base rounded text-11-medium">Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </Show>
  )
}

export type { PaletteAction, CommandCategory }
