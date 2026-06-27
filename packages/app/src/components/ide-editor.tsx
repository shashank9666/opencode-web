import { createEffect, createSignal, onCleanup, onMount } from "solid-js"
import { render } from "solid-js/web"
import { Icon } from "@opencode-ai/ui/icon"
import { Button } from "@opencode-ai/ui/button"
import * as monaco from "monaco-editor"

self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === "json") return new Worker(new URL("monaco-editor/esm/vs/language/json/json.worker.js", import.meta.url), { type: "module" })
    if (label === "css" || label === "scss" || label === "less") return new Worker(new URL("monaco-editor/esm/vs/language/css/css.worker.js", import.meta.url), { type: "module" })
    if (label === "html" || label === "handlebars" || label === "razor") return new Worker(new URL("monaco-editor/esm/vs/language/html/html.worker.js", import.meta.url), { type: "module" })
    if (label === "typescript" || label === "javascript") return new Worker(new URL("monaco-editor/esm/vs/language/typescript/ts.worker.js", import.meta.url), { type: "module" })
    return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), { type: "module" })
  },
}

monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
  allowNonTsExtensions: true,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  noEmit: true,
  esModuleInterop: true,
  target: monaco.languages.typescript.ScriptTarget.Latest,
})

monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false,
})

monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
  allowNonTsExtensions: true,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  noEmit: true,
  esModuleInterop: true,
  target: monaco.languages.typescript.ScriptTarget.Latest,
})

monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false,
})

const extToLanguage = new Map([
  [".ts", "typescript"], [".tsx", "typescript"], [".js", "javascript"], [".jsx", "javascript"],
  [".mjs", "javascript"], [".cjs", "javascript"], [".mts", "typescript"], [".cts", "typescript"],
  [".json", "json"], [".jsonc", "json"], [".json5", "json"],
  [".md", "markdown"], [".mdx", "markdown"],
  [".css", "css"], [".scss", "scss"], [".sass", "scss"], [".less", "less"],
  [".html", "html"], [".htm", "html"], [".xhtml", "html"],
  [".rs", "rust"], [".py", "python"], [".pyw", "python"], [".go", "go"], [".toml", "ini"],
  [".yaml", "yaml"], [".yml", "yaml"], [".sh", "shell"], [".bash", "shell"],
  [".zsh", "shell"], [".fish", "shell"], [".ps1", "powershell"],
  [".sql", "sql"], [".xml", "xml"], [".svg", "xml"], [".xsl", "xml"],
  [".svelte", "html"], [".vue", "html"], [".astro", "html"],
  [".c", "c"], [".cpp", "cpp"], [".cc", "cpp"], [".cxx", "cpp"], [".h", "c"],
  [".hpp", "cpp"], [".hxx", "cpp"], [".java", "java"], [".rb", "ruby"],
  [".php", "php"], [".phtml", "php"], [".swift", "swift"],
  [".kt", "kotlin"], [".kts", "kotlin"], [".dart", "dart"],
  [".lua", "lua"], [".pl", "perl"], [".pm", "perl"],
  [".r", "r"], [".R", "r"], [".scala", "scala"], [".sc", "scala"],
  [".elixir", "elixir"], [".ex", "elixir"], [".exs", "elixir"],
  [".erl", "erlang"], [".hrl", "erlang"],
  [".hs", "haskell"], [".lhs", "haskell"],
  [".clj", "clojure"], [".cljs", "clojure"], [".edn", "clojure"],
  [".cs", "csharp"], [".fs", "fsharp"], [".fsx", "fsharp"],
  [".cr", "crystal"], [".nim", "nim"], [".zig", "zig"],
  [".tex", "latex"], [".bib", "bibtex"],
  [".gradle", "groovy"], [".groovy", "groovy"],
  [".makefile", "makefile"], [".mk", "makefile"],
  [".dockerfile", "dockerfile"], [".containerfile", "dockerfile"],
  [".ignore", "ignore"], [".gitignore", "ignore"],
  [".env", "dotenv"], [".properties", "properties"],
  [".ini", "ini"], [".cfg", "ini"], [".conf", "ini"],
  [".csv", "rainbowcsv"], [".tsv", "rainbowcsv"], [".psv", "rainbowcsv"],
  [".graphql", "graphql"], [".gql", "graphql"],
  [".proto", "protobuf"],
  [".lock", "json"],
])

monaco.languages.register({ id: "rainbowcsv" })

const CSV_COLORS = [
  { token: "csv.column0", fg: "E06C75" },
  { token: "csv.column1", fg: "56B6C2" },
  { token: "csv.column2", fg: "61AFEF" },
  { token: "csv.column3", fg: "D19A66" },
  { token: "csv.column4", fg: "C678DD" },
  { token: "csv.column5", fg: "56B6C2" },
  { token: "csv.column6", fg: "E5C07B" },
  { token: "csv.column7", fg: "98C379" },
]

monaco.editor.defineTheme("rainbowcsv-dark", {
  base: "vs-dark", inherit: true,
  rules: [
    { token: "csv.delimiter", foreground: "3E4452" },
    ...CSV_COLORS.map(({ token, fg }) => ({ token, foreground: fg })),
  ], colors: {},
})

monaco.editor.defineTheme("rainbowcsv-light", {
  base: "vs", inherit: true,
  rules: [
    { token: "csv.delimiter", foreground: "D0D0D0" },
    ...CSV_COLORS.map(({ token, fg }) => ({ token, foreground: fg })),
  ], colors: {},
})

const RAINBOW_HTML_COLORS = [
  "#E06C75", "#56B6C2", "#61AFEF", "#D19A66",
  "#C678DD", "#56B6C2", "#E5C07B", "#98C379",
]

export function languageFromPath(path: string): string {
  const ext = path.slice(path.lastIndexOf("."))
  return extToLanguage.get(ext) ?? "plaintext"
}

export type OpenFile = {
  path: string
  content: string
  originalContent?: string
  dirty: boolean
}

export function createIdeEditor() {
  const [files, setFiles] = createSignal<OpenFile[]>([])
  const [activeFile, setActiveFile] = createSignal("")

  const openFile = (path: string, content: string) => {
    const existing = files().find((f) => f.path === path)
    if (existing) {
      setActiveFile(path)
      return
    }
    setFiles([...files(), { path, content, dirty: false }])
    setActiveFile(path)
  }

  const closeFile = (path: string) => {
    const idx = files().findIndex((f) => f.path === path)
    if (idx === -1) return
    const remaining = files().filter((f) => f.path !== path)
    setFiles(remaining)
    if (activeFile() === path) {
      if (remaining.length > 0) {
        const nextIdx = Math.min(idx, remaining.length - 1)
        setActiveFile(remaining[nextIdx]!.path)
      } else {
        setActiveFile("")
      }
    }
  }

  const setContent = (path: string, content: string) => {
    setFiles(files().map((f) => (f.path === path ? { ...f, content, dirty: true } : f)))
  }

  const markClean = (path: string) => {
    setFiles(files().map((f) => (f.path === path ? { ...f, dirty: false } : f)))
  }

  const setOriginalContent = (path: string, original: string) => {
    setFiles(files().map((f) => (f.path === path ? { ...f, originalContent: original } : f)))
  }

  const dirty = (path?: string) => {
    const target = path ?? activeFile()
    if (!target) return false
    return files().find((f) => f.path === target)?.dirty ?? false
  }

  const content = (path?: string) => {
    const target = path ?? activeFile()
    if (!target) return ""
    return files().find((f) => f.path === target)?.content ?? ""
  }

  const originalContent = (path?: string) => {
    const target = path ?? activeFile()
    if (!target) return undefined
    return files().find((f) => f.path === target)?.originalContent
  }

  return { files, activeFile, openFile, closeFile, setContent, markClean, dirty, content, setActiveFile, setOriginalContent, originalContent }
}

export default function IdeEditor(props: {
  path: string
  content: string
  onChange?: (value: string) => void
  onCursorChange?: (line: number, col: number) => void
  formatTrigger?: number
  class?: string
  fontSize?: number
  tabSize?: number
  wordWrap?: "off" | "on" | "wordWrapColumn" | "bounded"
  onEditorReady?: (editor: monaco.editor.IStandaloneCodeEditor) => void
  onProvideCompletionItems?: (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.InlineCompletionContext,
    token: monaco.CancellationToken
  ) => monaco.languages.ProviderResult<monaco.languages.InlineCompletions>
}) {
  let container: HTMLDivElement | undefined
  let editor: monaco.editor.IStandaloneCodeEditor | undefined

  onMount(() => {
    if (!container) return
    editor = monaco.editor.create(container, {
      theme: "vs-dark",
      automaticLayout: true,
      fontSize: props.fontSize ?? 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace",
      fontLigatures: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: true,
      lineNumbers: "on",
      renderLineHighlight: "all",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      padding: { top: 8 },
      tabSize: props.tabSize ?? 2,
      wordWrap: props.wordWrap ?? "off",
      guides: { indentation: true },
      bracketPairColorization: { enabled: true },
      autoIndent: "full",
      formatOnPaste: true,
      formatOnType: true,
      glyphMargin: true,
      folding: true,
      matchBrackets: "always",
      renderWhitespace: "selection",
      renderControlCharacters: true,
      links: true,
      contextmenu: true,
      hover: { enabled: true, delay: 300 },
      suggestSelection: "first",
      suggest: {
        showIcons: true,
        showStatusBar: true,
        preview: true,
      },
      acceptSuggestionOnEnter: "on",
      acceptSuggestionOnCommitCharacter: true,
      snippetSuggestions: "inline",
      wordBasedSuggestions: "matchingDocuments",
      smoothScrolling: true,
      dragAndDrop: true,
      showUnused: true,
      showFoldingControls: "mouseover",
      roundedSelection: false,
    })

    props.onEditorReady?.(editor)

    editor.onDidChangeModelContent(() => {
      props.onChange?.(editor?.getValue() ?? "")
    })

    editor.onDidChangeCursorPosition((e) => {
      props.onCursorChange?.(e.position.lineNumber, e.position.column)
    })

    let completionsProvider: monaco.IDisposable | undefined
    if (props.onProvideCompletionItems) {
      completionsProvider = monaco.languages.registerInlineCompletionsProvider("*", {
        provideInlineCompletions: async (model, position, context, token) => {
          if (editor?.getModel()?.uri !== model.uri) return { items: [] }
          return props.onProvideCompletionItems!(model, position, context, token)
        },
        freeInlineCompletions: () => {}
      })
    }

    // Error Lens: highlight error/warning lines with background and gutter markers
    let errorLensDecorations: string[] = []
    const updateErrorLens = () => {
      const model = editor?.getModel()
      if (!model) return
      const markers = monaco.editor.getModelMarkers({ resource: model.uri })
      const decorations: monaco.editor.IModelDeltaDecoration[] = markers.map((m) => ({
        range: new monaco.Range(m.startLineNumber, 1, m.startLineNumber, 1),
        options: {
          isWholeLine: true,
          className: m.severity === monaco.MarkerSeverity.Error ? "error-lens-line error-lens-line-error" : "error-lens-line error-lens-line-warning",
          glyphMarginClassName: m.severity === monaco.MarkerSeverity.Error ? "error-lens-glyph error-lens-glyph-error" : "error-lens-glyph error-lens-glyph-warning",
          glyphMarginHoverMessage: { value: `**${m.severity === monaco.MarkerSeverity.Error ? "Error" : "Warning"}**: ${m.message}` },
          description: "error-lens",
        },
      }))
      errorLensDecorations = editor!.deltaDecorations(errorLensDecorations, decorations)
    }

    const markerListener = monaco.editor.onDidChangeMarkers((uris) => {
      const model = editor?.getModel()
      if (model && uris.some((u) => u.toString() === model.uri.toString())) {
        updateErrorLens()
      }
    })

    editor.onDidChangeModel(() => {
      updateErrorLens()
    })

    setTimeout(updateErrorLens, 500)

    // Rainbow CSV: column-based coloring
    let rainbowDecos: string[] = []
    const applyRainbowDecorations = () => {
      if (!editor) return
      const model = editor.getModel()
      if (!model || model.isDisposed()) return
      const lang = languageFromPath(props.path)
      if (lang !== "rainbowcsv") return
      const lineCount = model.getLineCount()
      const decos: monaco.editor.IModelDeltaDecoration[] = []
      for (let line = 1; line <= lineCount; line++) {
        const text = model.getLineContent(line)
        const cols = text.split(",")
        let offset = 0
        for (let ci = 0; ci < cols.length; ci++) {
          const colText = cols[ci]
          const leading = colText.length - colText.trimStart().length
          const colorIdx = ci % RAINBOW_HTML_COLORS.length
          decos.push({
            range: new monaco.Range(line, offset + leading + 1, line, offset + colText.length),
            options: {
              inlineClassName: `rainbow-csv-col${colorIdx}`,
            },
          })
          offset += colText.length + 1
        }
      }
      rainbowDecos = editor?.deltaDecorations(rainbowDecos, decos) ?? []
    }

    applyRainbowDecorations()

    const rainbowListener = editor?.onDidChangeModelContent(() => {
      applyRainbowDecorations()
    })

    onCleanup(() => {
      rainbowListener?.dispose()
      if (editor) {
        rainbowDecos = editor.deltaDecorations(rainbowDecos, [])
      }
    })
  })

  createEffect(() => {
    if (!editor) return
    const lang = languageFromPath(props.path)
    const uri = monaco.Uri.parse(`file:///${props.path.replace(/^[/\\]+/, '')}`)
    let model = monaco.editor.getModel(uri)
    if (!model) {
      model = monaco.editor.createModel(props.content, lang, uri)
    } else {
      monaco.editor.setModelLanguage(model, lang)
    }
    if (editor.getModel() !== model) {
      editor.setModel(model)
    }
  })

  createEffect(() => {
    if (!editor) return
    const current = editor.getValue()
    if (current !== props.content) {
      const state = editor.saveViewState()
      editor.executeEdits("auto-reload", [
        {
          range: editor.getModel()!.getFullModelRange(),
          text: props.content,
        },
      ])
      if (state) editor.restoreViewState(state)
    }
  })

  createEffect(() => {
    if (!editor || props.formatTrigger === undefined) return
    props.formatTrigger
    editor.getAction("editor.action.formatDocument")?.run()
  })

  // Handle editor actions from menu bar (Selection menu)
  createEffect(() => {
    if (!editor) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ action: string }>).detail
      if (!detail?.action) return
      editor?.getAction(detail.action)?.run()
    }
    window.addEventListener("editor-action", handler)
    onCleanup(() => window.removeEventListener("editor-action", handler))
  })

  createEffect(() => {
    if (!editor) return
    editor.updateOptions({
      fontSize: props.fontSize ?? 13,
      tabSize: props.tabSize ?? 2,
      wordWrap: props.wordWrap ?? "off",
    })
  })

  return <div ref={container} class={props.class ?? "size-full"} />
}

export function IdeDiffEditor(props: {
  path: string
  original: string
  modified: string
  class?: string
  fontSize?: number
  tabSize?: number
  wordWrap?: "off" | "on" | "wordWrapColumn" | "bounded"
  onAccept?: () => void
  onReject?: () => void
  onChange?: (value: string) => void
}) {
  let container: HTMLDivElement | undefined
  let diffEditor: monaco.editor.IStandaloneDiffEditor | undefined
  let overlayContainer: HTMLDivElement | undefined

  onMount(() => {
    if (!container) return
    const lang = languageFromPath(props.path)

    diffEditor = monaco.editor.createDiffEditor(container, {
      theme: "vs-dark",
      automaticLayout: true,
      fontSize: props.fontSize ?? 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace",
      renderSideBySide: false,
      scrollBeyondLastLine: true,
      wordWrap: props.wordWrap ?? "off",
      readOnly: false,
      lineNumbers: "on",
      renderLineHighlight: "all",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      padding: { top: 8 },
      bracketPairColorization: { enabled: true },
      glyphMargin: true,
      folding: true,
      guides: { indentation: true },
      matchBrackets: "always",
      renderWhitespace: "selection",
      renderControlCharacters: true,
      links: true,
      contextmenu: true,
      hover: { enabled: true, delay: 300 },
      smoothScrolling: true,
      showUnused: true,
      showFoldingControls: "mouseover",
      roundedSelection: false,
      ignoreTrimWhitespace: true,
      hideUnchangedRegions: {
        enabled: true,
        revealLineCount: 10,
        minimumLineCount: 10
      }
    } as any) // Typecast for compatibility if hideUnchangedRegions isn't in older typings

    const normOriginal = (props.original || "").replace(/\r\n/g, "\n")
    const normModified = (props.modified || "").replace(/\r\n/g, "\n")

    diffEditor.setModel({
      original: monaco.editor.createModel(normOriginal, lang),
      modified: monaco.editor.createModel(normModified, lang),
    })

    diffEditor.getModifiedEditor().onDidChangeModelContent(() => {
      props.onChange?.(diffEditor?.getModifiedEditor().getValue() ?? "")
    })

    let contentWidget: monaco.editor.IContentWidget | undefined

    const nextDiff = () => {
      const changes = diffEditor?.getLineChanges()
      if (!changes || changes.length === 0) return
      const currentLine = diffEditor?.getModifiedEditor().getPosition()?.lineNumber || 1
      const next = changes.find(c => (c.modifiedStartLineNumber || c.modifiedEndLineNumber) > currentLine) || changes[0]
      if (next) {
        const line = next.modifiedStartLineNumber || next.modifiedEndLineNumber || 1
        diffEditor?.getModifiedEditor().revealLineInCenter(line)
        diffEditor?.getModifiedEditor().setPosition({ lineNumber: line, column: 1 })
      }
    }

    const prevDiff = () => {
      const changes = diffEditor?.getLineChanges()
      if (!changes || changes.length === 0) return
      const currentLine = diffEditor?.getModifiedEditor().getPosition()?.lineNumber || 1
      const prev = [...changes].reverse().find(c => (c.modifiedEndLineNumber || c.modifiedStartLineNumber) < currentLine) || changes[changes.length - 1]
      if (prev) {
        const line = prev.modifiedStartLineNumber || prev.modifiedEndLineNumber || 1
        diffEditor?.getModifiedEditor().revealLineInCenter(line)
        diffEditor?.getModifiedEditor().setPosition({ lineNumber: line, column: 1 })
      }
    }

    diffEditor.getModifiedEditor().addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyJ, nextDiff)
    diffEditor.getOriginalEditor().addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyJ, nextDiff)

    diffEditor.onDidUpdateDiff(() => {
      const changes = diffEditor?.getLineChanges()
      if (!changes || changes.length === 0) return

      if (contentWidget) {
        diffEditor?.getModifiedEditor().removeContentWidget(contentWidget)
        contentWidget = undefined
      }

      if (props.onAccept || props.onReject) {
        // Find the last change line
        const maxLine = Math.max(...changes.map(c => c.modifiedEndLineNumber || c.modifiedStartLineNumber))
        
        const widgetNode = document.createElement("div")
        widgetNode.className = "flex items-center z-50 overflow-hidden rounded-md shadow-2xl border border-[#3c3c3c] bg-[#1e1e1e]"
        
        render(() => (
          <>
            {props.onAccept && (
              <button 
                class="flex items-center gap-2 px-3 py-1.5 text-12-medium text-white bg-[#0e639c] hover:bg-[#1177bb] transition-colors"
                onClick={props.onAccept}
              >
                Accept Changes <span class="opacity-70 text-11-regular font-normal">Ctrl+↵</span>
              </button>
            )}
            {props.onReject && (
              <button 
                class="flex items-center gap-2 px-3 py-1.5 text-12-medium text-[#cccccc] bg-transparent hover:bg-[#333333] transition-colors"
                onClick={props.onReject}
              >
                Reject <span class="opacity-70 text-11-regular font-normal">Ctrl+⌫</span>
              </button>
            )}
            <div class="w-[1px] self-stretch bg-[#3c3c3c]" />
            <div class="flex items-center gap-1.5 px-3 py-1.5 text-[#cccccc] text-12-regular">
              <Icon name="arrow-up" class="size-3.5 cursor-pointer hover:text-white" onClick={prevDiff} />
              <Icon name="arrow-down" class="size-3.5 cursor-pointer hover:text-white" onClick={nextDiff} />
              <span class="opacity-70 ml-1 font-normal">Alt+J</span>
            </div>
          </>
        ), widgetNode)

        contentWidget = {
          getId: () => "ai-inline-diff-widget",
          getDomNode: () => widgetNode,
          getPosition: () => ({
            position: { lineNumber: maxLine, column: 1 },
            preference: [monaco.editor.ContentWidgetPositionPreference.BELOW]
          })
        }
        diffEditor?.getModifiedEditor().addContentWidget(contentWidget)
      }
    })
  })

  createEffect(() => {
    if (!diffEditor) return
    const lang = languageFromPath(props.path)
    const model = diffEditor.getModel()
    if (!model) return
    const normOriginal = (props.original || "").replace(/\r\n/g, "\n")
    const normModified = (props.modified || "").replace(/\r\n/g, "\n")
    if (model.original.getValue() !== normOriginal) model.original.setValue(normOriginal)
    if (model.modified.getValue() !== normModified) model.modified.setValue(normModified)
    monaco.editor.setModelLanguage(model.original, lang)
    monaco.editor.setModelLanguage(model.modified, lang)
  })

  createEffect(() => {
    if (!diffEditor) return
    diffEditor.updateOptions({
      fontSize: props.fontSize ?? 13,
      wordWrap: props.wordWrap ?? "off",
    })
  })

  onCleanup(() => {
    if (!diffEditor) return
    const model = diffEditor.getModel()
    model?.original.dispose()
    model?.modified.dispose()
    diffEditor.dispose()
  })

  return <div ref={container} class={props.class ?? "size-full"} />
}