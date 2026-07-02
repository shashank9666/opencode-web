import { createStore } from "solid-js/store"
import { For, Show, createSignal } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Button } from "@opencode-ai/ui/button"
import { TextField } from "@opencode-ai/ui/text-field"

export type WorkflowStep = {
  id: string
  type: "agent" | "prompt" | "command" | "condition"
  label: string
  config: Record<string, string>
}

export type Workflow = {
  id: string
  name: string
  steps: WorkflowStep[]
}

let nextId = 1
const newId = () => `step-${nextId++}`

type Props = {
  workflows: Workflow[]
  onSave: (workflows: Workflow[]) => void
}

export function WorkflowBuilder(props: Props) {
  const [workflows, setWorkflows] = createStore<Workflow[]>(props.workflows)
  const [selectedIdx, setSelectedIdx] = createSignal<number | null>(null)

  const selected = () => (selectedIdx() !== null ? workflows[selectedIdx()!] : null)

  const addWorkflow = () => {
    const wf: Workflow = { id: `wf-${Date.now()}`, name: "New Workflow", steps: [] }
    setWorkflows(workflows.length, wf)
    setSelectedIdx(workflows.length)
  }

  const removeWorkflow = (idx: number) => {
    setWorkflows((prev) => [...prev.slice(0, idx), ...prev.slice(idx + 1)])
    setSelectedIdx(null)
  }

  const addStep = () => {
    const idx = selectedIdx()
    if (idx === null) return
    const step: WorkflowStep = { id: newId(), type: "agent", label: "New Step", config: {} }
    setWorkflows(idx, "steps", (steps) => [...steps, step])
  }

  const removeStep = (stepIdx: number) => {
    const idx = selectedIdx()
    if (idx === null) return
    setWorkflows(idx, "steps", (steps) => [...steps.slice(0, stepIdx), ...steps.slice(stepIdx + 1)])
  }

  const updateStep = (stepIdx: number, field: keyof WorkflowStep, value: string) => {
    const idx = selectedIdx()
    if (idx === null) return
    setWorkflows(idx, "steps", stepIdx, field as any, value as any)
  }

  const save = () => {
    props.onSave([...workflows])
  }

  return (
    <div class="workflow-builder">
      <div class="workflow-sidebar">
        <div class="workflow-list">
          <For each={workflows}>
            {(wf, i) => (
              <div
                class="workflow-item"
                classList={{ selected: selectedIdx() === i() }}
                onClick={() => setSelectedIdx(i())}
              >
                <Icon name="git-merge" />
                <span>{wf.name}</span>
                <button class="workflow-remove" onClick={() => removeWorkflow(i())} aria-label="Remove workflow">
                  <Icon name="x" />
                </button>
              </div>
            )}
          </For>
        </div>
        <Button variant="outline" onClick={addWorkflow}>
          <Icon name="plus" /> Add Workflow
        </Button>
      </div>

      <Show when={selected()}>
        {(wf) => (
          <div class="workflow-editor">
            <TextField
              value={wf().name}
              onChange={(v) => {
                const idx = selectedIdx()
                if (idx !== null) setWorkflows(idx, "name", v)
              }}
              label="Workflow Name"
            />

            <div class="workflow-canvas">
              <For each={wf().steps}>
                {(step, i) => (
                  <div class="workflow-step">
                    <div class="step-header">
                      <span class="step-number">{i() + 1}</span>
                      <select
                        value={step.type}
                        onChange={(e) => updateStep(i(), "type", e.target.value)}
                      >
                        <option value="agent">Agent</option>
                        <option value="prompt">Prompt</option>
                        <option value="command">Command</option>
                        <option value="condition">Condition</option>
                      </select>
                      <button class="step-remove" onClick={() => removeStep(i())} aria-label="Remove step">
                        <Icon name="x" />
                      </button>
                    </div>
                    <TextField
                      value={step.label}
                      onChange={(v) => updateStep(i(), "label", v)}
                      placeholder="Step description"
                    />
                  </div>
                )}
              </For>
              <Button variant="outline" onClick={addStep}>
                <Icon name="plus" /> Add Step
              </Button>
            </div>
          </div>
        )}
      </Show>

      <div class="workflow-actions">
        <Button onClick={save}>Save Workflows</Button>
      </div>
    </div>
  )
}
