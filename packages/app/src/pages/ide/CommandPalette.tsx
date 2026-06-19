import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"

export interface PaletteCommand {
  id: string
  title: string
  description?: string
  category?: string
  keybind?: string
  icon?: string
  onSelect: () => void
}

export default function CommandPalette(props: {
  open: boolean
  onClose: () => void
  commands: PaletteCommand[]
}) {
  const [query, setQuery] = createSignal("")
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  let inputRef: HTMLInputElement | undefined
  let listRef: HTMLDivElement | undefined

  const filtered = createMemo(() => {
    const q = query().toLowerCase().trim()
    if (!q) return props.commands.slice(0, 50)
    return props.commands
      .filter((cmd) => {
        const title = cmd.title.toLowerCase()
        const category = cmd.category?.toLowerCase() ?? ""
        return title.includes(q) || category.includes(q)
      })
      .slice(0, 50)
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
        class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/40"
        onClick={props.onClose}
      >
        <div
          class="w-[600px] max-w-[90vw] bg-surface-raised-base border border-border-base rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div class="flex items-center gap-2 px-4 py-3 border-b border-border-base">
            <Icon name="magnifying-glass-menu" size="normal" class="text-icon-weak shrink-0" />
            <input
              ref={inputRef}
              type="text"
              class="flex-1 bg-transparent text-14-regular text-text-strong outline-none placeholder:text-text-weaker"
              placeholder="Search for commands, files, and symbols..."
              value={query()}
              onInput={(e) => { setQuery(e.currentTarget.value); setSelectedIndex(0) }}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Results */}
          <div
            ref={listRef}
            class="max-h-[400px] overflow-y-auto py-1"
            onKeyDown={handleKeyDown}
          >
            <Show
              when={filtered().length > 0}
              fallback={
                <div class="px-4 py-6 text-center text-13-regular text-text-weaker">
                  No matching commands found
                </div>
              }
            >
              <For each={filtered()}>
                {(cmd, i) => (
                  <div
                    data-command-item
                    class="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors"
                    classList={{
                      "bg-accent-base/10 text-text-strong": i() === selectedIndex(),
                      "text-text-base hover:bg-surface-raised-base-hover": i() !== selectedIndex(),
                    }}
                    onClick={() => {
                      if (i() === selectedIndex()) executeSelected()
                      else setSelectedIndex(i())
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
                        <span class="px-1.5 py-0.5 text-11-medium text-text-weaker bg-surface-base border border-border-base rounded">{cmd.keybind}</span>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  )
}
