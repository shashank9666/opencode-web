import { createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import Session from "@/pages/session"

export default function AIWorkspacePanel(props: {
  onFloat?: () => void
  onClose?: () => void
  onDragStart?: (e: MouseEvent) => void
  activeSessionId: string | null
  recentSessions: any[]
  handleNewSession: () => void
  confirmDeleteSession: (id: string, title: string) => void
  setActiveSessionId: (id: string | null) => void
  dir: string
}) {
  const [hoveredSession, setHoveredSession] = createSignal<string | null>(null)

  const getSessionIndex = (id: string) => {
    const idx = props.recentSessions.findIndex((s) => s.id === id)
    return idx >= 0 ? idx : 0
  }

  return (
    <div class="size-full flex flex-col bg-background-base overflow-hidden">
      <Show
        when={props.activeSessionId}
        fallback={
          /* ── Session list view ── */
          <div class="size-full flex flex-col min-h-0">
            {/* Header */}
            <div class="flex items-center justify-between px-3 py-2 border-b border-border-base shrink-0">
              <span class="text-12-medium text-text-strong">Agent Sessions</span>
              <div class="flex items-center gap-1">
                <IconButton
                  icon="edit"
                  variant="ghost"
                  size="small"
                  class="size-6 rounded"
                  onClick={props.handleNewSession}
                  aria-label="New session"
                />
                <Show when={props.onClose}>
                  <IconButton
                    icon="close"
                    variant="ghost"
                    size="small"
                    class="size-6 rounded"
                    onClick={props.onClose}
                    aria-label="Close panel"
                  />
                </Show>
              </div>
            </div>

            {/* New session button */}
            <div class="px-2 pt-2 shrink-0">
              <button
                type="button"
                class="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-surface-base hover:bg-surface-raised-base-hover border border-border-base text-13-regular text-text-weak hover:text-text-strong transition-colors"
                onClick={props.handleNewSession}
              >
                <Icon name="plus" size="small" />
                <span>New session</span>
              </button>
            </div>

            {/* Session list */}
            <div class="flex-1 overflow-y-auto min-h-0 px-2 py-2 flex flex-col gap-0.5">
              <Show
                when={props.recentSessions.length > 0}
                fallback={
                  <div class="flex-1 flex flex-col items-center justify-center text-center gap-3 py-8">
                    <div class="size-10 rounded-full bg-surface-base flex items-center justify-center">
                      <Icon name="brain" size="large" class="text-icon-weaker" />
                    </div>
                    <p class="text-12-regular text-text-weaker max-w-[180px]">
                      No sessions yet. Start a new session to begin.
                    </p>
                  </div>
                }
              >
                <For each={props.recentSessions}>
                  {(session, index) => (
                    <div
                      class="group relative flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
                      classList={{
                        "bg-surface-raised-base": hoveredSession() === session.id,
                        "hover:bg-surface-base": hoveredSession() !== session.id,
                      }}
                      onMouseEnter={() => setHoveredSession(session.id)}
                      onMouseLeave={() => setHoveredSession(null)}
                      onClick={() => props.setActiveSessionId(session.id)}
                    >
                      {/* Session number avatar */}
                      <div
                        class="shrink-0 size-7 rounded flex items-center justify-center text-12-medium font-bold"
                        style={{
                          background: `hsl(${(index() * 47 + 140) % 360}, 60%, 35%)`,
                          color: "white",
                        }}
                      >
                        {index()}
                      </div>

                      {/* Session title */}
                      <div class="flex-1 min-w-0">
                        <p class="text-12-regular text-text-strong truncate">
                          {session.title || "New session"}
                        </p>
                      </div>

                      {/* Delete button */}
                      <IconButton
                        icon="trash"
                        variant="ghost"
                        size="small"
                        class="size-5 rounded opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation()
                          props.confirmDeleteSession(session.id, session.title || "Untitled")
                        }}
                        aria-label="Delete session"
                      />
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>
        }
      >
        {(sid) => (
          /* ── Active session view ── */
          <div class="size-full flex flex-col min-h-0">
            {/* Back bar */}
            <div class="flex items-center gap-1 px-2 py-1.5 border-b border-border-base shrink-0 bg-background-base">
              <button
                type="button"
                class="flex items-center gap-1 text-12-regular text-text-weak hover:text-text-strong transition-colors rounded px-1 py-0.5"
                onClick={() => props.setActiveSessionId(null)}
              >
                <Icon name="chevron-left" size="small" />
                <span>Sessions</span>
              </button>
              <div class="flex-1 min-w-0 flex items-center justify-center">
                <span class="text-12-medium text-text-strong truncate px-2">
                  {props.recentSessions.find((s) => s.id === sid())?.title || "New session"}
                </span>
              </div>
              <Show when={props.onClose}>
                <IconButton
                  icon="close"
                  variant="ghost"
                  size="small"
                  class="size-5 rounded shrink-0"
                  onClick={props.onClose}
                  aria-label="Close"
                />
              </Show>
            </div>

            {/* Embedded session */}
            <div class="flex-1 min-h-0 overflow-hidden">
              <Session sessionId={sid()} dir={props.dir} embedded={true} />
            </div>
          </div>
        )}
      </Show>
    </div>
  )
}
