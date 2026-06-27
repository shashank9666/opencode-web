import { createSignal, Show, For } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"

type DeviceProfile = {
  id: string
  label: string
  width: number
  height: number
}

type BrowserEngine = "chromium" | "firefox" | "webkit"

const DEVICE_PROFILES: DeviceProfile[] = [
  { id: "desktop", label: "Desktop", width: 1920, height: 1080 },
  { id: "laptop", label: "Laptop", width: 1440, height: 900 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  { id: "iphone", label: "iPhone", width: 390, height: 844 },
  { id: "pixel", label: "Pixel", width: 393, height: 873 },
]

const BREAKPOINTS = [390, 768, 1024, 1440]

const ENGINES: { id: BrowserEngine; label: string }[] = [
  { id: "chromium", label: "Chromium" },
  { id: "firefox", label: "Firefox" },
  { id: "webkit", label: "WebKit" },
]

export function BrowserToolbar(props: {
  url: string
  onUrlChange: (url: string) => void
  onNavigate: () => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onClear: () => void
  canGoBack: boolean
  canGoForward: boolean
  statusIcon: string
  statusColor: string
  showDevTools: boolean
  onToggleDevTools: () => void
  showSessionCard: boolean
  onToggleSessionCard: () => void
}) {
  const [showDeviceMenu, setShowDeviceMenu] = createSignal(false)
  const [showEngineMenu, setShowEngineMenu] = createSignal(false)
  const [showBreakpoints, setShowBreakpoints] = createSignal(false)
  const [selectedDevice, setSelectedDevice] = createSignal(DEVICE_PROFILES[0])
  const [selectedEngine, setSelectedEngine] = createSignal<BrowserEngine>("chromium")
  const [activeBreakpoint, setActiveBreakpoint] = createSignal<number | null>(null)

  return (
    <div class="flex flex-col shrink-0 bg-surface-raised-base border-b border-border-base">
      {/* Main toolbar row */}
      <div class="flex items-center gap-1.5 px-3 py-1.5">
        {/* Navigation */}
        <Tooltip value="Go Back" placement="bottom">
          <IconButton
            icon="arrow-left"
            variant="ghost"
            size="small"
            class="size-6 rounded"
            classList={{ "opacity-40": !props.canGoBack }}
            onClick={props.canGoBack ? props.onBack : undefined}
            aria-label="Go Back"
          />
        </Tooltip>
        <Tooltip value="Go Forward" placement="bottom">
          <IconButton
            icon="arrow-right"
            variant="ghost"
            size="small"
            class="size-6 rounded"
            classList={{ "opacity-40": !props.canGoForward }}
            onClick={props.canGoForward ? props.onForward : undefined}
            aria-label="Go Forward"
          />
        </Tooltip>
        <Tooltip value="Reload" placement="bottom">
          <IconButton
            icon="reset"
            variant="ghost"
            size="small"
            class="size-6 rounded"
            onClick={props.onReload}
            aria-label="Reload"
          />
        </Tooltip>

        <div class="w-px h-4 bg-border-base mx-0.5" />

        {/* URL bar */}
        <div class="flex-1 flex items-center gap-2 bg-surface-base border border-border-base rounded px-2 py-1 text-12-regular text-text-weak focus-within:border-border-strong transition-colors">
          <Icon name={props.statusIcon as any} size="small" class={`${props.statusColor} shrink-0`} />
          <input
            type="text"
            value={props.url}
            onInput={(e) => props.onUrlChange(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === "Enter") props.onNavigate() }}
            class="flex-1 bg-transparent border-none outline-none text-text-strong text-13-regular"
            placeholder="Enter a URL (e.g. http://localhost:5173)"
          />
          <Show when={props.url}>
            <IconButton
              icon="close-small"
              variant="ghost"
              size="small"
              class="size-4 rounded shrink-0"
              onClick={props.onClear}
              aria-label="Clear"
            />
          </Show>
        </div>

        <div class="w-px h-4 bg-border-base mx-0.5" />

        {/* Device profile */}
        <div class="relative">
          <Tooltip value="Device Profile" placement="bottom">
            <IconButton
              icon="browser"
              variant="ghost"
              size="small"
              class="size-6 rounded"
              onClick={() => setShowDeviceMenu(!showDeviceMenu())}
              aria-label="Device Profile"
            />
          </Tooltip>
          <Show when={showDeviceMenu()}>
            <div class="absolute top-full right-0 mt-1 w-48 bg-surface-raised-base border border-border-base rounded-lg shadow-xl z-50 overflow-hidden">
              <div class="px-3 py-1.5 border-b border-border-base text-11-medium text-text-weaker uppercase tracking-wider">Device</div>
              <For each={DEVICE_PROFILES}>
                {(device) => (
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 px-3 py-1.5 text-12-regular hover:bg-surface-raised-base-hover transition-colors text-left"
                    classList={{ "bg-accent-base/10 text-accent-base": selectedDevice().id === device.id }}
                    onClick={() => { setSelectedDevice(device); setShowDeviceMenu(false) }}
                  >
                    <span class="flex-1">{device.label}</span>
                    <span class="text-11-regular text-text-weaker">{device.width}x{device.height}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Viewport breakpoints */}
        <div class="relative">
          <Tooltip value="Viewport Sizes" placement="bottom">
            <IconButton
              icon="layout-left-partial"
              variant="ghost"
              size="small"
              class="size-6 rounded"
              onClick={() => setShowBreakpoints(!showBreakpoints())}
              aria-label="Viewport Sizes"
            />
          </Tooltip>
          <Show when={showBreakpoints()}>
            <div class="absolute top-full right-0 mt-1 w-44 bg-surface-raised-base border border-border-base rounded-lg shadow-xl z-50 overflow-hidden">
              <div class="px-3 py-1.5 border-b border-border-base text-11-medium text-text-weaker uppercase tracking-wider">Breakpoints</div>
              <For each={BREAKPOINTS}>
                {(bp) => (
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 px-3 py-1.5 text-12-regular hover:bg-surface-raised-base-hover transition-colors"
                    classList={{ "bg-accent-base/10 text-accent-base": activeBreakpoint() === bp }}
                    onClick={() => { setActiveBreakpoint(activeBreakpoint() === bp ? null : bp); setShowBreakpoints(false) }}
                  >
                    <span>{bp}px</span>
                    <Show when={bp === 390}><span class="text-11-regular text-text-weaker">— Mobile</span></Show>
                    <Show when={bp === 768}><span class="text-11-regular text-text-weaker">— Tablet</span></Show>
                    <Show when={bp === 1024}><span class="text-11-regular text-text-weaker">— Small Desktop</span></Show>
                    <Show when={bp === 1440}><span class="text-11-regular text-text-weaker">— Desktop</span></Show>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Browser engine */}
        <div class="relative">
          <Tooltip value="Browser Engine" placement="bottom">
            <IconButton
              icon="server"
              variant="ghost"
              size="small"
              class="size-6 rounded"
              onClick={() => setShowEngineMenu(!showEngineMenu())}
              aria-label="Browser Engine"
            />
          </Tooltip>
          <Show when={showEngineMenu()}>
            <div class="absolute top-full right-0 mt-1 w-40 bg-surface-raised-base border border-border-base rounded-lg shadow-xl z-50 overflow-hidden">
              <div class="px-3 py-1.5 border-b border-border-base text-11-medium text-text-weaker uppercase tracking-wider">Engine</div>
              <For each={ENGINES}>
                {(engine) => (
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 px-3 py-1.5 text-12-regular hover:bg-surface-raised-base-hover transition-colors"
                    classList={{ "bg-accent-base/10 text-accent-base": selectedEngine() === engine.id }}
                    onClick={() => { setSelectedEngine(engine.id); setShowEngineMenu(false) }}
                  >
                    <span>{engine.label}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>

        <div class="w-px h-4 bg-border-base mx-0.5" />

        {/* Session card toggle */}
        <Tooltip value="Session Info" placement="bottom">
          <IconButton
            icon="bubble-5"
            variant="ghost"
            size="small"
            class="size-6 rounded"
            classList={{ "text-accent-base": props.showSessionCard }}
            onClick={props.onToggleSessionCard}
            aria-label="Session Info"
          />
        </Tooltip>

        {/* DevTools toggle */}
        <Tooltip value="Developer Tools" placement="bottom">
          <IconButton
            icon="sliders"
            variant="ghost"
            size="small"
            class="size-6 rounded"
            classList={{ "text-accent-base": props.showDevTools }}
            onClick={props.onToggleDevTools}
            aria-label="Developer Tools"
          />
        </Tooltip>
      </div>
    </div>
  )
}

export { DEVICE_PROFILES }
export type { DeviceProfile, BrowserEngine }
