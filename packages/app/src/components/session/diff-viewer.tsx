import { createEffect, createMemo, For, onCleanup, onMount, Show } from "solid-js"
import { makeEventListener } from "@solid-primitives/event-listener"
import { parsePatch } from "diff"
import * as monaco from "monaco-editor"
import { DiffViewerActions, DiffViewerBatchActions } from "@opencode-ai/ui/diff-viewer-actions"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { getDirectory, getFilename } from "@opencode-ai/core/util/path"
import { languageFromPath } from "@/components/ide-editor"

export interface DiffViewerFile {
  file: string
  patch?: string
  before?: string
  after?: string
  additions: number
  deletions: number
  status?: "added" | "deleted" | "modified"
}

export interface DiffViewerProps {
  diffs: DiffViewerFile[]
  onAccept: (file: string) => void
  onReject: (file: string) => void
  onEditManually?: (file: string) => void
  onAcceptAll?: () => void
  onRejectAll?: () => void
  class?: string
}

function patchToContents(patch: string): { original: string; modified: string } | undefined {
  const parsed = parsePatch(patch)[0]
  if (!parsed) return

  let original = ""
  let modified = ""

  for (const hunk of parsed.hunks) {
    for (const line of hunk.lines) {
      if (line.startsWith("\\")) continue
      if (line.startsWith("-")) {
        original += line.slice(1) + "\n"
      } else if (line.startsWith("+")) {
        modified += line.slice(1) + "\n"
      } else if (line.startsWith(" ")) {
        original += line.slice(1) + "\n"
        modified += line.slice(1) + "\n"
      }
    }
  }

  return { original, modified }
}

function MonacoDiffEditor(props: { original: string; modified: string; language: string; class?: string }) {
  let container: HTMLDivElement | undefined
  let editor: monaco.editor.IStandaloneDiffEditor | undefined

  onMount(() => {
    if (!container) return

    editor = monaco.editor.createDiffEditor(container, {
      theme: "vs-dark",
      automaticLayout: true,
      fontSize: 13,
      renderSideBySide: false,
      readOnly: true,
      scrollBeyondLastLine: false,
      wordWrap: "off",
      renderLineHighlight: "all",
      padding: { top: 8 },
      ignoreTrimWhitespace: false,
    })

    editor.setModel({
      original: monaco.editor.createModel(props.original, props.language),
      modified: monaco.editor.createModel(props.modified, props.language),
    })
  })

  createEffect(() => {
    if (!editor) return
    const model = editor.getModel()
    if (!model) return
    const lang = props.language
    if (model.original.getValue() !== props.original) model.original.setValue(props.original)
    if (model.modified.getValue() !== props.modified) model.modified.setValue(props.modified)
    monaco.editor.setModelLanguage(model.original, lang)
    monaco.editor.setModelLanguage(model.modified, lang)
  })

  onCleanup(() => {
    if (!editor) return
    const model = editor.getModel()
    model?.original.dispose()
    model?.modified.dispose()
    editor.dispose()
  })

  return <div ref={container} class={props.class ?? "size-full min-h-[80px] rounded-md overflow-hidden"} />
}

function DiffContent(props: { file: string; patch?: string; before?: string; after?: string }) {
  const contents = createMemo(() => {
    if (props.before !== undefined && props.after !== undefined) {
      return { original: props.before, modified: props.after }
    }
    if (props.patch) {
      const parsed = patchToContents(props.patch)
      if (parsed) return parsed
    }
    return { original: "", modified: "" }
  })

  const hasChanges = () => contents().original !== contents().modified
  const lang = () => languageFromPath(props.file)

  return (
    <Show when={hasChanges()} fallback={<div class="text-text-weak text-xs p-2">No changes</div>}>
      <MonacoDiffEditor
        original={contents().original}
        modified={contents().modified}
        language={lang()}
      />
    </Show>
  )
}

export function DiffViewer(props: DiffViewerProps) {
  let container: HTMLDivElement | undefined

  const handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    const fileEl = target.closest("[data-file]")
    if (!fileEl) return
    const file = fileEl.getAttribute("data-file")
    if (!file) return
    if (event.altKey && event.key === "Enter") {
      event.preventDefault()
      props.onAccept(file)
      return
    }
    if (event.shiftKey && event.altKey && (event.key === "Backspace" || event.key === "Delete")) {
      event.preventDefault()
      props.onReject(file)
    }
  }

  onMount(() => {
    if (!container) return
    makeEventListener(container, "keydown", handleKeyDown)
  })

  return (
    <div
      ref={container}
      data-component="diff-viewer"
      class={props.class}
      tabIndex={-1}
    >
      <div data-slot="diff-viewer-header" class="flex items-center justify-between px-3 py-2 border-b border-border-weak-base">
        <span data-slot="diff-viewer-title" class="text-13-medium text-text-base">
          Changes ({props.diffs.length} file{props.diffs.length !== 1 ? "s" : ""})
        </span>
        <DiffViewerBatchActions
          onAcceptAll={props.onAcceptAll}
          onRejectAll={props.onRejectAll}
          visible={props.diffs.length > 1}
        />
      </div>
      <div data-slot="diff-viewer-files" class="divide-y divide-border-weak-base">
        <For each={props.diffs}>
          {(diff) => (
            <div
              data-slot="diff-viewer-file"
              data-file={diff.file}
              tabIndex={0}
              class="outline-none focus:bg-background-stronger/20"
            >
              <div data-slot="diff-viewer-file-header" class="flex items-center gap-2 px-3 py-1.5 border-b border-border-weak-base bg-background-stronger/30">
                <FileIcon node={{ path: diff.file, type: "file" }} />
                <div data-slot="diff-viewer-file-name" class="flex-1 min-w-0">
                  <Show when={diff.file.includes("/")}>
                    <span data-slot="diff-viewer-directory" class="text-text-weak text-11-medium">
                      {getDirectory(diff.file)}
                    </span>
                  </Show>
                  <span data-slot="diff-viewer-filename" class="text-13-medium text-text-base">
                    {getFilename(diff.file)}
                  </span>
                </div>
                <DiffViewerActions
                  file={diff.file}
                  onAccept={props.onAccept}
                  onReject={props.onReject}
                  onEditManually={props.onEditManually}
                />
              </div>
              <div data-slot="diff-viewer-file-diff" class="px-3 py-2">
                <DiffContent
                  file={diff.file}
                  patch={diff.patch}
                  before={diff.before}
                  after={diff.after}
                />
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
