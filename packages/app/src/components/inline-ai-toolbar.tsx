import { createSignal, createEffect, Show, onCleanup, For } from "solid-js"
import * as monaco from "monaco-editor"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useSpring } from "@opencode-ai/ui/motion-spring"
import type { IconProps } from "@opencode-ai/ui/icon"

type AIAction = {
  id: string
  label: string
  icon: IconProps["name"]
  prompt: (code: string, language: string, filePath: string) => string
}

const AI_ACTIONS: AIAction[] = [
  {
    id: "explain",
    label: "Explain",
    icon: "eye",
    prompt: (code, language) =>
      `Explain the following ${language} code in detail. Break down what it does, why it works, and any important patterns or edge cases to be aware of:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  },
  {
    id: "optimize",
    label: "Optimize",
    icon: "arrow-up",
    prompt: (code, language) =>
      `Optimize the following ${language} code for better performance, readability, or both. Explain the changes you make and why they improve the code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  },
  {
    id: "refactor",
    label: "Refactor",
    icon: "code",
    prompt: (code, language) =>
      `Refactor the following ${language} code to improve its structure, readability, and maintainability. Apply best practices and design patterns where appropriate:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  },
  {
    id: "fix",
    label: "Fix",
    icon: "circle-check",
    prompt: (code, language) =>
      `Identify and fix any bugs, issues, or potential problems in the following ${language} code. Explain what was wrong and how you fixed it:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  },
  {
    id: "test",
    label: "Test",
    icon: "checklist",
    prompt: (code, language) =>
      `Generate comprehensive tests for the following ${language} code. Include unit tests, edge cases, and any necessary mocking:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  },
  {
    id: "document",
    label: "Document",
    icon: "comment",
    prompt: (code, language) =>
      `Add comprehensive documentation to the following ${language} code. Include inline comments, JSDoc/TSDoc-style annotations, and any usage examples:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  },
]

export type InlineAIActionPayload = {
  actionId: string
  prompt: string
  selectedCode: string
  filePath: string
  language: string
  lineStart: number
  lineEnd: number
}

type InlineAIToolbarProps = {
  editor: monaco.editor.IStandaloneCodeEditor | undefined
  filePath: string
  language: string
  onAction: (payload: InlineAIActionPayload) => void
  disabled?: boolean
}

export default function InlineAIToolbar(props: InlineAIToolbarProps) {
  const [visible, setVisible] = createSignal(false)
  const [position, setPosition] = createSignal<{ x: number; y: number }>({ x: 0, y: 0 })
  const [selectionText, setSelectionText] = createSignal("")
  const [selectionRange, setSelectionRange] = createSignal<{ startLine: number; endLine: number } | null>(null)

  const springValue = useSpring(() => (visible() ? 1 : 0), { stiffness: 300, damping: 25 })

  createEffect(() => {
    const editor = props.editor
    if (!editor) return

    let isDragging = false

    const updateToolbar = () => {
      if (props.disabled) {
        setVisible(false)
        return
      }

      if (isDragging) {
        setVisible(false)
        return
      }

      const selection = editor.getSelection()
      if (!selection || selection.isEmpty()) {
        setVisible(false)
        return
      }

      const model = editor.getModel()
      if (!model) {
        setVisible(false)
        return
      }

      const text = model.getValueInRange(selection)
      if (!text.trim()) {
        setVisible(false)
        return
      }

      setSelectionText(text)
      setSelectionRange({ startLine: selection.startLineNumber, endLine: selection.endLineNumber })

      // Calculate position above the selection
      const startPosition = selection.getStartPosition()
      const visiblePos = editor.getScrolledVisiblePosition(startPosition)
      if (!visiblePos) {
        setVisible(false)
        return
      }

      const editorDom = editor.getDomNode()
      if (!editorDom) {
        setVisible(false)
        return
      }

      const editorRect = editorDom.getBoundingClientRect()
      const toolbarWidth = 280 // approximate
      const x = editorRect.left + visiblePos.left + 20
      const y = editorRect.top + visiblePos.top - 44

      // Clamp to editor bounds
      const clampedX = Math.max(editorRect.left + 8, Math.min(x, editorRect.right - toolbarWidth - 8))
      const clampedY = Math.max(editorRect.top + 8, y)

      setPosition({ x: clampedX, y: clampedY })
      setVisible(true)
    }

    const disposables = [
      editor.onDidChangeCursorSelection(updateToolbar),
      editor.onDidScrollChange(() => {
        if (visible()) updateToolbar()
      }),
      editor.onMouseDown(() => {
        isDragging = true
        setVisible(false)
      }),
      editor.onMouseUp(() => {
        isDragging = false
        updateToolbar()
      }),
      editor.onKeyUp(() => {
        updateToolbar()
      }),
      editor.onDidBlurEditorWidget(() => setTimeout(() => setVisible(false), 150)),
    ]

    // Also listen to document clicks to hide when clicking outside editor
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-inline-ai-toolbar]")) {
        setVisible(false)
      }
    }
    document.addEventListener("mousedown", handleDocumentClick)

    onCleanup(() => {
      disposables.forEach((d) => d.dispose())
      document.removeEventListener("mousedown", handleDocumentClick)
    })
  })

  createEffect(() => {
    if (visible()) {
      setVisible(true)
    }
  })

  const handleAction = (action: AIAction) => {
    const range = selectionRange()
    if (!range) return

    props.onAction({
      actionId: action.id,
      prompt: action.prompt(selectionText(), props.language, props.filePath),
      selectedCode: selectionText(),
      filePath: props.filePath,
      language: props.language,
      lineStart: range.startLine,
      lineEnd: range.endLine,
    })

    setVisible(false)
  }

  const scale = () => 0.9 + 0.1 * springValue()
  const opacity = () => springValue()

  return (
    <Show when={visible()}>
      <div
        data-inline-ai-toolbar
        class="fixed z-50 flex items-center gap-0.5 px-1.5 py-1 bg-surface-raised-base border border-border-base rounded-xl shadow-xl"
        style={{
          left: `${position().x}px`,
          top: `${position().y}px`,
          transform: `translate(15%, -40%) scale(${scale()})`,
          opacity: `${opacity()}`,
          "transform-origin": "bottom center",
        }}
      >
        <For each={AI_ACTIONS}>
          {(action) => (
            <Tooltip value={action.label} placement="top">
              <IconButton
                icon={action.icon}
                variant="ghost"
                size="small"
                class="size-7 rounded-lg hover:bg-surface-raised-base-hover transition-colors"
                onClick={() => handleAction(action)}
              />
            </Tooltip>
          )}
        </For>
        <div class="w-px h-4 bg-border-base mx-0.5" />
        <Tooltip value="Close" placement="top">
          <IconButton
            icon="close-small"
            variant="ghost"
            size="small"
            class="size-7 rounded-lg hover:bg-surface-raised-base-hover transition-colors text-text-weaker"
            onClick={() => setVisible(false)}
          />
        </Tooltip>
      </div>
    </Show>
  )
}
