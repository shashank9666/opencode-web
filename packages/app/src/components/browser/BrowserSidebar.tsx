import { For } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"

export type BrowserSession = {
  id: string
  title: string
  url: string
  status: "idle" | "loading" | "connected" | "error"
  createdAt: number
}

export interface BrowserSidebarProps {
  sessions: BrowserSession[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onCloseSession: (id: string) => void
  onCloseSidebar: () => void
}

export function BrowserSidebar(props: BrowserSidebarProps) {
  const statusColor = (status: string) => {
    switch (status) {
      case "connected": return "bg-[#10b981]" // Emerald
      case "loading": return "bg-[#f59e0b]" // Amber
      case "error": return "bg-[#ef4444]" // Red
      default: return "bg-[#8a8a8a]"
    }
  }

  return (
    <div class="flex flex-col w-[250px] h-full bg-[#252526] border-r border-[#3c3c3c] shrink-0 text-[#cccccc]">
      <div class="flex items-center justify-between px-3 h-[36px] border-b border-[#3c3c3c] shrink-0">
        <span class="text-[11px] font-bold uppercase tracking-wider text-[#cccccc]">Browsers</span>
        <div class="flex items-center gap-1">
          <IconButton
            icon="plus"
            variant="ghost"
            class="size-6 rounded text-[#8a8a8a] hover:text-[#cccccc] hover:bg-[#3d3d3d]"
            onClick={props.onNewSession}
            title="New Browser"
          />
          <IconButton
            icon="layout-sidebar-left-off"
            variant="ghost"
            class="size-6 rounded text-[#8a8a8a] hover:text-[#cccccc] hover:bg-[#3d3d3d]"
            onClick={props.onCloseSidebar}
            title="Close Sidebar"
          />
        </div>
      </div>
      
      <div class="flex-1 overflow-y-auto py-2">
        <For each={props.sessions}>
          {(session) => (
            <div
              class={`group flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors ${
                session.id === props.activeSessionId ? "bg-[#37373d] text-white" : "hover:bg-[#2a2d2e]"
              }`}
              onClick={() => props.onSelectSession(session.id)}
            >
              <div class="flex items-center gap-2 overflow-hidden">
                <div class={`w-2 h-2 rounded-full shrink-0 ${statusColor(session.status)}`} />
                <span class="text-[13px] truncate">{session.title}</span>
              </div>
              <button
                class={`size-5 flex items-center justify-center rounded hover:bg-[#4d4d4d] shrink-0 ${
                  session.id === props.activeSessionId ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  props.onCloseSession(session.id)
                }}
              >
                <Icon name="close-small" class="size-3" />
              </button>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
