import { type Component, createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"

export type WorkspacePreset = {
  id: string
  name: string
  description: string
  icon: string
  panels: Record<string, { position: string; visible: boolean }>
}

const PRESETS: WorkspacePreset[] = [
  {
    id: "coding",
    name: "Coding",
    description: "Focus on code with file explorer and minimap",
    icon: "code",
    panels: { explorer: { position: "left", visible: true }, terminal: { position: "bottom", visible: true }, ai: { position: "right", visible: false } },
  },
  {
    id: "ai-assistant",
    name: "AI Assistant",
    description: "Full AI workspace with chat and context",
    icon: "brain",
    panels: { explorer: { position: "left", visible: true }, terminal: { position: "bottom", visible: false }, ai: { position: "right", visible: true } },
  },
  {
    id: "debugging",
    name: "Debugging",
    description: "Debugger, variables, and call stack",
    icon: "window-cursor",
    panels: { explorer: { position: "left", visible: true }, terminal: { position: "bottom", visible: true }, debug: { position: "bottom", visible: true } },
  },
  {
    id: "code-review",
    name: "Code Review",
    description: "Review changes and diffs",
    icon: "review",
    panels: { explorer: { position: "left", visible: true }, terminal: { position: "bottom", visible: false }, diff: { position: "right", visible: true } },
  },
  {
    id: "terminal-focus",
    name: "Terminal Focus",
    description: "Maximize terminal workspace",
    icon: "terminal",
    panels: { explorer: { position: "left", visible: false }, terminal: { position: "bottom", visible: true }, ai: { position: "right", visible: false } },
  },
  {
    id: "frontend",
    name: "Frontend Dev",
    description: "Code with live preview",
    icon: "glasses",
    panels: { explorer: { position: "left", visible: true }, terminal: { position: "bottom", visible: true }, preview: { position: "right", visible: true } },
  },
  {
    id: "backend",
    name: "Backend Dev",
    description: "Terminal and server logs",
    icon: "server",
    panels: { explorer: { position: "left", visible: true }, terminal: { position: "bottom", visible: true }, output: { position: "bottom", visible: true } },
  },
  {
    id: "full-workspace",
    name: "Full Workspace",
    description: "Everything visible",
    icon: "layout-left",
    panels: { explorer: { position: "left", visible: true }, terminal: { position: "bottom", visible: true }, ai: { position: "right", visible: true }, output: { position: "bottom", visible: true } },
  },
  {
    id: "minimal-focus",
    name: "Minimal Focus",
    description: "Just the editor",
    icon: "circle-check",
    panels: { explorer: { position: "left", visible: false }, terminal: { position: "bottom", visible: false }, ai: { position: "right", visible: false } },
  },
]

export default function WorkspacePresets(props: {
  activePreset?: string
  onSelect: (preset: WorkspacePreset) => void
  onClose: () => void
  open: boolean
}) {
  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={props.onClose}>
        <div
          class="w-[520px] max-w-[90vw] bg-surface-raised-base border border-border-base rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="px-4 py-3 border-b border-border-base">
            <h2 class="text-15-medium text-text-strong">Workspace Presets</h2>
            <p class="text-12-regular text-text-weaker mt-0.5">Choose a layout preset to match your workflow</p>
          </div>
          <div class="p-3 grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
            <For each={PRESETS}>
              {(preset) => (
                <button
                  type="button"
                  class="flex flex-col items-center gap-2 p-3 rounded-xl border border-border-base hover:border-accent-base hover:bg-accent-base/5 transition-all duration-150 cursor-pointer"
                  classList={{
                    "border-accent-base bg-accent-base/5 ring-1 ring-accent-base/30": props.activePreset === preset.id,
                  }}
                  onClick={() => { props.onSelect(preset); props.onClose() }}
                >
                  <div class="size-10 rounded-xl bg-surface-base flex items-center justify-center">
                    <Icon name={preset.icon as any} size="medium" class="text-accent-base" />
                  </div>
                  <div class="text-center">
                    <div class="text-13-medium text-text-strong">{preset.name}</div>
                    <div class="text-11-regular text-text-weaker mt-0.5">{preset.description}</div>
                  </div>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  )
}

export { PRESETS }
