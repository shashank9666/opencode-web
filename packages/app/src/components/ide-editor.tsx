import { createEffect, createSignal, onCleanup, onMount } from "solid-js"
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

const extToLanguage = new Map([
  [".ts", "typescript"], [".tsx", "typescript"], [".js", "javascript"], [".jsx", "javascript"],
  [".json", "json"], [".md", "markdown"], [".css", "css"], [".html", "html"],
  [".rs", "rust"], [".py", "python"], [".go", "go"], [".toml", "ini"],
  [".yaml", "yaml"], [".yml", "yaml"], [".sh", "shell"], [".bash", "shell"],
  [".sql", "sql"], [".xml", "xml"], [".svg", "xml"], [".svelte", "html"],
  [".vue", "html"], [".c", "c"], [".cpp", "cpp"], [".h", "c"],
  [".java", "java"], [".rb", "ruby"], [".php", "php"], [".swift", "swift"],
  [".kt", "kotlin"], [".dart", "dart"],
])

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
      value: props.content,
      language: languageFromPath(props.path),
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

    onCleanup(() => {
      completionsProvider?.dispose()
      editor?.dispose()
    })
  })

  createEffect(() => {
    if (!editor) return
    const lang = languageFromPath(props.path)
    const model = editor.getModel()
    if (model) monaco.editor.setModelLanguage(model, lang)
  })

  createEffect(() => {
    if (!editor) return
    const current = editor.getValue()
    if (current !== props.content) editor.setValue(props.content)
  })

  createEffect(() => {
    if (!editor || props.formatTrigger === undefined) return
    props.formatTrigger
    editor.getAction("editor.action.formatDocument")?.run()
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
}) {
  let container: HTMLDivElement | undefined
  let diffEditor: monaco.editor.IStandaloneDiffEditor | undefined

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
      readOnly: true,
      lineNumbers: "on",
      renderLineHighlight: "all",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      padding: { top: 8 },
      bracketPairColorization: { enabled: true },
      glyphMargin: true,
      folding: true,
      guides: { indentation: true }, //: true,
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
      ignoreTrimWhitespace: false,
    })

    diffEditor.setModel({
      original: monaco.editor.createModel(props.original, lang),
      modified: monaco.editor.createModel(props.modified, lang),
    })
  })

  createEffect(() => {
    if (!diffEditor) return
    const lang = languageFromPath(props.path)
    const model = diffEditor.getModel()
    if (!model) return
    if (model.original.getValue() !== props.original) model.original.setValue(props.original)
    if (model.modified.getValue() !== props.modified) model.modified.setValue(props.modified)
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