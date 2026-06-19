import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"

export type ActivityBarTab = "explorer" | "search" | "source-control" | "extensions" | "ai-chat"

export type BottomPanelTab = "terminal" | "problems" | "output" | "debug-console" | "ai-logs"

export default function ActivityBar(props: {
  activeTab: ActivityBarTab
  sidebarOpen: boolean
  bottomPanelOpen: boolean
  bottomTab: BottomPanelTab
  onTabClick: (tab: ActivityBarTab) => void
  onBottomTabClick: (tab: BottomPanelTab) => void
  onOpenFolder: () => void
}) {
  const active = (tab: ActivityBarTab) => props.activeTab === tab && props.sidebarOpen
  const activeBottom = (tab: BottomPanelTab) => props.bottomPanelOpen && props.bottomTab === tab

  return (
    <div class="w-12 shrink-0 flex flex-col items-center py-2 gap-1 border-r border-border-base bg-surface-base select-none [app-region:no-drag]">
      {/* Top section - sidebar panels */}
      <div class="flex flex-col items-center gap-1">
        <Tooltip value="Explorer (Ctrl+Shift+E)" placement="right">
          <button
            type="button"
            class="size-9 flex items-center justify-center rounded-lg transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-accent-base before:rounded-r-full": active("explorer"),
              "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !active("explorer"),
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
            class="size-9 flex items-center justify-center rounded-lg transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-accent-base before:rounded-r-full": active("search"),
              "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !active("search"),
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
            class="size-9 flex items-center justify-center rounded-lg transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-accent-base before:rounded-r-full": active("source-control"),
              "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !active("source-control"),
            }}
            onClick={() => props.onTabClick("source-control")}
            aria-label="Source Control"
          >
            <Icon name="branch" size="large" />
          </button>
        </Tooltip>

        <Tooltip value="Extensions (Ctrl+Shift+X)" placement="right">
          <button
            type="button"
            class="size-9 flex items-center justify-center rounded-lg transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-accent-base before:rounded-r-full": active("extensions"),
              "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !active("extensions"),
            }}
            onClick={() => props.onTabClick("extensions")}
            aria-label="Extensions"
          >
            <Icon name="models" size="large" />
          </button>
        </Tooltip>

        <Tooltip value="AI Chat (Ctrl+Shift+I)" placement="right">
          <button
            type="button"
            class="size-9 flex items-center justify-center rounded-lg transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-accent-base before:rounded-r-full": active("ai-chat"),
              "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !active("ai-chat"),
            }}
            onClick={() => props.onTabClick("ai-chat")}
            aria-label="AI Chat"
          >
            <Icon name="brain" size="large" />
          </button>
        </Tooltip>
      </div>

      {/* Spacer */}
      <div class="flex-1" />

      {/* Bottom section - panel toggles */}
      <div class="flex flex-col items-center gap-1">
        <Tooltip value="Terminal (Ctrl+`)" placement="right">
          <button
            type="button"
            class="size-9 flex items-center justify-center rounded-lg transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-accent-base before:rounded-r-full": activeBottom("terminal"),
              "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !activeBottom("terminal"),
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
            class="size-9 flex items-center justify-center rounded-lg transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-accent-base before:rounded-r-full": activeBottom("problems"),
              "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !activeBottom("problems"),
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
            class="size-9 flex items-center justify-center rounded-lg transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-accent-base before:rounded-r-full": activeBottom("output"),
              "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !activeBottom("output"),
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
            class="size-9 flex items-center justify-center rounded-lg transition-colors relative"
            classList={{
              "text-text-strong before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-accent-base before:rounded-r-full": activeBottom("debug-console"),
              "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !activeBottom("debug-console"),
            }}
            onClick={() => props.onBottomTabClick("debug-console")}
            aria-label="Debug Console"
          >
            <Icon name="window-cursor" size="large" />
          </button>
        </Tooltip>

        <div class="w-6 h-px bg-border-base my-1" />

        <Tooltip value="Settings (Ctrl+,)" placement="right">
          <button
            type="button"
            class="size-9 flex items-center justify-center rounded-lg text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors relative"
            onClick={() => props.onOpenFolder()}
            aria-label="Open Folder"
          >
            <Icon name="settings-gear" size="large" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
