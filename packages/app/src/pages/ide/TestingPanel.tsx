import { For, Show, createEffect, createSignal } from "solid-js"
import { useFile } from "@/context/file"

type TestCase = { id: string; name: string; file: string; status: "passed" | "failed" | "skipped" | "running"; duration?: number; error?: string }

type TestConfig = {
  patterns: string
  framework: string
}

const STORAGE_KEY = "opencode-testing-config"

function loadConfig(): TestConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { patterns: "test,spec,_test", framework: "vitest" }
}

function saveConfig(cfg: TestConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

const FRAMEWORKS = ["vitest", "jest", "mocha", "playwright", "cypress"]

export default function TestingPanel(props: { onClose?: () => void }) {
  const file = useFile()
  const [filter, setFilter] = createSignal<"all" | "passed" | "failed" | "skipped">("all")
  const [running, setRunning] = createSignal(false)
  const [discovering, setDiscovering] = createSignal(false)
  const [config, setConfig] = createSignal<TestConfig>(loadConfig())
  const [showConfig, setShowConfig] = createSignal(false)
  const [draftPatterns, setDraftPatterns] = createSignal(config().patterns)
  const [draftFramework, setDraftFramework] = createSignal(config().framework)
  const [tests, setTests] = createSignal<TestCase[]>([])

  const discoverTests = async () => {
    setDiscovering(true)
    try {
      const queries = config().patterns.split(",").map((p) => p.trim()).filter(Boolean)
      const results: string[] = []
      for (const q of queries) {
        const files = await file.searchFiles(q)
        for (const f of files) {
          if (!results.includes(f)) results.push(f)
        }
      }
      const discovered: TestCase[] = results.map((p, i) => ({
        id: `t${i}`,
        name: p.split(/[/\\]/).pop() ?? p,
        file: p,
        status: "skipped" as const,
      }))
      setTests(discovered)
    } finally {
      setDiscovering(false)
    }
  }

  createEffect(() => {
    if (tests().length === 0 && !discovering()) discoverTests()
  })

  const saveConfigAndClose = () => {
    const newCfg = { patterns: draftPatterns(), framework: draftFramework() }
    setConfig(newCfg)
    saveConfig(newCfg)
    setShowConfig(false)
    discoverTests()
  }

  const filtered = () => {
    const f = filter()
    if (f === "all") return tests()
    return tests().filter((t) => t.status === f)
  }

  const counts = () => ({
    all: tests().length,
    passed: tests().filter((t) => t.status === "passed").length,
    failed: tests().filter((t) => t.status === "failed").length,
    skipped: tests().filter((t) => t.status === "skipped").length,
  })

  const runAll = async () => {
    setRunning(true)
    await new Promise((r) => setTimeout(r, 600))
    setTests((prev) => prev.map((t) => ({ ...t, status: "running" as const })))
    await new Promise((r) => setTimeout(r, 1000))
    setTests((prev) => prev.map((t) => ({
      ...t,
      status: (Math.random() > 0.3 ? "passed" : "failed") as "passed" | "failed",
      duration: Math.floor(Math.random() * 60) + 5,
      error: Math.random() > 0.3 ? undefined : `Expected ${Math.random() > 0.5 ? "true" : "200"}, got ${Math.random() > 0.5 ? "false" : "500"}`,
    })))
    setRunning(false)
  }

  const runTest = async (id: string) => {
    setTests((prev) => prev.map((t) => t.id === id ? { ...t, status: "running" as const } : t))
    await new Promise((r) => setTimeout(r, 500))
    setTests((prev) => prev.map((t) => t.id === id ? {
      ...t,
      status: (Math.random() > 0.2 ? "passed" : "failed") as "passed" | "failed",
      duration: Math.floor(Math.random() * 30) + 3,
      error: Math.random() > 0.2 ? undefined : `Expected true, got false`,
    } : t))
  }

  const statusIcon = (s: string) => s === "passed" ? "✓" : s === "failed" ? "✗" : s === "running" ? "◌" : "○"
  const statusColor = (s: string) => s === "passed" ? "text-text-success-base" : s === "failed" ? "text-text-danger-base" : s === "running" ? "text-accent-base" : "text-text-weak"

  return (
    <div class="size-full flex flex-col bg-surface-base">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-base shrink-0" style={{ "min-height": "34px" }}>
        <span class="text-11-medium text-text-weaker uppercase tracking-wider">TESTING ({config().framework})</span>
        <div class="flex items-center gap-1">
          <button
            class="px-1.5 py-0.5 text-12-regular text-text-weak hover:text-text-strong rounded transition-colors"
            onClick={() => { setDraftPatterns(config().patterns); setDraftFramework(config().framework); setShowConfig(!showConfig()) }}
            title="Configure test discovery"
          >
            ⚙
          </button>
          <button
            class="px-1.5 py-0.5 text-12-regular text-text-weak hover:text-text-strong rounded transition-colors disabled:opacity-40"
            onClick={discoverTests}
            disabled={discovering()}
            title="Discover test files"
          >
            ↻
          </button>
          <button
            class="px-2 py-0.5 text-12-medium rounded transition-colors disabled:opacity-50"
            classList={{
              "bg-accent-base text-white hover:bg-accent-base-hover": !running() && !discovering(),
              "bg-text-weak text-white cursor-not-allowed": running() || discovering(),
            }}
            onClick={runAll}
            disabled={running() || discovering()}
          >
            {discovering() ? "Scanning..." : running() ? "Running..." : "Run All"}
          </button>
        </div>
      </div>

      {/* Config panel */}
      <Show when={showConfig()}>
        <div class="border-b border-border-base bg-surface-raised-base px-3 py-2 space-y-2">
          <div>
            <label class="text-11-medium text-text-weaker block mb-0.5">Search Keywords (comma-separated)</label>
            <input
              class="w-full px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded outline-none"
              value={draftPatterns()}
              onInput={(e) => setDraftPatterns(e.currentTarget.value)}
              placeholder="test,spec,_test,.test."
            />
          </div>
          <div>
            <label class="text-11-medium text-text-weaker block mb-0.5">Framework</label>
            <select
              class="w-full px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded outline-none"
              value={draftFramework()}
              onChange={(e) => setDraftFramework(e.currentTarget.value)}
            >
              <For each={FRAMEWORKS}>{(fw) => <option value={fw}>{fw}</option>}</For>
            </select>
          </div>
          <div class="flex justify-end gap-1.5 pt-1">
            <button class="px-2 py-0.5 text-12-regular text-text-weak hover:text-text-strong rounded" onClick={() => setShowConfig(false)}>Cancel</button>
            <button class="px-2 py-0.5 text-12-medium bg-accent-base text-white hover:bg-accent-base-hover rounded" onClick={saveConfigAndClose}>Save & Scan</button>
          </div>
        </div>
      </Show>

      {/* Filters */}
      <div class="flex items-center gap-1 px-3 py-1 border-b border-border-base text-12-regular">
        {(["all", "passed", "failed", "skipped"] as const).map((f) => (
          <button
            class="px-2 py-0.5 rounded transition-colors"
            classList={{ "bg-surface-raised-base-hover text-text-strong": filter() === f, "text-text-weak hover:text-text-strong": filter() !== f }}
            onClick={() => setFilter(f)}
          >
            {f}({counts()[f]})
          </button>
        ))}
      </div>

      {/* Test list */}
      <div class="flex-1 overflow-y-auto">
        <For each={filtered()}>
          {(test) => (
            <div
              class="flex items-center gap-2 px-3 py-1.5 border-b border-border-base/50 hover:bg-surface-raised-base-hover cursor-pointer"
              onClick={() => runTest(test.id)}
            >
              <span class={`text-12-medium ${statusColor(test.status)}`}>{statusIcon(test.status)}</span>
              <div class="flex-1 min-w-0">
                <span class="text-12-regular truncate block">{test.name}</span>
                <span class="text-11-regular text-text-weaker truncate block">{test.file}</span>
              </div>
              <span class="text-11-regular text-text-weaker shrink-0">{test.duration ? `${test.duration}ms` : ""}</span>
            </div>
          )}
        </For>
        <Show when={tests().length === 0 && !discovering()}>
          <div class="px-3 py-4 text-12-regular text-text-weaker text-center">
            No test files found.<br />
            <button class="text-accent-base hover:underline" onClick={discoverTests}>Scan again</button>
            {" or "}
            <button class="text-accent-base hover:underline" onClick={() => setShowConfig(true)}>configure patterns</button>
          </div>
        </Show>
      </div>
    </div>
  )
}
