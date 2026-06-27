import { createEffect, createSignal, createMemo, For, onCleanup, Show } from "solid-js"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { useMarked } from "@opencode-ai/ui/context/marked"
import { marked as fallbackMarked } from "marked"

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

function extractToc(html: string): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = []
  const regex = /<h([1-3])(?:\s+id="([^"]*)")?[^>]*>(.*?)<\/h\1>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1])
    const text = match[3].replace(/<[^>]*>/g, "")
    const id = match[2] || text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
    headings.push({ id, text, level })
  }
  return headings
}

const proseClass = "prose prose-sm max-w-none text-text-strong [&_pre]:bg-surface-base [&_pre]:border [&_pre]:border-border-base [&_pre]:rounded-md [&_pre]:p-3 [&_code]:text-12-regular [&_h1]:text-18-medium [&_h2]:text-16-medium [&_h3]:text-14-medium [&_a]:text-accent-base [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-accent-base [&_blockquote]:pl-3 [&_blockquote]:text-text-weak [&_img]:rounded-md [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_hr]:border-border-base [&_table]:w-full [&_th]:text-left [&_th]:p-2 [&_th]:bg-surface-base [&_td]:p-2 [&_td]:border-t [&_td]:border-border-base [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre_code]:text-12-regular [&_pre_code]:leading-relaxed [&_pre_code]:block"

export function MarkdownPreviewToolbar(props: {
  filename: string
  onRefresh: () => void
  showToc: boolean
  onToggleToc: () => void
  toc: { id: string; text: string; level: number }[]
  onScrollToHeading: (id: string) => void
}) {
  return (
    <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-base bg-surface-base shrink-0">
      <div class="flex items-center gap-1">
        <IconButton icon="eye" size="small" variant="ghost" class="size-6 rounded" title="Refresh preview" onClick={props.onRefresh} />
        <span class="text-12-medium text-text-weak ml-1">{props.filename}</span>
      </div>
      <Show when={props.toc.length > 0}>
        <div class="flex items-center gap-1 relative">
          <IconButton icon="bullet-list" size="small" variant="ghost" class="size-6 rounded" title="Table of Contents" onClick={props.onToggleToc} />
          <Show when={props.showToc}>
            <div class="absolute top-full right-0 mt-1 w-56 max-h-64 overflow-y-auto bg-surface-raised-base border border-border-base rounded-lg shadow-xl z-50 p-1.5">
              <For each={props.toc}>
                {(item) => (
                  <button
                    class="w-full text-left px-2 py-1 text-12-regular text-text-strong hover:bg-surface-raised-base-hover rounded transition-colors truncate block"
                    style={{ "padding-left": `${item.level * 8 + 8}px` }}
                    onClick={() => props.onScrollToHeading(item.id)}
                  >
                    {item.text}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}

export function MarkdownPreviewPanel(props: { content: string; filename: string }) {
  const markedContext = useMarked()
  const [html, setHtml] = createSignal("")
  const [error, setError] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [showToc, setShowToc] = createSignal(false)
  const [toc, setToc] = createSignal<{ id: string; text: string; level: number }[]>([])
  let previewRef: HTMLDivElement | undefined

  const tryParse = async (markdown: string): Promise<string> => {
    const parser = markedContext as unknown
    if (typeof parser === "function") {
      return await (parser as (markdown: string) => Promise<string>)(markdown)
    }
    if (parser && typeof (parser as { parse: Function }).parse === "function") {
      return await (parser as { parse: (markdown: string) => Promise<string> }).parse(markdown)
    }
    throw new Error("Context parser unavailable")
  }

  const renderMarkdown = async (markdown: string) => {
    setLoading(true)
    setError(null)
    try {
      if (!markdown) {
        setHtml("<p class='text-text-weak italic'>Empty file</p>")
        setLoading(false)
        return
      }
      let result: string
      try {
        result = await tryParse(markdown)
      } catch {
        result = await fallbackMarked.parse(markdown)
      }
      const cleaned = sanitizeHtml(result)
      const resolved = resolveRelativeUrls(cleaned, props.filename)
      setHtml(resolved)
      setToc(extractToc(resolved))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setHtml("")
    }
    setLoading(false)
  }

  createEffect(() => {
    const content = props.content
    void renderMarkdown(content)
  })

  const scrollToHeading = (id: string) => {
    if (!previewRef) return
    const el = previewRef.querySelector(`#${CSS.escape(id)}`)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    setShowToc(false)
  }

  const handleLinkClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === "A") {
      const href = target.getAttribute("href")
      if (!href) return
      if (href.startsWith("#")) {
        e.preventDefault()
        scrollToHeading(href.slice(1))
      } else {
        e.preventDefault()
        window.open(href, "_blank")
      }
    }
  }

  return (
    <div class="flex-1 flex flex-col overflow-hidden">
      <MarkdownPreviewToolbar
        filename={props.filename}
        onRefresh={() => void renderMarkdown(props.content)}
        showToc={showToc()}
        onToggleToc={() => setShowToc((p) => !p)}
        toc={toc()}
        onScrollToHeading={scrollToHeading}
      />
      <div class="flex-1 overflow-y-auto p-8 bg-background-base" ref={previewRef} onClick={handleLinkClick}>
        <Show when={!loading()} fallback={
          <div class="flex items-center justify-center py-10 text-text-weak">
            <div class="flex items-center gap-2">
              <Icon name="cursor" size="small" class="animate-pulse" />
              <span>Rendering...</span>
            </div>
          </div>
        }>
          <Show when={!error()} fallback={
            <div class="flex flex-col items-center gap-3 py-10">
              <Icon name="circle-ban-sign" size="large" class="text-icon-danger-active" />
              <p class="text-text-weak text-13-regular">Failed to render markdown</p>
              <p class="text-text-weaker text-11-regular max-w-md text-center">{error()}</p>
              <button
                class="px-3 py-1.5 text-12-medium text-accent-base hover:bg-accent-base/10 rounded-md transition-colors"
                onClick={() => void renderMarkdown(props.content)}
              >
                Retry
              </button>
            </div>
          }>
            <div class={proseClass} innerHTML={html()} />
          </Show>
        </Show>
      </div>
    </div>
  )
}

export function MarkdownPreview(props: { content: string; filename: string; onClose: () => void }) {
  const markedContext = useMarked()
  const [html, setHtml] = createSignal("")
  const [error, setError] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(true)

  const tryParse = async (markdown: string): Promise<string> => {
    const parser = markedContext as unknown
    if (typeof parser === "function") {
      return await (parser as (markdown: string) => Promise<string>)(markdown)
    }
    if (parser && typeof (parser as { parse: Function }).parse === "function") {
      return await (parser as { parse: (markdown: string) => Promise<string> }).parse(markdown)
    }
    throw new Error("Context parser unavailable")
  }

  const renderMarkdown = async (markdown: string) => {
    setLoading(true)
    setError(null)
    try {
      if (!markdown) {
        setHtml("<p class='text-text-weak italic'>Empty file</p>")
        setLoading(false)
        return
      }
      let result: string
      try {
        result = await tryParse(markdown)
      } catch {
        result = await fallbackMarked.parse(markdown)
      }
      const cleaned = sanitizeHtml(result)
      const resolved = resolveRelativeUrls(cleaned, props.filename)
      setHtml(resolved)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setHtml("")
    }
    setLoading(false)
  }

  createEffect(() => {
    void renderMarkdown(props.content)
  })

  return (
    <Dialog transition class="!max-w-4xl !max-h-[85vh]">
      <div class="flex items-center justify-between px-4 py-2 border-b border-border-base shrink-0">
        <span class="text-13-medium text-text-strong truncate">Preview {props.filename}</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="flex items-center justify-center size-6 rounded text-icon-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors"
            onClick={() => void renderMarkdown(props.content)}
          >
            <Icon name="reset" size="small" />
          </button>
          <IconButton icon="close" variant="ghost" size="small" class="size-6 rounded" onClick={props.onClose} />
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <Show when={!loading()} fallback={
          <div class="flex items-center justify-center py-10 text-text-weak">
            <div class="flex items-center gap-2">
              <Icon name="cursor" size="small" class="animate-pulse" />
              <span>Rendering...</span>
            </div>
          </div>
        }>
          <Show when={!error()} fallback={
            <div class="flex flex-col items-center gap-3 py-10">
              <Icon name="circle-ban-sign" size="large" class="text-icon-danger-active" />
              <p class="text-text-weak text-13-regular">Failed to render markdown</p>
              <p class="text-text-weaker text-11-regular">{error()}</p>
            </div>
          }>
            <div class={proseClass} innerHTML={html()} />
          </Show>
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
