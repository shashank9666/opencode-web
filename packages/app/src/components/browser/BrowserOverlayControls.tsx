import { Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"

export interface BrowserOverlayControlsProps {
  status: "idle" | "loading" | "connected" | "error"
  latency: number | null
  viewportWidth: number
  viewportHeight: number
  onRefresh: () => void
  onOpenExternal: () => void
}

export function BrowserOverlayControls(props: BrowserOverlayControlsProps) {
  return (
    <>
      {/* Floating Overlay Controls (Top Right inside browser) */}
      <div class="absolute top-2 right-2 z-50 flex flex-col gap-1 p-1 bg-[#1e1e1e]/90 backdrop-blur-sm border border-[#3c3c3c] rounded-lg shadow-lg opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100">
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
            icon="square-arrow-top-right"
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
