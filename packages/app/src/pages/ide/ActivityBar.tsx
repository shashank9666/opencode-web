import { For, createSignal } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"

export type ActivityBarTab = "explorer" | "search" | "source-control" | "run-debug" | "extensions" | "ai-chat" | "database" | "remote" | "testing"

export type BottomPanelTab = "terminal" | "problems" | "output" | "debug-console"

const SIDEBAR_TABS = [
  { tab: "explorer" as const, icon: "file-tree" as const, activeIcon: "file-tree-active" as const, label: "Explorer", shortcut: "Ctrl+Shift+E" },
  { tab: "search" as const, icon: "magnifying-glass" as const, label: "Search", shortcut: "Ctrl+Shift+F" },
  { tab: "source-control" as const, icon: "branch" as const, label: "Source Control", shortcut: "Ctrl+Shift+G" },
  { tab: "run-debug" as const, icon: "window-cursor" as const, label: "Run & Debug", shortcut: "Ctrl+Shift+D" },
  { tab: "extensions" as const, icon: "sliders" as const, label: "Extensions", shortcut: "Ctrl+Shift+X" },
  { tab: "ai-chat" as const, icon: "brain" as const, label: "AI Assistant", shortcut: "Ctrl+Shift+I" },
  { tab: "remote" as const, icon: "arrow-right" as const, label: "Remote Explorer", shortcut: "" },
  { tab: "testing" as const, icon: "check" as const, label: "Testing", shortcut: "" },
]

export default function ActivityBar(props: {
  activeTab: ActivityBarTab
  activeRightTab?: string
  sidebarOpen: boolean
  rightPanelOpen?: boolean
  bottomPanelOpen: boolean
  bottomTab: BottomPanelTab
  onTabClick: (tab: ActivityBarTab) => void
  onBottomTabClick: (tab: BottomPanelTab) => void
  onOpenFolder: () => void
  onRemoteClick: () => void
  remoteConnection?: string
}) {
  const [contextMenuPos, setContextMenuPos] = createSignal<{ x: number; y: number } | null>(null)
  
  const active = (tab: ActivityBarTab) => {
    if (tab === "ai-chat") return props.activeRightTab === "ai-chat" && props.rightPanelOpen
    return props.activeTab === tab && props.sidebarOpen
  }
  const activeBottom = (tab: BottomPanelTab) => props.bottomPanelOpen && props.bottomTab === tab

  return (
    <>
      {contextMenuPos() && (
        <>
          <div class="fixed inset-0 z-40" onClick={() => setContextMenuPos(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenuPos(null); }} />
          <div 
            class="context-menu fixed z-50 bg-surface-raised-base border border-border-base rounded-md shadow-xl py-1 min-w-48 text-13-regular text-text-weak"
            data-testid="context-menu"
            style={{ left: `${contextMenuPos()!.x}px`, top: `${contextMenuPos()!.y}px` }}
          >
            <For each={SIDEBAR_TABS}>
              {(item) => (
                <button class="w-full flex items-center px-4 py-1.5 hover:bg-accent-base hover:text-white transition-colors">
                  <span class="mr-2">✓</span>
                  {item.label}
                </button>
              )}
            </For>
          </div>
        </>
      )}
      <div 
        class="activity-bar w-12 shrink-0 flex flex-col items-center py-0 border-r border-border-base bg-surface-base select-none [app-region:no-drag] size-full" 
        data-testid="activity-bar"
        onContextMenu={(e) => {
          e.preventDefault()
          setContextMenuPos({ x: e.clientX, y: e.clientY })
        }}
      >
      {/* Top section - sidebar panels */}
      <div class="flex flex-col items-center w-full">
        <For each={SIDEBAR_TABS}>
          {(item) => (
            <Tooltip value={`${item.label}${item.shortcut ? ` (${item.shortcut})` : ""}`} placement="right">
              <button
                type="button"
                class="w-full h-12 flex items-center justify-center transition-colors relative"
                classList={{
                  "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": active(item.tab),
                  "text-text-weak hover:text-text-strong": !active(item.tab),
                }}
                onClick={() => props.onTabClick(item.tab)}
                aria-label={item.label}
              >
                <Icon name={item.activeIcon && active(item.tab) ? item.activeIcon : item.icon} size="large" />
              </button>
            </Tooltip>
          )}
        </For>
      </div>

      {/* Spacer */}
      <div class="flex-1" />

      {/* Bottom section - panel toggles */}
      <div class="flex flex-col items-center w-full">
        <Tooltip value='Terminal (Ctrl+`)' placement="right">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": activeBottom("terminal"),
              "text-text-weak hover:text-text-strong": !activeBottom("terminal"),
            }}
            onClick={() => props.onBottomTabClick("terminal")}
            aria-label="Terminal"
          >
            <Icon name={activeBottom("terminal") ? "terminal-active" : "terminal"} size="large" />
          </button>
        </Tooltip>

        <Tooltip value="Problems (Ctrl+Shift+M)" placement="right">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": activeBottom("problems"),
              "text-text-weak hover:text-text-strong": !activeBottom("problems"),
            }}
            onClick={() => props.onBottomTabClick("problems")}
            aria-label="Problems"
          >
            <Icon name="circle-x" size="large" />
          </button>
        </Tooltip>

        <Tooltip value="Output (Ctrl+Shift+U)" placement="right">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": activeBottom("output"),
              "text-text-weak hover:text-text-strong": !activeBottom("output"),
            }}
            onClick={() => props.onBottomTabClick("output")}
            aria-label="Output"
          >
            <Icon name="console" size="large" />
          </button>
        </Tooltip>

        <Tooltip value="Debug Console (Ctrl+Shift+Y)" placement="right">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": activeBottom("debug-console"),
              "text-text-weak hover:text-text-strong": !activeBottom("debug-console"),
            }}
            onClick={() => props.onBottomTabClick("debug-console")}
            aria-label="Debug Console"
          >
            <Icon name="window-cursor" size="large" />
          </button>
        </Tooltip>

        <div class="w-full border-t border-border-base my-0.5" />

        {/* Remote Connection Button */}
        <Tooltip value={props.remoteConnection ? `Connected to ${props.remoteConnection}` : "Open Remote Window"} placement="right">
          <button
            type="button"
            class="w-full h-10 flex items-center justify-center bg-accent-base text-white hover:bg-accent-base-hover transition-colors relative"
            onClick={() => props.onRemoteClick()}
            aria-label="Remote Window"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-5">
              <path d="M5 4L1.5 7.5L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M11 4L14.5 7.5L11 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>
    </>
  )
}
