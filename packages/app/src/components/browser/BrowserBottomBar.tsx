import { Show, For, createSignal } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Popover } from "@opencode-ai/ui/popover"

export type DeviceProfile = {
  id: string
  label: string
  width: number
  height: number
}

export type BrowserEngine = "chromium" | "firefox" | "webkit"

export const DEVICE_PROFILES: DeviceProfile[] = [
  { id: "desktop", label: "Desktop", width: 1920, height: 1080 },
  { id: "laptop", label: "Laptop", width: 1440, height: 900 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  { id: "mobile", label: "Mobile", width: 390, height: 844 },
]

export const ENGINES: { id: BrowserEngine; label: string }[] = [
  { id: "chromium", label: "Chromium" },
  { id: "firefox", label: "Firefox" },
  { id: "webkit", label: "WebKit" },
]

export interface BrowserBottomBarProps {
  url: string
  status: "idle" | "loading" | "connected" | "error"
  latency: number | null
  viewportWidth: number
  viewportHeight: number
  onViewportChange: (width: number, height: number) => void
}

export function BrowserBottomBar(props: BrowserBottomBarProps) {
  const [deviceMenuOpen, setDeviceMenuOpen] = createSignal(false)

  const statusColor = () => {
    switch (props.status) {
      case "connected": return "bg-[#10b981]" // Emerald
      case "loading": return "bg-[#007AFF]" // Blue
      case "error": return "bg-[#ef4444]" // Red
      default: return "bg-[#8a8a8a]"
    }
  }

  return (
    <div class="flex items-center justify-between h-[22px] bg-[#007ACC] text-white px-2 select-none text-[12px] font-medium shrink-0 shadow-inner overflow-hidden"
         style={{ "background-color": props.status === "error" ? "#CA3A3A" : "#007ACC" }}>
      
      {/* Left side */}
      <div class="flex items-center gap-4 h-full">
        {/* Status */}
        <div class="flex items-center gap-1.5 h-full hover:bg-white/10 px-1.5 cursor-pointer rounded-sm transition-colors">
          <Icon name={props.status === "error" ? "circle-x" : props.status === "connected" ? "circle-check" : "reset"} class={`size-3.5 ${props.status === "loading" ? "animate-spin" : ""}`} />
          <span>{props.status === "connected" ? "Connected" : props.status === "error" ? "Failed" : props.status === "loading" ? "Loading" : "Ready"}</span>
        </div>

        {/* URL host */}
        <Show when={props.url}>
          <div class="flex items-center gap-1.5 h-full hover:bg-white/10 px-1.5 cursor-pointer rounded-sm transition-colors max-w-[200px]">
            <Icon name="link" class="size-3.5 opacity-80" />
            <span class="truncate opacity-90">{props.url.replace(/^https?:\/\//, "").split("/")[0]}</span>
          </div>
        </Show>

        {/* Latency */}
        <Show when={props.latency !== null}>
          <div class="flex items-center gap-1.5 h-full hover:bg-white/10 px-1.5 cursor-pointer rounded-sm transition-colors">
            <span class="opacity-90">{props.latency} ms</span>
          </div>
        </Show>
      </div>

      {/* Right side */}
      <div class="flex items-center h-full">
        {/* Device Profile / Viewport */}
        <Popover
          open={deviceMenuOpen()}
          onOpenChange={setDeviceMenuOpen}
          trigger={
            <div class="flex items-center gap-1.5 h-full hover:bg-white/10 px-1.5 cursor-pointer rounded-sm transition-colors border-l border-white/10">
              <Icon name="layout-left-partial" class="size-3.5 opacity-80" />
              <span class="opacity-90">{props.viewportWidth}×{props.viewportHeight}</span>
            </div>
          }
          class="bg-[#252526] border border-[#3c3c3c] rounded-md shadow-xl p-1 min-w-[150px] mb-1 text-[#cccccc]"
        >
          <div class="px-2 py-1.5 text-[10px] font-bold text-[#8a8a8a] uppercase tracking-wider">Device Profile</div>
          <For each={DEVICE_PROFILES}>
            {(device) => (
              <button
                class="w-full flex items-center justify-between px-2 py-1.5 text-[12px] hover:bg-[#007AFF] hover:text-white rounded transition-colors text-left"
                onClick={() => {
                  props.onViewportChange(device.width, device.height)
                  setDeviceMenuOpen(false)
                }}
              >
                <span>{device.label}</span>
                <span class="opacity-50">{device.width}×{device.height}</span>
              </button>
            )}
          </For>
        </Popover>
      </div>
    </div>
  )
}
