import { Effect, Context, Layer } from "effect"
import { SessionV2 } from "@opencode-ai/core/session"

export interface Interface {
  readonly scheduleTimer: (sessionID: string, delayMs: number, prompt: string) => Effect.Effect<void, Error>
  readonly scheduleCron: (sessionID: string, cronExp: string, prompt: string) => Effect.Effect<void, Error>
}

export class BackgroundScheduler extends Context.Service<BackgroundScheduler, Interface>()("@opencode/BackgroundScheduler") {}

export const layer = Layer.effect(
  BackgroundScheduler,
  Effect.gen(function* () {
    const session = yield* SessionV2.Service

    return {
      scheduleTimer: (sessionID: string, delayMs: number, prompt: string) => Effect.gen(function* () {
        // Run asynchronously in the background
        const task = Effect.sleep(delayMs).pipe(
          Effect.andThen(Effect.logInfo(`Timer triggered for session ${sessionID}`)),
          // Reactive wakeup: Inject Mid-Conversation System Message
          Effect.andThen(session.prompt({
            sessionID: sessionID as any,
            id: `timer-${Date.now()}` as any,
            prompt: { text: `[Mid-Conversation System Message: Timer Triggered]\n${prompt}` } as any, // Mock prompt creation
            delivery: "queue"
          }))
        )
        
        // Use runFork to detach if forkDaemon doesn't work, but let's try forkDaemon.
        // Actually, let's just use Effect.forkDaemon(task) if possible, or Effect.runPromise.
        // runPromise is safest if fork doesn't exist on Effect.
        setTimeout(() => Effect.runPromise(task), 0)
      }),
      
      scheduleCron: (sessionID: string, cronExp: string, prompt: string) => Effect.gen(function* () {
        // Mock implementation for cron
        yield* Effect.logInfo(`Cron scheduled for session ${sessionID} with expression ${cronExp}`)
      })
    }
  })
)
