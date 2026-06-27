import { createSignal, For, Show, type JSX, onCleanup } from "solid-js"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { StatusPopover } from "@/components/status-popover"
import { buildMenus, type IdeActions, type SubmenuItem } from "./MenuBar"

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
  const [menuPosition, setMenuPosition] = createSignal<{ left: number; top: number; maxHeight: number }>({ left: 0, top: 0, maxHeight: 400 })
  const [searchOpen, setSearchOpen] = createSignal(false)
  const [searchQuery, setSearchQuery] = createSignal("")
  let searchInputRef: HTMLInputElement | undefined
  let menuBarRef: HTMLDivElement | undefined
  const dialog = useDialog()

  const menus = () => buildMenus(props.actions || {}, props.workspaceName)

  const handleMenuClick = (menuLabel: string, index: number) => {
    if (activeMenu() === menuLabel) {
      setActiveMenu(null)
      return
    }
    setActiveMenu(menuLabel)
    updateMenuPosition(index)
  }

  const handleMouseLeave = () => setActiveMenu(null)

  const updateMenuPosition = (index: number) => {
    if (!menuBarRef) return
    const buttons = menuBarRef.querySelectorAll("button[data-menu-trigger]")
    const button = buttons[index] as HTMLElement | undefined
    if (!button) return

    const rect = button.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const menuWidth = 224

    let left = rect.left
    let top = rect.bottom

    if (left + menuWidth > viewportWidth) {
      left = Math.max(0, viewportWidth - menuWidth - 8)
    }

    const availableHeight = viewportHeight - top - 8
    setMenuPosition({
      left,
      top,
      maxHeight: Math.max(200, Math.min(500, availableHeight)),
    })
  }

  const [submenuActive, setSubmenuActive] = createSignal<string | null>(null)
  const [submenuPos, setSubmenuPos] = createSignal<{ left: number; top: number }>({ left: 0, top: 0 })

  const handleSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchOpen(false)
      setSearchQuery("")
    } else if (e.key === "Enter" && searchQuery()) {
      setSearchOpen(false)
      props.onSearch()
    }
  }

  const MenuItemRow = (item: SubmenuItem, parentPath: string) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const path = parentPath ? `${parentPath} > ${item.label}` : item.label || ""

    return (
      <div
        class="relative"
        onMouseEnter={(e) => {
          if (hasSubmenu) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const menuWidth = 224
            let left = rect.right - 4
            const maxLeft = window.innerWidth - menuWidth - 8
            if (left + menuWidth > window.innerWidth) {
              left = Math.max(8, rect.left - menuWidth + 4)
            }
            setSubmenuPos({ left, top: rect.top - 4 })
            setSubmenuActive(path)
          }
        }}
        onMouseLeave={() => {
          setSubmenuActive(null)
        }}
      >
        <Show when={item.separator}>
          <div class="h-px my-1 bg-border-base" />
        </Show>
        <Show when={!item.separator && !hasSubmenu}>
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
        <Show when={!item.separator && hasSubmenu}>
          <div
            class="w-full flex items-center justify-between px-6 py-1.5 text-13-regular text-text-weak hover:bg-accent-base hover:text-white transition-colors cursor-default"
            classList={{ "opacity-50 cursor-not-allowed": item.disabled }}
          >
            <span>{item.label}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="shrink-0 ml-4">
              <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <Show when={submenuActive() === path && item.submenu}>
            <div
              class="fixed min-w-56 bg-surface-raised-base border border-border-base rounded-md shadow-xl py-1 z-[60] overflow-y-auto"
              style={{
                left: `${submenuPos().left}px`,
                top: `${submenuPos().top}px`,
                "max-height": `400px`,
              }}
              onMouseEnter={() => setSubmenuActive(path)}
              onMouseLeave={() => setSubmenuActive(null)}
            >
              <For each={item.submenu}>{ (sub) => MenuItemRow(sub, path) }</For>
            </div>
          </Show>
        </Show>
      </div>
    )
  }

  onCleanup(() => {
    setActiveMenu(null)
    setSubmenuActive(null)
  })

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
          <img src="/favicon-96x96-v3.png" alt="OpenCode" width="18" height="18" class="block rounded-[2px]" />
        </div>

        {/* Menus */}
        <div class="flex items-center h-full" ref={menuBarRef}>
          <For each={menus()}>{(menu, index) => (
            <div class="relative h-full" onMouseEnter={() => { if (activeMenu()) setActiveMenu(menu.label); setSubmenuActive(null) }}>
              <button
                type="button"
                data-menu-trigger
                class="px-2.5 h-full text-13-regular hover:bg-surface-raised-base-hover hover:text-text-strong transition-colors cursor-default"
                classList={{ "bg-surface-raised-base text-text-strong": activeMenu() === menu.label }}
                onClick={() => handleMenuClick(menu.label, index())}
                onMouseEnter={() => { if (activeMenu()) setActiveMenu(menu.label); setSubmenuActive(null) }}
              >
                {menu.label}
              </button>
              <Show when={activeMenu() === menu.label && menu.submenu}>
                <div
                  class="fixed min-w-56 bg-surface-raised-base border border-border-base rounded-md shadow-xl py-1 z-50 overflow-y-auto"
                  style={{
                    left: `${menuPosition().left}px`,
                    top: `${menuPosition().top}px`,
                    "max-height": `${menuPosition().maxHeight}px`,
                  }}
                  onMouseEnter={() => setSubmenuActive(null)}
                >
                  <For each={menu.submenu}>{ (item) => MenuItemRow(item, menu.label) }</For>
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
          <Tooltip value="Search Files (Ctrl+Shift+F)" placement="bottom">
            <IconButton
              icon="magnifying-glass"
              variant="ghost"
              size="small"
              class="size-6 text-icon-weak hover:text-text-strong rounded-[4px]"
              onClick={() => {
                props.onSearch()
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

