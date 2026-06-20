import { createSignal, For, Show, type JSX } from "solid-js"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { StatusPopover } from "@/components/status-popover"
import { buildMenus, type IdeActions } from "./MenuBar"

export default function HeaderBar(props: {
  workspaceName?: string
  activeFile?: string
  onSearch: () => void
  onCommandPalette: () => void
  onToggleLeftPanel?: () => void
  onToggleBottomPanel?: () => void
  onToggleRightPanel?: () => void
  actions?: Partial<IdeActions>
}) {
  const [activeMenu, setActiveMenu] = createSignal<string | null>(null)
  const [searchOpen, setSearchOpen] = createSignal(false)
  const [searchQuery, setSearchQuery] = createSignal("")
  let searchInputRef: HTMLInputElement | undefined
  const dialog = useDialog()

  const menus = () => buildMenus(props.actions || {})

  const handleMenuClick = (menuLabel: string) => {
    if (activeMenu() === menuLabel) setActiveMenu(null)
    else setActiveMenu(menuLabel)
  }

  const handleMouseLeave = () => setActiveMenu(null)

  const handleSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchOpen(false)
      setSearchQuery("")
    } else if (e.key === "Enter" && searchQuery()) {
      setSearchOpen(false)
      props.onSearch()
    }
  }

  return (
    <div
      class="shrink-0 flex items-center justify-between px-2 border-b border-border-base bg-[#181818] select-none [app-region:drag] z-30 text-text-weaker relative"
      style={{ height: "35px" }}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Left: Logo & Menus ── */}
      <div class="flex items-center h-full [app-region:no-drag]">
        {/* Logo */}
        <div class="flex items-center justify-center px-3 h-full cursor-pointer hover:bg-surface-raised-base-hover transition-colors">
          <svg
            width="18"
            height="22"
            viewBox="0 0 24 30"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M0 0V30H24V0H0ZM6 6V24H18V6H6Z"
            />
          </svg>
        </div>

        {/* Menus */}
        <div class="flex items-center h-full">
          <For each={menus()}>{(menu) => (
            <div class="relative h-full">
              <button
                type="button"
                class="px-2.5 h-full text-13-regular hover:bg-surface-raised-base-hover hover:text-text-strong transition-colors cursor-default"
                classList={{ "bg-surface-raised-base text-text-strong": activeMenu() === menu.label }}
                onClick={() => handleMenuClick(menu.label)}
                onMouseEnter={() => { if (activeMenu()) setActiveMenu(menu.label) }}
              >
                {menu.label}
              </button>
              <Show when={activeMenu() === menu.label && menu.submenu}>
                <div class="absolute top-full left-0 mt-0 min-w-52 bg-surface-raised-base border border-border-base rounded-md shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <For each={menu.submenu}>{(item) => (
                    <>
                      <Show when={item.separator}>
                        <div class="h-px my-1 bg-border-base" />
                      </Show>
                      <Show when={!item.separator}>
                        <button
                          type="button"
                          class="w-full flex items-center justify-between px-6 py-1.5 text-13-regular text-text-weak hover:bg-accent-base hover:text-white transition-colors cursor-default"
                          disabled={item.disabled}
                          classList={{ "opacity-50 cursor-not-allowed": item.disabled }}
                          onClick={() => { if (item.action) item.action(); setActiveMenu(null) }}
                        >
                          <span>{item.label}</span>
                          <Show when={item.shortcut}>
                            <span class="text-11-regular ml-6 opacity-70">{item.shortcut}</span>
                          </Show>
                        </button>
                      </Show>
                    </>
                  )}</For>
                </div>
              </Show>
            </div>
          )}</For>
        </div>
      </div>

      {/* ── Center: Search Bar (VS Code style) ── */}
      <div class="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 flex items-center justify-center">
        <Show when={searchOpen()}>
          <div class="flex items-center gap-1 bg-surface-base border border-border-base rounded-md px-2 py-0.5 w-[400px] max-w-[50vw] pointer-events-auto">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="text-icon-weaker shrink-0">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              class="flex-1 bg-transparent text-12-regular text-text-strong outline-none placeholder:text-text-weaker"
              placeholder="Search files by name..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              onKeyDown={handleSearchKeyDown}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            <button
              type="button"
              class="text-icon-weaker hover:text-text-strong p-0.5"
              onClick={() => { setSearchOpen(false); setSearchQuery("") }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
            </button>
          </div>
        </Show>
        <Show when={!searchOpen()}>
          <span class="text-12-regular text-text-weaker truncate px-4 pointer-events-none">
            {props.workspaceName ?? "Untitled"} {`/`}
            <Show when={props.activeFile}>
              {props.activeFile}
            </Show>
          </span>
        </Show>
      </div>

      {/* ── Right: Status and Settings ── */}
      <div class="flex items-center h-full [app-region:no-drag] px-2 gap-2">
        <div class="flex items-center h-full">
          <Tooltip value="Search Files" placement="bottom">
            <IconButton
              icon="magnifying-glass"
              variant="ghost"
              size="small"
              class="size-6 text-icon-weak hover:text-text-strong rounded-[4px]"
              onClick={() => {
                setSearchOpen(true)
                setTimeout(() => searchInputRef?.focus(), 50)
              }}
            />
          </Tooltip>
        </div>
        <div class="flex items-center h-full">
          <StatusPopover />
        </div>
        <div class="flex items-center h-full ml-1">
          <Tooltip value="Settings" placement="bottom">
            <IconButton
              icon="sliders"
              variant="ghost"
              size="small"
              class="size-6 text-icon-weak hover:text-text-strong rounded-[4px]"
              onClick={() => {
                void import("@/components/dialog-settings").then((x) => {
                  dialog.show(() => <x.DialogSettings />)
                })
              }}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

