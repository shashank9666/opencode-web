import { FSUtil } from "@opencode-ai/core/fs-util"
import { Tool } from "@opencode-ai/core/tool/tool"
import { AppProcess } from "@opencode-ai/core/process"
import { Effect, Option, Schema } from "effect"
import path from "path"

const DetectInput = Schema.Struct({
  directory: Schema.optional(Schema.String),
})

const ConflictFile = Schema.Struct({
  file: Schema.String,
  conflict_count: Schema.Number,
})

const DetectOutput = Schema.Struct({
  has_conflicts: Schema.Boolean,
  files: Schema.Array(ConflictFile),
  count: Schema.Number,
})

const ResolveInput = Schema.Struct({
  file: Schema.String,
  content: Schema.String,
  directory: Schema.optional(Schema.String),
})

const ResolveOutput = Schema.Struct({
  file: Schema.String,
  resolved: Schema.Boolean,
})

export const detect = Tool.create({
  name: "detect_conflicts",
  description: "Detect git merge conflicts by listing unmerged files. Returns files with conflict markers.",
  input: DetectInput,
  output: DetectOutput,
  execute: (params) =>
    Effect.gen(function* () {
      const cwd = params.directory ?? process.cwd()
      const proc = yield* AppProcess.AppProcess
      const result = yield* proc.run("git", ["diff", "--name-only", "--diff-filter=U"], { cwd }).pipe(Effect.option)
      if (Option.isNone(result)) return { has_conflicts: false, files: [], count: 0 }

      const lines = result.value.stdout.trim().split("\n").filter(Boolean)
      const files = yield* Effect.forEach(lines, (file) =>
        Effect.gen(function* () {
          const content = yield* proc.run("git", ["show", `:2:${file}`], { cwd }).pipe(
            Effect.map((r) => r.stdout),
            Effect.option,
          )
          const markers = Option.isSome(content) ? (content.value.match(/<<<<<<< /g)?.length ?? 0) : 0
          return { file, conflict_count: markers }
        }),
      )
      return { has_conflicts: files.length > 0, files, count: files.length }
    }),
})

export const resolve = Tool.create({
  name: "resolve_conflicts",
  description: "Resolve a merge conflict by writing resolved content to the file and staging it with git add.",
  input: ResolveInput,
  output: ResolveOutput,
  execute: (params) =>
    Effect.gen(function* () {
      const cwd = params.directory ?? process.cwd()
      const fullPath = path.join(cwd, params.file)
      const fs = yield* FSUtil.Service
      yield* fs.writeWithDirs(fullPath, params.content)
      const proc = yield* AppProcess.AppProcess
      yield* proc.run("git", ["add", params.file], { cwd })
      return { file: params.file, resolved: true }
    }),
})

export * as ResolveConflicts from "./resolve-conflicts"
