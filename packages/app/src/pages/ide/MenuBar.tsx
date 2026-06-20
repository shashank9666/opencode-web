import { createSignal, For, Show, type Component } from "solid-js"
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
  // Terminal
  newTerminal?: () => void
  splitTerminal?: () => void
  runTask?: () => void
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
      { label: "Auto Save", submenu: [
        { label: "Off", action: () => {} },
        { label: "After Delay", action: () => {} },
        { label: "On Focus Change", action: () => {} },
      ]},
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

  const VIEW_MENU: MenuItem = {
    label: "View",
    submenu: [
      { label: "Explorer", shortcut: "Ctrl+Shift+E", action: actions.toggleExplorer, submenu: [
        { label: "Toggle Explorer", shortcut: "Ctrl+B", action: actions.toggleExplorer },
        { label: "Show Hidden Files", action: () => {} },
      ]},
      { label: "Search", shortcut: "Ctrl+Shift+F", action: actions.toggleSearch, submenu: [
        { label: "Toggle Search", action: actions.toggleSearch },
        { label: "Replace in Files", shortcut: "Ctrl+H", action: actions.replace },
      ]},
      { label: "Source Control", shortcut: "Ctrl+Shift+G", action: actions.toggleSourceControl, submenu: [
        { label: "Toggle Source Control", action: actions.toggleSourceControl },
        { label: "Focus on Source Control", action: () => {} },
      ]},
      { label: "Run and Debug", shortcut: "Ctrl+Shift+D", action: actions.startDebugging },
      { separator: true },
      { label: "Command Palette...", shortcut: "Ctrl+Shift+P", action: actions.commandPalette },
      { separator: true },
      { label: "Appearance", submenu: [
        { label: "Zoom In", shortcut: "Ctrl++", action: actions.zoomIn },
        { label: "Zoom Out", shortcut: "Ctrl+-", action: actions.zoomOut },
        { label: "Reset Zoom", shortcut: "Ctrl+0", action: actions.resetZoom },
        { separator: true },
        { label: "Toggle Full Screen", shortcut: "F11", action: actions.toggleFullScreen },
        { label: "Toggle Zen Mode", shortcut: "Ctrl+K Z", action: actions.toggleZenMode },
        { separator: true },
        { label: "Toggle Panel", shortcut: "Ctrl+J", action: actions.togglePanel },
        { label: "Toggle Secondary Side Bar", shortcut: "Ctrl+Alt+B", action: actions.toggleSecondarySideBar },
        { label: "Toggle Status Bar", action: () => {} },
      ]},
      { separator: true },
      { label: "Navigator", submenu: [
        { label: "Quick Open", shortcut: "Ctrl+P", action: actions.goToFile },
        { label: "Go to File...", shortcut: "Ctrl+P", action: actions.goToFile },
        { label: "Go to Symbol...", shortcut: "Ctrl+Shift+O", action: actions.goToSymbolEditor },
        { label: "Go to Line...", shortcut: "Ctrl+G", action: actions.goToLine },
      ]},
    ],
  }

  const GO_MENU: MenuItem = {
    label: "Go",
    submenu: [
      { label: "Go to File...", shortcut: "Ctrl+P", action: actions.goToFile },
      { label: "Go to Symbol in Workspace...", shortcut: "Ctrl+T", action: actions.goToSymbolWorkspace },
      { label: "Go to Symbol in Editor...", shortcut: "Ctrl+Shift+O", action: actions.goToSymbolEditor },
      { label: "Go to Line...", shortcut: "Ctrl+G", action: actions.goToLine },
      { separator: true },
      { label: "Go to Definition", shortcut: "F12", action: actions.goToDefinition },
      { label: "Go to Declaration", shortcut: "Ctrl+F12", action: actions.goToDeclaration },
      { label: "Go to Type Definition", shortcut: "Ctrl+Shift+O", action: actions.goToTypeDefinition },
      { label: "Go to Implementation", shortcut: "Ctrl+F12", action: actions.goToImplementation },
      { separator: true },
      { label: "Go Back", shortcut: "Alt+Left", action: actions.goBack },
      { label: "Go Forward", shortcut: "Alt+Right", action: actions.goForward },
    ],
  }

  const RUN_MENU: MenuItem = {
    label: "Run",
    submenu: [
      { label: "Run Without Debugging", shortcut: "Ctrl+F5", action: actions.runWithoutDebugging },
      { label: "Start Debugging", shortcut: "F5", action: actions.startDebugging },
      { separator: true },
      { label: "Add Configuration...", action: () => {} },
      { separator: true },
      { label: "Run Task", submenu: [
        { label: "Run Build Task", shortcut: "Ctrl+Shift+B", action: actions.runTask },
        { label: "Run Test Task", action: () => {} },
      ]},
    ],
  }

  const TERMINAL_MENU: MenuItem = {
    label: "Terminal",
    submenu: [
      { label: "New Terminal", shortcut: "Ctrl+`", action: actions.newTerminal },
      { label: "Split Terminal", action: actions.splitTerminal },
      { separator: true },
      { label: "Run Task", shortcut: "Ctrl+Shift+B", action: actions.runTask },
      { label: "Run Build Task...", action: () => {} },
      { label: "Run Active File", action: () => {} },
      { separator: true },
      { label: "Select Default Shell", action: () => {} },
    ],
  }

  return [FILE_MENU, EDIT_MENU, VIEW_MENU, GO_MENU, RUN_MENU, TERMINAL_MENU]
}

// Keep a backward compatible default MENUS array if needed elsewhere
export const MENUS: MenuItem[] = buildMenus({})

export default function MenuBar(props: { onCommandPalette?: () => void }) {
  const [activeMenu, setActiveMenu] = createSignal<string | null>(null)

  const menus = buildMenus({ commandPalette: props.onCommandPalette })

  const handleMenuClick = (menu: MenuItem) => {
    if (activeMenu() === menu.label) setActiveMenu(null)
    else setActiveMenu(menu.label)
  }

  const handleMouseLeave = () => setActiveMenu(null)

  return (
    <div class="flex items-center h-full" onMouseLeave={handleMouseLeave}>
      <For each={menus}>{(menu) => (
        <div class="relative h-full">
          <button
            type="button"
            class="px-2.5 h-full text-13-regular hover:bg-surface-raised-base-hover hover:text-text-strong transition-colors cursor-default"
            classList={{ "bg-surface-raised-base text-text-strong": activeMenu() === menu.label }}
            onClick={() => handleMenuClick(menu)}
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
  )
}