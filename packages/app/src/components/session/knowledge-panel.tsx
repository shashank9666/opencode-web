import { For, Show, createMemo, createSignal } from "solid-js"
import { useKnowledge, KNOWLEDGE_CATEGORIES, type KnowledgeCategory, type KnowledgeMemory } from "@/context/knowledge"
import { Icon } from "@opencode-ai/ui/icon"
import { Accordion } from "@opencode-ai/ui/accordion"
import { StickyAccordionHeader } from "@opencode-ai/ui/sticky-accordion-header"
import { ScrollView } from "@opencode-ai/ui/scroll-view"
import { uuid } from "@/utils/uuid"

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function KnowledgePanel() {
  const knowledge = useKnowledge()
  const [search, setSearch] = createSignal("")
  const [newMemory, setNewMemory] = createSignal<{
    category: KnowledgeCategory
    key: string
    value: string
  }>()

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase()
    if (!q) return null
    return knowledge.searchMemories(q)
  })

  const hasResults = createMemo(() => {
    const f = filtered()
    if (f) return f.length > 0
    return knowledge.allMemories.length > 0
  })

  const categoryCount = (category: KnowledgeCategory) => {
    const f = filtered()
    if (f) return f.filter((m) => m.category === category).length
    return knowledge.listMemories(category).length
  }

  const memoriesForCategory = (category: KnowledgeCategory) => {
    const f = filtered()
    if (f) return f.filter((m) => m.category === category)
    return knowledge.listMemories(category)
  }

  const startAdd = (category: KnowledgeCategory) => {
    setNewMemory({ category, key: "", value: "" })
  }

  const cancelAdd = () => {
    setNewMemory(undefined)
  }

  const confirmAdd = () => {
    const nm = newMemory()
    if (!nm || !nm.key.trim() || !nm.value.trim()) return
    knowledge.addMemory(nm.category, nm.key.trim(), nm.value.trim())
    setNewMemory(undefined)
  }

  const setNewKey = (key: string) => {
    const nm = newMemory()
    if (!nm) return
    setNewMemory({ ...nm, key })
  }

  const setNewValue = (value: string) => {
    const nm = newMemory()
    if (!nm) return
    setNewMemory({ ...nm, value })
  }

  const [editingId, setEditingId] = createSignal<string>()
  const [editKey, setEditKey] = createSignal("")
  const [editValue, setEditValue] = createSignal("")

  const startEdit = (mem: KnowledgeMemory) => {
    setEditingId(mem.id)
    setEditKey(mem.key)
    setEditValue(mem.value)
  }

  const cancelEdit = () => {
    setEditingId(undefined)
  }

  const confirmEdit = () => {
    const id = editingId()
    if (!id) return
    if (!editKey().trim() || !editValue().trim()) return
    knowledge.updateMemory(id, { key: editKey().trim(), value: editValue().trim() })
    setEditingId(undefined)
  }

  return (
    <ScrollView class="h-full contain-strict">
      <div class="px-3 pt-3 pb-6 flex flex-col gap-1">
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
            placeholder="Search knowledge…"
            class="w-full h-8 pl-8 pr-3 text-13-regular text-text-strong bg-surface-base rounded-md border border-border-base outline-none placeholder:text-text-weaker"
          />
        </div>

        <Show when={!hasResults()}>
          <div class="text-12-regular text-text-weak text-center pt-8">
            {search() ? "No knowledge matches your search" : "No knowledge yet"}
          </div>
        </Show>

        <Accordion multiple>
          <For each={KNOWLEDGE_CATEGORIES}>
            {(category) => {
              const count = categoryCount(category)
              const items = memoriesForCategory(category)
              return (
                <Show when={count > 0 || !search().trim()}>
                  <Accordion.Item value={category}>
                    <StickyAccordionHeader>
                      <div class="flex items-center justify-between gap-2 w-full px-1">
                        <Accordion.Trigger class="flex-1">
                          <div class="flex items-center justify-between gap-2 w-full">
                            <span class="text-12-medium text-text-strong">{category}</span>
                            <Show when={count > 0}>
                              <span class="text-11-regular text-text-weaker tabular-nums">{count}</span>
                            </Show>
                          </div>
                        </Accordion.Trigger>
                        <Show when={!search().trim()}>
                          <button
                            type="button"
                            onClick={() => startAdd(category)}
                            class="shrink-0 flex items-center justify-center size-5 rounded hover:bg-surface-raised-base-hover text-icon-weak hover:text-icon-base transition-colors"
                            aria-label={`Add memory to ${category}`}
                          >
                            <Icon name="plus-small" size="small" />
                          </button>
                        </Show>
                      </div>
                    </StickyAccordionHeader>
                    <Accordion.Content>
                      <div class="flex flex-col gap-0.5 py-1">
                        <For each={items}>
                          {(mem) => {
                            const isEditing = () => editingId() === mem.id
                            return (
                              <Show when={isEditing()} fallback={<MemoryItem memory={mem} onEdit={() => startEdit(mem)} onDelete={() => knowledge.removeMemory(mem.id)} />}>
                                <div class="flex flex-col gap-1.5 px-2.5 py-2 rounded-md bg-surface-base">
                                  <input
                                    type="text"
                                    value={editKey()}
                                    onInput={(e) => setEditKey(e.currentTarget.value)}
                                    placeholder="Key"
                                    class="w-full h-7 px-2 text-12-medium text-text-strong bg-surface-stronger rounded border border-border-base outline-none placeholder:text-text-weaker"
                                  />
                                  <textarea
                                    value={editValue()}
                                    onInput={(e) => setEditValue(e.currentTarget.value)}
                                    placeholder="Value"
                                    rows={2}
                                    class="w-full px-2 py-1 text-12-regular text-text-strong bg-surface-stronger rounded border border-border-base outline-none placeholder:text-text-weaker resize-none"
                                  />
                                  <div class="flex items-center gap-1.5 justify-end">
                                    <button
                                      type="button"
                                      onClick={cancelEdit}
                                      class="px-2 py-1 text-11-regular text-text-weak hover:text-text-strong"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={confirmEdit}
                                      class="px-2 py-1 text-11-medium text-text-strong bg-surface-raised-base hover:bg-surface-raised-base-hover rounded"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              </Show>
                            )
                          }}
                        </For>
                        <Show when={newMemory()?.category === category && !search().trim()}>
                          <div class="flex flex-col gap-1.5 px-2.5 py-2 rounded-md bg-surface-base">
                            <input
                              type="text"
                              value={newMemory()?.key ?? ""}
                              onInput={(e) => setNewKey(e.currentTarget.value)}
                              placeholder="Key (e.g. indent-style)"
                              class="w-full h-7 px-2 text-12-medium text-text-strong bg-surface-stronger rounded border border-border-base outline-none placeholder:text-text-weaker"
                            />
                            <textarea
                              value={newMemory()?.value ?? ""}
                              onInput={(e) => setNewValue(e.currentTarget.value)}
                              placeholder="Value (e.g. 2 spaces, no tabs)"
                              rows={2}
                              class="w-full px-2 py-1 text-12-regular text-text-strong bg-surface-stronger rounded border border-border-base outline-none placeholder:text-text-weaker resize-none"
                            />
                            <div class="flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={cancelAdd}
                                class="px-2 py-1 text-11-regular text-text-weak hover:text-text-strong"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={confirmAdd}
                                class="px-2 py-1 text-11-medium text-text-strong bg-surface-raised-base hover:bg-surface-raised-base-hover rounded"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </Show>
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                </Show>
              )
            }}
          </For>
        </Accordion>
      </div>
    </ScrollView>
  )
}

function MemoryItem(props: { memory: KnowledgeMemory; onEdit: () => void; onDelete: () => void }) {
  return (
    <div class="group flex items-start gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-raised-base-hover transition-colors">
      <div class="min-w-0 flex-1 flex flex-col leading-tight gap-0.5">
        <span class="text-12-medium text-text-strong truncate">{props.memory.key}</span>
        <span class="text-11-regular text-text-weak line-clamp-2 whitespace-pre-wrap">{props.memory.value}</span>
        <span class="text-10-regular text-text-weaker mt-0.5">{fmtTime(props.memory.updated)}</span>
      </div>
      <div class="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={props.onEdit}
          class="flex items-center justify-center size-5 rounded hover:bg-surface-stronger text-icon-weak hover:text-icon-base"
          aria-label="Edit memory"
        >
            <Icon name="edit" size="small" />
        </button>
        <button
          type="button"
          onClick={props.onDelete}
          class="flex items-center justify-center size-5 rounded hover:bg-surface-stronger text-icon-weak hover:text-icon-danger"
          aria-label="Delete memory"
        >
          <Icon name="trash" size="small" />
        </button>
      </div>
    </div>
  )
}
