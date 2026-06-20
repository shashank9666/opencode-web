# OpenCode Feature Backlog & Todo

## 1. UI & Theming
- [ ] 1. Colorful material icons, material theme and smoother file explorer management.
- [ ] 2. Custom icons option, theme, etc., to allow users to customize anything.
- [ ] 3. Customize the command palette (not just themes/colors).
- [ ] 16. In view menu: remove extensions option. Ensure all menu panels (File, Edit, View, Go, Run, Terminal) are properly working.
- [ ] 17. Sidebar and other panels: if options exceed height, use an additional panel/dropdown with a `...` button.
- [ ] 20. Central search bar in the header, identical to VS Code.

## 2. Editor & Layout
- [ ] 15. Fix split window in code editor. Support drag and drop panels over one another to swap them.
- [ ] 15. Customizable layout options in the status bar and a full-screen option.
- [ ] 18. Code editor: support compact sessions, checkpoints.
- [ ] 18. Settings panel: options to dynamically operate `opencode.jsonc`.
- [ ] 19. Fix the line and column tracker in the bottom bar (currently not working).
- [ ] 19. Language support for popular languages (TypeScript, JavaScript, Python, C/C++, Go, Java, etc.).

## 3. Search & Navigation
- [ ] 4. Advanced Search Explorer with options: find word/letters, files to include, files to exclude, replace all, match case, match whole word, use regular expressions, collapse all, view as tree, open new search editor, refresh, clear search results.
- [ ] 5. Search Explorer: click on any result to focus the code editor exactly on that result (letter/word, filenames, foldernames, etc.).
- [ ] 12. Fix command palette (currently not working).
- [ ] 12. Fix "Go to File" (currently unable to search files on the go).

## 4. Source Control (Git)
- [ ] 6. Git source control with three main options: repos used list, changes (with commit message generation & actions), and Git timeline/pull requests/all Git actions/Git graph/Git history/Git logs fully functional.
- [ ] 9. Git inspect: see modified/untracked files with markers in file explorer.
- [ ] 9. Git blame: show inline which line of code was written by which contributor.

## 5. Terminal & Debugging
- [ ] 8. Run and debug: customizable `launch.json` file to run/debug projects, and support for debug URLs (like VS Code).
- [ ] 11. Fix split terminal (currently not working).
- [ ] 14. Testing: make dynamically configurable by user (currently static).

## 6. Built-in Extensions & Remote
- [ ] 7. Remote Explorer: after connecting (WSL, SSH, or Container), show its explorer to open files remotely.
- [ ] 10. Built-in Extensions: Explorer, Search, Source Control, Terminal, Problems, Editor Tabs, Command Palette, Prettier, ESLint, Tailwind IntelliSense, Path IntelliSense, Error Lens, AI Chat, AI Completion, AI Actions, Git Integration, NPM Scripts.
- [ ] 10. Fix Error Lens (currently doesn't show syntax errors/problems in code properly).
- [ ] 22. Add general third-party extension support if possible.

## 7. AI & Chatbot
- [ ] 13. Chatbot options: changes overview, background terminals, artifacts.
- [ ] 13. Plan mode: token optimization, proper implementation plan / todo tracking (rather than just temp files).
- [ ] 13. Browser option: click to open a new tab showing what Playwright is doing, with options to view/pause/stop Playwright.

## 8. File Previews & Actions
- [ ] 21. Previews for PDF, PPT, and .md files.
- [ ] 21. Support for image view, SVG view, and SVG edit code.
- [ ] 21. On-click file actions (support all standard file actions like VS Code).
