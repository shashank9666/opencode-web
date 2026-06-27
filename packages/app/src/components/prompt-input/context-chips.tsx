import { Component, For, Show } from "solid-js"
import { Icon, type IconProps } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"

export type ChatContextChipData = {
  id: string
  icon: IconProps["name"]
  label: string
  onRemove?: () => void
}

type ChatContextChipsProps = {
  chips?: ChatContextChipData[]
  class?: string
}

export const ChatContextChips: Component<ChatContextChipsProps> = (props) => {
  return (
    <Show when={(props.chips?.length ?? 0) > 0}>
      <div class={`flex flex-wrap items-center gap-1.5 px-3 pb-1 ${props.class ?? ""}`}>
        <For each={props.chips ?? []}>
          {(chip) => (
            <div class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-v2-overlay-simple-overlay-hover text-v2-text-text-muted text-[11px] font-medium leading-4 select-none">
              <Icon name={chip.icon} size="small" class="shrink-0 text-v2-icon-icon-muted" />
              <span class="truncate max-w-[120px]">{chip.label}</span>
              <IconButton
                icon="close-small"
                variant="ghost"
                size="small"
                class="-mr-0.5 size-3.5 text-v2-text-text-muted hover:text-v2-text-text-base"
                onClick={(e) => {
                  e.stopPropagation()
                  chip.onRemove?.()
                }}
                aria-label={`Remove ${chip.label}`}
              />
            </div>
          )}
        </For>
      </div>
    </Show>
  )
}
