import { Button } from "./button"
import { Show } from "solid-js"

export interface DiffViewerActionsProps {
  file: string
  onAccept?: (file: string) => void
  onReject?: (file: string) => void
  onEditManually?: (file: string) => void
}

export function DiffViewerActions(props: DiffViewerActionsProps) {
  return (
    <div data-slot="diff-viewer-actions" class="flex items-center gap-1">
      <Show when={props.onAccept}>
        <Button
          size="small"
          variant="primary"
          class="h-6 px-2 text-11-medium"
          onClick={() => props.onAccept?.(props.file)}
        >
          <span class="flex items-center gap-1">
            Accept <span class="opacity-70 text-[10px]">Alt+Enter</span>
          </span>
        </Button>
      </Show>
      <Show when={props.onReject}>
        <Button
          size="small"
          variant="ghost"
          class="h-6 px-2 text-11-medium text-text-weak hover:text-text-base"
          onClick={() => props.onReject?.(props.file)}
        >
          <span class="flex items-center gap-1">
            Reject <span class="opacity-70 text-[10px]">Shift+Alt+⌫</span>
          </span>
        </Button>
      </Show>
      <Show when={props.onEditManually}>
        <Button
          size="small"
          variant="ghost"
          class="h-6 px-2 text-11-medium"
          onClick={() => props.onEditManually?.(props.file)}
        >
          Edit
        </Button>
      </Show>
    </div>
  )
}

export function DiffViewerBatchActions(props: {
  onAcceptAll?: () => void
  onRejectAll?: () => void
  visible?: boolean
}) {
  return (
    <Show when={props.visible !== false}>
      <div data-slot="diff-viewer-batch-actions" class="flex items-center gap-2">
        <Show when={props.onAcceptAll}>
          <Button size="small" variant="primary" onClick={props.onAcceptAll}>
            Accept All
          </Button>
        </Show>
        <Show when={props.onRejectAll}>
          <Button size="small" variant="ghost" onClick={props.onRejectAll}>
            Reject All
          </Button>
        </Show>
      </div>
    </Show>
  )
}
