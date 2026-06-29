import { Schema, Effect } from "effect"
import { ArtifactManager } from "./manager"

// Note: In reality, tools are usually defined in packages/opencode/src/tool
// This file serves to export the schema and definition for the artifact tools.

export const WriteArtifactParams = Schema.Struct({
  name: Schema.String.annotate({ description: "Filename of the artifact" }),
  content: Schema.String.annotate({ description: "Markdown content" }),
  metadata: Schema.Struct({
    requestFeedback: Schema.Boolean.pipe(Schema.optional),
    summary: Schema.String.pipe(Schema.optional),
    userFacing: Schema.Boolean.pipe(Schema.optional),
  }),
})

export const ReadArtifactParams = Schema.Struct({
  name: Schema.String.annotate({ description: "Filename of the artifact" }),
})

export const executeWriteArtifact = (sessionID: string, params: typeof WriteArtifactParams.Type) =>
  Effect.gen(function* () {
    const manager = yield* ArtifactManager
    yield* manager.write(sessionID, params.name, params.content, params.metadata)
    return { output: \`Successfully wrote artifact \${params.name}\` }
  })

export const executeReadArtifact = (sessionID: string, params: typeof ReadArtifactParams.Type) =>
  Effect.gen(function* () {
    const manager = yield* ArtifactManager
    const artifact = yield* manager.read(sessionID, params.name)
    return { output: artifact.content }
  })
