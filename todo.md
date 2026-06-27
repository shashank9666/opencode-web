# IDE Todo & Bug Tracker

---

## Part 1 — UI / Launch Experience ✅

- [x] **Splash screen animation** — Replace the current animation with a better version
- [x] **Blank screen on IDE switch** — Add a loading spinner/skeleton when switching to the IDE tab to cover the blank-screen delay

---

## Part 2 — File Explorer ✅

- [x] **File click not opening in editor** — Clicking a file in the explorer must open it in the code editor panel
- [x] **Context menu not working** — Audit and implement every option in the right-click file menu:
  - Open to the Side (`Ctrl+Enter`)
  - Open With…
  - Reveal in File Explorer (`Shift+Alt+R`)
  - Open in Integrated Terminal
  - Attach to OpenChamber Chat
  - Select Files as Context
  - Share →
  - Select for Compare
  - Open Changes →
  - Open on Remote (Web) →
  - File History →
  - Open Timeline
  - Add File to Chat
  - Cut (`Ctrl+X`) / Copy (`Ctrl+C`)
  - Copy Path (`Shift+Alt+C`)
  - Copy Relative Path (`Ctrl+K Ctrl+Shift+C`)
  - Copy Remote File URL / Copy Remote File URL From…
  - Rename… (`F2`)
  - Delete (`Del`)
- [x] **Context menu overflow / layout bleed** — The right-click menu overflows outside the IDE boundary when scrolling. Strictly constrain all IDE panels inside their container; prevent any overflow beyond `<body>`/`<html>` boundaries

---

## Part 3 — Top Menu Bar ✅

- [x] **Menu bar items** — Add the following menus to the top bar (with a search bar centred between them):
  `File | Edit | Selection | View | Go | Run | opencode-web | PSF | EXPLORER | Terminal | Help`

### 3a. File Menu
- [x] New Text File (`Ctrl+N`)
- [x] New File… (`Ctrl+Alt+Win+N`)
- [x] New Window (`Ctrl+Shift+N`)
- [x] New Window with Profile →
- [x] Open File… (`Ctrl+O`)
- [x] Open Folder… (`Ctrl+K Ctrl+O`)
- [x] Open Workspace from File…
- [x] Open Recent →
- [x] Add Folder to Workspace…
- [x] Save Workspace As…
- [x] Duplicate Workspace
- [x] Save (`Ctrl+S`)
- [x] Save As… (`Ctrl+Shift+S`)
- [x] Save All (`Ctrl+K S`)
- [x] Share →
- [x] Auto Save
- [x] Preferences →
- [x] Revert File
- [x] Close Editor (`Ctrl+F4`)
- [x] Close Folder (`Ctrl+K F`)
- [x] Close Window (`Alt+F4`)
- [x] Exit

### 3b. Edit Menu
- [x] Undo (`Ctrl+Z`)
- [x] Redo (`Ctrl+Y`)
- [x] Cut (`Ctrl+X`) / Copy (`Ctrl+C`) / Paste (`Ctrl+V`)
- [x] Find (`Ctrl+F`)
- [x] Replace (`Ctrl+H`)
- [x] Find in Files
- [x] Replace in Files (`Ctrl+Shift+H`)
- [x] Toggle Line Comment (`Ctrl+/`)
- [x] Toggle Block Comment (`Shift+Alt+A`)
- [x] Emmet: Expand Abbreviation (`Tab`)

### 3c. Selection Menu
- [x] Select All (`Ctrl+A`)
- [x] Expand Selection (`Shift+Alt+→`)
- [x] Shrink Selection (`Shift+Alt+←`)
- [x] Copy Line Up (`Shift+Alt+↑`)
- [x] Copy Line Down (`Shift+Alt+↓`)
- [x] Move Line Up (`Alt+↑`)
- [x] Move Line Down (`Alt+↓`)
- [x] Duplicate Selection
- [x] Add Cursor Above (`Ctrl+Alt+↑`)
- [x] Add Cursor Below (`Ctrl+Alt+↓`)
- [x] Add Cursors to Line Ends (`Shift+Alt+I`)
- [x] Add Next Occurrence (`Ctrl+D`)
- [x] Add Previous Occurrence
- [x] Select All Occurrences
- [x] Switch to Ctrl+Click for Multi-Cursor
- [x] Column Selection Mode

### 3d. View Menu
- [x] Command Palette… (`Ctrl+Shift+P`)
- [x] Open View…
- [x] **Appearance** → (submenu)
- [x] Explorer (`Ctrl+Shift+E`)
- [x] Search
- [x] Source Control (`Ctrl+Shift+G G`)
- [x] Run (`Ctrl+Shift+D`)
- [x] Extensions (`Ctrl+Shift+X`)
- [x] Chat
- [x] Browser (`Ctrl+Alt+/`)
- [x] Problems (`Ctrl+Shift+M`)
- [x] Output (`Ctrl+Shift+U`)
- [x] Debug Console (`Ctrl+Shift+Y`)
- [x] Terminal (`` Ctrl+` ``)
- [x] Word Wrap (`Alt+Z`)

**Appearance submenu:**
- [x] Full Screen (`F11`)
- [x] Zen Mode (`Ctrl+K Z`)
- [x] ✓ Menu Bar
- [x] ✓ Primary Side Bar (`Ctrl+B`)
- [x] Secondary Side Bar (`Ctrl+Alt+B`)
- [x] ✓ Status Bar
- [x] Panel (`Ctrl+J`)
- [x] Zoom In (`Ctrl+=`)
- [x] Zoom Out (`Ctrl+-`)
- [x] Reset Zoom (`Ctrl+NumPad0`)

### 3e. Go Menu
- [x] Back (`Alt+←`)
- [x] Forward (`Alt+→`)
- [x] Last Edit Location (`Ctrl+K Ctrl+Q`)
- [x] Switch Editor →
- [x] Switch Group →
- [x] Go to File… (`Ctrl+P`)
- [x] Go to Symbol in Workspace… (`Ctrl+T`)
- [x] Go to Symbol in Editor… (`Ctrl+Shift+O`)
- [x] Go to Definition (`F12`)
- [x] Go to Declaration
- [x] Go to Type Definition
- [x] Go to Implementations
- [x] Go to References (`Shift+F12`)
- [x] Go to Line/Column… (`Ctrl+G`)
- [x] Go to Bracket (`Ctrl+Shift+\`)
- [x] Next Problem (`F8`) / Previous Problem (`Shift+F8`)
- [x] Next Change (`Alt+F3`) / Previous Change (`Shift+Alt+F3`)

### 3f. Run Menu
- [x] Start Debugging (`F5`)
- [x] Run Without Debugging
- [x] Stop Debugging (`Shift+F5`)
- [x] Restart Debugging (`Ctrl+Shift+F5`)
- [x] Open Configurations
- [x] Add Configuration…
- [x] Step Over (`F10`)
- [x] Step Into (`F11`)
- [x] Step Out (`Shift+F11`)
- [x] Continue (`F5`)
- [x] Toggle Breakpoint (`F9`)
- [x] New Breakpoint →
- [x] Enable / Disable / Remove All Breakpoints
- [x] Install Additional Debuggers…

### 3g. Terminal Menu
- [x] New Terminal (`Ctrl+Shift+``)
- [x] Split Terminal (`Ctrl+Shift+5`)
- [x] New Terminal Window (`Ctrl+Shift+Alt+``)
- [x] Run Task… / Run Build Task… (`Ctrl+Shift+B`)
- [x] Run Active File / Run Selected Text
- [x] Show Running Tasks…
- [x] Restart Running Task…
- [x] Terminate Task…
- [x] Configure Tasks… / Configure Default Build Task…

### 3h. Help Menu
- [x] Welcome
- [x] Show All Commands (`Ctrl+Shift+P`)
- [x] Documentation
- [x] Editor Playground
- [x] Open Walkthrough…
- [x] Show Release Notes
- [x] Get Started with Accessibility Features
- [x] Ask @vscode
- [x] Keyboard Shortcuts Reference (`Ctrl+K Ctrl+R`)
- [x] Video Tutorials / Tips and Tricks
- [x] Join Us on YouTube / Search Feature Requests / Report Issue
- [x] View License / Privacy Statement
- [x] Toggle Developer Tools / Open Process Explorer
- [x] Check for Updates…
- [x] About

### 3i. Settings (PSF) Menu
- [x] Command Palette… (`Ctrl+Shift+P`)
- [x] Profiles
- [x] Settings (`Ctrl+,`)
- [x] Extensions (`Ctrl+Shift+X`)
- [x] Keyboard Shortcuts (`Ctrl+K Ctrl+S`)
- [x] Snippets / Tasks
- [x] Themes →

---

## Part 4 — Editor Features ✅

- [x] **Markdown preview not working** — Implement a full VS Code–style Markdown preview panel:
  - Trigger via **Open Preview**, `Ctrl+Shift+V`, or opening a `.md` file
  - Pipeline: `marked` → `shiki` → preview pane (using existing `useMarked` context)
  - Support: tables, task lists, KaTeX math, YAML front matter, syntax highlighting
  - Relative image / link resolution
  - Theme-aware prose styling
  - Preview title: `Preview <filename>`
  - Reload button, link opening in new tab
  - HTML sanitization (script tag stripping)
- [x] **Image viewer zoom** — Add zoom-in and zoom-out controls to the image viewer:
  - Zoom (±25%), mouse wheel, pan when zoomed (drag)
  - Fit / Actual size buttons, percentage display
  - Both dialog preview (`@opencode-ai/ui/image-preview`) and inline editor viewer (`EditorArea.tsx`)

---

## Part 5 — Remote Explorer (Full Redesign)

- [x] **Recent connections list** — Show saved remote targets and reconnect from the panel
- [x] **Sectioned remote tree** — Show SSH, WSL, and Dev Container groups with clickable entries
- [x] **Per-host context menu** — Add connect, open folder, copy host, delete, and open terminal actions
- [x] **Connect in new window** — Make the tree submenu open a new connection path instead of doing nothing
- [x] **Status indicators** — Show connected, connecting, offline, and auth-failed states in the remote tree
- [x] **Remote command strip** — Add reconnect, close connection, install server, and show log actions
- [x] **Tunnels group** — Show tunnel-like remote entries alongside SSH, WSL, and containers
- [x] **Remote logs panel** — Surface connection, SSH, extension host, server, terminal, and git log streams
- [x] **Remote process explorer** — Show remote PID entries with inspect/kill actions
- [x] **Remote settings** — Provide User, Workspace, and Remote settings scopes in the panel
- [x] **Connection flow timeline** — Show SSH auth through ready-state stages
- [x] **Remote file operations** — Route create, rename, delete, move, copy, and drag/drop through remote actions
- [ ] **Complete redesign with working functionality** — Rebuild the Remote Explorer to match VS Code's remote workspace architecture:
  - Tree: SSH Targets, Dev Containers, WSL, Tunnels, Recent Connections
  - Per-host context menu: Connect, Connect in New Window, Open Folder…, Disconnect, Rename, Edit SSH Config, Copy Host, Delete
  - Status indicators: ● Connected, ○ Connecting…, ⚠ Auth Failed, ✕ Offline
  - Connection flow: SSH Auth → Start Remote Agent → Init File System → Open Workspace → Start Language Servers → Ready
  - Remote File Explorer behaves identically to local
  - Status bar shows `>< SSH: <host>` / `>< Dev Container` / `>< WSL: <distro>`
  - Command Palette remote commands: Connect to Host, Reconnect, Close Connection, Install Server, Kill Server, Show Log, Forward Port
  - All file operations (Create, Delete, Rename, Move, Copy, Drag & Drop) routed through remote agent
  - Terminal opens a remote shell, not a local one
  - Extensions install on the remote server
  - Global search (`Ctrl+Shift+F`) runs remotely
  - Git commands execute remotely
  - Debugger runs remotely via debug protocol
  - Port forwarding panel (Forward Port, Stop, Open in Browser, Copy Address, Change Visibility)
  - Remote Process Explorer (PID list, Kill, Inspect)
  - Remote Logs panel: Connection, SSH, Extension Host, Server, Terminal, Git
  - Remote Settings: User / Workspace / Remote (stored remotely)
  - Remote Explorer context menu: Connect, Connect in New Window, Disconnect, Open Folder, Edit Config, Show Logs, Install Server, Kill Server, Forward Port, Rename, Delete
  - Architecture: WebSocket/SSH → Remote Agent (File System API, Git API, Search API, Terminal API, Debug API, LSP Manager, Task Runner, Extension Host, Port Forwarder)

---

## Part 6 — AI Permission System ✅

- [x] **Permissions toggles not enforcing** — Implement a centralized Permission Manager that every AI tool call must pass through before execution:
  - Architecture: `AI Model → Agent Planner → Permission Manager (reads config) → Tool Executor`
  - Permission matrix with three states: **Allow / Ask / Deny**
  - Scopes: Once, Always, Session, Workspace
  - Each tool must declare its required permission:
    - `readFile()` → `filesystem.read.project`
    - `writeFile()` → `filesystem.write.project`
    - `exec("git status")` → `terminal.safe`
    - `exec("npm install")` → `terminal.all`
    - `browser.navigate()` → `browser`
    - `mcp.call()` → `mcp`
  - "Ask" mode shows an in-IDE confirmation prompt before execution
  - Config store must be wired to the Tool Executor (currently disconnected)

---

## Part 7 — AI Chat / Agent Workspace (Antigravity-level)

### Chat Experience
- [x] Streaming responses with Markdown rendering, syntax highlighting, Mermaid, LaTeX
- [ ] File & image attachments (drag & drop, paste)
- [ ] Code block actions: Copy, Apply to Editor, Retry, Continue, Edit Prompt, Branch, Regenerate, Stop
- [ ] Token usage display, model selector, temperature control, context indicator
- [x] `@file`, `@folder`, `@symbol`, `@diagnostics` mentions
- [ ] Slash commands, prompt history, search chat history
- [ ] Pin / rename / delete / export / import conversations
- [ ] Multi-chat tabs

### Context Management
- [ ] Workspace-wide context, selected files, open editors, Git diff, diagnostics, terminal output, browser logs, clipboard, images, URLs, PDFs, MCP resources, symbols, definitions, references, call hierarchy, workspace & project memories

### Agent Capabilities
- [ ] Read / edit / create / delete / rename / move files
- [ ] Codebase search, terminal execution, browser automation, Git operations
- [ ] Run tests, formatter, linter, package installs, build, deploy, debug
- [ ] Execute MCP tools

### Planning Mode
- [ ] Goal → Understand Project → Analyse Dependencies → Implementation Plan → Approval → Execution → Verification → Summary

### Task System
- [x] Every request becomes a task with states: Planning / Running / Waiting / Completed / Failed / Cancelled
- [x] Task detail: Timeline, Tool Calls, Files Changed, Commands Executed, Browser Actions, Logs, Artifacts

### Artifacts
- [x] Produce structured artifacts: Implementation Plan, TODO List, Architecture Diagram, Code Diff, Screenshot, Browser Recording, Test Report, Deployment Report, Performance Report, Documentation

### Tool Timeline
- [ ] Collapsible and searchable timeline of all tool calls with timestamps

### File Change Tracking
- [ ] Modified / Created / Deleted file list; click to open side-by-side diff
- [ ] Per-edit: Accept / Reject / View Diff / Edit Manually

### Browser Integration (Antigravity-style)
- [ ] Layout: Chat panel | Live Browser panel + bottom panel (Timeline, Console, Network, Screenshots, DOM, Logs)
- [ ] Browser Session Card: website, status, duration, viewport, actions count
- [ ] DOM Inspector with live highlight on click
- [ ] Element Details: Tag, Text, Role, Selector, Visible, Clickable
- [ ] Console panel (Error / Warning / Info / Log)
- [ ] Network panel (identical to DevTools: Headers, Request, Response, Timing, Preview)
- [ ] Screenshot timeline with full-size preview on click
- [ ] Browser recording (Pause, Stop, Download)
- [ ] Browser state: Cookies, Local Storage, Session Storage, IndexedDB
- [ ] Permission prompt before each AI interaction ("Allow Once / Always Allow / Reject")
- [ ] Recovery options on failure: Retry, Search Similar, Use OCR, Ask User, Cancel
- [ ] Playwright step view (Navigate → Click → Fill → Submit → Wait — each expandable)
- [ ] Toggle between Actions view and generated Playwright code view
- [ ] Browser memory: Visited Pages, Form Data, Downloads, Cookies, History
- [ ] Downloads panel: Open, Reveal, Delete
- [ ] Page Errors panel: 404, 500, Console, Accessibility, Slow Request
- [ ] Visual Diff (Before / After / Highlight Changes) when AI edits a page
- [ ] Multi-browser support: Chromium, Firefox, WebKit
- [ ] Device profiles: Desktop, Laptop, Tablet, iPhone, Pixel
- [ ] Responsive view breakpoints: 390 / 768 / 1024 / 1440 px
- [ ] AI Summary card at completion with step status and failure reason

### Terminal Integration
- [ ] Terminal panel shows: Commands, Exit Code, Duration, Output; actions: Restart, Kill, Copy

### Agent Modes
- [ ] Modes: Ask, Edit, Agent, Turbo, Review, Debug, Planning

### Multi-Agent Support
- [ ] Orchestrate parallel sub-agents: Backend, Frontend, Testing, Documentation, Refactor — merge results

### Knowledge / Memory
- [ ] Persist project memory: Coding Style, Architecture, Libraries, Patterns, Rules, Preferences

### Verification Pipeline
- [ ] Before "Done": Run Tests → Linter → Formatter → Build → Browser Test → Accessibility → Performance

### Chat Input
- [ ] Support `@`, `/`, `#`, drag files, paste images, voice/microphone, Stop, Continue, history, templates

### Conversation Memory
- [ ] Remember: current workspace, open files, previous edits/prompts, user preferences, pending tasks

### Diff Viewer
- [ ] Old / New / Accept / Reject / Accept All

### Background Tasks
- [ ] Run indexing, testing, doc generation, refactoring, search in the background while the user codes

### Notifications
- [ ] Task Completed, Tests Failed, Merge Conflict, Build Failed, Deployment Complete, Review Needed

### Chat Context Chips
- [ ] Removable chips above prompt: Workspace, N Files, Git Diff, Terminal, Browser, Screenshot, Console, MCP, Memory

### Suggested Actions
- [ ] After every response show quick-action buttons: Apply, Run Tests, Commit, Explain, Refactor, Optimize, Generate Docs, Continue

### Production Features
- [ ] Conversation search, workspace history, undo/redo AI edits, agent logs, metrics, cost & token tracking, model fallback, retry failed tools, offline queue, session restore, autosave
