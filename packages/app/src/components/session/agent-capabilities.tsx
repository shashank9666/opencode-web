import { createMemo, createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Accordion } from "@opencode-ai/ui/accordion"
import { StickyAccordionHeader } from "@opencode-ai/ui/sticky-accordion-header"
import { ScrollView } from "@opencode-ai/ui/scroll-view"
import { useAgentCapabilities, capabilityGroups, type Capability, type CapabilityGroup, type CapabilityStatus } from "@/context/agent-capabilities"

const statusIcon = (status: CapabilityStatus) => {
  if (status === "active") return { name: "check-small" as const, cls: "text-icon-success" }
  if (status === "unavailable") return { name: "circle-ban-sign" as const, cls: "text-icon-danger" }
  return { name: "dash" as const, cls: "text-icon-weak" }
}

const groupLabel = (group: CapabilityGroup) => {
  const g = capabilityGroups.find((cg) => cg.id === group)
  return g?.name ?? group
}

const iconName = (name: string | undefined): any => name ?? "dash"

export function AgentCapabilities() {
  const caps = useAgentCapabilities()
  const [search, setSearch] = createSignal("")
  const [detailCap, setDetailCap] = createSignal<Capability | null>(null)

  const grouped = createMemo(() => {
    const q = search().toLowerCase().trim()
    const filtered = q ? caps.capabilities().filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) : caps.capabilities()

    const map = new Map<CapabilityGroup, Capability[]>()
    for (const g of capabilityGroups.map((g) => g.id)) {
      const items = filtered.filter((c) => c.group === g)
      if (items.length > 0) map.set(g, items)
    }
    return map
  })

  const activeCount = createMemo(() => caps.activeCapabilities().length)

  return (
    <ScrollView class="h-full contain-strict">
      <div class="px-3 pt-3 pb-6 flex flex-col gap-1">
        <div class="px-1 pb-2 flex items-center justify-between">
          <div class="text-13-medium text-text-strong">
            Capabilities
          </div>
          <Show when={activeCount() > 0}>
            <div class="flex items-center gap-1 text-11-regular text-icon-success">
              <span class="size-1.5 rounded-full bg-icon-success animate-pulse" />
              {activeCount()} active
            </div>
          </Show>
        </div>

        <div class="relative px-1 pb-2">
          <div class="absolute left-4 top-1/2 -translate-y-1/2 text-icon-weak pointer-events-none flex items-center justify-center">
            <Icon
              name="magnifying-glass"
              size="small"
            />
          </div>
          <input
            type="text"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search capabilities…"
            class="w-full h-8 pl-8 pr-3 text-13-regular text-text-strong bg-surface-base rounded-md border border-border-base outline-none placeholder:text-text-weaker"
          />
        </div>

        <Show when={grouped().size === 0}>
          <div class="text-12-regular text-text-weak text-center pt-8">
            {search() ? "No capabilities match your search" : "No capabilities available"}
          </div>
        </Show>

        <Accordion multiple>
          <For each={capabilityGroups.filter((g) => grouped().has(g.id))}>
            {(group) => {
              const items = () => grouped().get(group.id)!
              const groupActive = () => items().filter((c) => c.status === "active").length
              return (
                <Accordion.Item value={group.id}>
                  <StickyAccordionHeader>
                    <Accordion.Trigger>
                      <div class="flex items-center justify-between gap-2 w-full px-1">
                        <div class="flex items-center gap-2">
                          <Icon name={iconName(group.icon)} size="small" class="text-icon-weak shrink-0" />
                          <span class="text-12-medium text-text-strong">{groupLabel(group.id)}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <Show when={groupActive() > 0}>
                            <span class="size-1.5 rounded-full bg-icon-success animate-pulse" />
                          </Show>
                          <span class="text-11-regular text-text-weaker">{items().length}</span>
                          <Icon name="chevron-down" size="small" class="text-text-weak" />
                        </div>
                      </div>
                    </Accordion.Trigger>
                  </StickyAccordionHeader>
                  <Accordion.Content>
                    <div class="flex flex-col gap-0.5 py-1">
                      <For each={items()}>
                        {(cap) => (
                          <CapabilityRow
                            cap={cap}
                            onClick={() => setDetailCap(detailCap()?.id === cap.id ? null : cap)}
                            selected={detailCap()?.id === cap.id}
                          />
                        )}
                      </For>
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              )
            }}
          </For>
        </Accordion>

        <Show when={detailCap()}>
          {(dc) => (
            <CapabilityDetailPanel
              cap={dc()}
              onClose={() => setDetailCap(null)}
              onToggle={() => {
                if (dc().status === "active") caps.disable(dc().id)
                else caps.enable(dc().id)
              }}
            />
          )}
        </Show>
      </div>
    </ScrollView>
  )
}

function CapabilityRow(props: { cap: Capability; onClick: () => void; selected: boolean }) {
  const stat = () => statusIcon(props.cap.status)

  return (
    <div
      class="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-surface-raised-base-hover transition-colors"
      classList={{
        "bg-surface-raised-base": props.selected,
        "ring-1 ring-border-base": props.selected,
      }}
      onClick={props.onClick}
      data-capability-id={props.cap.id}
    >
      <div class="relative">
        <Icon name={iconName(props.cap.icon)} size="small" class="shrink-0 text-icon-weak" />
        <Show when={props.cap.status === "active"}>
          <span class="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-icon-success animate-pulse" />
        </Show>
      </div>
      <div class="min-w-0 flex-1 flex flex-col leading-tight">
        <span class="text-12-medium text-text-strong truncate">{props.cap.name}</span>
        <Show when={props.cap.usageCount > 0}>
          <span class="text-11-regular text-text-weaker">Used {props.cap.usageCount} time{props.cap.usageCount !== 1 ? "s" : ""}</span>
        </Show>
      </div>
      <div class="shrink-0 flex items-center gap-1.5">
        <Icon name={stat().name} size="small" class={`shrink-0 ${stat().cls}`} />
      </div>
    </div>
  )
}

function CapabilityDetailPanel(props: { cap: Capability; onClose: () => void; onToggle: () => void }) {
  const stat = () => statusIcon(props.cap.status)

  return (
    <div class="mx-2 mt-3 p-3 rounded-lg border border-border-base bg-surface-raised-base">
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2">
          <Icon name={iconName(props.cap.icon)} size="normal" class="text-icon-base" />
          <div>
            <div class="text-13-medium text-text-strong">{props.cap.name}</div>
            <div class="text-11-regular text-text-weak">{props.cap.group}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={props.onClose}
          class="size-5 flex items-center justify-center rounded hover:bg-surface-raised-base-hover text-icon-weak"
        >
          <Icon name="close-small" size="small" />
        </button>
      </div>

      <p class="text-12-regular text-text-base mb-3">{props.cap.description}</p>

      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-11-regular text-text-weaker">Status:</span>
          <Icon name={stat().name} size="small" class={stat().cls} />
          <span class="text-12-regular text-text-strong capitalize">{props.cap.status}</span>
        </div>
        <Show when={props.cap.usageCount > 0}>
          <span class="text-11-regular text-text-weaker">Used {props.cap.usageCount} time{props.cap.usageCount !== 1 ? "s" : ""}</span>
        </Show>
      </div>

      <div class="flex gap-2">
        <button
          type="button"
          onClick={props.onToggle}
          class="flex-1 h-8 rounded-md text-12-medium transition-colors"
          classList={{
            "bg-icon-success text-white hover:brightness-110": props.cap.status !== "active",
            "bg-surface-base text-text-strong border border-border-base hover:bg-surface-raised-base-hover": props.cap.status === "active",
          }}
        >
          {props.cap.status === "active" ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  )
}
