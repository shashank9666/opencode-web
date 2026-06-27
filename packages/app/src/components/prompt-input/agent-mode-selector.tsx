import { For, type Component } from "solid-js"
import { Icon, type IconProps } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"

export type AgentMode = "ask" | "edit" | "agent" | "turbo" | "review" | "debug" | "planning"

const AGENT_MODES: { mode: AgentMode; icon: IconProps["name"]; label: string }[] = [
  { mode: "ask", icon: "bubble-5", label: "Ask" },
  { mode: "edit", icon: "edit", label: "Edit" },
  { mode: "agent", icon: "window-cursor", label: "Agent" },
  { mode: "turbo", icon: "play", label: "Turbo" },
  { mode: "review", icon: "review", label: "Review" },
  { mode: "debug", icon: "settings-gear", label: "Debug" },
  { mode: "planning", icon: "brain", label: "Planning" },
]

interface AgentModeSelectorProps {
  current: AgentMode
  onChange: (mode: AgentMode) => void
}

export const AgentModeSelector: Component<AgentModeSelectorProps> = (props) => {
  return (
    <div class="flex items-center gap-0.5">
      <For each={AGENT_MODES}>
        {(config) => (
          <Tooltip placement="top" gutter={4} value={config.label}>
            <button
              type="button"
              class={`size-6 rounded transition-colors flex items-center justify-center ${
                props.current === config.mode
                  ? "bg-surface-raised-stronger text-icon-primary-active"
                  : "text-icon-muted hover:text-icon-base hover:bg-surface-raised-hover"
              }`}
              onClick={() => props.onChange(config.mode)}
              aria-label={config.label}
            >
              <Icon name={config.icon} size="small" />
            </button>
          </Tooltip>
        )}
      </For>
    </div>
  )
}
