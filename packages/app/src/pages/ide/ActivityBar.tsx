import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"

export type ActivityBarTab = "explorer" | "search" | "source-control" | "run-debug" | "extensions" | "ai-chat" | "database" | "remote" | "testing"

export type BottomPanelTab = "terminal" | "problems" | "output" | "debug-console"

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

  return (
    <div class="w-12 shrink-0 flex flex-col items-center py-0 border-r border-border-base bg-surface-base select-none [app-region:no-drag]">
      {/* Top section - sidebar panels */}
      <div class="flex flex-col items-center w-full">
        <Tooltip value="Explorer (Ctrl+Shift+E)" placement="right">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": active("explorer"),
              "text-text-weak hover:text-text-strong": !active("explorer"),
            }}
            onClick={() => props.onTabClick("explorer")}
            aria-label="Explorer"
          >
            <Icon name={active("explorer") ? "file-tree-active" : "file-tree"} size="large" />
          </button>
        </Tooltip>

        <Tooltip value="Search (Ctrl+Shift+F)" placement="right">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": active("search"),
              "text-text-weak hover:text-text-strong": !active("search"),
            }}
            onClick={() => props.onTabClick("search")}
            aria-label="Search"
          >
            <Icon name="magnifying-glass" size="large" />
          </button>
        </Tooltip>

        <Tooltip value="Source Control (Ctrl+Shift+G)" placement="right">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": active("source-control"),
              "text-text-weak hover:text-text-strong": !active("source-control"),
            }}
            onClick={() => props.onTabClick("source-control")}
            aria-label="Source Control"
          >
            <Icon name="branch" size="large" />
          </button>
        </Tooltip>

        <Tooltip value="Run & Debug (Ctrl+Shift+D)" placement="right">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": active("run-debug"),
              "text-text-weak hover:text-text-strong": !active("run-debug"),
            }}
            onClick={() => props.onTabClick("run-debug")}
            aria-label="Run and Debug"
          >
            <Icon name="window-cursor" size="large" />
          </button>
        </Tooltip>



        <Tooltip value="AI Assistant (Ctrl+Shift+I)" placement="right">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": active("ai-chat"),
              "text-text-weak hover:text-text-strong": !active("ai-chat"),
            }}
            onClick={() => props.onTabClick("ai-chat")}
            aria-label="AI Chat"
          >
            <Icon name="brain" size="large" />
          </button>
        </Tooltip>

        <Tooltip value="Remote Explorer" placement="right">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": active("remote"),
              "text-text-weak hover:text-text-strong": !active("remote"),
            }}
            onClick={() => props.onTabClick("remote")}
            aria-label="Remote Explorer"
          >
            <Icon name="arrow-right" size="large" />
          </button>
        </Tooltip>

        <Tooltip value="Testing" placement="right">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-base": active("testing"),
              "text-text-weak hover:text-text-strong": !active("testing"),
            }}
            onClick={() => props.onTabClick("testing")}
            aria-label="Testing"
          >
            <Icon name="check" size="large" />
          </button>
        </Tooltip>
      </div>

      {/* Spacer */}
      <div class="flex-1" />

      {/* Bottom section - panel toggles */}
      <div class="flex flex-col items-center w-full">
        <Tooltip value="Terminal (Ctrl+`)" placement="right">
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
