export * as KnowledgeMemory from "./knowledge-memory"

import { Context, Effect, Schema } from "effect"

export const KnowledgeCategory = Schema.Literals(
  "Coding Style",
  "Architecture",
  "Libraries",
  "Patterns",
  "Rules",
  "Preferences",
)
export type KnowledgeCategory = typeof KnowledgeCategory.Type

export const KnowledgeMemory = Schema.Struct({
  id: Schema.String,
  project_id: Schema.String,
  category: KnowledgeCategory,
  key: Schema.String,
  value: Schema.String,
  session_id: Schema.optional(Schema.String),
  source: Schema.Literal("user", "agent"),
  time_created: Schema.Number,
  time_updated: Schema.Number,
})
export type KnowledgeMemory = Schema.Schema.Type<typeof KnowledgeMemory>

export const CreateMemoryInput = Schema.Struct({
  category: KnowledgeCategory,
  key: Schema.String,
  value: Schema.String,
  session_id: Schema.optional(Schema.String),
})

export const UpdateMemoryInput = Schema.Struct({
  category: Schema.optional(KnowledgeCategory),
  key: Schema.optional(Schema.String),
  value: Schema.optional(Schema.String),
})

export const MemoryQuery = Schema.Struct({
  project_id: Schema.String,
  category: Schema.optional(KnowledgeCategory),
  query: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.Number),
})

export interface Interface {
  readonly create: (projectID: string, input: Schema.Schema.Type<typeof CreateMemoryInput>) => Effect.Effect<KnowledgeMemory>
  readonly update: (id: string, input: Schema.Schema.Type<typeof UpdateMemoryInput>) => Effect.Effect<KnowledgeMemory>
  readonly remove: (id: string) => Effect.Effect<void>
  readonly get: (id: string) => Effect.Effect<KnowledgeMemory>
  readonly list: (query: Schema.Schema.Type<typeof MemoryQuery>) => Effect.Effect<ReadonlyArray<KnowledgeMemory>>
  readonly search: (projectID: string, query: string) => Effect.Effect<ReadonlyArray<KnowledgeMemory>>
  readonly getContextText: (projectID: string) => Effect.Effect<string>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/KnowledgeMemory") {}
