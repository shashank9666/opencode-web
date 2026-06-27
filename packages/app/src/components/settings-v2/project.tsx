import { Component, For, Show, createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import { Switch } from "@opencode-ai/ui/v2/switch-v2"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import { useLanguage } from "@/context/language"
import { useServerSync } from "@/context/server-sync"
import { SettingsListV2 } from "./parts/list"
import { SettingsRowV2 } from "./parts/row"
import "./settings-v2.css"

const SHARE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "auto", label: "Auto" },
  { value: "disabled", label: "Disabled" },
]

const AUTOUPDATE_OPTIONS = [
  { value: "true", label: "Enabled" },
  { value: "false", label: "Disabled" },
  { value: "notify", label: "Notify only" },
]

export const SettingsProjectV2: Component = () => {
  const language = useLanguage()
  const serverSync = useServerSync()

  const config = createMemo(() => serverSync().data.config)

  const shareMode = createMemo(() => config().share ?? "manual")
  const defaultAgent = createMemo(() => config().default_agent ?? "")
  const smallModel = createMemo(() => config().small_model ?? "")
  const instructions = createMemo(() => config().instructions ?? [])
  const autoupdate = createMemo(() => {
    const v = config().autoupdate
    if (v === true) return "true"
    if (v === "notify") return "notify"
    return "false"
  })
  const watcherIgnore = createMemo(() => config().watcher?.ignore ?? [])
  const compactionAuto = createMemo(() => config().compaction?.auto ?? true)
  const compactionTailTurns = createMemo(() => config().compaction?.tail_turns ?? 50)

  const [state, setState] = createStore({
    newInstruction: "",
    newWatcherPattern: "",
  })

  const setShareMode = async (value: string) => {
    if (value === shareMode()) return
    await serverSync().updateConfig({ share: value as "manual" | "auto" | "disabled" })
  }

  const setDefaultAgent = async (value: string) => {
    await serverSync().updateConfig({ default_agent: value || undefined })
  }

  const setSmallModel = async (value: string) => {
    await serverSync().updateConfig({ small_model: value || undefined })
  }

  const setAutoupdate = async (value: string) => {
    let v: boolean | "notify" | undefined
    if (value === "true") v = true
    else if (value === "notify") v = "notify"
    else v = false
    await serverSync().updateConfig({ autoupdate: v })
  }

  const addInstruction = async () => {
    const val = state.newInstruction.trim()
    if (!val) return
    const current = instructions()
    if (current.includes(val)) {
      setState("newInstruction", "")
      return
    }
    await serverSync().updateConfig({ instructions: [...current, val] })
    setState("newInstruction", "")
  }

  const removeInstruction = async (index: number) => {
    const current = instructions()
    await serverSync().updateConfig({ instructions: current.filter((_, i) => i !== index) })
  }

  const addWatcherPattern = async () => {
    const val = state.newWatcherPattern.trim()
    if (!val) return
    const current = watcherIgnore()
    if (current.includes(val)) {
      setState("newWatcherPattern", "")
      return
    }
    await serverSync().updateConfig({ watcher: { ignore: [...current, val] } })
    setState("newWatcherPattern", "")
  }

  const removeWatcherPattern = async (index: number) => {
    const current = watcherIgnore()
    await serverSync().updateConfig({ watcher: { ignore: current.filter((_, i) => i !== index) } })
  }

  const setCompactionAuto = async (checked: boolean) => {
    const current = config().compaction ?? {}
    await serverSync().updateConfig({ compaction: { ...current, auto: checked } })
  }

  const setCompactionTailTurns = async (value: string) => {
    const num = Number.parseInt(value, 10)
    if (Number.isNaN(num) || num < 0) return
    const current = config().compaction ?? {}
    await serverSync().updateConfig({ compaction: { ...current, tail_turns: num } })
  }

  return (
    <>
      <div class="settings-v2-tab-header">
        <h2 class="settings-v2-tab-title">Project Config</h2>
        <p class="settings-v2-tab-description">
          Configure project-level settings that apply to the current workspace.
        </p>
      </div>

      <div class="settings-v2-tab-body">
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">General</h3>
          <SettingsListV2>
            <SettingsRowV2
              title="Share mode"
              description="Control how sessions are shared: manual approval, auto-share, or disabled"
            >
              <SelectV2
                appearance="inline"
                options={SHARE_OPTIONS}
                current={SHARE_OPTIONS.find((o) => o.value === shareMode())}
                value={(o) => o.value}
                label={(o) => o.label}
                onSelect={(option) => option && setShareMode(option.value)}
              />
            </SettingsRowV2>

            <SettingsRowV2
              title="Default agent"
              description="Default agent to use for new sessions"
            >
              <div class="w-full sm:w-[220px]">
                <TextInputV2
                  type="text"
                  appearance="base"
                  value={defaultAgent()}
                  onInput={(event) => setDefaultAgent(event.currentTarget.value)}
                  placeholder="e.g. build"
                  spellcheck={false}
                />
              </div>
            </SettingsRowV2>

            <SettingsRowV2
              title="Small model"
              description="Model to use for lightweight tasks (e.g., 'provider/model')"
            >
              <div class="w-full sm:w-[220px]">
                <TextInputV2
                  type="text"
                  appearance="base"
                  value={smallModel()}
                  onInput={(event) => setSmallModel(event.currentTarget.value)}
                  placeholder="e.g. openai/gpt-4o-mini"
                  spellcheck={false}
                />
              </div>
            </SettingsRowV2>

            <SettingsRowV2
              title="Auto-update"
              description="Automatically update to new versions"
            >
              <SelectV2
                appearance="inline"
                options={AUTOUPDATE_OPTIONS}
                current={AUTOUPDATE_OPTIONS.find((o) => o.value === autoupdate())}
                value={(o) => o.value}
                label={(o) => o.label}
                onSelect={(option) => option && setAutoupdate(option.value)}
              />
            </SettingsRowV2>
          </SettingsListV2>
        </div>

        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Instructions</h3>
          <SettingsListV2>
            <SettingsRowV2
              title="Instruction paths"
              description="Paths to instruction files that provide context to the agent"
            >
              <div class="flex flex-col gap-2 w-full">
                <For each={instructions()}>
                  {(instruction, index) => (
                    <div class="flex items-center gap-2">
                      <span class="flex-1 text-13-regular text-text-base truncate">{instruction}</span>
                      <ButtonV2 variant="ghost-muted" size="small" icon="close" onClick={() => removeInstruction(index())}>
                        Remove
                      </ButtonV2>
                    </div>
                  )}
                </For>
                <Show when={instructions().length === 0}>
                  <span class="text-13-regular text-text-muted">No instruction paths configured</span>
                </Show>
                <div class="flex items-center gap-2 w-full">
                  <div class="flex-1 min-w-0">
                    <TextInputV2
                      type="text"
                      appearance="base"
                      value={state.newInstruction}
                      onInput={(event) => setState("newInstruction", event.currentTarget.value)}
                      placeholder="path/to/instructions.md"
                      spellcheck={false}
                    />
                  </div>
                  <ButtonV2 variant="ghost-muted" icon="plus" onClick={addInstruction} class="shrink-0">
                    Add
                  </ButtonV2>
                </div>
              </div>
            </SettingsRowV2>
          </SettingsListV2>
        </div>

        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">File Watcher</h3>
          <SettingsListV2>
            <SettingsRowV2
              title="Ignore patterns"
              description="Glob patterns for files to exclude from file watching"
            >
              <div class="flex flex-col gap-2 w-full">
                <For each={watcherIgnore()}>
                  {(pattern, index) => (
                    <div class="flex items-center gap-2">
                      <span class="flex-1 text-13-regular text-text-base font-mono truncate">{pattern}</span>
                      <ButtonV2 variant="ghost-muted" size="small" icon="close" onClick={() => removeWatcherPattern(index())}>
                        Remove
                      </ButtonV2>
                    </div>
                  )}
                </For>
                <Show when={watcherIgnore().length === 0}>
                  <span class="text-13-regular text-text-muted">No ignore patterns configured</span>
                </Show>
                <div class="flex items-center gap-2 w-full">
                  <div class="flex-1 min-w-0">
                    <TextInputV2
                      type="text"
                      appearance="base"
                      value={state.newWatcherPattern}
                      onInput={(event) => setState("newWatcherPattern", event.currentTarget.value)}
                      placeholder="e.g. **/node_modules/**"
                      spellcheck={false}
                    />
                  </div>
                  <ButtonV2 variant="ghost-muted" icon="plus" onClick={addWatcherPattern} class="shrink-0">
                    Add
                  </ButtonV2>
                </div>
              </div>
            </SettingsRowV2>
          </SettingsListV2>
        </div>

        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Compaction</h3>
          <SettingsListV2>
            <SettingsRowV2
              title="Auto-compaction"
              description="Automatically compact sessions to manage context window"
            >
              <Switch checked={compactionAuto()} onChange={setCompactionAuto} />
            </SettingsRowV2>

            <SettingsRowV2
              title="Tail turns"
              description="Number of recent turns to preserve during compaction"
            >
              <div class="w-full sm:w-[120px]">
                <TextInputV2
                  type="number"
                  appearance="base"
                  value={String(compactionTailTurns())}
                  onInput={(event) => setCompactionTailTurns(event.currentTarget.value)}
                  min={1}
                />
              </div>
            </SettingsRowV2>
          </SettingsListV2>
        </div>
      </div>
    </>
  )
}
