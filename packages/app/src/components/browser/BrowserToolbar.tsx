import { createSignal, Show, For } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"

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
}) {
  return (
    <div class="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1 bg-[#1e1e1e]/90 backdrop-blur-md border border-[#3c3c3c] rounded-xl shadow-xl hover:shadow-2xl hover:bg-[#1e1e1e] transition-all max-w-[600px] w-full mx-4">
      {/* Navigation */}
      <IconButton
        icon="arrow-left"
        variant="ghost"
        size="small"
        class="size-8 rounded-lg"
        classList={{ "opacity-40": !props.canGoBack, "text-[#cccccc] hover:bg-[#2d2d2d]": props.canGoBack }}
        onClick={props.canGoBack ? props.onBack : undefined}
        aria-label="Go Back"
      />
      <IconButton
        icon="arrow-right"
        variant="ghost"
        size="small"
        class="size-8 rounded-lg"
        classList={{ "opacity-40": !props.canGoForward, "text-[#cccccc] hover:bg-[#2d2d2d]": props.canGoForward }}
        onClick={props.canGoForward ? props.onForward : undefined}
        aria-label="Go Forward"
      />
      <IconButton
        icon="reset"
        variant="ghost"
        size="small"
        class="size-8 rounded-lg text-[#cccccc] hover:bg-[#2d2d2d]"
        onClick={props.onReload}
        aria-label="Reload"
      />

      {/* URL bar */}
      <div class="flex-1 flex items-center gap-2 bg-[#252526] border border-[#3c3c3c] hover:border-[#4c4c4c] focus-within:border-[#007AFF] focus-within:ring-1 focus-within:ring-[#007AFF] rounded-lg px-3 py-1.5 transition-all">
        <Icon name="lock" class="size-3 text-[#10b981] shrink-0" />
        <input
          type="text"
          value={props.url}
          onInput={(e) => props.onUrlChange(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === "Enter") props.onNavigate() }}
          class="flex-1 bg-transparent border-none outline-none text-[#cccccc] text-[13px] font-medium"
          placeholder="Enter a URL (e.g. localhost:5173)"
        />
        <Show when={props.url}>
          <button
            class="text-[#8a8a8a] hover:text-[#cccccc] shrink-0 outline-none"
            onClick={props.onClear}
            title="Clear"
          >
            <Icon name="close-small" class="size-4" />
          </button>
        </Show>
      </div>
    </div>
  )
}
