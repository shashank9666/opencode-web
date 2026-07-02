# Effect TODO

Short roadmap for Effect cleanup in `packages/opencode`.

Current patterns and examples live in [`guide.md`](./guide.md). Error
boundary migration details live in
[`error-boundaries-plan.md`](./error-boundaries-plan.md). Test migration rules live in
[`test/EFFECT_TEST_MIGRATION.md`](../../test/EFFECT_TEST_MIGRATION.md).
Older deep-dive notes in this directory may still be useful, but treat
this roadmap and the guide as the current entry points.

This is a planning map, not a verified inventory. Before starting a task,
re-run a targeted `git grep` from current `dev` and update this file if
the inventory changed.

## Priorities

```text
P0  ERR + RENDER + HTTP
    Make expected failures typed, render them well, and stop relying on
    generic HTTP error guesswork.

P1  TEST
    Convert touched tests to the ideal Effect test patterns from the guide.

P2  RF
    Move mutable runtime flags into typed runtime/config services.

P3  GLOBAL
    Make global paths explicit and remove import-time side effects.

P4  INST + BRIDGE
    Remove ambient Instance coupling while keeping Promise/callback interop.

P5  PROC + FS
    Replace raw process/filesystem edges with typed Effect services.

P6  OA
    Shrink OpenAPI compatibility shims as source schemas improve.
```

## Work Paths

- `ERR` Typed errors — replace legacy `NamedError.create(...)` and
  `Effect.die(...)` for expected service failures with
  `Schema.TaggedErrorClass` errors on the Effect error channel.
  Shrinks: [`NamedError`](../../../core/src/util/error.ts) usage.
- `RENDER` User-visible error rendering — preserve structured typed-error
  details at CLI, HTTP, and tool boundaries.
  Shrinks: opaque `Error: Name` rendering.
- `HTTP` HTTP route cleanup — make route errors explicit instead of
  relying on generic middleware to guess status/body from error names.
  Shrinks: [`middleware/error.ts`](../../src/server/routes/instance/httpapi/middleware/error.ts)
  and route-level compatibility shims.
- `TEST` Effect test migration — use `testEffect`, `it.live`, and
  `it.instance` with explicit layers.
  Shrinks: Promise-style tests, sleeps, mutable global test flags.
- `RF` RuntimeFlags / Flag deletion — move mutable
  [`Flag`](../../../core/src/flag/flag.ts) reads into typed runtime/config
  services.
  Shrinks: [`flag.ts`](../../../core/src/flag/flag.ts),
  [`test/fixture/flag.ts`](../../test/fixture/flag.ts).
- `GLOBAL` Global paths / import side effects — make global path state
  explicit and testable instead of mutable module state.
  Shrinks: [`global.ts`](../../../core/src/global.ts) import-time side
  effects, mutable `Global.Path` overrides, and its `Flag` dependency.
- `INST` Instance context — keep project context explicit through Effect refs
  and bridge boundaries.
- `BRIDGE` Promise/callback interop — keep bridge helpers, but reduce
  legacy ALS coupling.
  Shrinks: ad hoc Promise/callback re-entry code.
- `PROC` AppProcess migration — prefer `AppProcess.Service` over raw
  process wrappers.
  Shrinks: direct spawn callsites and legacy process helpers.
- `FS` FSUtil migration — prefer `FSUtil.Service` over raw
  filesystem APIs.
  Shrinks: direct `fs` / `Bun.file` service callsites where inappropriate.
- `RT` Runtime/facade cleanup — remove service-local `makeRuntime`
  facades when not intentional.
  Shrinks: async facade exports around services and
  [`run-service.ts`](../../src/effect/run-service.ts) usage.
- `OA` OpenAPI compatibility — tighten source schemas instead of
  post-processing generated OpenAPI.
  Shrinks: schema workaround blocks in
  [`public.ts`](../../src/server/routes/instance/httpapi/public.ts).

## P0: Errors, Rendering, And HTTP

This should be the next big cleanup theme. The codebase is moving toward
typed Effect failures, but the user-facing boundaries still leak old
shapes and sometimes collapse rich errors into opaque strings.

### Problems

- Some expected service failures still use `NamedError.create(...)` or
  collapse to `Effect.die(...)`. The storage/worktree/provider-auth
  conversions are done; an inventory sweep is needed for the rest.
- HTTP error middleware still guesses status codes from error names —
  some entries (e.g. storage `NotFound`, provider auth) can now be
  removed, but the middleware overall has not shrunk.
- Route handlers and route groups do not consistently declare the public
  error body they intend to expose.
- Repeated route error translations do not yet have a clear home: some
  should stay inline, some deserve tiny shared mapper helpers.

### Target Shape

- Services define expected failures with `Schema.TaggedErrorClass`.
- Services export an `Error` union and include it in method return types.
- Expected failures stay on the Effect error channel.
- `Effect.die(...)` is reserved for defects: bugs, impossible states,
  violated invariants, or final unknown-boundary fallbacks.
- Inside `Effect.gen` / `Effect.fn`, use `yield* new MyError(...)` for
  direct expected failures.
- Domain services do not import HTTP status codes, `HttpApiError`, or
  route-specific error schemas.
- HTTP route groups make their public error contracts obvious.
- Handlers map service errors to declared HTTP errors at the boundary.
- Shared mapper helpers are only for repeated translations, not a giant
  central registry of every domain error.
- Generic HTTP middleware should shrink; it should not accumulate more
  name-based domain knowledge.

### Recently completed

- [x] `RENDER-1` CLI tagged config error rendering (#27256, tests #27257).
- [x] `ERR-1` [`storage/storage.ts`](../../src/storage/storage.ts) typed
      `NotFoundError` (#27265) and removal of the server defect fallback
      (#27287).
- [x] `ERR-2` [`worktree/index.ts`](../../src/worktree/index.ts) typed
      errors (#27296).
- [x] `ERR-3` [`provider/auth.ts`](../../src/provider/auth.ts) typed
      validation/oauth errors (#27301).
- [x] `HTTP-1` Unknown-500 details no longer leaked (#27251); follow-up
      to stop exposing named defects (#27471).
- [x] Session message reads typed and made effectful (#27269, #27275,
      #27280, #27291).
- [x] Session HTTP error contracts tightened (#27308); busy-session
      mapping centralized (#27375, #27473).
- [x] Provider init (#27484) and LSP init (#27494) errors typed.

### Completed / In Progress

- [x] `HTTP-2` Audited one route group (file) for explicit error contracts —
      added `FileNotFoundError` and `PathEscapesError` to the HttpApi
      group with proper HTTP status codes (404/400). Changed the content
      handler to yield typed errors instead of `Effect.die`.
- [x] `ERR-4` Swept remaining `NamedError.create(...)` callsites. Migrated
      or removed unused instances: MCP.Failed removed (was never thrown).
      Used `NamedError` remaining as-is: `packages/core/src/v1/` errors
      are legacy but still actively used by name-based rendering in CLI/TUI
      and HTTP middleware. The `configData()` function supports both
      `{ name, data }` and `{ _tag, ...fields }` shapes.
- [x] `RENDER-2` Audited CLI and TUI surfaces for opaque `Error: Name`
      rendering. Fixed 3 high-risk locations: `run.ts` (716-717) — use
      `.message` before `.name`; `session-data.ts` (178-179) — removed
      bare `.name` fallback; `stream.transport.ts` (256, 265-267) —
      removed `.name` fallbacks. Remaining lower-risk locations use
      `.name` as a prefix within a longer message or as structured data.

## P1: Tests

When touching tests, migrate them toward the ideal patterns in
[`test/EFFECT_TEST_MIGRATION.md`](../../test/EFFECT_TEST_MIGRATION.md):

- Use `testEffect(...)` with explicit layers.
- Prefer `it.instance(...)` for service tests that need an instance.
- Prefer `it.live(...)` for real timers, filesystem mtimes, child
  processes, git, locks, or other live integration behavior.
- Avoid sleeps; wait on real events or deterministic state transitions.
- Do not mutate `process.env` or mutable globals after layers are built.
- Use explicit layer variants, such as `RuntimeFlags.layer(...)`, for
  behavior changes.

## P2: RuntimeFlags / Flag Deletion

Recently completed:

- [x] Plugin/pure-mode flags moved to RuntimeFlags.
- [x] Tool visibility flags moved to RuntimeFlags.
- [x] Built-in websearch provider selection uses the same runtime flags as
      tool visibility.
- [x] Removed global default-plugin disabling from test preload.
- [x] `RF-1` Reference reads routed through runtime flags (#27318).
- [x] `RF-2` Plan-mode prompt read routed through runtime flags (#27320).
- [x] `RF-3` Event-system reads routed through runtime flags (#27323).
- [x] `RF-4` Workspaces reads routed through runtime flags for session
      (#27335), sync (#27336), and control-plane (#27337).
- [x] LLM client (#27368) and installation client (#27369) routed
      through runtime flags.
- [x] TUI plugin runtime flags simplified (#27506).
- [x] Background-subagents flag moved to RuntimeFlags, then removed
      (`refactor(task): use runtime flag for background subagents`,
      `refactor(flags): remove background subagents flag`).

### Cleanup Inventory (from current sweep)

- `packages/core/src/` — 8 files import `Flag.*`:
  `database.ts`, `global.ts`, `models-dev.ts`, `shell.ts`,
  `instruction-context.ts`, `filesystem/search.ts`, `filesystem/watcher.ts`,
  `observability/otlp.ts`, `tool/websearch.ts`.
  Each reads an env-var boundary — most are legitimate env/boot config
  (OTEL, DB path, models URL, shell path). A few experimental flags
  (`DISABLE_FFF`, `EXPERIMENTAL_FILEWATCHER`) could migrate to
  RuntimeFlags.
- `packages/opencode/src/` — 18 files import `Flag.*`.
  Config path flags (`OPENCODE_CONFIG_DIR`, `OPENCODE_CONFIG`) and
  server secrets (`SERVER_PASSWORD/USERNAME`) are legitimate env config.
  Debug flags (`SHOW_TTFD`, `AUTO_HEAP_SNAPSHOT`, `FAKE_VCS`) are
  dev-only overrides. Workspace-routing flags (`WORKSPACE_ID`,
  `EXPERIMENTAL_WORKSPACES`) route through RuntimeFlags in some paths.
- `test/fixture/flag.ts` — **does not exist** (the referenced path
  doesn't exist in the current tree).
- Notable: `OPENCODE_DISABLE_PROJECT_CONFIG`, `OPENCODE_PURE`,
  `OPENCODE_PERMISSION`, `OPENCODE_CLIENT` are getter-based lazy flags
  that tests or runtime set via env vars — natural candidates for `Config`.

### Remaining

- [ ] Route experimental flags (`DISABLE_FFF`, `EXPERIMENTAL_FILEWATCHER`,
      `EXPERIMENTAL_DISABLE_FILEWATCHER`) through RuntimeFlags.
- [ ] Delete [`flag.ts`](../../../core/src/flag/flag.ts) once no packages
      import it.

## P3: Global Paths

[`global.ts`](../../../core/src/global.ts) is real connective tissue, not
just cosmetic ugliness. It currently mixes path calculation, import-time
directory creation, `Flock` setup, mutable exported `Path` state, and a
`Flag` dependency.

Problems to reduce:

- Importing the module creates directories.
- Tests override `Global.Path` by mutating exported module state.
- Most callers use `Global.Path` directly instead of the Effect service.
- `Global.make()` still reads mutable `Flag.OPENCODE_CONFIG_DIR`.

### Inventory

- 34 source files and 30+ test files import from `@opencode-ai/core/global`.
- `Global.Path.*` is used pervasively for config, data, log, cache, state,
  and tmp directories across both core and opencode packages.
- `Global.make()` reads `Flag.OPENCODE_CONFIG_DIR` and creates directories
  at import time via `global.ts`.
- No test overrides were found for `Global.Path` — tests import and use the
  real paths (mostly for temp directory fixtures).

### Remaining

- [ ] Replace mutable `Global.Path` test overrides with explicit test
      layers or scoped helpers.
- [ ] Move directory creation and `Flock` setup behind an explicit init
      boundary where possible.
- [ ] Remove the `Flag` dependency from global path resolution.

## P4: Instance And Bridge

Instance context migration is complete for the legacy sync shim. Promise and callback interop continues through [`effect/bridge.ts`](../../src/effect/bridge.ts).

Current rules:

- Effect services read instance data from `InstanceRef`, `WorkspaceRef`, `InstanceState`, or explicit arguments.
- Plain JavaScript callback boundaries use `EffectBridge` or explicit context arguments.
- Runtime entrypoints must provide refs explicitly when they are instance-scoped.

## Lower Priority Tracks

- `PROC` / `FS` — continue AppProcess and FSUtil migrations as
  focused PRs when touching relevant files.
- `RT` — remove service-local runtime facades only when they are not an
  intentional boundary.
- `OA` — shrink [`public.ts`](../../src/server/routes/instance/httpapi/public.ts)
  by tightening source schemas one workaround at a time.
- `fetch` → `HttpClient` — migrate raw fetch callsites when the caller is
  already effectful or being effectified.
- `Tools` — remaining tool cleanup is narrow: `webfetch` HTML extraction
  and `shell` raw stream/promise edges.
