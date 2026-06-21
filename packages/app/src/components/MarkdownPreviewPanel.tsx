import { createSignal, Show } from "solid-js"
import { SolidMarkdown } from "solid-markdown"

export function MarkdownPreviewPanel(props: { content: string; visible: boolean }) {
  const [expanded, setExpanded] = createSignal(true)

  return (
    <Show when={props.visible}>
      <div class="border-l border-border-base bg-background-base overflow-y-auto min-w-0 flex-1">
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-base bg-surface-base shrink-0">
          <span class="text-12-medium text-text-weak">Preview</span>
          <button
            type="button"
            class="text-12-regular text-text-weak hover:text-text-strong px-1.5 py-0.5 rounded hover:bg-surface-raised-base-hover transition-colors"
            onClick={() => setExpanded((p) => !p)}
          >
            {expanded() ? "Collapse" : "Expand"}
          </button>
        </div>
        <Show when={expanded()}>
          <div class="p-4 prose prose-sm max-w-none text-text-strong [&_pre]:bg-surface-base [&_pre]:border [&_pre]:border-border-base [&_pre]:rounded-md [&_pre]:p-3 [&_code]:text-12-regular [&_h1]:text-18-medium [&_h2]:text-16-medium [&_h3]:text-14-medium [&_a]:text-accent-base [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-accent-base [&_blockquote]:pl-3 [&_blockquote]:text-text-weak [&_img]:rounded-md [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_hr]:border-border-base [&_table]:w-full [&_th]:text-left [&_th]:p-2 [&_th]:bg-surface-base [&_td]:p-2 [&_td]:border-t [&_td]:border-border-base">
            <SolidMarkdown>{props.content || ""}</SolidMarkdown>
          </div>
        </Show>
      </div>
    </Show>
  )
}
