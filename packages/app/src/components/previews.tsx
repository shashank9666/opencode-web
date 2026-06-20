import { createEffect, createSignal, Show } from "solid-js"
import { Dialog } from "@opencode-ai/ui/dialog"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { useMarked } from "@opencode-ai/ui/context/marked"

export function MarkdownPreview(props: { content: string; filename: string; onClose: () => void }) {
  const marked = useMarked()
  const [html, setHtml] = createSignal("")
  const [loading, setLoading] = createSignal(true)

  createEffect(() => {
    const content = props.content
    setLoading(true)
    const parser = (marked as unknown) as { (markdown: string): Promise<string> } | { parse: (markdown: string) => Promise<string> }
    if (typeof parser === "function") {
      parser(content).then((result: string) => {
        setHtml(result)
        setLoading(false)
      }).catch(() => {
        setHtml(`<p>Failed to render markdown</p>`)
        setLoading(false)
      })
    } else if (parser && typeof (parser as { parse: Function }).parse === "function") {
      ;(parser as { parse: (markdown: string) => Promise<string> }).parse(content).then((result: string) => {
        setHtml(result)
        setLoading(false)
      }).catch(() => {
        setHtml(`<p>Failed to render markdown</p>`)
        setLoading(false)
      })
    }
  })

  return (
    <Dialog transition class="!max-w-4xl !max-h-[85vh]">
      <div class="flex items-center justify-between px-4 py-2 border-b border-border-base shrink-0">
        <span class="text-13-medium text-text-strong truncate">{props.filename}</span>
        <IconButton icon="close" variant="ghost" size="small" class="size-6 rounded" onClick={props.onClose} />
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <Show when={loading()} fallback={
          <div class="prose prose-sm max-w-none text-text-strong [&_pre]:bg-surface-base [&_pre]:border [&_pre]:border-border-base [&_pre]:rounded-md [&_pre]:p-3 [&_code]:text-12-regular [&_h1]:text-18-medium [&_h2]:text-16-medium [&_h3]:text-14-medium [&_a]:text-accent-base [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-accent-base [&_blockquote]:pl-3 [&_blockquote]:text-text-weak [&_img]:rounded-md [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_hr]:border-border-base [&_table]:w-full [&_th]:text-left [&_th]:p-2 [&_th]:bg-surface-base [&_td]:p-2 [&_td]:border-t [&_td]:border-border-base" innerHTML={html()} />
        }>
          <div class="flex items-center justify-center py-10 text-text-weak">Rendering...</div>
        </Show>
      </div>
    </Dialog>
  )
}

export function PdfPreview(props: { src: string; filename: string; onClose: () => void }) {
  return (
    <Dialog transition class="!max-w-5xl !max-h-[90vh]">
      <div class="flex items-center justify-between px-4 py-2 border-b border-border-base shrink-0">
        <span class="text-13-medium text-text-strong truncate">{props.filename}</span>
        <IconButton icon="close" variant="ghost" size="small" class="size-6 rounded" onClick={props.onClose} />
      </div>
      <div class="flex-1 min-h-0">
        <iframe
          src={props.src}
          class="w-full h-full min-h-[70vh]"
          title={props.filename}
        />
      </div>
    </Dialog>
  )
}
