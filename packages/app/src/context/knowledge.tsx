import { createStore } from "solid-js/store"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { persisted } from "@/utils/persist"
import { Persist } from "@/utils/persist"
import { uuid } from "@/utils/uuid"

export type KnowledgeCategory =
  | "Coding Style"
  | "Architecture"
  | "Libraries"
  | "Patterns"
  | "Rules"
  | "Preferences"

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  "Coding Style",
  "Architecture",
  "Libraries",
  "Patterns",
  "Rules",
  "Preferences",
]

export type KnowledgeMemory = {
  id: string
  category: KnowledgeCategory
  key: string
  value: string
  created: number
  updated: number
}

export type ConversationMemory = {
  id: string
  sessionId: string
  context: string
  created: number
}

type KnowledgeStore = {
  memories: KnowledgeMemory[]
  conversations: ConversationMemory[]
}

export const { use: useKnowledge, provider: KnowledgeProvider } = createSimpleContext({
  name: "Knowledge",
  gate: false,
  init: () => {
    const [store, setStore, _, ready] = persisted(
      Persist.global("knowledge.v1"),
      createStore<KnowledgeStore>({ memories: [], conversations: [] }),
    )

    const now = () => Date.now()

    return {
      ready,
      get allMemories() {
        return store.memories
      },
      get conversations() {
        return store.conversations
      },
      addMemory(category: KnowledgeCategory, key: string, value: string) {
        const t = now()
        setStore("memories", (memories) => [
          ...memories,
          { id: uuid(), category, key, value, created: t, updated: t },
        ])
      },
      getMemory(category: KnowledgeCategory, key: string) {
        return store.memories.find((m) => m.category === category && m.key === key)
      },
      listMemories(category: KnowledgeCategory) {
        return store.memories.filter((m) => m.category === category)
      },
      removeMemory(id: string) {
        setStore("memories", (memories) => memories.filter((m) => m.id !== id))
      },
      updateMemory(id: string, updates: Partial<Pick<KnowledgeMemory, "key" | "value">>) {
        setStore("memories", (m) => m.id === id, { ...updates, updated: now() })
      },
      searchMemories(query: string) {
        const q = query.toLowerCase()
        return store.memories.filter(
          (m) =>
            m.key.toLowerCase().includes(q) ||
            m.value.toLowerCase().includes(q) ||
            m.category.toLowerCase().includes(q),
        )
      },
      rememberContext(sessionId: string, context: string) {
        setStore("conversations", (convs) => [
          ...convs,
          { id: uuid(), sessionId, context, created: now() },
        ])
      },
      recall(query: string) {
        const q = query.toLowerCase()
        return store.conversations.filter((c) => c.context.toLowerCase().includes(q))
      },
      clearSessionMemory(sessionId: string) {
        setStore("conversations", (convs) => convs.filter((c) => c.sessionId !== sessionId))
      },
    }
  },
})
