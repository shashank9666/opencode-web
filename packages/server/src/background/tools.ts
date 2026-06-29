import { Schema, Effect } from "effect"
import { BackgroundScheduler } from "./scheduler"

export const ScheduleTaskParams = Schema.Struct({
  durationSeconds: Schema.Number.pipe(Schema.optional, Schema.annotate({ description: "One-shot timer in seconds" })),
  cronExpression: Schema.String.pipe(Schema.optional, Schema.annotate({ description: "Cron schedule expression" })),
  prompt: Schema.String.annotate({ description: "The message content to include when the timer fires" }),
})

export const executeScheduleTask = (sessionID: string, params: typeof ScheduleTaskParams.Type) =>
  Effect.gen(function* () {
    const scheduler = yield* BackgroundScheduler
    
    if (params.durationSeconds) {
      yield* scheduler.scheduleTimer(sessionID, params.durationSeconds * 1000, params.prompt)
      return { output: `Scheduled timer to fire in ${params.durationSeconds} seconds` }
    } else if (params.cronExpression) {
      yield* scheduler.scheduleCron(sessionID, params.cronExpression, params.prompt)
      return { output: `Scheduled cron with expression ${params.cronExpression}` }
    }
    
    return { output: "Error: must specify either durationSeconds or cronExpression" }
  })
