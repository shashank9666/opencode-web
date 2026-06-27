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
  newTextFile?: () => void
  newFile?: () => void
  newWindow?: () => void
  newWindowWithProfile?: () => void
  openFile?: () => void
  openFolder?: () => void
  openWorkspaceFromFile?: () => void
  openRecent?: () => void
  addFolderToWorkspace?: () => void
  saveWorkspaceAs?: () => void
  duplicateWorkspace?: () => void
  save?: () => void
  saveAs?: () => void
  saveAll?: () => void
  share?: () => void
  autoSave?: () => void
  preferences?: () => void
  revertFile?: () => void
  closeEditor?: () => void
  closeFolder?: () => void
  closeWindow?: () => void
  exit?: () => void
  // Edit
  undo?: () => void
  redo?: () => void
  cut?: () => void
  copy?: () => void
  paste?: () => void
  find?: () => void
  replace?: () => void
  findInFiles?: () => void
  replaceInFiles?: () => void
  toggleLineComment?: () => void
  toggleBlockComment?: () => void
  emmetExpandAbbreviation?: () => void
  // Selection
  selectAll?: () => void
  expandSelection?: () => void
  shrinkSelection?: () => void
  copyLineUp?: () => void
  copyLineDown?: () => void
  moveLineUp?: () => void
  moveLineDown?: () => void
  duplicateSelection?: () => void
  addCursorAbove?: () => void
  addCursorBelow?: () => void
  addCursorsToLineEnds?: () => void
  addNextOccurrence?: () => void
  addPreviousOccurrence?: () => void
  selectAllOccurrences?: () => void
  switchToCtrlClickForMultiCursor?: () => void
  columnSelectionMode?: () => void
  // View
  commandPalette?: () => void
  openView?: () => void
  toggleExplorer?: () => void
  toggleSearch?: () => void
  toggleSourceControl?: () => void
  toggleRun?: () => void
  toggleExtensions?: () => void
  toggleChat?: () => void
  toggleBrowser?: () => void
  toggleProblems?: () => void
  toggleOutput?: () => void
  toggleDebugConsole?: () => void
  zoomIn?: () => void
  zoomOut?: () => void
  resetZoom?: () => void
  toggleFullScreen?: () => void
  toggleZenMode?: () => void
  togglePanel?: () => void
  toggleSecondarySideBar?: () => void
  toggleWordWrap?: () => void
  // Go
  goBack?: () => void
  goForward?: () => void
  lastEditLocation?: () => void
  switchEditor?: () => void
  switchGroup?: () => void
  goToFile?: () => void
  goToSymbolWorkspace?: () => void
  goToSymbolEditor?: () => void
  goToDefinition?: () => void
  goToDeclaration?: () => void
  goToTypeDefinition?: () => void
  goToImplementation?: () => void
  goToReferences?: () => void
  goToLine?: () => void
  goToBracket?: () => void
  nextProblem?: () => void
  previousProblem?: () => void
  nextChange?: () => void
  previousChange?: () => void
  // Run
  startDebugging?: () => void
  runWithoutDebugging?: () => void
  stopDebugging?: () => void
  restartDebugging?: () => void
  openConfigurations?: () => void
  addConfiguration?: () => void
  stepOver?: () => void
  stepInto?: () => void
  stepOut?: () => void
  continue?: () => void
  toggleBreakpoint?: () => void
  newBreakpoint?: () => void
  enableAllBreakpoints?: () => void
  disableAllBreakpoints?: () => void
  removeAllBreakpoints?: () => void
  installAdditionalDebuggers?: () => void
  // Terminal
  newTerminal?: () => void
  splitTerminal?: () => void
  newTerminalWindow?: () => void
  runTask?: () => void
  runBuildTask?: () => void
  runActiveFile?: () => void
  runSelectedText?: () => void
  showRunningTasks?: () => void
  restartRunningTask?: () => void
  terminateTask?: () => void
  configureTasks?: () => void
  configureDefaultBuildTask?: () => void
  selectDefaultShell?: () => void
  // Help
  welcome?: () => void
  showAllCommands?: () => void
  documentation?: () => void
  editorPlayground?: () => void
  openWalkthrough?: () => void
  showReleaseNotes?: () => void
  getStartedWithAccessibility?: () => void
  askAtVscode?: () => void
  keyboardShortcutsReference?: () => void
  videoTutorials?: () => void
  tipsAndTricks?: () => void
  joinUsOnYoutube?: () => void
  searchFeatureRequests?: () => void
  reportIssue?: () => void
  viewLicense?: () => void
  privacyStatement?: () => void
  toggleDeveloperTools?: () => void
  openProcessExplorer?: () => void
  checkForUpdates?: () => void
  about?: () => void
  // Settings (PSF)
  profiles?: () => void
  settings?: () => void
  extensions?: () => void
  keyboardShortcuts?: () => void
  snippets?: () => void
  tasks?: () => void
  themes?: () => void
}

export function buildMenus(actions: Partial<IdeActions>, workspaceName?: string): MenuItem[] {
  const FILE_MENU: MenuItem = {
    label: "File",
    submenu: [
      { label: "New Text File", shortcut: "Ctrl+N", action: actions.newTextFile },
      { label: "New File...", action: actions.newFile },
      { label: "New Window", shortcut: "Ctrl+Shift+N", action: actions.newWindow },
      { label: "New Window with Profile", action: actions.newWindowWithProfile },
      { separator: true },
      { label: "Open File...", shortcut: "Ctrl+O", action: actions.openFile },
      { label: "Open Folder...", shortcut: "Ctrl+K Ctrl+O", action: actions.openFolder },
      { label: "Open Workspace from File...", action: actions.openWorkspaceFromFile },
      { separator: true },

      { separator: true },
      { label: "Add Folder to Workspace...", action: actions.addFolderToWorkspace },
      { label: "Save Workspace As...", action: actions.saveWorkspaceAs },
      { label: "Duplicate Workspace", action: actions.duplicateWorkspace },
      { separator: true },
      { label: "Save", shortcut: "Ctrl+S", action: actions.save },
      { label: "Save As...", shortcut: "Ctrl+Shift+S", action: actions.saveAs },
      { label: "Save All", shortcut: "Ctrl+K S", action: actions.saveAll },
      { separator: true },
      { label: "Share", submenu: [
        { label: "Copy Link to File...", action: actions.share },
      ]},
      { separator: true },
      { label: "Auto Save", action: actions.autoSave },
      { label: "Preferences", action: actions.preferences },
      { separator: true },
      { label: "Revert File", action: actions.revertFile },
      { separator: true },
      { label: "Close Editor", shortcut: "Ctrl+F4", action: actions.closeEditor },
      { label: "Close Folder", action: actions.closeFolder },
      { label: "Close Window", shortcut: "Alt+F4", action: actions.closeWindow },
      { separator: true },
      { label: "Exit", shortcut: "Ctrl+Q", action: actions.exit },
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
      { label: "Replace in Files", shortcut: "Ctrl+Shift+H", action: actions.replaceInFiles },
      { separator: true },
      { label: "Toggle Line Comment", shortcut: "Ctrl+/", action: actions.toggleLineComment },
      { label: "Toggle Block Comment", shortcut: "Shift+Alt+A", action: actions.toggleBlockComment },
      { separator: true },
      { label: "Emmet: Expand Abbreviation", shortcut: "Tab", action: actions.emmetExpandAbbreviation },
    ],
  }

  const SELECTION_MENU: MenuItem = {
    label: "Selection",
    submenu: [
      { label: "Select All", shortcut: "Ctrl+A", action: actions.selectAll },
      { label: "Expand Selection", shortcut: "Shift+Alt+→", action: actions.expandSelection },
      { label: "Shrink Selection", shortcut: "Shift+Alt+←", action: actions.shrinkSelection },
      { separator: true },
      { label: "Copy Line Up", shortcut: "Shift+Alt+↑", action: actions.copyLineUp },
      { label: "Copy Line Down", shortcut: "Shift+Alt+↓", action: actions.copyLineDown },
      { label: "Move Line Up", shortcut: "Alt+↑", action: actions.moveLineUp },
      { label: "Move Line Down", shortcut: "Alt+↓", action: actions.moveLineDown },
      { label: "Duplicate Selection", shortcut: "Ctrl+Shift+D", action: actions.duplicateSelection },
      { separator: true },
      { label: "Add Cursor Above", shortcut: "Ctrl+Alt+↑", action: actions.addCursorAbove },
      { label: "Add Cursor Below", shortcut: "Ctrl+Alt+↓", action: actions.addCursorBelow },
      { label: "Add Cursors to Line Ends", shortcut: "Shift+Alt+I", action: actions.addCursorsToLineEnds },
      { label: "Add Next Occurrence", shortcut: "Ctrl+D", action: actions.addNextOccurrence },
      { label: "Add Previous Occurrence", shortcut: "Ctrl+Shift+D", action: actions.addPreviousOccurrence },
      { label: "Select All Occurrences", shortcut: "Ctrl+Shift+L", action: actions.selectAllOccurrences },
      { separator: true },
      { label: "Switch to Ctrl+Click for Multi-Cursor", action: actions.switchToCtrlClickForMultiCursor },
      { label: "Column Selection Mode", action: actions.columnSelectionMode },
    ],
  }

  const VIEW_MENU: MenuItem = {
    label: "View",
    submenu: [
      { label: "Command Palette...", shortcut: "Ctrl+Shift+P", action: actions.commandPalette },
      { label: "Open View...", shortcut: "Ctrl+Shift+O", action: actions.openView },
      { separator: true },
      { label: "Appearance", submenu: [
        { label: "Explorer", shortcut: "Ctrl+Shift+E", action: actions.toggleExplorer },
        { label: "Search", shortcut: "Ctrl+Shift+F", action: actions.toggleSearch },
        { label: "Source Control", shortcut: "Ctrl+Shift+G", action: actions.toggleSourceControl },
        { label: "Run", shortcut: "Ctrl+Shift+D", action: actions.toggleRun },
        { label: "Extensions", shortcut: "Ctrl+Shift+X", action: actions.toggleExtensions },
        { label: "OpenCode Chat", shortcut: "Ctrl+Shift+I", action: actions.toggleChat },
        { label: "Browser", shortcut: "Ctrl+Shift+U", action: actions.toggleBrowser },
        { separator: true },
        { label: "Problems", shortcut: "Ctrl+Shift+M", action: actions.toggleProblems },
        { label: "Output", shortcut: "Ctrl+Shift+U", action: actions.toggleOutput },
        { label: "Debug Console", shortcut: "Ctrl+Shift+Y", action: actions.toggleDebugConsole },
        { separator: true },
        { label: "Toggle Terminal", shortcut: "Ctrl+`", action: actions.togglePanel },
        { label: "Toggle Secondary Sidebar", action: actions.toggleSecondarySideBar },
        { label: "Toggle Word Wrap", shortcut: "Alt+Z", action: actions.toggleWordWrap },
        { separator: true },
        { label: "Toggle Fullscreen", shortcut: "F11", action: actions.toggleFullScreen },
        { label: "Toggle Zen Mode", shortcut: "Ctrl+K Z", action: actions.toggleZenMode },
      ]},
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
      { label: "Last Edit Location", shortcut: "Ctrl+K Ctrl+Q", action: actions.lastEditLocation },
      { separator: true },
      { label: "Switch Editor", shortcut: "Ctrl+Tab", action: actions.switchEditor },
      { label: "Switch Group", shortcut: "Ctrl+Shift+Tab", action: actions.switchGroup },
      { separator: true },
      { label: "Go to File...", shortcut: "Ctrl+P", action: actions.goToFile },
      { label: "Go to Symbol in Workspace...", shortcut: "Ctrl+T", action: actions.goToSymbolWorkspace },
      { label: "Go to Symbol in Editor...", shortcut: "Ctrl+Shift+O", action: actions.goToSymbolEditor },
      { label: "Go to Line/Column...", shortcut: "Ctrl+G", action: actions.goToLine },
      { separator: true },
      { label: "Go to Definition", shortcut: "F12", action: actions.goToDefinition },
      { label: "Go to Declaration", shortcut: "Ctrl+F12", action: actions.goToDeclaration },
      { label: "Go to Type Definition", shortcut: "Ctrl+Shift+F12", action: actions.goToTypeDefinition },
      { label: "Go to Implementation", shortcut: "Ctrl+F12", action: actions.goToImplementation },
      { label: "Go to References", shortcut: "Shift+F12", action: actions.goToReferences },
      { separator: true },
      { label: "Go to Bracket", shortcut: "Ctrl+Shift+\\", action: actions.goToBracket },
      { separator: true },
      { label: "Next Problem", shortcut: "F8", action: actions.nextProblem },
      { label: "Previous Problem", shortcut: "Shift+F8", action: actions.previousProblem },
      { separator: true },
      { label: "Next Change", shortcut: "Ctrl+Alt+PgDn", action: actions.nextChange },
      { label: "Previous Change", shortcut: "Ctrl+Alt+PgUp", action: actions.previousChange },
    ],
  }

  const RUN_MENU: MenuItem = {
    label: "Run",
    submenu: [
      { label: "Start Debugging", shortcut: "F5", action: actions.startDebugging },
      { label: "Run Without Debugging", shortcut: "Ctrl+F5", action: actions.runWithoutDebugging },
      { label: "Stop Debugging", shortcut: "Shift+F5", action: actions.stopDebugging },
      { label: "Restart Debugging", shortcut: "Ctrl+Shift+F5", action: actions.restartDebugging },
      { separator: true },
      { label: "Open Configurations", action: actions.openConfigurations },
      { label: "Add Configuration...", action: actions.addConfiguration },
      { separator: true },
      { label: "Step Over", shortcut: "F10", action: actions.stepOver },
      { label: "Step Into", shortcut: "F11", action: actions.stepInto },
      { label: "Step Out", shortcut: "Shift+F11", action: actions.stepOut },
      { label: "Continue", shortcut: "F5", action: actions.continue },
      { separator: true },
      { label: "Toggle Breakpoint", shortcut: "F9", action: actions.toggleBreakpoint },
      { label: "New Breakpoint", action: actions.newBreakpoint },
      { separator: true },
      { label: "Enable All Breakpoints", action: actions.enableAllBreakpoints },
      { label: "Disable All Breakpoints", action: actions.disableAllBreakpoints },
      { label: "Remove All Breakpoints", action: actions.removeAllBreakpoints },
      { separator: true },
      { label: "Install Additional Debuggers...", action: actions.installAdditionalDebuggers },
    ],
  }

  const OPENCODE_WEB_MENU: MenuItem = {
    label: workspaceName || "opencode-web",
    submenu: [
      { label: "About OpenCode Web", action: actions.about },
      { label: "Check for Updates...", action: actions.checkForUpdates },
      { separator: true },
      { label: "Preferences", shortcut: "Ctrl+,", action: actions.preferences },
      { label: "Profiles", action: actions.profiles },
      { label: "Settings", shortcut: "Ctrl+,", action: actions.settings },
      { label: "Extensions", shortcut: "Ctrl+Shift+X", action: actions.extensions },
      { label: "Keyboard Shortcuts", shortcut: "Ctrl+K Ctrl+S", action: actions.keyboardShortcuts },
      { label: "Snippets", action: actions.snippets },
      { label: "Tasks", action: actions.tasks },
      { separator: true },
      { label: "Themes", action: actions.themes },
      { separator: true },
      { label: "Toggle Developer Tools", shortcut: "Ctrl+Shift+I", action: actions.toggleDeveloperTools },
      { label: "Open Process Explorer", action: actions.openProcessExplorer },
    ],
  }

  const PSF_MENU: MenuItem = {
    label: "PSF",
    submenu: [
      { label: "Settings", shortcut: "Ctrl+,", action: actions.settings },
      { label: "Profiles", action: actions.profiles },
      { label: "Extensions", shortcut: "Ctrl+Shift+X", action: actions.extensions },
      { label: "Keyboard Shortcuts", shortcut: "Ctrl+K Ctrl+S", action: actions.keyboardShortcuts },
      { label: "Snippets", action: actions.snippets },
      { label: "Tasks", action: actions.tasks },
      { label: "Themes", action: actions.themes },
    ],
  }

  const EXPLORER_MENU: MenuItem = {
    label: "EXPLORER",
    submenu: [
      { label: "Explorer", shortcut: "Ctrl+Shift+E", action: actions.toggleExplorer },
      { label: "Search", shortcut: "Ctrl+Shift+F", action: actions.toggleSearch },
      { label: "Source Control", shortcut: "Ctrl+Shift+G", action: actions.toggleSourceControl },
      { label: "Run and Debug", shortcut: "Ctrl+Shift+D", action: actions.toggleRun },
      { label: "Extensions", shortcut: "Ctrl+Shift+X", action: actions.toggleExtensions },
      { separator: true },
      { label: "Problems", shortcut: "Ctrl+Shift+M", action: actions.toggleProblems },
      { label: "Output", shortcut: "Ctrl+Shift+U", action: actions.toggleOutput },
      { label: "Debug Console", shortcut: "Ctrl+Shift+Y", action: actions.toggleDebugConsole },
      { label: "Terminal", shortcut: "Ctrl+`", action: actions.togglePanel },
    ],
  }

  const TERMINAL_MENU: MenuItem = {
    label: "Terminal",
    submenu: [
      { label: "New Terminal", shortcut: "Ctrl+Shift+`", action: actions.newTerminal },
      { label: "Split Terminal", shortcut: "Ctrl+Shift+5", action: actions.splitTerminal },
      { label: "New Terminal Window", action: actions.newTerminalWindow },
      { separator: true },
      { label: "Run Task...", action: actions.runTask },
      { label: "Run Build Task...", shortcut: "Ctrl+Shift+B", action: actions.runBuildTask },
      { label: "Run Active File", action: actions.runActiveFile },
      { label: "Run Selected Text", action: actions.runSelectedText },
      { separator: true },
      { label: "Show Running Tasks...", action: actions.showRunningTasks },
      { label: "Restart Running Task...", action: actions.restartRunningTask },
      { label: "Terminate Task...", action: actions.terminateTask },
      { separator: true },
      { label: "Configure Tasks...", action: actions.configureTasks },
      { label: "Configure Default Build Task...", action: actions.configureDefaultBuildTask },
      { separator: true },
      { label: "Select Default Profile...", action: actions.selectDefaultShell },
    ],
  }

  const HELP_MENU: MenuItem = {
    label: "Help",
    submenu: [
      { label: "Welcome", action: actions.welcome },
      { label: "Show All Commands", shortcut: "Ctrl+Shift+P", action: actions.showAllCommands },
      { label: "Documentation", action: actions.documentation },
      { label: "Editor Playground", action: actions.editorPlayground },
      { separator: true },
      { label: "Walkthroughs...", action: actions.openWalkthrough },
      { label: "Get Started with Accessibility", action: actions.getStartedWithAccessibility },
      { separator: true },
      { label: "Ask at opencode-web Help", action: actions.askAtVscode },
      { label: "Keyboard Shortcuts Reference", action: actions.keyboardShortcutsReference },
      { label: "Video Tutorials", action: actions.videoTutorials },
      { label: "Tips and Tricks", action: actions.tipsAndTricks },
      { label: "Join Us on YouTube", action: actions.joinUsOnYoutube },
      { separator: true },
      { label: "Search Feature Requests", action: actions.searchFeatureRequests },
      { label: "Report Issue", action: actions.reportIssue },
      { separator: true },
      { label: "View License", action: actions.viewLicense },
      { label: "Privacy Statement", action: actions.privacyStatement },
      { separator: true },
      { label: "Toggle Developer Tools", shortcut: "Ctrl+Shift+I", action: actions.toggleDeveloperTools },
      { label: "Open Process Explorer", action: actions.openProcessExplorer },
      { separator: true },
      { label: "Check for Updates", action: actions.checkForUpdates },
      { separator: true },
      { label: "About", action: actions.about },
    ],
  }

  return [FILE_MENU, EDIT_MENU, SELECTION_MENU, VIEW_MENU, GO_MENU, RUN_MENU, TERMINAL_MENU, HELP_MENU]
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
              class="fixed min-w-56 bg-surface-raised-base border border-border-base rounded-md shadow-xl py-1 z-50 overflow-y-auto overflow-x-hidden"
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