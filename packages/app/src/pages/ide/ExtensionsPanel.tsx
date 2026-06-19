import { createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"

interface Extension {
  id: string
  name: string
  description: string
  publisher: string
  version: string
  installed: boolean
}

export default function ExtensionsPanel(props: {
  extensions: Extension[]
  onInstall?: (id: string) => void
  onUninstall?: (id: string) => void
  onDisable?: (id: string) => void
}) {
  const [searchQuery, setSearchQuery] = createSignal("")

  const filtered = () => {
    const q = searchQuery().toLowerCase().trim()
    if (!q) return props.extensions
    return props.extensions.filter(
      (ext) =>
        ext.name.toLowerCase().includes(q) ||
        ext.description.toLowerCase().includes(q) ||
        ext.publisher.toLowerCase().includes(q),
    )
  }

  return (
    <div class="size-full flex flex-col">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-base shrink-0">
        <span class="text-12-medium text-text-weak uppercase tracking-wider">EXTENSIONS</span>
      </div>

      {/* Search */}
      <div class="p-2 border-b border-border-base shrink-0">
        <div class="relative">
          <input
            type="text"
            class="w-full pl-7 pr-2 py-1.5 text-13-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong"
            placeholder="Search extensions..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
          <Icon name="magnifying-glass" size="small" class="absolute left-2 top-1/2 -translate-y-1/2 text-icon-weak pointer-events-none" />
        </div>
      </div>

      {/* Extension list */}
      <div class="flex-1 overflow-y-auto min-h-0">
        <Show
          when={filtered().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center py-8 text-13-regular text-text-weaker gap-2 px-4 text-center">
              <span>No extensions found</span>
              <Show when={props.extensions.length === 0}>
                <span class="text-12-regular">Browse the marketplace to find extensions for your project</span>
              </Show>
            </div>
          }
        >
          <For each={filtered()}>
            {(ext) => (
              <div class="flex items-start gap-3 px-3 py-2 hover:bg-surface-raised-base-hover transition-colors">
                <div class="size-8 shrink-0 rounded-md bg-accent-base/10 flex items-center justify-center text-13-medium text-accent-base">
                  {ext.name.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-13-regular text-text-strong truncate">{ext.name}</div>
                  <div class="text-12-regular text-text-weaker truncate">{ext.publisher}</div>
                  <div class="text-12-regular text-text-weak line-clamp-2 mt-0.5">{ext.description}</div>
                </div>
                <Show when={ext.installed}>
                  <div class="flex items-center gap-1 shrink-0">
                    <Tooltip value="Disable" placement="bottom">
                      <IconButton
                        icon="circle-ban-sign"
                        variant="ghost"
                        size="small"
                        class="size-6 rounded"
                        onClick={() => props.onDisable?.(ext.id)}
                        aria-label="Disable"
                      />
                    </Tooltip>
                    <Tooltip value="Uninstall" placement="bottom">
                      <IconButton
                        icon="trash"
                        variant="ghost"
                        size="small"
                        class="size-6 rounded"
                        onClick={() => props.onUninstall?.(ext.id)}
                        aria-label="Uninstall"
                      />
                    </Tooltip>
                  </div>
                </Show>
                <Show when={!ext.installed}>
                  <button
                    type="button"
                    class="shrink-0 px-3 py-1 text-13-regular bg-accent-base text-white rounded-md hover:bg-accent-base-hover transition-colors"
                    onClick={() => props.onInstall?.(ext.id)}
                  >
                    Install
                  </button>
                </Show>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}
