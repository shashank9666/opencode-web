import { createResizeObserver } from "@solid-primitives/resize-observer"
import { createSignal, For, Show } from "solid-js"
import { DropdownMenu } from "@opencode-ai/ui/dropdown-menu"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"

export type ActivityBarTab = "explorer" | "search" | "source-control" | "run-debug" | "extensions" | "ai-chat" | "database" | "remote" | "testing"

export type BottomPanelTab = "terminal" | "problems" | "output" | "debug-console"

const SIDEBAR_TABS = [
  { tab: "explorer" as const, icon: "file-tree" as const, activeIcon: "file-tree-active" as const, label: "Explorer", shortcut: "Ctrl+Shift+E" },
  { tab: "search" as const, icon: "magnifying-glass" as const, label: "Search", shortcut: "Ctrl+Shift+F" },
  { tab: "source-control" as const, icon: "branch" as const, label: "Source Control", shortcut: "Ctrl+Shift+G" },
  { tab: "run-debug" as const, icon: "window-cursor" as const, label: "Run & Debug", shortcut: "Ctrl+Shift+D" },
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
  const active = (tab: ActivityBarTab) => {
    if (tab === "ai-chat") return props.activeRightTab === "ai-chat" && props.rightPanelOpen
    return props.activeTab === tab && props.sidebarOpen
  }
  const activeBottom = (tab: BottomPanelTab) => props.bottomPanelOpen && props.bottomTab === tab

  let topContainerRef!: HTMLDivElement
  const [visibleCount, setVisibleCount] = createSignal(SIDEBAR_TABS.length)

  createResizeObserver(() => topContainerRef, () => {
    if (!topContainerRef) return
    const containerHeight = topContainerRef.clientHeight
    const buttonHeight = 48
    const maxButtons = Math.floor(containerHeight / buttonHeight)
    setVisibleCount(Math.max(1, Math.min(maxButtons, SIDEBAR_TABS.length)))
  })

  const visibleTabs = () => SIDEBAR_TABS.slice(0, visibleCount())
  const overflowTabs = () => SIDEBAR_TABS.slice(visibleCount())

  return (
    <div class="w-12 shrink-0 flex flex-col items-center py-0 border-r border-border-base bg-surface-base select-none [app-region:no-drag]">
      {/* Top section - sidebar panels */}
      <div class="flex flex-col items-center w-full" ref={topContainerRef}>
        <For each={visibleTabs()}>
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

        <Show when={overflowTabs().length > 0}>
          <DropdownMenu>
            <Tooltip value="More Actions..." placement="right">
              <DropdownMenu.Trigger
                as="button"
                type="button"
                class="w-full h-12 flex items-center justify-center transition-colors text-text-weak hover:text-text-strong relative"
                aria-label="More Actions"
              >
                <span class="text-16-bold leading-none tracking-wider">...</span>
              </DropdownMenu.Trigger>
            </Tooltip>
            <DropdownMenu.Portal>
              <DropdownMenu.Content class="ml-1 min-w-40">
                <For each={overflowTabs()}>
                  {(item) => (
                    <DropdownMenu.Item
                      onSelect={() => props.onTabClick(item.tab)}
                      classList={{
                        "text-text-strong": active(item.tab),
                      }}
                    >
                      <div class="flex items-center gap-2">
                        <Icon name={item.activeIcon && active(item.tab) ? item.activeIcon : item.icon} size="small" />
                        <span>{item.label}</span>
                      </div>
                    </DropdownMenu.Item>
                  )}
                </For>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu>
        </Show>
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
  )
}
