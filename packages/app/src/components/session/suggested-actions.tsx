import { For } from "solid-js"
import { useCommand } from "@/context/command"

const actions = [
  { id: "apply.changes", label: "Apply" },
  { id: "run.tests", label: "Run Tests" },
  { id: "git.commit", label: "Commit" },
  { id: "explain.code", label: "Explain" },
  { id: "refactor.code", label: "Refactor" },
  { id: "optimize.code", label: "Optimize" },
  { id: "generate.docs", label: "Generate Docs" },
  { id: "continue.response", label: "Continue" },
] as const

export function SuggestedActions() {
  const command = useCommand()

  return (
    <div data-slot="suggested-actions" class="flex flex-wrap gap-1.5 px-4 md:px-5 pb-2 pt-1">
      <For each={actions}>
        {(action) => (
          <button
            type="button"
            data-slot="suggested-action-button"
            class="rounded-[6px] border border-border-weaker-base bg-transparent px-2.5 py-[3px] text-11-medium text-text-weak transition-colors hover:border-border-weak-base hover:text-text-base cursor-pointer"
            onClick={() => command.trigger(action.id, "palette")}
          >
            {action.label}
          </button>
        )}
      </For>
    </div>
  )
}
