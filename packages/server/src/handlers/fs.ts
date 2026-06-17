import { FileSystem } from "@opencode-ai/core/filesystem"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Location } from "@opencode-ai/core/location"
import { RelativePath } from "@opencode-ai/core/schema"
import { Effect } from "effect"
import { pipe } from "effect/Function"
import { HttpServerResponse } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"
import { response } from "../groups/location"
import { InvalidRequestError, UnauthorizedError } from "../errors"
import path from "path"

export const FileSystemHandler = HttpApiBuilder.group(Api, "server.fs", (handlers) =>
  Effect.gen(function* () {
    return handlers
      .handleRaw("fs.read", (ctx) =>
        Effect.gen(function* () {
          const file = yield* (yield* FileSystem.Service).read({
            path: RelativePath.make(
              decodeURIComponent(new URL(ctx.request.url, "http://localhost").pathname.slice(13)),
            ),
          })
          return HttpServerResponse.uint8Array(file.content, { contentType: file.mime })
        })
      )
      .handle("fs.list", (ctx) =>
        response(
          Effect.gen(function* () {
            const fs = yield* FileSystem.Service
            return yield* fs.list(ctx.query)
          })
        )
      )
      .handle("fs.find", (ctx) =>
        response(
          Effect.gen(function* () {
            const fs = yield* FileSystem.Service
            return yield* fs.find(ctx.query)
          })
        )
      )
      .handle("fs.write", (ctx) =>
        pipe(
          Effect.gen(function* () {
            const location = yield* Location.Service
            const fsUtil = yield* FSUtil.Service
            const absolute = path.resolve(location.directory, ctx.payload.path)
            if (!FSUtil.contains(location.directory, absolute))
              return yield* Effect.fail(new InvalidRequestError({ message: "Path escapes the location" }))
            yield* fsUtil.writeWithDirs(absolute, ctx.payload.content)
            return { path: ctx.payload.path }
          }),
          Effect.catch((e) =>
            Effect.fail(e instanceof InvalidRequestError ? e : new InvalidRequestError({ message: String(e) }))
          )
        )
      )
      .handle("fs.delete", (ctx) =>
        pipe(
          Effect.gen(function* () {
            const location = yield* Location.Service
            const fsUtil = yield* FSUtil.Service
            const absolute = path.resolve(location.directory, ctx.payload.path)
            if (!FSUtil.contains(location.directory, absolute))
              return yield* Effect.fail(new InvalidRequestError({ message: "Path escapes the location" }))
            yield* fsUtil.remove(absolute)
            return { path: ctx.payload.path }
          }),
          Effect.catch((e) =>
            Effect.fail(e instanceof InvalidRequestError ? e : new InvalidRequestError({ message: String(e) }))
          )
        )
      )
  })
)