import { KnowledgeMemory as Core } from "@opencode-ai/core/knowledge-memory"
import { Database } from "@/storage/database"
import { Identifier } from "@opencode-ai/core/util/identifier"
import { Schema } from "effect"
import { Effect, Layer } from "effect"
import { sql } from "drizzle-orm"

type Row = {
  id: string
  project_id: string
  category: string
  key: string
  value: string
  session_id: string | null
  source: string
  time_created: number
  time_updated: number
}

function decode(row: Row): Core.KnowledgeMemory {
  return Schema.decodeUnknownSync(Core.KnowledgeMemory)({
    ...row,
    session_id: row.session_id ?? undefined,
  })
}

export const layer = Layer.effect(
  Core.Service,
  Effect.gen(function* () {
    const db = yield* Database.Service

    const create: Core.Interface["create"] = (projectID, input) =>
      Effect.gen(function* () {
        const id = Identifier.ascending()
        const now = Date.now()
        yield* db.run(sql`
          INSERT INTO knowledge_memory (id, project_id, category, key, value, session_id, source, time_created, time_updated)
          VALUES (${id}, ${projectID}, ${input.category}, ${input.key}, ${input.value}, ${input.session_id ?? null}, 'user', ${now}, ${now})
        `)
        return yield* get(id)
      })

    const update: Core.Interface["update"] = (id, input) =>
      Effect.gen(function* () {
        const sets: string[] = []
        const vals: unknown[] = []
        if (input.category !== undefined) { sets.push("category = ?"); vals.push(input.category) }
        if (input.key !== undefined) { sets.push("key = ?"); vals.push(input.key) }
        if (input.value !== undefined) { sets.push("value = ?"); vals.push(input.value) }
        if (sets.length === 0) return yield* get(id)
        sets.push("time_updated = ?"); vals.push(Date.now())
        yield* db.run(sql`UPDATE knowledge_memory SET ${sql.raw(sets.join(", "))} WHERE id = ${id}`)
        return yield* get(id)
      })

    const remove: Core.Interface["remove"] = (id) =>
      db.run(sql`DELETE FROM knowledge_memory WHERE id = ${id}`).pipe(Effect.as(void 0))

    const get: Core.Interface["get"] = (id) =>
      Effect.gen(function* () {
        const row = yield* db.get<Row>(sql`SELECT * FROM knowledge_memory WHERE id = ${id}`)
        if (!row) return yield* Effect.die(new Error(`Knowledge memory not found: ${id}`))
        return decode(row)
      })

    const list: Core.Interface["list"] = (query) =>
      Effect.gen(function* () {
        const conditions = ["project_id = ?"]
        const params: unknown[] = [query.project_id]
        if (query.category) { conditions.push("category = ?"); params.push(query.category) }
        if (query.limit) params.push(query.limit)
        const rows = yield* db.all<Row>(
          sql`SELECT * FROM knowledge_memory WHERE ${sql.raw(conditions.join(" AND "))} ORDER BY time_updated DESC ${query.limit ? sql`LIMIT ${query.limit}` : sql``}`,
        )
        return rows.map(decode)
      })

    const search: Core.Interface["search"] = (projectID, query) =>
      Effect.gen(function* () {
        const rows = yield* db.all<Row>(
          sql`SELECT * FROM knowledge_memory WHERE project_id = ${projectID} AND (key LIKE ${`%${query}%`} OR value LIKE ${`%${query}%`}) ORDER BY time_updated DESC LIMIT 20`,
        )
        return rows.map(decode)
      })

    const getContextText: Core.Interface["getContextText"] = (projectID) =>
      Effect.gen(function* () {
        const rows = yield* db.all<Row>(
          sql`SELECT * FROM knowledge_memory WHERE project_id = ${projectID} ORDER BY time_updated DESC LIMIT 50`,
        )
        if (rows.length === 0) return ""
        const lines = rows.map(
          (r) => `[${r.category}] ${r.key}: ${r.value}`,
        )
        return ["<user_knowledge>", ...lines, "</user_knowledge>"].join("\n")
      })

    return Core.Service.of({ create, update, remove, get, list, search, getContextText })
  }),
)

export * as Memory from "./memory"
