import { Effect, Context, Layer } from "effect"
import { FSUtil } from "../fs-util"
import * as path from "path"

export interface Artifact {
  name: string
  content: string
  metadata: {
    requestFeedback?: boolean
    summary?: string
    userFacing?: boolean
  }
}

export interface ArtifactManager {
  readonly write: (sessionID: string, name: string, content: string, metadata: any) => Effect.Effect<void, Error>
  readonly read: (sessionID: string, name: string) => Effect.Effect<Artifact, Error>
  readonly list: (sessionID: string) => Effect.Effect<Artifact[], Error>
}

export const ArtifactManager = Context.GenericTag<ArtifactManager>("@opencode/ArtifactManager")

export const layer = Layer.effect(
  ArtifactManager,
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    
    // In a real implementation this would resolve the brain directory from global app context
    const getBrainDir = (sessionID: string) => path.join(process.cwd(), ".gemini", "brain", sessionID)

    return {
      write: (sessionID, name, content, metadata) => Effect.gen(function* () {
        const filepath = path.join(getBrainDir(sessionID), name)
        const fsPromises = require("fs/promises")
        yield* Effect.tryPromise(() => fsPromises.mkdir(path.dirname(filepath), { recursive: true }))
        yield* Effect.tryPromise(() => fsPromises.writeFile(filepath, content, "utf-8"))
      }).pipe(Effect.orDie),

      read: (sessionID, name) => Effect.gen(function* () {
        const filepath = path.join(getBrainDir(sessionID), name)
        const fsPromises = require("fs/promises")
        const content = yield* Effect.tryPromise(() => fsPromises.readFile(filepath, "utf-8"))
        return { name, content, metadata: {} }
      }).pipe(Effect.orDie),

      list: (sessionID) => Effect.succeed([]),
    }
  })
)
