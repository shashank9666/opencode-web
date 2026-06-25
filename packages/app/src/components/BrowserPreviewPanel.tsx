import { createSignal, createMemo, createEffect, Show, For } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"

// ── Connection status ──

type ConnectionStatus = "idle" | "loading" | "connected" | "error"

// ── History entry ──

type HistoryEntry = {
  url: string
  timestamp: number
  title?: string
}

// ── Browser Instance (for tracking) ──

type BrowserInstance = {
  id: string
  url: string
  title: string
  status: ConnectionStatus
  createdAt: number
  loadTime: number | null
}

// ── Recent URLs ──

const RECENT_KEY = "opencode-browser-preview-recent"

function loadRecent(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveRecent(entries: HistoryEntry[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(entries.slice(0, 20)))
}

// ── Common localhost ports ──

const COMMON_PORTS = [
  { port: 3000, label: "React / Next.js" },
  { port: 5173, label: "Vite" },
  { port: 8080, label: "Dev Server" },
  { port: 4200, label: "Angular" },
  { port: 4000, label: "GraphQL" },
  { port: 8000, label: "Django / Python" },
  { port: 9229, label: "Node Debug" },
  { port: 5500, label: "Live Server" },
]

// ── Browser Tracker State ──

const BROWSER_INSTANCES_KEY = "opencode-browser-instances"

function loadBrowserInstances(): BrowserInstance[] {
  try {
    const raw = localStorage.getItem(BROWSER_INSTANCES_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveBrowserInstances(instances: BrowserInstance[]) {
  localStorage.setItem(BROWSER_INSTANCES_KEY, JSON.stringify(instances.slice(0, 10)))
}

// ── Main Component ──

export function BrowserPreviewPanel() {
  const [url, setUrl] = createSignal("")
  const [status, setStatus] = createSignal<ConnectionStatus>("idle")
  const [history, setHistory] = createSignal<HistoryEntry[]>(loadRecent())
  const [showHistory, setShowHistory] = createSignal(false)
  const [showQuickConnect, setShowQuickConnect] = createSignal(false)
  const [pageTitle, setPageTitle] = createSignal("")
  const [loadTime, setLoadTime] = createSignal<number | null>(null)
  const [browserInstances, setBrowserInstances] = createSignal<BrowserInstance[]>(loadBrowserInstances())
  const [showBrowserList, setShowBrowserList] = createSignal(false)
  const [activeBrowserId, setActiveBrowserId] = createSignal<string | null>(null)
  let loadStartTime = 0

  const iframeSrc = createMemo(() => {
    const raw = url().trim()
    if (!raw) return ""
    if (raw.match(/^\d+$/)) return `http://localhost:${raw}`
    if (!raw.startsWith("http://") && !raw.startsWith("https://")) return `http://${raw}`
    return raw
  })

  // Track iframe load status
  const handleIframeLoad = () => {
    setStatus("connected")
    const loadMs = Date.now() - loadStartTime
    setLoadTime(loadMs)

    // Update browser instance
    const currentUrl = iframeSrc()
    if (activeBrowserId()) {
      setBrowserInstances(prev => {
        const updated = prev.map(b =>
          b.id === activeBrowserId()
            ? { ...b, url: currentUrl, status: "connected" as const, loadTime: loadMs }
            : b
        )
        saveBrowserInstances(updated)
        return updated
      })
    }
  }

  const handleIframeError = () => {
    setStatus("error")
    setLoadTime(null)

    // Update browser instance
    if (activeBrowserId()) {
      setBrowserInstances(prev => {
        const updated = prev.map(b =>
          b.id === activeBrowserId()
            ? { ...b, status: "error" as const, loadTime: null }
            : b
        )
        saveBrowserInstances(updated)
        return updated
      })
    }
  }

  // Add to history when URL changes
  createEffect(() => {
    const current = iframeSrc()
    if (!current) return
    setStatus("loading")
    loadStartTime = Date.now()
    setPageTitle("")
    setLoadTime(null)

    // Add to history after a short delay (debounce)
    const timer = setTimeout(() => {
      setHistory(prev => {
        const entry: HistoryEntry = { url: current, timestamp: Date.now() }
        const filtered = prev.filter(e => e.url !== current)
        const updated = [entry, ...filtered].slice(0, 20)
        saveRecent(updated)
        return updated
      })
    }, 500)
    return () => clearTimeout(timer)
  })

  const navigate = (newUrl: string) => {
    setUrl(newUrl)
    setShowHistory(false)
    setShowQuickConnect(false)
  }

  const reload = () => {
    const current = url()
    setUrl("")
    setTimeout(() => setUrl(current), 50)
  }

  const goBack = () => {
    setUrl("")
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const statusColor = () => {
    switch (status()) {
      case "connected": return "text-text-success-base"
      case "loading": return "text-text-warning-base"
      case "error": return "text-text-danger-base"
      default: return "text-text-weak"
    }
  }

  const statusIcon = () => {
    switch (status()) {
      case "connected": return "circle-check"
      case "loading": return "reset"
      case "error": return "circle-x"
      default: return "browser"
    }
  }

  // ── Playwright Browser Launch ──
  const launchPlaywright = (targetUrl?: string) => {
    const launchUrl = targetUrl || url() || "http://localhost:3000"
    const newId = `browser-${Date.now()}`
    const nextNumber = browserInstances().length + 1

    setBrowserInstances(prev => {
      const newBrowser: BrowserInstance = {
        id: newId,
        url: launchUrl,
        title: `Browser ${nextNumber}`,
        status: "loading",
        createdAt: Date.now(),
        loadTime: null,
      }
      const updated = [...prev, newBrowser]
      saveBrowserInstances(updated)
      return updated
    })
    setActiveBrowserId(newId)
    setUrl(launchUrl)
    setShowBrowserList(false)

    // Emit event for Playwright integration
    window.dispatchEvent(new CustomEvent("playwright-launch", {
      detail: { url: launchUrl, id: newId }
    }))
  }

  const switchBrowser = (id: string) => {
    const browser = browserInstances().find(b => b.id === id)
    if (browser) {
      setActiveBrowserId(id)
      setUrl(browser.url)
      setShowBrowserList(false)
    }
  }

  const closeBrowser = (id: string) => {
    setBrowserInstances(prev => {
      const updated = prev.filter(b => b.id !== id)
      saveBrowserInstances(updated)
      return updated
    })
    if (activeBrowserId() === id) {
      setActiveBrowserId(null)
      setUrl("")
      setStatus("idle")
    }

    window.dispatchEvent(new CustomEvent("playwright-close", {
      detail: { id }
    }))
  }

  const totalBrowserCount = () => browserInstances().length
  const connectedCount = () => browserInstances().filter(b => b.status === "connected").length

  return (
    <div class="flex-1 flex flex-col min-h-0 min-w-0 bg-surface-base">
      {/* Toolbar */}
      <div class="flex items-center gap-1.5 px-3 py-2 border-b border-border-base bg-surface-raised-base shrink-0">
        {/* Navigation buttons */}
        <Tooltip value="Go Back" placement="bottom">
          <IconButton
            icon="arrow-left"
            variant="ghost"
            size="small"
            class="size-6 rounded"
            onClick={goBack}
            aria-label="Go Back"
          />
        </Tooltip>
        <Tooltip value="Reload" placement="bottom">
          <IconButton
            icon="reset"
            variant="ghost"
            size="small"
            class="size-6 rounded"
            onClick={reload}
            aria-label="Reload"
          />
        </Tooltip>

        <div class="w-px h-4 bg-border-base mx-1" />

        {/* URL bar */}
        <div class="flex-1 flex items-center gap-2 bg-surface-base border border-border-base rounded px-2 py-1 text-12-regular text-text-weak focus-within:border-border-strong transition-colors">
          <Icon name={statusIcon()} size="small" class={`${statusColor()} shrink-0`} />
          <input
            type="text"
            value={url()}
            onInput={(e) => setUrl(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate(url())
              }
            }}
            class="flex-1 bg-transparent border-none outline-none text-text-strong"
            placeholder="Enter URL or port number (e.g. localhost:3000)"
          />
          <Show when={url()}>
            <IconButton
              icon="close-small"
              variant="ghost"
              size="small"
              class="size-4 rounded shrink-0"
              onClick={() => { setUrl(""); setStatus("idle"); setLoadTime(null) }}
              aria-label="Clear"
            />
          </Show>
        </div>

        <div class="w-px h-4 bg-border-base mx-1" />

        {/* Launch Playwright */}
        <Tooltip value="Launch Browser" placement="bottom">
          <IconButton
            icon="play"
            variant="ghost"
            size="small"
            class="size-6 rounded text-text-success-base hover:text-text-success-base"
            onClick={() => launchPlaywright()}
            aria-label="Launch Browser"
          />
        </Tooltip>

        {/* Browser list */}
        <div class="relative">
          <Tooltip value="Browser Instances" placement="bottom">
            <IconButton
              icon="browser"
              variant="ghost"
              size="small"
              class="size-6 rounded"
              onClick={() => setShowBrowserList(!showBrowserList())}
              aria-label="Browser Instances"
            />
          </Tooltip>
          <Show when={totalBrowserCount() > 0}>
            <div class="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-accent-base text-white text-[9px] font-bold flex items-center justify-center px-0.5">
              {totalBrowserCount()}
            </div>
          </Show>
          <Show when={showBrowserList()}>
            <div class="absolute top-full right-0 mt-1 w-72 bg-surface-raised-base border border-border-base rounded-lg shadow-xl z-50 overflow-hidden">
              <div class="px-3 py-2 border-b border-border-base flex items-center justify-between">
                <span class="text-12-medium text-text-strong">Browser Instances ({totalBrowserCount()})</span>
                <button
                  type="button"
                  class="text-11-regular text-accent-base hover:text-accent-base-hover"
                  onClick={() => launchPlaywright()}
                >
                  + New
                </button>
              </div>
              <div class="max-h-64 overflow-y-auto">
                <Show
                  when={browserInstances().length > 0}
                  fallback={
                    <div class="px-3 py-4 text-12-regular text-text-weaker text-center">
                      No browser instances
                    </div>
                  }
                >
                  <For each={browserInstances()}>
                    {(browser) => (
                      <div
                        class="flex items-center gap-2 px-3 py-2 hover:bg-surface-raised-base-hover transition-colors cursor-pointer group"
                        classList={{ "bg-accent-base/10": activeBrowserId() === browser.id }}
                        onClick={() => switchBrowser(browser.id)}
                      >
                        <Icon
                          name={browser.status === "connected" ? "circle-check" : browser.status === "loading" ? "reset" : browser.status === "error" ? "circle-x" : "browser"}
                          size="small"
                          class={browser.status === "connected" ? "text-text-success-base" : browser.status === "loading" ? "text-text-warning-base" : browser.status === "error" ? "text-text-danger-base" : "text-text-weak"}
                        />
                        <div class="flex-1 min-w-0">
                          <div class="text-12-regular text-text-strong truncate">{browser.title}</div>
                          <div class="text-11-regular text-text-weaker truncate">{browser.url}</div>
                        </div>
                        <Show when={browser.loadTime !== null}>
                          <span class="text-10-regular text-text-weaker shrink-0">{formatTime(browser.loadTime!)}</span>
                        </Show>
                        <button
                          type="button"
                          class="size-5 flex items-center justify-center rounded hover:bg-surface-base text-text-weaker hover:text-text-danger-base opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); closeBrowser(browser.id) }}
                          aria-label="Close browser"
                        >
                          <Icon name="close-small" size="small" />
                        </button>
                      </div>
                    )}
                  </For>
                </Show>
              </div>
              {connectedCount() > 0 && (
                <div class="px-3 py-1.5 border-t border-border-base text-10-regular text-text-weaker">
                  {connectedCount()} connected
                </div>
              )}
            </div>
          </Show>
        </div>

        <div class="w-px h-4 bg-border-base mx-1" />

        {/* Quick connect */}
        <Tooltip value="Quick Connect" placement="bottom">
          <IconButton
            icon="bolt"
            variant="ghost"
            size="small"
            class="size-6 rounded"
            onClick={() => setShowQuickConnect(!showQuickConnect())}
            aria-label="Quick Connect"
          />
        </Tooltip>

        {/* History */}
        <Tooltip value="History" placement="bottom">
          <IconButton
            icon="history"
            variant="ghost"
            size="small"
            class="size-6 rounded"
            onClick={() => setShowHistory(!showHistory())}
            aria-label="History"
          />
        </Tooltip>

        {/* Page info */}
        <Show when={status() === "connected" && loadTime() !== null}>
          <div class="flex items-center gap-1 text-11-regular text-text-weaker ml-1">
            <Icon name="clock" size="small" />
            <span>{formatTime(loadTime()!)}</span>
          </div>
        </Show>
      </div>

      {/* Quick connect dropdown */}
      <Show when={showQuickConnect()}>
        <div class="border-b border-border-base bg-surface-raised-base px-3 py-2 shrink-0">
          <div class="text-11-medium text-text-weaker uppercase tracking-wider mb-1.5">Quick Connect</div>
          <div class="grid grid-cols-2 gap-1">
            <For each={COMMON_PORTS}>
              {(item) => (
                <button
                  type="button"
                  class="flex items-center gap-2 px-2 py-1.5 text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover rounded transition-colors"
                  onClick={() => navigate(String(item.port))}
                >
                  <span class="text-accent-base font-mono">{item.port}</span>
                  <span class="truncate">{item.label}</span>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* History dropdown */}
      <Show when={showHistory()}>
        <div class="border-b border-border-base bg-surface-raised-base max-h-48 overflow-y-auto shrink-0">
          <Show
            when={history().length > 0}
            fallback={
              <div class="px-3 py-2 text-12-regular text-text-weaker text-center">No history yet</div>
            }
          >
            <For each={history()}>
              {(entry) => (
                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors text-left"
                  onClick={() => navigate(entry.url)}
                >
                  <Icon name="link" size="small" class="shrink-0" />
                  <span class="truncate flex-1">{entry.url}</span>
                  <span class="text-11-regular text-text-weaker shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </button>
              )}
            </For>
          </Show>
        </div>
      </Show>

      {/* Browser content */}
      <div class="flex-1 relative overflow-hidden bg-background-stronger flex items-center justify-center">
        {url() ? (
          <div class="relative w-full h-full bg-white border-t border-border-base overflow-hidden">
            {/* Loading indicator */}
            <Show when={status() === "loading"}>
              <div class="absolute top-0 left-0 right-0 h-0.5 bg-surface-base z-10">
                <div class="h-full bg-accent-base animate-pulse" style={{ width: "60%" }} />
              </div>
            </Show>

            {/* Error state */}
            <Show when={status() === "error"}>
              <div class="absolute inset-0 flex flex-col items-center justify-center bg-surface-base gap-3 z-20">
                <Icon name="circle-x" size="large" class="text-text-danger-base" />
                <div class="text-13-medium text-text-strong">Failed to load</div>
                <div class="text-12-regular text-text-weaker text-center max-w-sm">
                  Could not connect to {iframeSrc()}
                </div>
                <div class="flex gap-2 mt-2">
                  <button
                    type="button"
                    class="px-3 py-1.5 text-12-medium bg-accent-base text-white rounded hover:bg-accent-base-hover transition-colors"
                    onClick={reload}
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    class="px-3 py-1.5 text-12-medium bg-surface-raised-base border border-border-base rounded hover:bg-surface-raised-base-hover transition-colors"
                    onClick={() => { setUrl(""); setStatus("idle") }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </Show>

            <iframe
              src={iframeSrc()}
              class="w-full h-full border-none bg-white"
              title="Browser Preview"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        ) : (
          <div class="text-text-weak text-13-regular flex flex-col items-center gap-3 px-6 text-center">
            <div class="w-16 h-16 rounded-full bg-surface-raised-base flex items-center justify-center">
              <Icon name="browser" size="large" class="text-icon-weaker opacity-50" />
            </div>
            <div class="flex flex-col gap-1">
              <p class="text-14-medium text-text-weak">Browser Preview</p>
              <p class="text-12-regular text-text-weaker">Enter a URL or port number to preview your app</p>
            </div>

            {/* Launch Playwright Button */}
            <button
              type="button"
              class="flex items-center gap-2 px-4 py-2 text-13-medium bg-accent-base text-white rounded-lg hover:bg-accent-base-hover transition-colors mt-2"
              onClick={() => launchPlaywright()}
            >
              <Icon name="play" size="small" />
              Launch Browser
            </button>

            <div class="flex flex-col gap-1.5 mt-2 w-full max-w-xs">
              <div class="text-11-medium text-text-weaker uppercase tracking-wider">Quick Start</div>
              <For each={COMMON_PORTS.slice(0, 4)}>
                {(item) => (
                  <button
                    type="button"
                    class="flex items-center gap-2 px-3 py-2 text-12-regular text-text-weak hover:text-text-strong bg-surface-raised-base border border-border-base rounded-lg hover:bg-surface-raised-base-hover transition-colors"
                    onClick={() => navigate(String(item.port))}
                  >
                    <span class="text-accent-base font-mono font-bold">{item.port}</span>
                    <span class="text-text-weaker">—</span>
                    <span>{item.label}</span>
                  </button>
                )}
              </For>
            </div>

            <p class="text-11-regular text-text-weaker mt-2">
              Run your dev server, then enter the port number above
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
