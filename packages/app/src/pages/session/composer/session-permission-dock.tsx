import { For, Show, onMount, onCleanup, createSignal } from "solid-js"
import type { PermissionRequest } from "@opencode-ai/sdk/v2"
import { Button } from "@opencode-ai/ui/button"
import { DockPrompt } from "@opencode-ai/ui/dock-prompt"
import { Icon } from "@opencode-ai/ui/icon"
import { useLanguage } from "@/context/language"
import { DialogPermissionExplain } from "@/components/dialog-permission-explain"
import { useDialog } from "@opencode-ai/ui/context/dialog"

export function SessionPermissionDock(props: {
  request: PermissionRequest
  responding: boolean
  onDecide: (response: "once" | "always" | "reject") => void
}) {
  const language = useLanguage()
  const dialog = useDialog()
  const [showExplain, setShowExplain] = createSignal(false)

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (props.responding) return

      // Do not intercept if user is typing in an input
      const active = document.activeElement
      if (
        active?.tagName === "INPUT" ||
        active?.tagName === "TEXTAREA" ||
        (active as HTMLElement)?.isContentEditable
      ) {
        return
      }

      if (e.key === "Enter") {
        e.preventDefault()
        props.onDecide("once")
      } else if (e.key === "Backspace") {
        e.preventDefault()
        props.onDecide("reject")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown))
  })

  const toolDescription = () => {
    const key = `settings.permissions.tool.${props.request.permission}.description`
    const value = language.t(key as Parameters<typeof language.t>[0])
    if (value === key) return ""
    return value
  }

  return (
    <DockPrompt
      kind="permission"
      header={
        <div data-slot="permission-row" data-variant="header">
          <span data-slot="permission-icon">
            <Icon name="warning" size="normal" />
          </span>
          <div data-slot="permission-header-title">{language.t("notification.permission.title")}</div>
        </div>
      }
      footer={
        <>
          <div />
          <div data-slot="permission-footer-actions">
            <Button variant="ghost" size="normal" onClick={() => props.onDecide("reject")} disabled={props.responding}>
              {language.t("ui.permission.deny")} <span class="opacity-70 ml-1 text-11-regular">(Backspace)</span>
            </Button>
            <Button
              variant="secondary"
              size="normal"
              onClick={() => props.onDecide("always")}
              disabled={props.responding}
            >
              {language.t("ui.permission.allowAlways")}
            </Button>
            <Button variant="primary" size="normal" onClick={() => props.onDecide("once")} disabled={props.responding}>
              {language.t("ui.permission.allowOnce")} <span class="opacity-70 ml-1 text-11-regular">(Enter)</span>
            </Button>
          </div>
        </>
      }
    >
      <Show when={toolDescription()}>
        <div data-slot="permission-row">
          <span data-slot="permission-spacer" aria-hidden="true" />
          <div data-slot="permission-hint">{toolDescription()}</div>
        </div>
      </Show>

      <Show when={props.request.patterns.length > 0}>
        <div data-slot="permission-row">
          <span data-slot="permission-spacer" aria-hidden="true" />
          <div data-slot="permission-patterns">
            <For each={props.request.patterns}>
              {(pattern) => <code class="text-12-regular text-text-base break-all">{pattern}</code>}
            </For>
          </div>
        </div>
      </Show>

      <div data-slot="permission-row">
        <span data-slot="permission-spacer" aria-hidden="true" />
        <button
          type="button"
          class="text-12-regular text-text-interactive-base hover:text-text-interactive-hover transition-colors"
          onClick={() => setShowExplain(true)}
        >
          Learn more about this permission
        </button>
      </div>

      <Show when={showExplain()}>
        <DialogPermissionExplain
          request={props.request}
          onClose={() => setShowExplain(false)}
        />
      </Show>
    </DockPrompt>
  )
}
