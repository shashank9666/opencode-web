import { createEffect, createSignal, createMemo, For, onCleanup, Show, onMount } from "solid-js"
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

const proseClass = "prose prose-sm max-w-none text-text-strong"

export function MarkdownPreviewToolbar(props: {
  filename: string
  onRefresh: () => void
  showToc: boolean
  onToggleToc: () => void
  toc: { id: string; text: string; level: number }[]
  onScrollToHeading: (id: string) => void
  showSource?: boolean
  onToggleSource?: () => void
  wordWrap?: boolean
  onToggleWordWrap?: () => void
  scrollContainer?: () => HTMLElement | undefined
}) {
  const scrollTop = () => {
    const el = props.scrollContainer?.()
    if (!el) return 0
    return el.scrollTop
  }
  const scrollMax = () => {
    const el = props.scrollContainer?.()
    if (!el) return 1
    return Math.max(1, el.scrollHeight - el.clientHeight)
  }
  const scrollPercent = () => Math.round((scrollTop() / scrollMax()) * 100)

  return (
    <div data-component="markdown-toolbar">
      <div class="flex items-center gap-1">
        {/* File name */}
        <span class="text-12-medium text-text-weak ml-1">{props.filename}</span>
      </div>

      <div class="flex-1" />

      <div class="flex items-center gap-0.5">
        {/* Scroll position */}
        <span class="text-10-regular text-text-weaker tabular-nums mr-1">{scrollPercent()}%</span>

        {/* Word wrap toggle */}
        <Show when={props.onToggleWordWrap}>
          <button
            data-active={props.wordWrap ? "true" : "false"}
            title="Toggle word wrap"
            onClick={props.onToggleWordWrap}
          >
            <Icon name="wrap" size="small" />
          </button>
        </Show>

        {/* Source/Preview toggle */}
        <Show when={props.onToggleSource}>
          <button
            data-active={props.showSource ? "true" : "false"}
            title="Toggle source view"
            onClick={props.onToggleSource}
          >
            <Icon name="code" size="small" />
          </button>
        </Show>

        <div data-slot="toolbar-separator" />

        {/* Table of contents */}
        <Show when={props.toc.length > 0}>
          <button title="Table of Contents" onClick={props.onToggleToc}>
            <Icon name="bullet-list" size="small" />
          </button>
        </Show>

        {/* Refresh */}
        <button title="Refresh preview" onClick={props.onRefresh}>
          <Icon name="reset" size="small" />
        </button>
      </div>

      {/* TOC dropdown */}
      <Show when={props.showToc}>
        <div class="absolute top-full right-2 mt-1 w-60 max-h-72 overflow-y-auto bg-surface-raised-base border border-border-base rounded-lg shadow-xl z-50 py-1">
          <For each={props.toc}>
            {(item) => (
              <button
                class="w-full text-left px-3 py-1.5 text-12-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors truncate block"
                style={{ "padding-left": `${item.level * 10 + 12}px` }}
                onClick={() => props.onScrollToHeading(item.id)}
              >
                {item.text}
              </button>
            )}
          </For>
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
  const [showSource, setShowSource] = createSignal(false)
  const [wordWrap, setWordWrap] = createSignal(false)
  const [scrollProgress, setScrollProgress] = createSignal(0)
  let previewRef: HTMLDivElement | undefined
  let scrollContainerRef: HTMLDivElement | undefined

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

  // Scroll progress tracking
  const handleScroll = () => {
    if (!scrollContainerRef) return
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef
    const max = Math.max(1, scrollHeight - clientHeight)
    const progress = Math.min(100, Math.round((scrollTop / max) * 100))
    setScrollProgress(progress)
    // Update CSS custom property for the progress bar
    scrollContainerRef.style.setProperty("--scroll-progress", `${progress}%`)
  }

  onMount(() => {
    scrollContainerRef?.addEventListener("scroll", handleScroll, { passive: true })
    onCleanup(() => scrollContainerRef?.removeEventListener("scroll", handleScroll))
  })

  const scrollToHeading = (id: string) => {
    if (!previewRef) return
    const el = previewRef.querySelector(`#${CSS.escape(id)}`)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    setShowToc(false)
  }

  const scrollToTop = () => {
    scrollContainerRef?.scrollTo({ top: 0, behavior: "smooth" })
  }

  const scrollToBottom = () => {
    if (!scrollContainerRef) return
    scrollContainerRef.scrollTo({ top: scrollContainerRef.scrollHeight, behavior: "smooth" })
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
        showSource={showSource()}
        onToggleSource={() => setShowSource((p) => !p)}
        wordWrap={wordWrap()}
        onToggleWordWrap={() => setWordWrap((p) => !p)}
        scrollContainer={() => scrollContainerRef}
      />
      <Show
        when={!showSource()}
        fallback={
          <div
            class="flex-1 overflow-auto bg-background-base"
            ref={scrollContainerRef}
            onScroll={handleScroll}
          >
            <pre
              class="p-6 text-12-regular font-mono text-text-strong whitespace-pre-wrap break-words m-0"
              style={{ "white-space": wordWrap() ? "pre-wrap" : "pre" }}
            >
              {props.content}
            </pre>
          </div>
        }
      >
        <div
          data-component="markdown-preview"
          class="flex-1 overflow-y-auto p-8 bg-background-base"
          ref={(el) => {
            scrollContainerRef = el
            previewRef = el
          }}
          onClick={handleLinkClick}
        >
          <Show
            when={!loading()}
            fallback={
              <div class="flex items-center justify-center py-10 text-text-weak">
                <div class="flex items-center gap-2">
                  <Icon name="cursor" size="small" class="animate-pulse" />
                  <span>Rendering...</span>
                </div>
              </div>
            }
          >
            <Show
              when={!error()}
              fallback={
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
              }
            >
              <div class={proseClass} innerHTML={html()} />
            </Show>
          </Show>
        </div>
      </Show>
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
