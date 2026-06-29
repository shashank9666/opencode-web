import { Effect, Context, Layer } from "effect"
import { FSUtil } from "../fs-util"
import * as path from "path"

export interface KnowledgeDaemon {
  readonly fetchAndInject: (sessionID: string) => Effect.Effect<void, Error>
}

export const KnowledgeDaemon = Context.Tag<KnowledgeDaemon>()("@opencode/KnowledgeDaemon")

export const layer = Layer.effect(
  KnowledgeDaemon,
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    
    return {
      fetchAndInject: (sessionID: string) => Effect.gen(function* () {
        const kiDir = path.join(process.cwd(), ".gemini", "knowledge")
        const exists = yield* fs.existsSafe(kiDir)
        
        if (exists) {
          // Fetch knowledge indexes and merge into prompt headers
          yield* Effect.logInfo(`Proactively fetched Knowledge Items for session ${sessionID}`)
          // Implementation of header injection would integrate with SystemContext
        }
      }).pipe(Effect.orDie)
    }
  })
)
