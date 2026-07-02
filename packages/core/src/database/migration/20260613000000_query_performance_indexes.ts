import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20260613000000_query_performance_indexes",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`session_time_updated_idx\` ON \`session\` (\`time_updated\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`session_directory_idx\` ON \`session\` (\`directory\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`session_input_time_created_idx\` ON \`session_input\` (\`session_id\`,\`time_created\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`session_message_type_idx\` ON \`session_message\` (\`type\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`session_message_time_updated_idx\` ON \`session_message\` (\`time_updated\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`part_time_created_idx\` ON \`part\` (\`session_id\`,\`time_created\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`todo_session_status_priority_idx\` ON \`todo\` (\`session_id\`,\`status\`,\`priority\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`event_type_idx\` ON \`event\` (\`aggregate_id\`,\`type\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`project_directory_type_idx\` ON \`project_directory\` (\`project_id\`,\`type\`);`)
    })
  },
} satisfies DatabaseMigration.Migration
