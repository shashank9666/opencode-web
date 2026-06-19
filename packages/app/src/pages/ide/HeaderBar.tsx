import { createSignal, For, Show, type JSX } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"

export default function HeaderBar(props: {
  workspaceName?: string
  branch?: string
  onSearch: (query: string) => void
  onCommandPalette: () => void
  onWorkspaceSwitch: () => void
  compact?: boolean
}) {
  const [searchQuery, setSearchQuery] = createSignal("")
  const [searchFocused, setSearchFocused] = createSignal(false)
  const [showNotifications, setShowNotifications] = createSignal(false)
  const [showUserMenu, setShowUserMenu] = createSignal(false)

  const height = () => props.compact ? "40px" : "48px"

  return (
    <div
      class="shrink-0 flex items-center gap-3 px-4 border-b border-border-base bg-surface-base select-none [app-region:drag] z-30"
      style={{ height: height() }}
    >
      {/* Left: Logo + Workspace */}
      <div class="flex items-center gap-2 shrink-0">
        <div class="size-7 rounded-lg bg-accent-base flex items-center justify-center [app-region:no-drag]">
          <span class="text-13-bold text-white">OC</span>
        </div>
        <div class="flex items-center gap-1.5">
          <Tooltip value="Switch Workspace" placement="bottom">
            <button
              type="button"
              class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface-raised-base-hover transition-colors text-left [app-region:no-drag]"
              onClick={props.onWorkspaceSwitch}
            >
              <span class="text-13-medium text-text-strong truncate max-w-32">
                {props.workspaceName ?? "Untitled"}
              </span>
              <Icon name="chevron-down" size="small" class="text-icon-weak" />
            </button>
          </Tooltip>
          <Show when={props.branch}>
            <div class="flex items-center gap-1 px-1.5 py-0.5 rounded text-11-medium text-accent-base bg-accent-base/10">
              <Icon name="branch" size="small" class="size-3" />
              <span>{props.branch}</span>
            </div>
          </Show>
        </div>
      </div>

      {/* Center: Search bar */}
      <div class="flex-1 flex justify-center min-w-0 px-4">
        <div
          class="relative w-full max-w-lg [app-region:no-drag]"
          classList={{ "scale-[1.02]": searchFocused() }}
          style={{ transition: "transform 0.15s ease" }}
        >
          <div
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150"
            classList={{
              "bg-background-base border-accent-base shadow-sm shadow-accent-base/10": searchFocused(),
              "bg-surface-base border-border-base hover:border-border-base-hover": !searchFocused(),
            }}
          >
            <Icon name="magnifying-glass" size="small" class="text-icon-weak shrink-0" />
            <input
              type="text"
              class="flex-1 bg-transparent text-13-regular text-text-strong outline-none placeholder:text-text-weaker"
              placeholder={props.compact ? "Search..." : "Search files, commands, symbols..."}
              value={searchQuery()}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onInput={(e) => { setSearchQuery(e.currentTarget.value); props.onSearch(e.currentTarget.value) }}
              onKeyDown={(e) => { if (e.key === "Enter") props.onCommandPalette() }}
            />
            <Tooltip value="Command Palette (Ctrl+Shift+P)" placement="bottom">
              <button
                type="button"
                class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-11-medium text-text-weaker hover:text-text-weak hover:bg-surface-raised-base-hover transition-colors"
                onClick={props.onCommandPalette}
              >
                <Icon name="keyboard" size="small" class="size-3" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div class="flex items-center gap-1 shrink-0 [app-region:no-drag]">
        {/* Notifications */}
        <Tooltip value="Notifications" placement="bottom">
          <button
            type="button"
            class="size-7 flex items-center justify-center rounded-md hover:bg-surface-raised-base-hover transition-colors relative"
            onClick={() => setShowNotifications(!showNotifications())}
          >
            <Icon name="status" size="small" class="text-icon-weak" />
            <span class="absolute -top-0.5 -right-0.5 size-2 bg-text-danger-base rounded-full" />
          </button>
        </Tooltip>

        {/* User menu */}
        <Tooltip value="User Menu" placement="bottom">
          <button
            type="button"
            class="size-7 flex items-center justify-center rounded-md hover:bg-surface-raised-base-hover transition-colors"
            onClick={() => setShowUserMenu(!showUserMenu())}
          >
            <div class="size-6 rounded-full bg-accent-base/20 flex items-center justify-center">
              <span class="text-11-medium text-accent-base">U</span>
            </div>
          </button>
        </Tooltip>
      </div>

      {/* Dropdown backdrops */}
      <Show when={showNotifications()}>
        <div class="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
      </Show>
      <Show when={showUserMenu()}>
        <div class="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      </Show>
    </div>
  )
}
