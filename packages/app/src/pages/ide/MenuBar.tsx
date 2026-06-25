import { createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"

export type MenuItem = {
  label: string
  submenu?: SubmenuItem[]
  action?: () => void
}

export type SubmenuItem = {
  label?: string
  shortcut?: string
  disabled?: boolean
  separator?: boolean
  submenu?: SubmenuItem[]
  action?: () => void
}

export interface IdeActions {
  // File
  newFile?: () => void
  newWindow?: () => void
  openFile?: () => void
  openFolder?: () => void
  save?: () => void
  saveAs?: () => void
  saveAll?: () => void
  closeEditor?: () => void
  closeFolder?: () => void
  closeWindow?: () => void
  // Edit
  undo?: () => void
  redo?: () => void
  cut?: () => void
  copy?: () => void
  paste?: () => void
  find?: () => void
  replace?: () => void
  findInFiles?: () => void
  toggleLineComment?: () => void
  toggleBlockComment?: () => void
  formatDocument?: () => void
  formatSelection?: () => void
  // Selection
  expandSelection?: () => void
  shrinkSelection?: () => void
  selectAllOccurrences?: () => void
  addCursorAbove?: () => void
  addCursorBelow?: () => void
  selectLine?: () => void
  selectWord?: () => void
  // View
  toggleExplorer?: () => void
  toggleSearch?: () => void
  toggleSourceControl?: () => void
  commandPalette?: () => void
  zoomIn?: () => void
  zoomOut?: () => void
  resetZoom?: () => void
  toggleFullScreen?: () => void
  toggleZenMode?: () => void
  togglePanel?: () => void
  toggleSecondarySideBar?: () => void
  toggleWordWrap?: () => void
  // Go
  goToFile?: () => void
  goToSymbolWorkspace?: () => void
  goToSymbolEditor?: () => void
  goToLine?: () => void
  goToDefinition?: () => void
  goToDeclaration?: () => void
  goToTypeDefinition?: () => void
  goToImplementation?: () => void
  goBack?: () => void
  goForward?: () => void
  // Run
  runWithoutDebugging?: () => void
  startDebugging?: () => void
  stopDebugging?: () => void
  // Terminal
  newTerminal?: () => void
  splitTerminal?: () => void
  runTask?: () => void
  selectDefaultShell?: () => void
}

export function buildMenus(actions: Partial<IdeActions>): MenuItem[] {
  const FILE_MENU: MenuItem = {
    label: "File",
    submenu: [
      { label: "New File", shortcut: "Ctrl+N", action: actions.newFile },
      { label: "New Window", shortcut: "Ctrl+Shift+N", action: actions.newWindow },
      { separator: true },
      { label: "Open File...", shortcut: "Ctrl+O", action: actions.openFile },
      { label: "Open Folder...", shortcut: "Ctrl+K Ctrl+O", action: actions.openFolder },
      { separator: true },
      { label: "Save", shortcut: "Ctrl+S", action: actions.save },
      { label: "Save As...", shortcut: "Ctrl+Shift+S", action: actions.saveAs },
      { label: "Save All", shortcut: "Ctrl+K S", action: actions.saveAll },
      { separator: true },
      { label: "Close Editor", shortcut: "Ctrl+F4", action: actions.closeEditor },
      { label: "Close Folder", action: actions.closeFolder },
      { label: "Close Window", shortcut: "Alt+F4", action: actions.closeWindow },
    ],
  }

  const EDIT_MENU: MenuItem = {
    label: "Edit",
    submenu: [
      { label: "Undo", shortcut: "Ctrl+Z", action: actions.undo },
      { label: "Redo", shortcut: "Ctrl+Y", action: actions.redo },
      { separator: true },
      { label: "Cut", shortcut: "Ctrl+X", action: actions.cut },
      { label: "Copy", shortcut: "Ctrl+C", action: actions.copy },
      { label: "Paste", shortcut: "Ctrl+V", action: actions.paste },
      { separator: true },
      { label: "Find", shortcut: "Ctrl+F", action: actions.find },
      { label: "Replace", shortcut: "Ctrl+H", action: actions.replace },
      { label: "Find in Files", shortcut: "Ctrl+Shift+F", action: actions.findInFiles },
      { separator: true },
      { label: "Toggle Line Comment", shortcut: "Ctrl+/", action: actions.toggleLineComment },
      { label: "Toggle Block Comment", shortcut: "Shift+Alt+A", action: actions.toggleBlockComment },
      { separator: true },
      { label: "Format Document", shortcut: "Shift+Alt+F", action: actions.formatDocument },
      { label: "Format Selection", shortcut: "Ctrl+K Ctrl+F", action: actions.formatSelection },
    ],
  }

  const SELECTION_MENU: MenuItem = {
    label: "Selection",
    submenu: [
      { label: "Select All", shortcut: "Ctrl+A" },
      { label: "Expand Selection", shortcut: "Shift+Alt+→", action: actions.expandSelection },
      { label: "Shrink Selection", shortcut: "Shift+Alt+←", action: actions.shrinkSelection },
      { separator: true },
      { label: "Select Line", shortcut: "Ctrl+L", action: actions.selectLine },
      { label: "Select Word", shortcut: "Ctrl+D", action: actions.selectWord },
      { separator: true },
      { label: "Add Cursor Above", shortcut: "Ctrl+Alt+↑", action: actions.addCursorAbove },
      { label: "Add Cursor Below", shortcut: "Ctrl+Alt+↓", action: actions.addCursorBelow },
      { separator: true },
      { label: "Select All Occurrences", shortcut: "Ctrl+Shift+L", action: actions.selectAllOccurrences },
    ],
  }

  const VIEW_MENU: MenuItem = {
    label: "View",
    submenu: [
      { label: "Command Palette...", shortcut: "Ctrl+Shift+P", action: actions.commandPalette },
      { separator: true },
      { label: "Explorer", shortcut: "Ctrl+Shift+E", action: actions.toggleExplorer },
      { label: "Search", shortcut: "Ctrl+Shift+F", action: actions.toggleSearch },
      { label: "Source Control", shortcut: "Ctrl+Shift+G", action: actions.toggleSourceControl },
      { label: "Run and Debug", shortcut: "Ctrl+Shift+D", action: actions.startDebugging },
      { separator: true },
      { label: "Toggle Terminal", shortcut: "Ctrl+`", action: actions.togglePanel },
      { label: "Toggle Secondary Sidebar", action: actions.toggleSecondarySideBar },
      { label: "Toggle Word Wrap", shortcut: "Alt+Z", action: actions.toggleWordWrap },
      { separator: true },
      { label: "Toggle Fullscreen", shortcut: "F11", action: actions.toggleFullScreen },
      { label: "Toggle Zen Mode", shortcut: "Ctrl+K Z", action: actions.toggleZenMode },
      { separator: true },
      { label: "Zoom In", shortcut: "Ctrl+=", action: actions.zoomIn },
      { label: "Zoom Out", shortcut: "Ctrl+-", action: actions.zoomOut },
      { label: "Reset Zoom", shortcut: "Ctrl+0", action: actions.resetZoom },
    ],
  }

  const GO_MENU: MenuItem = {
    label: "Go",
    submenu: [
      { label: "Back", shortcut: "Alt+←", action: actions.goBack },
      { label: "Forward", shortcut: "Alt+→", action: actions.goForward },
      { separator: true },
      { label: "Go to File...", shortcut: "Ctrl+P", action: actions.goToFile },
      { label: "Go to Symbol in Workspace...", shortcut: "Ctrl+T", action: actions.goToSymbolWorkspace },
      { label: "Go to Symbol in Editor...", shortcut: "Ctrl+Shift+O", action: actions.goToSymbolEditor },
      { label: "Go to Line...", shortcut: "Ctrl+G", action: actions.goToLine },
      { separator: true },
      { label: "Go to Definition", shortcut: "F12", action: actions.goToDefinition },
      { label: "Go to Declaration", shortcut: "Ctrl+F12", action: actions.goToDeclaration },
      { label: "Go to Type Definition", shortcut: "Ctrl+Shift+F12", action: actions.goToTypeDefinition },
      { label: "Go to Implementation", shortcut: "F12", action: actions.goToImplementation },
    ],
  }

  const RUN_MENU: MenuItem = {
    label: "Run",
    submenu: [
      { label: "Start Debugging", shortcut: "F5", action: actions.startDebugging },
      { label: "Run Without Debugging", shortcut: "Ctrl+F5", action: actions.runWithoutDebugging },
      { label: "Stop Debugging", shortcut: "Shift+F5", action: actions.stopDebugging },
      { separator: true },
      { label: "Run Task", shortcut: "Ctrl+Shift+B", action: actions.runTask },
    ],
  }

  const TERMINAL_MENU: MenuItem = {
    label: "Terminal",
    submenu: [
      { label: "New Terminal", shortcut: "Ctrl+Shift+`", action: actions.newTerminal },
      { label: "Split Terminal", shortcut: "Ctrl+Shift+5", action: actions.splitTerminal },
      { separator: true },
      { label: "Run Task", shortcut: "Ctrl+Shift+B", action: actions.runTask },
      { separator: true },
      { label: "Select Default Shell", action: actions.selectDefaultShell },
    ],
  }

  return [FILE_MENU, EDIT_MENU, SELECTION_MENU, VIEW_MENU, GO_MENU, RUN_MENU, TERMINAL_MENU]
}

// Keep a backward compatible default MENUS array if needed elsewhere
export const MENUS: MenuItem[] = buildMenus({})

export default function MenuBar(props: { onCommandPalette?: () => void }) {
  const [activeMenu, setActiveMenu] = createSignal<string | null>(null)
  const [menuPosition, setMenuPosition] = createSignal<{ left: number; top: number; maxHeight: number }>({ left: 0, top: 0, maxHeight: 400 })
  let menuBarRef: HTMLDivElement | undefined

  const menus = buildMenus({ commandPalette: props.onCommandPalette })

  const handleMenuClick = (menu: MenuItem, index: number) => {
    if (activeMenu() === menu.label) {
      setActiveMenu(null)
      return
    }
    setActiveMenu(menu.label)
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
    const menuWidth = 224 // min-w-56 = 14rem = 224px

    let left = rect.left
    let top = rect.bottom

    // Prevent overflow right
    if (left + menuWidth > viewportWidth) {
      left = Math.max(0, viewportWidth - menuWidth - 8)
    }

    // Prevent overflow bottom — calculate available height
    const availableHeight = viewportHeight - top - 8
    setMenuPosition({
      left,
      top,
      maxHeight: Math.max(200, Math.min(500, availableHeight)),
    })
  }

  return (
    <div class="flex items-center h-full" ref={menuBarRef} onMouseLeave={handleMouseLeave}>
      <For each={menus}>{(menu, index) => (
        <div class="relative h-full">
          <button
            type="button"
            data-menu-trigger
            class="px-2.5 h-full text-13-regular hover:bg-surface-raised-base-hover hover:text-text-strong transition-colors cursor-default"
            classList={{ "bg-surface-raised-base text-text-strong": activeMenu() === menu.label }}
            onClick={() => handleMenuClick(menu, index())}
            onMouseEnter={() => { if (activeMenu()) setActiveMenu(menu.label) }}
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
            >
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
  )
}