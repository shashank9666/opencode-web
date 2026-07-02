import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20260614000000_knowledge_memory",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`
        CREATE TABLE \`knowledge_memory\` (
          \`id\` text PRIMARY KEY,
          \`project_id\` text NOT NULL,
          \`category\` text NOT NULL,
          \`key\` text NOT NULL,
          \`value\` text NOT NULL,
          \`session_id\` text,
          \`source\` text DEFAULT 'user' NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`fk_knowledge_memory_project_id_project_id_fk\` FOREIGN KEY (\`project_id\`) REFERENCES \`project\`(\`id\`) ON DELETE CASCADE
        );
      `)
      yield* tx.run(`CREATE INDEX \`knowledge_memory_project_category_idx\` ON \`knowledge_memory\` (\`project_id\`,\`category\`);`)
      yield* tx.run(`CREATE INDEX \`knowledge_memory_project_key_idx\` ON \`knowledge_memory\` (\`project_id\`,\`key\`);`)
      yield* tx.run(`CREATE INDEX \`knowledge_memory_session_idx\` ON \`knowledge_memory\` (\`session_id\`);`)
    })
  },
} satisfies DatabaseMigration.Migration
