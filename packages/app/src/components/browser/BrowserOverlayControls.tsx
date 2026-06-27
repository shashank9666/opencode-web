import { Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"

export interface BrowserOverlayControlsProps {
  status: "idle" | "loading" | "connected" | "error"
  latency: number | null
  viewportWidth: number
  viewportHeight: number
  onScreenshot: () => void
  onInspect: () => void
  onRefresh: () => void
  onOpenExternal: () => void
}

export function BrowserOverlayControls(props: BrowserOverlayControlsProps) {
  const statusColor = () => {
    switch (props.status) {
      case "connected": return "bg-[#10b981]" // Emerald 500
      case "loading": return "bg-[#f59e0b]" // Amber 500
      case "error": return "bg-[#ef4444]" // Red 500
      default: return "bg-[#8a8a8a]"
    }
  }

  const statusText = () => {
    switch (props.status) {
      case "connected": return "Connected"
      case "loading": return "Loading..."
      case "error": return "Failed"
      default: return "Disconnected"
    }
  }

  return (
    <>
      {/* Floating Status Pill (Top Left inside browser) */}
      <div class="absolute top-4 left-4 z-50 flex items-center gap-2 px-2.5 py-1.5 bg-[#1e1e1e]/90 backdrop-blur-sm border border-[#3c3c3c] rounded-full shadow-lg pointer-events-none">
        <div class="flex items-center gap-1.5">
          <div class={`w-2 h-2 rounded-full ${statusColor()} shadow-[0_0_8px_currentColor] opacity-80`} />
          <span class="text-[11px] font-medium text-[#cccccc] tracking-wide">{statusText()}</span>
        </div>
        
        <Show when={props.latency !== null}>
          <div class="w-[1px] h-3 bg-[#3c3c3c]" />
          <div class="flex items-center gap-1">
            <Icon name="activity" class="size-3 text-[#8a8a8a]" />
            <span class="text-[11px] font-medium text-[#8a8a8a]">{props.latency}ms</span>
          </div>
        </Show>

        <div class="w-[1px] h-3 bg-[#3c3c3c]" />
        <span class="text-[11px] font-medium text-[#8a8a8a]">{props.viewportWidth}×{props.viewportHeight}</span>
      </div>

      {/* Floating Overlay Controls (Top Right inside browser) */}
      <div class="absolute top-4 right-4 z-50 flex flex-col gap-1 p-1 bg-[#1e1e1e]/90 backdrop-blur-sm border border-[#3c3c3c] rounded-lg shadow-lg opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100">
        <Tooltip placement="left" gutter={8} value="Screenshot">
          <IconButton
            icon="camera"
            variant="ghost"
            class="size-7 rounded-md text-[#8a8a8a] hover:text-[#cccccc] hover:bg-[#2d2d2d]"
            onClick={props.onScreenshot}
            aria-label="Screenshot"
          />
        </Tooltip>
        
        <Tooltip placement="left" gutter={8} value="Inspect Element">
          <IconButton
            icon="search"
            variant="ghost"
            class="size-7 rounded-md text-[#8a8a8a] hover:text-[#cccccc] hover:bg-[#2d2d2d]"
            onClick={props.onInspect}
            aria-label="Inspect Element"
          />
        </Tooltip>

        <Tooltip placement="left" gutter={8} value="Refresh">
          <IconButton
            icon="reset"
            variant="ghost"
            class="size-7 rounded-md text-[#8a8a8a] hover:text-[#cccccc] hover:bg-[#2d2d2d]"
            onClick={props.onRefresh}
            aria-label="Refresh"
          />
        </Tooltip>

        <div class="w-5 h-[1px] bg-[#3c3c3c] mx-auto my-0.5" />

        <Tooltip placement="left" gutter={8} value="Open External">
          <IconButton
            icon="external-link"
            variant="ghost"
            class="size-7 rounded-md text-[#8a8a8a] hover:text-[#cccccc] hover:bg-[#2d2d2d]"
            onClick={props.onOpenExternal}
            aria-label="Open External"
          />
        </Tooltip>
      </div>
    </>
  )
}
