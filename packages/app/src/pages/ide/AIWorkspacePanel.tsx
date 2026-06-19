import { createSignal, For, Show, type JSX } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { DockablePanelHeader } from "./DockablePanel"

type AIView = "chat" | "reasoning" | "context" | "memory" | "tools" | "patch"

export default function AIWorkspacePanel(props: {
  onFloat?: () => void
  onClose?: () => void
  onDragStart?: (e: MouseEvent) => void
}) {
  const [activeView, setActiveView] = createSignal<AIView>("chat")
  const [chatInput, setChatInput] = createSignal("")
  const [showViewMenu, setShowViewMenu] = createSignal(false)

  const views: Array<{ id: AIView; label: string; icon: string }> = [
    { id: "chat", label: "Chat", icon: "comment" },
    { id: "reasoning", label: "Reasoning", icon: "brain" },
    { id: "context", label: "Context", icon: "magnifying-glass-menu" },
    { id: "memory", label: "Memory", icon: "models" },
    { id: "tools", label: "Tools", icon: "task" },
    { id: "patch", label: "Patch", icon: "review" },
  ]

  return (
    <div class="size-full flex flex-col bg-surface-base">
      <DockablePanelHeader
        label="AI Workspace"
        icon="brain"
        onFloat={props.onFloat}
        onClose={props.onClose}
        onDragStart={props.onDragStart}
      />

      {/* View tabs */}
      <div class="flex items-center border-b border-border-base bg-surface-base overflow-x-auto shrink-0">
        <For each={views}>
          {(view) => (
            <button
              type="button"
              class="flex items-center gap-1 px-3 py-1.5 text-12-regular whitespace-nowrap transition-colors relative"
              classList={{
                "text-text-strong border-b-2 border-b-accent-base": activeView() === view.id,
                "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": activeView() !== view.id,
              }}
              onClick={() => setActiveView(view.id)}
            >
              <Icon name={view.icon as any} size="small" class="shrink-0" />
              <span>{view.label}</span>
            </button>
          )}
        </For>
      </div>

      {/* Content */}
      <div class="flex-1 min-h-0 overflow-auto">
        {/* Chat view */}
        <Show when={activeView() === "chat"}>
          <div class="size-full flex flex-col">
            <div class="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Welcome message */}
              <div class="flex items-start gap-3 p-3 rounded-xl bg-accent-base/5 border border-accent-base/10">
                <div class="size-8 rounded-full bg-accent-base flex items-center justify-center shrink-0">
                  <Icon name="brain" size="small" class="text-white" />
                </div>
                <div>
                  <div class="text-13-medium text-text-strong">AI Assistant</div>
                  <div class="text-13-regular text-text-weak mt-1">How can I help you today? I can answer questions, explain code, refactor, generate tests, and more.</div>
                  <div class="flex flex-wrap gap-2 mt-3">
                    {["Explain selected code", "Refactor this file", "Generate tests", "Fix errors", "Review changes"].map((action) => (
                      <button class="px-2.5 py-1 text-12-regular rounded-lg border border-border-base hover:bg-surface-raised-base-hover hover:border-accent-base/30 text-text-weak hover:text-text-strong transition-colors">
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div class="p-3 border-t border-border-base bg-surface-base">
              <div class="flex items-center gap-2 bg-background-base rounded-xl border border-border-base px-3 py-2">
                <input
                  type="text"
                  class="flex-1 bg-transparent text-13-regular text-text-strong outline-none placeholder:text-text-weaker"
                  placeholder="Ask AI anything..."
                  value={chatInput()}
                  onInput={(e) => setChatInput(e.currentTarget.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { /* handle send */ } }}
                />
                <div class="flex items-center gap-1">
                  <Tooltip value="Attach context" placement="top">
                    <button type="button" class="size-7 flex items-center justify-center rounded-lg hover:bg-surface-raised-base-hover transition-colors">
                      <Icon name="plus" size="small" class="text-icon-weak" />
                    </button>
                  </Tooltip>
                  <button
                    type="button"
                    class="size-7 flex items-center justify-center rounded-lg bg-accent-base text-white hover:bg-accent-base-hover transition-colors"
                    disabled={!chatInput().trim()}
                  >
                    <Icon name="arrow-up" size="small" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* Reasoning view */}
        <Show when={activeView() === "reasoning"}>
          <div class="p-3 space-y-2">
            <div class="text-13-regular text-text-weaker text-center py-8">
              <Icon name="brain" size="large" class="text-icon-weaker opacity-40 mx-auto mb-2" />
              <p>Reasoning traces will appear here</p>
              <p class="text-12-regular mt-1">Start an AI task to see step-by-step reasoning</p>
            </div>
          </div>
        </Show>

        {/* Context view */}
        <Show when={activeView() === "context"}>
          <div class="p-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-12-medium text-text-weaker uppercase tracking-wider">Context Sources</span>
              <button type="button" class="text-12-regular text-accent-base hover:underline">Manage</button>
            </div>
            <div class="text-13-regular text-text-weaker text-center py-6 border border-dashed border-border-base rounded-xl">
              <Icon name="magnifying-glass" size="medium" class="text-icon-weaker opacity-40 mx-auto mb-2" />
              <p>No context sources added</p>
              <p class="text-12-regular mt-1">Add files or folders to provide context</p>
            </div>
          </div>
        </Show>

        {/* Memory view */}
        <Show when={activeView() === "memory"}>
          <div class="p-3 space-y-2">
            <div class="text-13-regular text-text-weaker text-center py-8">
              <Icon name="server" size="large" class="text-icon-weaker opacity-40 mx-auto mb-2" />
              <p>Session memory is empty</p>
              <p class="text-12-regular mt-1">AI context will appear here during conversations</p>
            </div>
          </div>
        </Show>

        {/* Tools view */}
        <Show when={activeView() === "tools"}>
          <div class="p-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-12-medium text-text-weaker uppercase tracking-wider">Tool Executions</span>
            </div>
            <div class="text-13-regular text-text-weaker text-center py-6 border border-dashed border-border-base rounded-xl">
              <Icon name="task" size="medium" class="text-icon-weaker opacity-40 mx-auto mb-2" />
              <p>No tool executions yet</p>
            </div>
          </div>
        </Show>

        {/* Patch view */}
        <Show when={activeView() === "patch"}>
          <div class="p-3 space-y-2">
            <div class="text-13-regular text-text-weaker text-center py-8">
              <Icon name="edit-small-2" size="large" class="text-icon-weaker opacity-40 mx-auto mb-2" />
              <p>No pending changes</p>
              <p class="text-12-regular mt-1">Code changes from AI will appear here for review</p>
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}
