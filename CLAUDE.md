# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenCode is an AI-powered development tool — a CLI/TUI and web app that provides AI coding assistance with multi-provider LLM support, tool execution (bash, file ops, LSP, MCP), session management, and a plugin system.

## Monorepo Structure

Bun workspaces with Turborepo orchestration. Key packages:

- **`packages/core`** — Domain logic: sessions, agents, models, tools, providers, config, permissions, filesystem, git, MCP, LSP, ACP. All state is event-sourced into SQLite.
- **`packages/llm`** — LLM abstraction layer: providers (Anthropic, OpenAI, Google, Bedrock, etc.), protocols (Chat, Responses, Messages, Bedrock Converse), auth, streaming transports.
- **`packages/server`** — HTTP + WebSocket server wrapping core services. Exposes OpenAPI spec used by the SDK.
- **`packages/tui`** — Terminal UI using OpenTUI (SolidJS bindings for terminal rendering).
- **`packages/opencode`** — Main CLI entry point. Combines core + server + TUI. Builds to distributable binary.
- **`packages/app`** — Browser-based SolidJS SPA (alternative to TUI).
- **`packages/ui`** — Shared UI components (used by both app and tui).
- **`packages/sdk`** — Generated TypeScript client from the server's OpenAPI spec.
- **`packages/plugin`** — Plugin SDK for hooking into tool execution, auth, config, message transforms.
- **`packages/http-recorder`** — VCR-style HTTP recording/replay for deterministic LLM provider tests.
- **`packages/script`** — Internal build and utility scripts.
- **`packages/effect-drizzle-sqlite`** / **`packages/effect-sqlite-node`** — Effect wrappers bridging Drizzle ORM with SQLite.

## Key Technologies

- **Runtime**: Bun (`bun@1.3.14`) with conditional imports for Node.js compatibility (`#sqlite`, `#pty`)
- **Effect** (`v4.0.0-beta.74`): Pervasive for DI (`Context.Service`, `Layer`), error handling, concurrency, schema validation, HTTP, SQL
- **Drizzle ORM** (`v1.0.0-rc.2`): SQLite schema definitions in `sql.ts` files throughout core
- **SolidJS**: UI for both web app and TUI (via OpenTUI terminal renderer)
- **Vercel AI SDK** (`@ai-sdk/*`): LLM provider integrations
- **TypeScript**: Uses `tsgo` (`@typescript/native-preview`) for fast type checking

## Commands

```bash
# Install dependencies (from root)
bun install

# Run the CLI in dev mode
bun run dev

# Run the web app in dev mode
bun run dev:web

# Type checking (all packages)
bun turbo typecheck

# Type checking (single package, e.g. core)
cd packages/core && bun run typecheck

# Linting (uses oxlint, not ESLint)
bun run lint

# Run tests — do NOT run from root; run per-package
cd packages/opencode && bun test
cd packages/core && bun test
cd packages/llm && bun test
cd packages/app && bun test

# Run a single test file
cd packages/opencode && bun test test/session.test.ts

# Run previously-failed tests only
cd packages/opencode && bun test --only-failures

# Build the distributable CLI binary
cd packages/opencode && bun run build

# HTTP API exercise tests (opencode package)
cd packages/opencode && bun run test:httpapi
```

## Architecture Patterns

### Event Sourcing
All state changes in core are captured as events (`EventV2`) in SQLite. Projectors materialize views. This is the backbone — don't bypass it for state mutations.

### Effect Dependency Injection
Services are defined via `Context.Service` and composed with `Layer`. The application runtime (`ManagedRuntime`) wires everything together. New services follow the same pattern — define a service tag, implement with `Layer.effect()`, compose with `Layer.mergeAll()`.

### Conditional Imports
Bun vs Node.js compatibility is handled via `imports` field in package.json (e.g., `#db` resolves to `db.bun.ts` or `db.node.ts`). New platform-specific code should follow this pattern.

### Schema Validation
IDs are branded types via `Schema.brand()`. Data structures use `Schema.Class` and `Schema.Struct` for runtime validation. Errors use `Schema.TaggedErrorClass`.

## Testing

- Framework: Bun's built-in test runner (Jest-like API: `describe`/`it`/`expect`)
- Tests live in `test/` directories (`packages/core/test/`, `packages/opencode/test/`, `packages/llm/test/`) or `src/` (`packages/app`)
- HTTP recording via `@opencode-ai/http-recorder` for deterministic LLM provider tests
- E2E tests in `packages/app/e2e/` use Playwright
- `packages/app` requires `happydom` preload for DOM simulation in unit tests

## Code Style

- Prettier: no semicolons, 120 char print width
- Linting: oxlint with type-aware rules enabled. Notable disabled rules: `require-yield` (Effect generators), `no-shadow` (Effect closures), `no-unassigned-vars` (SolidJS refs)
- No ESLint — oxlint is the linter

## Configuration

- XDG paths: data at `~/.local/share/opencode/`, config at `~/.config/opencode/`
- Main config file: `opencode.json`
- Plugin configuration in the `plugin` array of config
- MCP servers configured in the `mcp` section of config
