export * as KnowledgeMemorySource from "./knowledge-memory-source"

import { Effect, Layer, Schema } from "effect"
import { SystemContext } from "./index"
import { SystemContextRegistry } from "./registry"
import { KnowledgeMemory } from "../knowledge-memory"
import { Location } from "../location"

export const layer = Layer.effectDiscard(
  Effect.gen(function* () {
    const location = yield* Location.Service
    const registry = yield* SystemContextRegistry.Service

    const context = SystemContext.make({
      key: SystemContext.Key.make("core/knowledge-memory"),
      codec: Schema.toCodecJson(Schema.String),
      load: KnowledgeMemory.Service.use((svc) => svc.getContextText(location.project.directory)).pipe(
        Effect.catch(() => Effect.succeed("")),
      ),
      baseline: (text) =>
        text ? ["## User Knowledge & Preferences", text].join("\n") : "",
      update: (_previous, text) =>
        text ? ["## Updated User Knowledge & Preferences", text].join("\n") : "",
    })

    yield* registry.register({ key: SystemContext.Key.make("core/knowledge-memory"), load: Effect.succeed(context) })
  }),
).pipe(Layer.provideMerge(SystemContextRegistry.layer))
