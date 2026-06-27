import { For, Show, createSignal, createMemo } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"

// ── launch.json types ──

type LaunchConfig = {
  version: string
  configurations: LaunchConfiguration[]
}

type LaunchConfiguration = {
  name: string
  type: string // "node", "python", "go", "rust", etc.
  request: "launch" | "attach"
  program?: string
  cwd?: string
  args?: string[]
  env?: Record<string, string>
  runtimeExecutable?: string
  console?: "integratedTerminal" | "internalConsole" | "externalTerminal"
  preLaunchTask?: string
  outFiles?: string[]
  sourceMaps?: boolean
  restart?: boolean
  port?: number
  serverReadyAction?: {
    action: "debugWithChrome" | "debugWithFirefox" | "openExternally" | "debugWithNode"
    serverReadyPattern?: string
    uriFormat?: string
  }
}

// ── Preset configurations ──

const PRESET_CONFIGS: Omit<LaunchConfiguration, "name">[] = [
  {
    type: "node",
    request: "launch",
    program: "${workspaceFolder}/src/index.ts",
    console: "integratedTerminal",
    sourceMaps: true,
    outFiles: ["${workspaceFolder}/dist/**/*.js"],
  },
  {
    type: "node",
    request: "launch",
    program: "${workspaceFolder}/src/main.ts",
    console: "integratedTerminal",
    sourceMaps: true,
    args: [],
  },
  {
    type: "python",
    request: "launch",
    program: "${workspaceFolder}/main.py",
    console: "integratedTerminal",
  },
  {
    type: "go",
    request: "launch",
    program: "${workspaceFolder}",
    console: "integratedTerminal",
  },
]

// ── Stored configs ──

const STORAGE_KEY = "opencode-launch-configs"

function loadConfigs(): LaunchConfiguration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return [
    {
      name: "Launch Program",
      type: "node",
      request: "launch",
      program: "${workspaceFolder}/src/index.ts",
      console: "integratedTerminal",
      sourceMaps: true,
      outFiles: ["${workspaceFolder}/dist/**/*.js"],
    },
  ]
}

function saveConfigs(configs: LaunchConfiguration[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
}

// ── Debug types ──

type DebugBreakpoint = { id: string; file: string; line: number; enabled: boolean; condition?: string }
type DebugState = "idle" | "running" | "paused" | "stopped"
type DebugVariable = { name: string; value: string; type: string }

export default function DebugPanel(props: {
  onOpenFile?: (path: string) => void
  onRunTerminal?: (command: string, title: string) => void
}) {
  const [state, setState] = createSignal<DebugState>("idle")
  const [configurations, setConfigurations] = createSignal<LaunchConfiguration[]>(loadConfigs())
  const [selectedConfig, setSelectedConfig] = createSignal(0)
  const [showAddConfig, setShowAddConfig] = createSignal(false)
  const [showConfigEditor, setShowConfigEditor] = createSignal(false)
  const [breakpoints, setBreakpoints] = createSignal<DebugBreakpoint[]>([])
  const [variables, setVariables] = createSignal<DebugVariable[]>([])
  const [callStack, setCallStack] = createSignal<{ name: string; file: string; line: number }[]>([])
  const [watchExpressions, setWatchExpressions] = createSignal<string[]>([])
  const [consoleLines, setConsoleLines] = createSignal<string[]>([])
  const [editingName, setEditingName] = createSignal("")
  const [editingProgram, setEditingProgram] = createSignal("")
  const [editingType, setEditingType] = createSignal("node")
  const [showPresets, setShowPresets] = createSignal(false)

  const currentConfig = createMemo(() => configurations()[selectedConfig()] ?? configurations()[0])

  const activeBreakpoints = () => breakpoints().filter(b => b.enabled)

  // Start debug session
  const startDebug = (config?: LaunchConfiguration) => {
    const cfg = config ?? currentConfig()
    if (!cfg) return
    setState("running")
    setConsoleLines([`[debug] Starting debug session: ${cfg.name}`])
    setConsoleLines(prev => [...prev, `[debug] Type: ${cfg.type}, Request: ${cfg.request}`])
    if (cfg.program) setConsoleLines(prev => [...prev, `[debug] Program: ${cfg.program}`])
    if (cfg.args?.length) setConsoleLines(prev => [...prev, `[debug] Args: ${cfg.args.join(" ")}`])
    if (cfg.env && Object.keys(cfg.env).length > 0) {
      setConsoleLines(prev => [...prev, `[debug] Env: ${Object.entries(cfg.env!).map(([k, v]) => `${k}=${v}`).join(", ")}`])
    }

    // Simulate debug session lifecycle
    setTimeout(() => {
      if (state() !== "running") return
      setConsoleLines(prev => [...prev, "[debug] Process started"])
      if (activeBreakpoints().length > 0) {
        const bp = activeBreakpoints()[0]
        setState("paused")
        setConsoleLines(prev => [...prev, `[debug] Breakpoint hit: ${bp.file}:${bp.line}`])
        setCallStack([
          { name: "main", file: bp.file, line: bp.line },
          { name: "start", file: "src/index.ts", line: 1 },
        ])
        setVariables([
          { name: "count", value: "0", type: "number" },
          { name: "config", value: '{"debug": true}', type: "object" },
        ])
      } else {
        setTimeout(() => {
          setConsoleLines(prev => [...prev, "[debug] Program exited with code 0"])
          setState("stopped")
          setTimeout(() => setState("idle"), 2000)
        }, 1500)
      }
    }, 800)
  }

  // Stop debug session
  const stopDebug = () => {
    setConsoleLines(prev => [...prev, "[debug] Stopping debug session..."])
    setState("stopped")
    setTimeout(() => {
      setState("idle")
      setCallStack([])
      setVariables([])
    }, 500)
  }

  // Continue execution
  const continueDebug = () => {
    if (state() !== "paused") return
    setState("running")
    setConsoleLines(prev => [...prev, "[debug] Continuing execution..."])
    setCallStack([])
    setVariables([])
    setTimeout(() => {
      setConsoleLines(prev => [...prev, "[debug] Program exited with code 0"])
      setState("stopped")
      setTimeout(() => setState("idle"), 2000)
    }, 1000)
  }

  // Step over
  const stepOver = () => {
    if (state() !== "paused") return
    setConsoleLines(prev => [...prev, "[debug] Step over"])
    const vars = variables()
    setVariables(vars.map(v => v.name === "count" ? { ...v, value: String(Number(v.value) + 1) } : v))
  }

  // Step into
  const stepInto = () => {
    if (state() !== "paused") return
    setConsoleLines(prev => [...prev, "[debug] Step into"])
  }

  // Step out
  const stepOut = () => {
    if (state() !== "paused") return
    setConsoleLines(prev => [...prev, "[debug] Step out"])
  }

  // Toggle breakpoint
  const toggleBreakpoint = (id: string) => {
    setBreakpoints(prev => prev.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b))
  }

  // Remove breakpoint
  const removeBreakpoint = (id: string) => {
    setBreakpoints(prev => prev.filter(b => b.id !== id))
  }

  // Add breakpoint
  const addBreakpoint = (file: string, line: number) => {
    const id = `bp-${Date.now()}`
    setBreakpoints(prev => [...prev, { id, file, line, enabled: true }])
  }

  // Add watch expression
  const addWatch = (expr: string) => {
    if (expr.trim()) setWatchExpressions(prev => [...prev, expr.trim()])
  }

  // Save configurations
  const saveAndClose = () => {
    saveConfigs(configurations())
    setShowAddConfig(false)
    setShowConfigEditor(false)
  }

  // Add new configuration
  const addConfiguration = (config: LaunchConfiguration) => {
    setConfigurations(prev => [...prev, config])
    setSelectedConfig(configurations().length)
    saveConfigs([...configurations(), config])
    setShowAddConfig(false)
  }

  // Remove configuration
  const removeConfiguration = (index: number) => {
    setConfigurations(prev => prev.filter((_, i) => i !== index))
    if (selectedConfig() >= configurations().length - 1) {
      setSelectedConfig(Math.max(0, configurations().length - 2))
    }
    saveConfigs(configurations().filter((_, i) => i !== index))
  }

  // State helpers
  const stateIcon = () => {
    switch (state()) {
      case "running": return { icon: "play" as const, color: "text-text-success-base" }
      case "paused": return { icon: "pause" as const, color: "text-text-warning-base" }
      case "stopped": return { icon: "stop" as const, color: "text-text-danger-base" }
      default: return { icon: "bug" as const, color: "text-text-weak" }
    }
  }

  const stateLabel = () => {
    switch (state()) {
      case "running": return "Running"
      case "paused": return "Paused"
      case "stopped": return "Stopped"
      default: return "Ready"
    }
  }

  return (
    <div class="size-full flex flex-col bg-surface-base">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-base shrink-0" style={{ "min-height": "34px" }}>
        <div class="flex items-center gap-2">
          <span class="text-11-medium text-text-weaker uppercase tracking-wider">DEBUG</span>
          <span class={`text-11-medium ${stateIcon().color}`}>{stateLabel()}</span>
        </div>
        <div class="flex items-center gap-0.5">
          <Show when={state() === "idle"}>
            <Tooltip value="Start Debugging" placement="bottom">
              <IconButton
                icon="play"
                variant="ghost"
                size="small"
                class="size-6 rounded text-text-success-base"
                onClick={() => startDebug()}
                aria-label="Start Debugging"
              />
            </Tooltip>
          </Show>
          <Show when={state() === "running"}>
            <Tooltip value="Stop" placement="bottom">
              <IconButton
                icon="stop"
                variant="ghost"
                size="small"
                class="size-6 rounded text-text-danger-base"
                onClick={stopDebug}
                aria-label="Stop"
              />
            </Tooltip>
            <Tooltip value="Pause" placement="bottom">
              <IconButton
                icon="pause"
                variant="ghost"
                size="small"
                class="size-6 rounded text-text-warning-base"
                onClick={() => { setState("paused"); setConsoleLines(prev => [...prev, "[debug] Paused"]) }}
                aria-label="Pause"
              />
            </Tooltip>
          </Show>
          <Show when={state() === "paused"}>
            <Tooltip value="Continue" placement="bottom">
              <IconButton
                icon="play"
                variant="ghost"
                size="small"
                class="size-6 rounded text-text-success-base"
                onClick={continueDebug}
                aria-label="Continue"
              />
            </Tooltip>
            <Tooltip value="Step Over" placement="bottom">
              <IconButton
                icon="chevron-down"
                variant="ghost"
                size="small"
                class="size-6 rounded"
                onClick={stepOver}
                aria-label="Step Over"
              />
            </Tooltip>
            <Tooltip value="Step Into" placement="bottom">
              <IconButton
                icon="arrow-right"
                variant="ghost"
                size="small"
                class="size-6 rounded"
                onClick={stepInto}
                aria-label="Step Into"
              />
            </Tooltip>
            <Tooltip value="Step Out" placement="bottom">
              <IconButton
                icon="arrow-left"
                variant="ghost"
                size="small"
                class="size-6 rounded"
                onClick={stepOut}
                aria-label="Step Out"
              />
            </Tooltip>
            <Tooltip value="Stop" placement="bottom">
              <IconButton
                icon="stop"
                variant="ghost"
                size="small"
                class="size-6 rounded text-text-danger-base"
                onClick={stopDebug}
                aria-label="Stop"
              />
            </Tooltip>
          </Show>
          <Show when={state() === "stopped"}>
            <Tooltip value="Start Debugging" placement="bottom">
              <IconButton
                icon="play"
                variant="ghost"
                size="small"
                class="size-6 rounded text-text-success-base"
                onClick={() => startDebug()}
                aria-label="Start Debugging"
              />
            </Tooltip>
          </Show>
          <Tooltip value="Add Configuration" placement="bottom">
            <IconButton
              icon="plus"
              variant="ghost"
              size="small"
              class="size-6 rounded"
              onClick={() => setShowAddConfig(!showAddConfig())}
              aria-label="Add Configuration"
            />
          </Tooltip>
          <Tooltip value="Edit launch.json" placement="bottom">
            <IconButton
              icon="settings-gear"
              variant="ghost"
              size="small"
              class="size-6 rounded"
              onClick={() => setShowConfigEditor(!showConfigEditor())}
              aria-label="Edit Configuration"
            />
          </Tooltip>
        </div>
      </div>

      {/* Configuration selector */}
      <div class="px-3 py-1.5 border-b border-border-base shrink-0">
        <div class="flex items-center gap-1">
          <Icon name="warning" size="small" class="text-icon-weak" />
          <select
            class="flex-1 px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded outline-none text-text-strong"
            value={selectedConfig()}
            onChange={(e) => setSelectedConfig(Number(e.currentTarget.value))}
          >
            {configurations().map((cfg, i) => (
              <option value={i}>{cfg.name} ({cfg.type})</option>
            ))}
          </select>
          <Show when={configurations().length > 1}>
            <IconButton
              icon="trash"
              variant="ghost"
              size="small"
              class="size-5 rounded shrink-0"
              onClick={() => removeConfiguration(selectedConfig())}
              aria-label="Remove Configuration"
            />
          </Show>
        </div>
      </div>

      {/* Add config presets */}
      <Show when={showAddConfig()}>
        <div class="border-b border-border-base bg-surface-raised-base px-3 py-2 space-y-2">
          <div class="text-11-medium text-text-weaker uppercase tracking-wider">Add Configuration</div>
          <div class="space-y-1">
            <button
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 text-12-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
              onClick={() => {
                setShowPresets(!showPresets())
              }}
            >
              <Icon name="plus" size="small" class="text-accent-base" />
              From Preset
            </button>
            <Show when={showPresets()}>
              <div class="ml-4 space-y-1">
                {PRESET_CONFIGS.map((preset) => (
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 px-3 py-1.5 text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover rounded transition-colors"
                    onClick={() => {
                      const name = `${preset.type.charAt(0).toUpperCase() + preset.type.slice(1)} Launch`
                      addConfiguration({ name, ...preset })
                      setShowPresets(false)
                    }}
                  >
                    <span class="text-11-medium text-accent-base uppercase">{preset.type}</span>
                    <span class="truncate">{preset.program ?? "Attach"}</span>
                  </button>
                ))}
              </div>
            </Show>
            <button
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 text-12-regular text-text-strong hover:bg-surface-raised-base-hover rounded-lg transition-colors"
              onClick={() => {
                addConfiguration({
                  name: "Custom Configuration",
                  type: "node",
                  request: "launch",
                  program: "${workspaceFolder}/src/index.ts",
                  console: "integratedTerminal",
                })
              }}
            >
              <Icon name="plus" size="small" class="text-accent-base" />
              Empty Configuration
            </button>
          </div>
          <div class="flex justify-end pt-1">
            <button class="px-2 py-0.5 text-12-regular text-text-weak hover:text-text-strong rounded" onClick={() => setShowAddConfig(false)}>Cancel</button>
          </div>
        </div>
      </Show>

      {/* Config editor */}
      <Show when={showConfigEditor()}>
        <div class="border-b border-border-base bg-surface-raised-base px-3 py-2 space-y-2">
          <div class="text-11-medium text-text-weaker uppercase tracking-wider">Edit Configuration</div>
          <div class="space-y-2">
            <div>
              <label class="text-11-regular text-text-weaker block mb-0.5">Name</label>
              <input
                class="w-full px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded outline-none text-text-strong"
                value={currentConfig()?.name ?? ""}
                onInput={(e) => {
                  const idx = selectedConfig()
                  setConfigurations(prev => prev.map((c, i) => i === idx ? { ...c, name: e.currentTarget.value } : c))
                }}
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-11-regular text-text-weaker block mb-0.5">Type</label>
                <select
                  class="w-full px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded outline-none text-text-strong"
                  value={currentConfig()?.type ?? "node"}
                  onChange={(e) => {
                    const idx = selectedConfig()
                    setConfigurations(prev => prev.map((c, i) => i === idx ? { ...c, type: e.currentTarget.value } : c))
                  }}
                >
                  <option value="node">Node.js</option>
                  <option value="python">Python</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="java">Java</option>
                </select>
              </div>
              <div>
                <label class="text-11-regular text-text-weaker block mb-0.5">Request</label>
                <select
                  class="w-full px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded outline-none text-text-strong"
                  value={currentConfig()?.request ?? "launch"}
                  onChange={(e) => {
                    const idx = selectedConfig()
                    setConfigurations(prev => prev.map((c, i) => i === idx ? { ...c, request: e.currentTarget.value as "launch" | "attach" } : c))
                  }}
                >
                  <option value="launch">Launch</option>
                  <option value="attach">Attach</option>
                </select>
              </div>
            </div>
            <div>
              <label class="text-11-regular text-text-weaker block mb-0.5">Program</label>
              <input
                class="w-full px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded outline-none text-text-strong font-mono"
                value={currentConfig()?.program ?? ""}
                onInput={(e) => {
                  const idx = selectedConfig()
                  setConfigurations(prev => prev.map((c, i) => i === idx ? { ...c, program: e.currentTarget.value } : c))
                }}
                placeholder="${workspaceFolder}/src/index.ts"
              />
            </div>
            <div>
              <label class="text-11-regular text-text-weaker block mb-0.5">Args (comma-separated)</label>
              <input
                class="w-full px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded outline-none text-text-strong font-mono"
                value={currentConfig()?.args?.join(", ") ?? ""}
                onInput={(e) => {
                  const idx = selectedConfig()
                  const args = e.currentTarget.value.split(",").map(a => a.trim()).filter(Boolean)
                  setConfigurations(prev => prev.map((c, i) => i === idx ? { ...c, args: args.length > 0 ? args : undefined } : c))
                }}
                placeholder="--port 3000, --verbose"
              />
            </div>
            <div>
              <label class="text-11-regular text-text-weaker block mb-0.5">Console</label>
              <select
                class="w-full px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded outline-none text-text-strong"
                value={currentConfig()?.console ?? "integratedTerminal"}
                onChange={(e) => {
                  const idx = selectedConfig()
                  setConfigurations(prev => prev.map((c, i) => i === idx ? { ...c, console: e.currentTarget.value as any } : c))
                }}
              >
                <option value="integratedTerminal">Integrated Terminal</option>
                <option value="internalConsole">Debug Console</option>
                <option value="externalTerminal">External Terminal</option>
              </select>
            </div>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-1.5 text-12-regular text-text-weak">
                <input
                  type="checkbox"
                  checked={currentConfig()?.sourceMaps ?? false}
                  onChange={(e) => {
                    const idx = selectedConfig()
                    setConfigurations(prev => prev.map((c, i) => i === idx ? { ...c, sourceMaps: e.currentTarget.checked } : c))
                  }}
                  class="accent-accent-base"
                />
                Source Maps
              </label>
              <label class="flex items-center gap-1.5 text-12-regular text-text-weak">
                <input
                  type="checkbox"
                  checked={currentConfig()?.restart ?? false}
                  onChange={(e) => {
                    const idx = selectedConfig()
                    setConfigurations(prev => prev.map((c, i) => i === idx ? { ...c, restart: e.currentTarget.checked } : c))
                  }}
                  class="accent-accent-base"
                />
                Auto Restart
              </label>
            </div>
          </div>
          <div class="flex justify-end gap-1.5 pt-1">
            <button class="px-2 py-0.5 text-12-regular text-text-weak hover:text-text-strong rounded" onClick={() => setShowConfigEditor(false)}>Cancel</button>
            <button class="px-2 py-0.5 text-12-medium bg-accent-base text-white hover:bg-accent-base-hover rounded" onClick={saveAndClose}>Save</button>
          </div>
        </div>
      </Show>

      <div class="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Breakpoints */}
        <div class="border-b border-border-base">
          <div class="flex items-center justify-between px-3 py-1">
            <span class="text-11-medium text-text-weaker uppercase tracking-wider">Breakpoints</span>
            <span class="text-11-regular text-text-weaker">{activeBreakpoints().length}</span>
          </div>
          <Show when={breakpoints().length === 0}>
            <div class="px-3 py-2 text-12-regular text-text-weaker">No breakpoints</div>
          </Show>
          <For each={breakpoints()}>
            {(bp) => (
              <div class="flex items-center gap-2 px-3 py-1 hover:bg-surface-raised-base-hover cursor-pointer group">
                <button
                  type="button"
                  class={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${bp.enabled ? "bg-text-danger-base" : "bg-text-weak"}`}
                  onClick={() => toggleBreakpoint(bp.id)}
                  aria-label={bp.enabled ? "Disable breakpoint" : "Enable breakpoint"}
                />
                <button
                  type="button"
                  class="flex-1 min-w-0 text-left"
                  onClick={() => props.onOpenFile?.(bp.file)}
                >
                  <span class="text-12-medium text-text-strong truncate block">{bp.file.split("/").pop()}:{bp.line}</span>
                </button>
                <Show when={bp.condition}>
                  <span class="text-11-regular text-text-weaker italic truncate max-w-24">{bp.condition}</span>
                </Show>
                <IconButton
                  icon="close-small"
                  variant="ghost"
                  size="small"
                  class="size-4 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => removeBreakpoint(bp.id)}
                  aria-label="Remove Breakpoint"
                />
              </div>
            )}
          </For>
        </div>

        {/* Call Stack */}
        <div class="border-b border-border-base">
          <div class="flex items-center justify-between px-3 py-1">
            <span class="text-11-medium text-text-weaker uppercase tracking-wider">Call Stack</span>
            <Show when={callStack().length > 0}>
              <span class="text-11-regular text-text-weaker">{callStack().length}</span>
            </Show>
          </div>
          <Show
            when={callStack().length > 0}
            fallback={<div class="px-3 py-2 text-12-regular text-text-weaker">Not available</div>}
          >
            <For each={callStack()}>
              {(frame, i) => (
                <div
                  class={`flex items-center gap-2 px-3 py-1 hover:bg-surface-raised-base-hover cursor-pointer ${i() === 0 ? "bg-surface-raised-base" : ""}`}
                  onClick={() => props.onOpenFile?.(frame.file)}
                >
                  <span class={`text-12-medium ${i() === 0 ? "text-accent-base" : "text-text-strong"}`}>
                    {i() === 0 ? "▶" : "  "} {frame.name}
                  </span>
                  <span class="text-11-regular text-text-weaker ml-auto shrink-0">
                    {frame.file.split("/").pop()}:{frame.line}
                  </span>
                </div>
              )}
            </For>
          </Show>
        </div>

        {/* Variables */}
        <div class="border-b border-border-base">
          <div class="flex items-center justify-between px-3 py-1">
            <span class="text-11-medium text-text-weaker uppercase tracking-wider">Variables</span>
            <Show when={variables().length > 0}>
              <span class="text-11-regular text-text-weaker">{variables().length}</span>
            </Show>
          </div>
          <Show
            when={variables().length > 0}
            fallback={<div class="px-3 py-2 text-12-regular text-text-weaker">Not available</div>}
          >
            <For each={variables()}>
              {(v) => (
                <div class="flex items-center gap-2 px-3 py-1 hover:bg-surface-raised-base-hover">
                  <span class="text-12-medium text-text-weak font-mono">{v.name}</span>
                  <span class="text-12-regular text-text-strong font-mono truncate">{v.value}</span>
                  <span class="text-11-regular text-text-weaker ml-auto shrink-0">{v.type}</span>
                </div>
              )}
            </For>
          </Show>
        </div>

        {/* Watch */}
        <div class="border-b border-border-base">
          <div class="flex items-center justify-between px-3 py-1">
            <span class="text-11-medium text-text-weaker uppercase tracking-wider">Watch</span>
            <IconButton
              icon="plus"
              variant="ghost"
              size="small"
              class="size-4 rounded"
              onClick={() => {
                const expr = prompt("Enter watch expression:")
                if (expr) addWatch(expr)
              }}
              aria-label="Add Watch Expression"
            />
          </div>
          <Show
            when={watchExpressions().length > 0}
            fallback={<div class="px-3 py-2 text-12-regular text-text-weaker">No watch expressions</div>}
          >
            <For each={watchExpressions()}>
              {(expr) => (
                <div class="flex items-center gap-2 px-3 py-1 hover:bg-surface-raised-base-hover group">
                  <span class="text-12-medium text-text-strong font-mono flex-1 truncate">{expr}</span>
                  <span class="text-12-regular text-text-weaker">undefined</span>
                  <IconButton
                    icon="close-small"
                    variant="ghost"
                    size="small"
                    class="size-4 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => setWatchExpressions(prev => prev.filter(e => e !== expr))}
                    aria-label="Remove"
                  />
                </div>
              )}
            </For>
          </Show>
        </div>

        {/* Debug Console */}
        <div class="flex-1 min-h-0 flex flex-col">
          <div class="flex items-center justify-between px-3 py-1 border-t border-border-base">
            <span class="text-11-medium text-text-weaker uppercase tracking-wider">Debug Console</span>
            <Show when={consoleLines().length > 0}>
              <IconButton
                icon="close-small"
                variant="ghost"
                size="small"
                class="size-4 rounded"
                onClick={() => setConsoleLines([])}
                aria-label="Clear Console"
              />
            </Show>
          </div>
          <div class="flex-1 overflow-y-auto p-2 font-mono text-12-regular bg-surface-raised-stronger-non-alpha">
            <Show
              when={consoleLines().length > 0}
              fallback={
                <div class="text-text-weaker text-center py-4">
                  Start a debug session to see output
                </div>
              }
            >
              <For each={consoleLines()}>
                {(line) => (
                  <div class="py-0.5 border-b border-border-base/50 whitespace-pre-wrap break-all">
                    <span class="text-text-weak select-none mr-2 text-11-regular">{'>'}</span>
                    <span class={
                      line.includes("[debug]") ? "text-accent-base" :
                      line.includes("Error") ? "text-text-danger-base" :
                      "text-text-strong"
                    }>
                      {line}
                    </span>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}
