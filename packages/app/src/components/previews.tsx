import { createEffect, createSignal, onCleanup, Show } from "solid-js"
import { Dialog } from "@opencode-ai/ui/dialog"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { useMarked } from "@opencode-ai/ui/context/marked"

function resolveRelativeUrls(html: string, filename: string): string {
  const base = filename.startsWith("/") ? filename.slice(0, filename.lastIndexOf("/") + 1) : ""
  if (!base) return html
  return html
    .replace(/(<img[^>]+src\s*=\s*["'])(?!https?:\/\/|data:|#|\.\/|\/)([^"']+)(["'])/gi, (_, pre, url, post) =>
      url.startsWith("http") ? `${pre}${url}${post}` : `${pre}${base}${url}${post}`
    )
    .replace(/(<a[^>]+href\s*=\s*["'])(?!https?:\/\/|#|mailto:)([^"']+)(["'])/gi, (_, pre, url, post) =>
      url.startsWith("http") || url.startsWith("#") || url.startsWith("mailto:") ? `${pre}${url}${post}` : `${pre}${base}${url}${post}`
    )
}

function sanitizeHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "")
}

export function MarkdownPreviewPanel(props: { content: string; filename: string }) {
  const marked = useMarked()
  const [html, setHtml] = createSignal("")
  const [loading, setLoading] = createSignal(true)
  let previewRef: HTMLDivElement | undefined

  createEffect(() => {
    const content = props.content
    setLoading(true)
    const parser = (marked as unknown) as { (markdown: string): Promise<string> } | { parse: (markdown: string) => Promise<string> }
    const render = (result: string) => {
      const cleaned = sanitizeHtml(result)
      const resolved = resolveRelativeUrls(cleaned, props.filename)
      setHtml(resolved)
      setLoading(false)
    }
    if (typeof parser === "function") {
      parser(content).then(render).catch(() => {
        setHtml(`<p>Failed to render markdown</p>`)
        setLoading(false)
      })
    } else if (parser && typeof (parser as { parse: Function }).parse === "function") {
      ;(parser as { parse: (markdown: string) => Promise<string> }).parse(content).then(render).catch(() => {
        setHtml(`<p>Failed to render markdown</p>`)
        setLoading(false)
      })
    }
  })

  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === "A") {
      e.preventDefault()
      const href = target.getAttribute("href")
      if (href) window.open(href, "_blank")
    }
  }

  return (
    <div class="flex-1 overflow-y-auto p-8 bg-background-base" ref={previewRef} onContextMenu={handleContextMenu}>
      <Show when={loading()} fallback={
        <div
          class="prose prose-sm max-w-none text-text-strong [&_pre]:bg-surface-base [&_pre]:border [&_pre]:border-border-base [&_pre]:rounded-md [&_pre]:p-3 [&_code]:text-12-regular [&_h1]:text-18-medium [&_h2]:text-16-medium [&_h3]:text-14-medium [&_a]:text-accent-base [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-accent-base [&_blockquote]:pl-3 [&_blockquote]:text-text-weak [&_img]:rounded-md [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_hr]:border-border-base [&_table]:w-full [&_th]:text-left [&_th]:p-2 [&_th]:bg-surface-base [&_td]:p-2 [&_td]:border-t [&_td]:border-border-base [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre_code]:text-12-regular [&_pre_code]:leading-relaxed"
          innerHTML={html()}
        />
      }>
        <div class="flex items-center justify-center py-10 text-text-weak">Rendering...</div>
      </Show>
    </div>
  )
}


export function MarkdownPreview(props: { content: string; filename: string; onClose: () => void }) {
  const marked = useMarked()
  const [html, setHtml] = createSignal("")
  const [loading, setLoading] = createSignal(true)
  let previewRef: HTMLDivElement | undefined

  createEffect(() => {
    const content = props.content
    setLoading(true)
    const parser = (marked as unknown) as { (markdown: string): Promise<string> } | { parse: (markdown: string) => Promise<string> }
    const render = (result: string) => {
      const cleaned = sanitizeHtml(result)
      const resolved = resolveRelativeUrls(cleaned, props.filename)
      setHtml(resolved)
      setLoading(false)
    }
    if (typeof parser === "function") {
      parser(content).then(render).catch(() => {
        setHtml(`<p>Failed to render markdown</p>`)
        setLoading(false)
      })
    } else if (parser && typeof (parser as { parse: Function }).parse === "function") {
      ;(parser as { parse: (markdown: string) => Promise<string> }).parse(content).then(render).catch(() => {
        setHtml(`<p>Failed to render markdown</p>`)
        setLoading(false)
      })
    }
  })

  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === "A") {
      e.preventDefault()
      const href = target.getAttribute("href")
      if (href) window.open(href, "_blank")
    }
  }

  return (
    <Dialog transition class="!max-w-4xl !max-h-[85vh]">
      <div class="flex items-center justify-between px-4 py-2 border-b border-border-base shrink-0">
        <span class="text-13-medium text-text-strong truncate">Preview {props.filename}</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="flex items-center justify-center size-6 rounded text-icon-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors"
            onClick={() => setLoading(true)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8C2 4.686 4.686 2 8 2C10.5 2 12.682 3.59 13.5 5.854M14 8C14 11.314 11.314 14 8 14C5.5 14 3.318 12.41 2.5 10.146" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V5.854H10.146M2 14V10.146H5.854" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <IconButton icon="close" variant="ghost" size="small" class="size-6 rounded" onClick={props.onClose} />
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-4" ref={previewRef} onContextMenu={handleContextMenu}>
        <Show when={loading()} fallback={
          <div
            class="prose prose-sm max-w-none text-text-strong [&_pre]:bg-surface-base [&_pre]:border [&_pre]:border-border-base [&_pre]:rounded-md [&_pre]:p-3 [&_code]:text-12-regular [&_h1]:text-18-medium [&_h2]:text-16-medium [&_h3]:text-14-medium [&_a]:text-accent-base [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-accent-base [&_blockquote]:pl-3 [&_blockquote]:text-text-weak [&_img]:rounded-md [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_hr]:border-border-base [&_table]:w-full [&_th]:text-left [&_th]:p-2 [&_th]:bg-surface-base [&_td]:p-2 [&_td]:border-t [&_td]:border-border-base [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre_code]:text-12-regular [&_pre_code]:leading-relaxed"
            innerHTML={html()}
          />
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
