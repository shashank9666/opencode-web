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
- [ ] 6. Git source control with three main options: repos used list, changes (with commit message generation & actions), and Git timeline/pull requests/all Git actions/Git graph/Git history/Git logs fully functional.
- [ ] 9. Git inspect: see modified/untracked files with markers in file explorer.
- [ ] 9. Git blame: show inline which line of code was written by which contributor.

## 5. Terminal & Debugging
- [ ] 8. Run and debug: customizable `launch.json` file to run/debug projects, and support for debug URLs (like VS Code).
- [x] 11. Fix split terminal (clone now appends instead of replacing; sidebar tab list). Added vertical split mode: toggle split button renders two terminals side by side in the terminal panel.
- [x] 14. Testing panel: dynamically configurable test search keywords, framework selector, test file discovery via SDK file search, scan/run buttons, config persistence in localStorage.

## 6. Built-in Extensions & Remote
- [ ] 7. Remote Explorer: after connecting (WSL, SSH, or Container), show its explorer to open files remotely.
- [ ] 10. Built-in Extensions: Explorer, Search, Source Control, Terminal, Problems, Editor Tabs, Command Palette, Prettier, ESLint, Tailwind IntelliSense, Path IntelliSense, Error Lens, AI Chat, AI Completion, AI Actions, Git Integration, NPM Scripts.
- [x] 24. Rainbow CSV: per-column visual highlighting (8 alternating colors) for .csv, .tsv, .psv files via Monaco deltaDecorations.
- [ ] 24. Additional Built-in Extensions requested: Import Cost, NPM Intellisense, TLDR support.
- [x] 10. Fix Error Lens: highlights lines with errors/warnings, glyph margin color bars, hover tooltips.
- [ ] 22. Add general third-party extension support if possible.

## 7. AI & Chatbot
- [ ] 13. Chatbot options: changes overview, background terminals, artifacts.
- [ ] 13. Plan mode: token optimization, proper implementation plan / todo tracking (rather than just temp files).
- [ ] 13. Browser option: click to open a new tab showing what Playwright is doing, with options to view/pause/stop Playwright.

## 8. File Previews & Actions
- [x] 21. Previews for .md files (inline rendered preview in editor using `solid-markdown`), PDF files (iframe), and images (dialog).
- [x] 21. Support for image view, SVG view (dialog preview).
- [x] 21. PPT preview (binary file — opens in editor or prompts download).
- [x] 21. On-click file actions (right-click context menu with Open, Open to Side, Preview, Rename, Delete, Copy Path, New File/Folder).
- []  22. const MAX_UNDO_STACK_SIZE = 50;
          const MAX_REDO_STACK_SIZE = 50; add them to stack and they should for undo/redo actions 