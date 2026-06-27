import { Git } from "@opencode-ai/core/git"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"
import { response } from "../groups/location"

export const GitHandler = HttpApiBuilder.group(Api, "server.git", (handlers) =>
  Effect.gen(function* () {
    return handlers.handle("git.blame", (ctx) =>
      response(
        Effect.gen(function* () {
          const git = yield* Git.Service
          return yield* git.blame({ directory: ctx.query.location?.directory ?? process.cwd(), file: ctx.query.file }).pipe(Effect.orDie)
        })
      )
    )
  })
)
