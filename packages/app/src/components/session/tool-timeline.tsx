import { createMemo, createSignal, For, Show } from "solid-js"
import { useSync } from "@/context/sync"
import { useSessionLayout } from "@/pages/session/session-layout"
import { Icon } from "@opencode-ai/ui/icon"
import { Accordion } from "@opencode-ai/ui/accordion"
import { StickyAccordionHeader } from "@opencode-ai/ui/sticky-accordion-header"
import { ScrollView } from "@opencode-ai/ui/scroll-view"
import { getToolInfo } from "@opencode-ai/ui/message-part"
import type { Part, ToolPart, AssistantMessage, UserMessage, Message } from "@opencode-ai/sdk/v2/client"

const emptyParts: Part[] = []
const emptyMessages: Message[] = []
const emptyUserMessages: UserMessage[] = []

type ToolEntry = {
  part: ToolPart
  messageID: string
  userMessageID: string
  userMessageTime: number
}

type TurnGroup = {
  userMessageID: string
  userMessageTime: number
  tools: ToolEntry[]
}

function fmtTime(ms: number | undefined): string {
  if (typeof ms !== "number") return ""
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function fmtDuration(ms: number | undefined): string {
  if (typeof ms !== "number") return ""
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.round((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

export function ToolTimeline() {
  const sync = useSync()
  const { params } = useSessionLayout()
  const [search, setSearch] = createSignal("")
  const [flash, setFlash] = createSignal<string>()

  const sessionID = () => params.id

  const messages = createMemo(() => {
    const id = sessionID()
    if (!id) return emptyMessages
    return sync().data.message[id] ?? emptyMessages
  })

  const userMessages = createMemo(() =>
    messages().filter((m): m is UserMessage => m.role === "user"),
  )

  const assistantByParent = createMemo(() => {
    const map = new Map<string, AssistantMessage[]>()
    for (const m of messages()) {
      if (m.role !== "assistant") continue
      const list = map.get(m.parentID)
      if (list) { list.push(m); continue }
      map.set(m.parentID, [m])
    }
    return map
  })

  const turns = createMemo(() => {
    const q = search().toLowerCase().trim()
    const result: TurnGroup[] = []

    for (const userMsg of userMessages()) {
      const assistants = assistantByParent().get(userMsg.id) ?? []
      const tools: ToolEntry[] = []

      for (const asst of assistants) {
        const parts = sync().data.part[asst.id] ?? emptyParts
        for (const part of parts) {
          if (part.type !== "tool") continue
          if (part.tool === "todowrite") continue
          if (q && !part.tool.toLowerCase().includes(q)) continue

          tools.push({
            part: part as ToolPart,
            messageID: asst.id,
            userMessageID: userMsg.id,
            userMessageTime: userMsg.time.created,
          })
        }
      }

      if (tools.length > 0) {
        result.push({ userMessageID: userMsg.id, userMessageTime: userMsg.time.created, tools })
      }
    }
    return result
  })

  const scrollToTool = (partID: string) => {
    const el = document.querySelector(`[data-timeline-part-id="${partID}"]`)
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.style.transition = "background-color 1.4s ease-out"
      el.style.backgroundColor = "var(--surface-highlight, rgba(255, 200, 50, 0.12))"
      setFlash(partID)
      setTimeout(() => {
        el.style.backgroundColor = ""
        setFlash(undefined)
      }, 1400)
    }
  }

  return (
    <ScrollView class="h-full contain-strict">
      <div class="px-3 pt-3 pb-6 flex flex-col gap-1">
        <div class="relative px-1 pb-2">
          <Icon
            name="magnifying-glass"
            size="small"
            class="absolute left-4 top-1/2 -translate-y-1/2 text-icon-weak pointer-events-none"
          />
          <input
            type="text"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search tools…"
            class="w-full h-8 pl-8 pr-3 text-13-regular text-text-strong bg-surface-base rounded-md border border-border-base outline-none placeholder:text-text-weaker"
          />
        </div>

        <Show when={turns().length === 0}>
          <div class="text-12-regular text-text-weak text-center pt-8">
            {search() ? "No tools match your search" : "No tools in this session"}
          </div>
        </Show>

        <Accordion multiple>
          <For each={turns()}>
            {(turn) => (
              <Accordion.Item value={turn.userMessageID}>
                <StickyAccordionHeader>
                  <Accordion.Trigger>
                    <div class="flex items-center justify-between gap-2 w-full px-1">
                      <span class="text-12-medium text-text-strong">
                        {turn.tools.length} tool{turn.tools.length > 1 ? "s" : ""}
                      </span>
                      <div class="flex items-center gap-2">
                        <span class="text-11-regular text-text-weaker tabular-nums">
                          {fmtTime(turn.userMessageTime)}
                        </span>
                        <Icon name="chevron-down" size="small" class="text-text-weak" />
                      </div>
                    </div>
                  </Accordion.Trigger>
                </StickyAccordionHeader>
                <Accordion.Content>
                  <div class="flex flex-col gap-0.5 py-1">
                    <For each={turn.tools}>
                      {(entry) => (
                        <ToolRow entry={entry} onClick={() => scrollToTool(entry.part.id)} />
                      )}
                    </For>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            )}
          </For>
        </Accordion>
      </div>
    </ScrollView>
  )
}

function ToolRow(props: { entry: ToolEntry; onClick: () => void }) {
  const { part } = props.entry
  const info = getToolInfo(
    part.tool,
    part.state.input ?? {},
    "metadata" in part.state ? (part.state.metadata as Record<string, unknown>) : undefined,
  )
  const stateTime = "time" in part.state
    ? (part.state as { time?: { start?: number; end?: number } }).time
    : undefined
  const status = part.state.status
  const startTime = stateTime?.start
  const endTime = stateTime?.end
  const duration = typeof startTime === "number"
    ? (typeof endTime === "number" ? endTime - startTime : Date.now() - startTime)
    : undefined

  const statusIcon = () => {
    if (status === "running") return { name: "play" as const, cls: "text-icon-warning" }
    if (status === "completed") return { name: "check-small" as const, cls: "text-icon-success" }
    if (status === "error") return { name: "circle-ban-sign" as const, cls: "text-icon-danger" }
    return { name: "dash" as const, cls: "text-icon-weak" }
  }

  return (
    <div
      class="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-surface-raised-base-hover transition-colors"
      onClick={props.onClick}
    >
      <Icon name={info.icon} size="small" class="shrink-0 text-icon-weak" />
      <div class="min-w-0 flex-1 flex flex-col leading-tight">
        <span class="text-12-medium text-text-strong truncate">{info.title}</span>
        <Show when={info.subtitle}>
          <span class="text-11-regular text-text-weak truncate">{info.subtitle}</span>
        </Show>
      </div>
      <div class="shrink-0 flex items-center gap-2">
          <span class="text-11-regular text-text-weaker tabular-nums">{fmtTime(startTime)}</span>
          <span class="text-11-regular text-text-weaker tabular-nums">{fmtDuration(duration)}</span>
        <Icon name={statusIcon().name} size="small" class={`shrink-0 ${statusIcon().cls}`} />
      </div>
    </div>
  )
}
