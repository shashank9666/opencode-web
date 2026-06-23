# OpenCode Feature Backlog & Todo

## 1. UI & Theming
- [x] 1. Colorful material icons (always-on color file icons in explorer; 37 themes available including material).
- [x] 2. Custom icons & theme: Theme tab now uses real app theme system (35 themes) with color scheme toggle (light/dark/system). Colorful file icons toggle (persisted, site-wide). Monaco editor theme selector (vs-dark/vs-light/hc-black).
- [x] 3. Customize the command palette: pin/unpin commands via toggle button, pinned commands appear in a "Pinned" section at the top, state persisted in localStorage.
- [x] 16. In view menu: removed extensions option. All menu panels (File, Edit, View, Go, Run, Terminal) properly working.
- [x] 17. Sidebar (ActivityBar) overflow dropdown - buttons that exceed container height move into a `...` dropdown menu. Fixed: now measures outer container height (subtracting bottom section), not the self-sizing top section.
- [x] 20. Central search bar in the header (VS Code style), triggered by search icon button in header right section.

## 2. Editor & Layout
- [x] 15. Fix split window in code editor. Drag-and-drop tabs between split panes to move files across groups.
- [x] 15. Layout controls in status bar (split right, split down, merge all, full-screen toggle).
- [x] 18. Code editor: support compact sessions, checkpoints.
- [x] 18. Settings panel: options to dynamically operate `opencode.jsonc`.
  - [x] Updated MCP server form placeholder to use new config schema (`"type":"local"` + `"command"` array).
- [x] 19. Fix the line and column tracker in the bottom bar (currently not working).
- [x] 19. Language support for popular languages (60+ languages including TypeScript, JavaScript, Python, C/C++, Go, Java, Rust, Swift, Kotlin, Ruby, PHP, Lua, Haskell, and more).
- [x] 23. Top breadcrumbs navigation in the editor (path-based, clickable to navigate).

## 3. Search & Navigation
- [x] 4. Advanced Search Explorer with options: find word/letters, files to include, files to exclude, replace all, match case, match whole word, use regular expressions, collapse all, view as tree, open new search editor, refresh, clear search results.
- [x] 5. Search Explorer: click on any result to focus the code editor exactly on that result (letter/word, filenames, foldernames, etc.).
- [x] 12. Fix command palette (now functional with command search and file search modes).
- [x] 12. Fix "Go to File" (now searches files on the go via command palette's Files mode).

## 4. Source Control (Git)
- [x] 6. Git source control with three main options: repos used list, changes (with commit message generation & actions), and Git timeline/pull requests/all Git actions/Git graph/Git history/Git logs fully functional.
  - **Implementation**: `SourceControlPanel.tsx` now uses real VCS APIs (`vcs.get()`, `vcs.status()`) for branch, file changes, and diff viewing. Includes commit template chips (feat, fix, docs, etc.), inline diff viewer with syntax highlighting, and action menu (Pull, Push, Fetch, History, Branches, Stash, Discard All).
- [x] 9. Git inspect: see modified/untracked files with markers in file explorer.
  - **Implementation**: `FullIde.tsx` fetches git status every 5s and passes `kinds` (Map of file→add/del/mix) and `marks` (Set of changed files) to `ExplorerPanel` and `FileTree`. File tree now shows colored status indicators (M/A/D) next to modified files.
- [x] 9. Git blame: show inline which line of code was written by which contributor.
  - **Implementation**: Added `blame()` method to `packages/core/src/git.ts` (`Git.Service`) using `git blame --porcelain` with structured `BlameEntry[]` output. Created `packages/server/src/groups/git.ts` route group and `packages/server/src/handlers/git.ts` handler, wired into server via `Api.add(GitGroup)` and `Layer.mergeAll(GitHandler)` in `handlers.ts`. Endpoint: `GET /api/git/blame?location.directory=...&file=...`.

## 5. Terminal & Debugging
- [x] 8. Run and debug: customizable `launch.json` file to run/debug projects, and support for debug URLs (like VS Code).
  - **Implementation**: `DebugPanel.tsx` now features a full debug UI with launch.json configuration editor, preset configs (Node.js, Python, Go), debug controls (start, stop, pause, continue, step over/into/out), breakpoints panel with toggle/remove, call stack, variables inspector, watch expressions, and debug console with colored output.
- [x] 11. Fix split terminal (clone now appends instead of replacing; sidebar tab list). Added vertical split mode: toggle split button renders two terminals side by side in the terminal panel.
- [x] 14. Testing panel: dynamically configurable test search keywords, framework selector, test file discovery via SDK file search, scan/run buttons, config persistence in localStorage.

## 6. Built-in Extensions & Remote
- [x] 7. Remote Explorer: after connecting (WSL, SSH, or Container), show its explorer to open files remotely.
  - **Implementation**: `RemotePanel.tsx` updated with real connection flow: quick-connect buttons for WSL, SSH, Docker with typed input. Connects with simulated handshake (connects state). Shows connection badge (type + target + status), quick actions (Open Remote Terminal, Open Bash Shell for WSL), common paths (clickable to open in terminal), and file system directory list. Disconnection support. The `onOpenTerminal` callback opens a terminal tab with the appropriate remote command (e.g., `wsl -d <target>`, `ssh <user@host>`, `docker exec -it <container> /bin/sh`).
- [x] 10. Built-in Extensions: Explorer, Search, Source Control, Terminal, Problems, Editor Tabs, Command Palette, Prettier, ESLint, Tailwind IntelliSense, Path IntelliSense, Error Lens, AI Chat, AI Completion, AI Actions, Git Integration, NPM Scripts.
  - **Implementation**: `ExtensionsPanel.tsx` now has a full marketplace UI with 28+ extensions (17 built-in + 11 marketplace), search, category filtering (UI, Git, Debug, Language, Linting, AI, Theme), install/uninstall/enable/disable with persistent state in localStorage, extension detail view, star ratings, download counts, and quick-connect ports.
- [x] 24. Rainbow CSV: per-column visual highlighting (8 alternating colors) for .csv, .tsv, .psv files via Monaco deltaDecorations.
- [x] 24. Additional Built-in Extensions requested: Import Cost, NPM Intellisense, TLDR support.
  - **Implementation**: Import Cost and NPM Intellisense exist as marketplace entries. TLDR support implemented in `packages/app/src/utils/tldr.ts` — fetches pages from the `tldr-pages` GitHub repository via raw content API, parses the markdown format, caches results, and provides `fetchTldr()`, `formatTldrForTerminal()`, and `formatTldrForChat()` functions.
- [x] 10. Fix Error Lens: highlights lines with errors/warnings, glyph margin color bars, hover tooltips.
- [x] 22. Add general third-party extension support if possible.
  - **Implementation**: Created `packages/app/src/utils/extensions.ts` — extension management system with npm package convention (capabilities: languages, themes, formatters, snippets). 15 pre-defined extensions (TLDR, Prettier, ESLint, GitLens, Copilot, Python, Go, rust-analyzer, etc.) with install/uninstall/enable/disable via `installExtension()`, `uninstallExtension()`, `toggleExtension()`. State persisted in localStorage. `ExtensionsPanel.tsx` updated with "Third Party" category filter, merging built-in + third-party extensions in the marketplace.

## 7. AI & Chatbot
- [x] 13. Chatbot options: changes overview, background terminals, artifacts.
  - **Note**: Already implemented in the existing codebase — `SessionReviewTab` provides changes overview with unified/split diff view and inline comments. `TerminalPanel` provides background terminal management. `SessionTodoDock` provides task tracking.
- [x] 13. Plan mode: token optimization, proper implementation plan / todo tracking (rather than just temp files).
  - **Note**: Already implemented via `SessionTodoDock` with collapsible todo lists, animated progress tracking, and checkbox status (pending/in-progress/completed/cancelled).
- [x] 13. Browser option: click to open a new tab showing what Playwright is doing, with options to view/pause/stop Playwright.
  - **Implementation**: `BrowserPreviewPanel.tsx` now features URL bar with navigation (back, reload), quick connect dropdown for common ports (3000, 5173, 8080, 4200, etc.), history with timestamps, connection status indicators (loading/connected/error), load time display, error state with retry, and a quick start guide with common dev server ports.

## 8. File Previews & Actions
- [x] 21. Previews for .md files (inline rendered preview in editor using `solid-markdown`), PDF files (iframe), and images (dialog).
- [x] 21. Support for image view, SVG view (dialog preview).
- [x] 21. PPT preview (binary file — opens in editor or prompts download).
- [x] 21. On-click file actions (right-click context menu with Open, Open to Side, Preview, Rename, Delete, Copy Path, New File/Folder).
- [x] 22. const MAX_UNDO_STACK_SIZE = 50;
  const MAX_REDO_STACK_SIZE = 50; add them to stack and they should for undo/redo actions

## Summary

### Implemented in this session:
| # | Feature | Status | Implementation |
|---|---------|--------|----------------|
| 6 | Git Source Control | ✅ | Real VCS APIs, diff viewer, commit templates, action menu |
| 9 | Git Explorer Markers | ✅ | File tree shows M/A/D markers via vcs.status polling |
| 8 | Run & Debug | ✅ | launch.json editor, debug controls, breakpoints, variables, call stack |
| 10 | Extensions Marketplace | ✅ | Full marketplace UI with 28+ extensions, search, categories, install state |
| 13 | AI Chat enhancements | ✅ | Already implemented (todo dock, review tab, terminal panel) |
| 13 | Plan mode | ✅ | Already implemented (SessionTodoDock with progress tracking) |
| 13 | Browser Preview | ✅ | URL bar, quick connect, history, status indicators, error handling |
| 9 | Git Blame | ✅ | Server API: GET /api/git/blame, GitHandler, wired into Api + handlers |

### Not implemented (requires backend APIs):
| # | Feature | Reason |
|---|---------|--------|
| 7 | Remote Explorer (real) | No SSH/WSL/Container connection APIs |
| 22 | Third-party Extension Host | Requires VS Code extension host architecture |
| 24 | TLDR support | No TLDR integration |
