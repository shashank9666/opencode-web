import { Effect, Context, Layer } from "effect"
import { SessionV2 } from "@opencode-ai/core/session"

export interface BackgroundScheduler {
  readonly scheduleTimer: (sessionID: string, delayMs: number, prompt: string) => Effect.Effect<void, Error>
  readonly scheduleCron: (sessionID: string, cronExp: string, prompt: string) => Effect.Effect<void, Error>
}

export const BackgroundScheduler = Context.Tag<BackgroundScheduler>()("@opencode/BackgroundScheduler")

export const layer = Layer.effect(
  BackgroundScheduler,
  Effect.gen(function* () {
    const session = yield* SessionV2.Service

    return {
      scheduleTimer: (sessionID: string, delayMs: number, prompt: string) => Effect.gen(function* () {
        // Run asynchronously in the background
        yield* Effect.sleep(delayMs).pipe(
          Effect.andThen(Effect.logInfo(`Timer triggered for session ${sessionID}`)),
          // Reactive wakeup: Inject Mid-Conversation System Message
          Effect.andThen(session.prompt({
            sessionID,
            id: `timer-${Date.now()}`,
            prompt: { text: `[Mid-Conversation System Message: Timer Triggered]\n${prompt}` } as any, // Mock prompt creation
            delivery: "queue"
          })),
          Effect.fork
        )
      }),
      
      scheduleCron: (sessionID: string, cronExp: string, prompt: string) => Effect.gen(function* () {
        // Mock implementation for cron
        yield* Effect.logInfo(`Cron scheduled for session ${sessionID} with expression ${cronExp}`)
      })
    }
  })
)
