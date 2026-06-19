import { createSignal, createMemo, For, Show, type JSX } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"

export default function HeaderBar(props: {
  workspaceName?: string
  branch?: string
  activeModel?: string
  activeProvider?: string
  syncStatus?: "synced" | "syncing" | "error"
  onSearch: (query: string) => void
  onCommandPalette: () => void
  onModelChange?: (model: string) => void
  onProviderChange?: (provider: string) => void
  onSettings: () => void
  onWorkspaceSwitch: () => void
  compact?: boolean
}) {
  const [searchQuery, setSearchQuery] = createSignal("")
  const [searchFocused, setSearchFocused] = createSignal(false)
  const [showModelDropdown, setShowModelDropdown] = createSignal(false)
  const [showProviderDropdown, setShowProviderDropdown] = createSignal(false)
  const [showNotifications, setShowNotifications] = createSignal(false)
  const [showUserMenu, setShowUserMenu] = createSignal(false)

  const syncIcon = createMemo(() => {
    switch (props.syncStatus) {
      case "syncing": return { icon: "reset" as const, class: "animate-spin text-accent-base" }
      case "error": return { icon: "circle-x" as const, class: "text-text-danger-base" }
      default: return { icon: "circle-check" as const, class: "text-icon-diff-add-base" }
    }
  })

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
        {/* AI Model selector */}
        <Tooltip value="Active Model" placement="bottom">
          <div class="relative">
            <button
              type="button"
              class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface-raised-base-hover transition-colors"
              onClick={() => setShowModelDropdown(!showModelDropdown())}
            >
              <Icon name="brain" size="small" class="text-accent-base" />
              <span class="text-13-regular text-text-strong truncate max-w-20">
                {props.activeModel ?? "No Model"}
              </span>
              <Icon name="chevron-down" size="small" class="text-icon-weak" />
            </button>
            <Show when={showModelDropdown()}>
              <div class="absolute top-full right-0 mt-1 z-50 w-56 bg-surface-raised-base border border-border-base rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                <div class="px-3 py-1.5 text-11-medium text-text-weaker uppercase tracking-wider">AI Models</div>
                <button class="w-full px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover text-left transition-colors">Claude 4 Sonnet</button>
                <button class="w-full px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover text-left transition-colors">GPT-4o</button>
                <button class="w-full px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover text-left transition-colors">Gemini 2.5 Pro</button>
              </div>
              <div class="fixed inset-0 z-40" onClick={() => setShowModelDropdown(false)} />
            </Show>
          </div>
        </Tooltip>

        <div class="w-px h-5 bg-border-base mx-1" />

        {/* Provider selector */}
        <Tooltip value="Provider: {props.activeProvider}" placement="bottom">
          <button
            type="button"
            class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface-raised-base-hover transition-colors"
            onClick={() => setShowProviderDropdown(!showProviderDropdown())}
          >
            <Icon name="providers" size="small" class="text-icon-weak" />
            <span class="text-13-regular text-text-weak truncate max-w-16">
              {props.activeProvider ?? "Provider"}
            </span>
          </button>
        </Tooltip>

        {/* Sync status */}
        <Tooltip value={`Sync: ${props.syncStatus ?? "unknown"}`} placement="bottom">
          <button type="button" class="size-7 flex items-center justify-center rounded-md hover:bg-surface-raised-base-hover transition-colors">
            <Icon name={syncIcon().icon} size="small" class={syncIcon().class} />
          </button>
        </Tooltip>

        <div class="w-px h-5 bg-border-base mx-1" />

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

        {/* Settings */}
        <Tooltip value="Settings" placement="bottom">
          <button
            type="button"
            class="size-7 flex items-center justify-center rounded-md hover:bg-surface-raised-base-hover transition-colors"
            onClick={props.onSettings}
          >
            <Icon name="settings-gear" size="small" class="text-icon-weak" />
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
      <Show when={showProviderDropdown()}>
        <div class="fixed inset-0 z-40" onClick={() => setShowProviderDropdown(false)} />
      </Show>
      <Show when={showNotifications()}>
        <div class="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
      </Show>
      <Show when={showUserMenu()}>
        <div class="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      </Show>
    </div>
  )
}
