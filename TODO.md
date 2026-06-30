# TODO

> Goal: Push the project past **9.5/10** and make it competitive with Cursor, Windsurf, Claude Code, and GitHub Copilot Workspace.

## High Priority — Core UX & Reliability

- [x] VS Code-level UI/UX polish
- [x] Better onboarding for first-time users
- [x] Reliability improvements around permissions and providers
- [/] Stronger debugging tools
  - Debug panel with breakpoints, variables, call stack, watch expressions exists (`DebugPanel.tsx`)
  - AI-suggested fix for runtime errors still missing

## High Priority — Developer Experience

- [x] One-click provider setup
  - Local provider detection (Ollama, LM Studio) added
- [x] Better Git integration
  - Source control panel with diff view, commit templates, push/pull/fetch
- [x] Inline blame annotations
  - Git blame gutter annotations implemented in `ide-editor.tsx` using `/api/git/blame`

## Medium Priority — Intelligence & Context

- [ ] More intelligent context management for very large repositories
- [ ] Persistent AI memory
- [ ] Better file indexing

## Medium Priority — Agent & Workflow

- [ ] Multi-agent orchestration
- [ ] Better agent planning/execution visualization
- [ ] Background autonomous tasks

## Medium Priority — Editor & Extensions

- [ ] Extension ecosystem
- [ ] Integrated terminal AI

## Lower Priority — Advanced Features

- [ ] Voice coding
- [ ] Built-in browser automation
- [ ] MCP server management UI
- [ ] Visual workflow builder
- [ ] Git conflict resolution with AI

## Infrastructure & Quality

- [ ] Better testing infrastructure
- [ ] Performance optimization
- [ ] Documentation improvements

---

## Progress Legend

- `[ ]` Not started
- `[/]` In progress
- `[x]` Completed