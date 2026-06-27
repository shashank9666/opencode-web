import { Component, createMemo, createSignal, For, Show } from "solid-js"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"

const STORAGE_KEY = "opencode-prompt-templates"

export type PromptTemplate = {
  id: string
  name: string
  content: string
  created: number
}

function loadTemplates(): PromptTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PromptTemplate[]
  } catch {
    return []
  }
}

function saveTemplates(templates: PromptTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export function getTemplates(): PromptTemplate[] {
  return loadTemplates()
}

export function saveTemplate(name: string, content: string): PromptTemplate {
  const templates = loadTemplates()
  const template: PromptTemplate = {
    id: crypto.randomUUID(),
    name,
    content,
    created: Date.now(),
  }
  templates.push(template)
  saveTemplates(templates)
  return template
}

export function deleteTemplate(id: string) {
  const templates = loadTemplates().filter((t) => t.id !== id)
  saveTemplates(templates)
}

type TemplatesPopoverProps = {
  onSelect: (content: string) => void
  onClose: () => void
}

export const TemplatesPopover: Component<TemplatesPopoverProps> = (props) => {
  const [templates, setTemplates] = createSignal<PromptTemplate[]>(loadTemplates())
  const [showSave, setShowSave] = createSignal(false)
  const [name, setName] = createSignal("")
  const [content, setContent] = createSignal("")

  const refresh = () => setTemplates(loadTemplates())

  const handleSelect = (template: PromptTemplate) => {
    props.onSelect(template.content)
    props.onClose()
  }

  const handleDelete = (id: string) => {
    deleteTemplate(id)
    refresh()
  }

  const handleSave = () => {
    if (!name().trim() || !content().trim()) return
    saveTemplate(name().trim(), content().trim())
    setName("")
    setContent("")
    setShowSave(false)
    refresh()
  }

  return (
    <div class="min-w-[260px] max-w-[320px]">
      <div class="flex items-center justify-between mb-2 border-b border-border-base pb-2">
        <span class="text-13-medium text-text-strong">Templates</span>
        <div class="flex items-center gap-1">
          <Tooltip placement="top" value="Save current as template">
            <IconButton
              icon="plus-small"
              variant="ghost"
              size="small"
              class="size-5 rounded"
              onClick={() => setShowSave(!showSave())}
              aria-label="Save template"
            />
          </Tooltip>
          <IconButton
            icon="close-small"
            variant="ghost"
            size="small"
            class="size-5 rounded"
            onClick={props.onClose}
            aria-label="Close"
          />
        </div>
      </div>

      <Show when={showSave()}>
        <div class="flex flex-col gap-2 mb-3 p-2 bg-surface-raised-base rounded-md border border-border-base">
          <input
            type="text"
            placeholder="Template name"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            class="w-full px-2 py-1 text-13-regular text-text-strong bg-surface-base border border-border-base rounded outline-none focus:border-border-strong"
          />
          <textarea
            placeholder="Template content"
            value={content()}
            onInput={(e) => setContent(e.currentTarget.value)}
            class="w-full px-2 py-1 text-13-regular text-text-strong bg-surface-base border border-border-base rounded outline-none focus:border-border-strong resize-none h-20"
          />
          <Button variant="primary" size="small" class="self-end" onClick={handleSave} disabled={!name().trim() || !content().trim()}>
            Save
          </Button>
        </div>
      </Show>

      <Show
        when={templates().length > 0}
        fallback={
          <div class="text-12-regular text-text-weak text-center py-4">
            No saved templates.
            <Show when={!showSave()}>
              <br />
              <button class="text-text-base underline mt-1" onClick={() => setShowSave(true)}>
                Create one
              </button>
            </Show>
          </div>
        }
      >
        <div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
          <For each={templates()}>
            {(template) => (
              <div
                class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-surface-raised-base-hover group"
                onClick={() => handleSelect(template)}
              >
                <Icon name="edit" size="small" class="shrink-0 text-icon-muted" />
                <div class="flex-1 min-w-0">
                  <div class="text-13-regular text-text-strong truncate">{template.name}</div>
                  <div class="text-11-regular text-text-weak truncate">{template.content}</div>
                </div>
                <button
                  class="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-danger-base"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(template.id)
                  }}
                  aria-label="Delete template"
                >
                  <Icon name="close-small" size="small" class="text-icon-danger" />
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
