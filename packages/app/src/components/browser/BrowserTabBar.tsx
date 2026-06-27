import { For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"

export type BrowserTab = {
  id: string
  url: string
  title: string
  isActive: boolean
  isLoading: boolean
}

export interface BrowserTabBarProps {
  tabs: BrowserTab[]
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNewTab: () => void
}

export function BrowserTabBar(props: BrowserTabBarProps) {
  return (
    <div class="flex items-center w-full h-[36px] bg-[#1e1e1e] border-b border-[#2d2d2d] px-2 select-none overflow-x-auto no-scrollbar">
      <div class="flex items-end h-full gap-1 pt-1.5 flex-1 min-w-0">
        <For each={props.tabs}>
          {(tab) => (
            <div
              class={`group relative flex items-center h-full max-w-[200px] min-w-[120px] shrink-0 border-t border-x rounded-t-lg transition-colors cursor-pointer ${
                tab.isActive
                  ? "bg-[#252526] border-[#2d2d2d] text-[#cccccc]"
                  : "bg-transparent border-transparent text-[#8a8a8a] hover:bg-[#2d2d2d]"
              }`}
              onClick={() => props.onSelect(tab.id)}
            >
              {/* Tab Content */}
              <div class="flex items-center gap-2 px-3 w-full">
                <Show
                  when={tab.isLoading}
                  fallback={<Icon name="browser" class="size-3.5 shrink-0 opacity-70" />}
                >
                  <div class="size-3.5 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin shrink-0" />
                </Show>
                <div class="text-[12px] truncate flex-1 font-medium pb-[1px]">
                  {tab.title || tab.url || "New Tab"}
                </div>
                {/* Close Button */}
                <button
                  class={`flex items-center justify-center size-[18px] rounded-md text-[#8a8a8a] hover:text-[#cccccc] hover:bg-[#3d3d3d] transition-colors shrink-0 ${
                    tab.isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    props.onClose(tab.id)
                  }}
                  title="Close (Ctrl+W)"
                >
                  <Icon name="x" class="size-3" />
                </button>
              </div>
              {/* Active Tab Highlight Indicator */}
              <Show when={tab.isActive}>
                <div class="absolute top-0 left-0 right-0 h-[1px] bg-[#007AFF] rounded-t-lg" />
              </Show>
            </div>
          )}
        </For>
      </div>

      {/* New Tab Button */}
      <IconButton
        icon="plus"
        variant="ghost"
        class="size-7 shrink-0 text-[#8a8a8a] hover:text-[#cccccc] hover:bg-[#2d2d2d]"
        onClick={props.onNewTab}
        aria-label="New Tab"
        title="New Tab (Ctrl+T)"
      />
    </div>
  )
}
