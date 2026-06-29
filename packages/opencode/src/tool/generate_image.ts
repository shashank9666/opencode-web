import { Schema } from "effect"
import * as path from "path"
import { Effect } from "effect"
import * as Tool from "./tool"
import DESCRIPTION from "./generate_image.txt"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { InstanceState } from "@/effect/instance-state"

export const Parameters = Schema.Struct({
  prompt: Schema.String.annotate({ description: "The text prompt to generate an image for" }),
  filePath: Schema.String.annotate({
    description: "The absolute path to save the generated image to (must be .png or .jpg)",
  }),
})

export const GenerateImageTool = Tool.define(
  "generate_image",
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: { prompt: string; filePath: string }, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const instance = yield* InstanceState.context
          const filepath = path.isAbsolute(params.filePath)
            ? params.filePath
            : path.join(instance.directory, params.filePath)

          yield* ctx.ask({
            permission: "filesystem.write.project",
            patterns: [path.relative(instance.worktree, filepath)],
            always: ["*"],
            metadata: { filepath },
          })

          const encodedPrompt = encodeURIComponent(params.prompt)
          const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true`
          
          const response = yield* Effect.tryPromise(() => fetch(imageUrl))
          if (!response.ok) {
            return {
              title: "Image Generation Failed",
              output: `Failed to fetch image: ${response.statusText}`,
              metadata: {}
            }
          }
          
          const arrayBuffer = yield* Effect.tryPromise(() => response.arrayBuffer())
          const buffer = Buffer.from(arrayBuffer)
          
          const fsPromises = require("fs/promises")
          yield* Effect.tryPromise(() => fsPromises.mkdir(path.dirname(filepath), { recursive: true }))
          yield* Effect.tryPromise(() => fsPromises.writeFile(filepath, buffer))
          
          return {
            title: path.relative(instance.worktree, filepath),
            metadata: { filepath },
            output: `Successfully generated and saved image to ${filepath}`,
          }
        }).pipe(
          Effect.catchAll((e: any) =>
            Effect.succeed({
              title: "Image Generation Error",
              output: `Error generating image: ${e.message}`,
              metadata: {}
            })
          )
        ),
    }
  }),
)
