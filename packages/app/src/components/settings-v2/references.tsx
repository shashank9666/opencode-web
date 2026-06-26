import { Component, For, Show, createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Switch } from "@opencode-ai/ui/v2/switch-v2"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import { Icon as IconV2 } from "@opencode-ai/ui/v2/icon"
import { IconButtonV2 } from "@opencode-ai/ui/v2/icon-button-v2"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import { useLanguage } from "@/context/language"
import { useServerSync } from "@/context/server-sync"
import { SettingsListV2 } from "./parts/list"
import "./settings-v2.css"

type RefValue = string | { repository: string; branch?: string; description?: string; hidden?: boolean } | { path: string; description?: string; hidden?: boolean }
type RefType = "url" | "git" | "local"

const REF_TYPE_OPTIONS: { value: RefType; label: string }[] = [
  { value: "local", label: "Local directory" },
  { value: "git", label: "Git repository" },
  { value: "url", label: "URL" },
]

export const SettingsReferencesV2: Component = () => {
  const language = useLanguage()
  const serverSync = useServerSync()

  const references = createMemo(() => {
    const refs = serverSync().data.config.references ?? serverSync().data.config.reference ?? {}
    return Object.entries(refs).map(([name, cfg]) => {
      let type: RefType
      if (typeof cfg === "string") {
        type = "url"
      } else if ("repository" in cfg) {
        type = "git"
      } else {
        type = "local"
      }
      return { name, cfg, type }
    })
  })

  const [newRef, setNewRef] = createStore({ name: "", type: "url" as RefType, value: "" })
  const [newRefOpts, setNewRefOpts] = createStore({ branch: "", description: "", hidden: false })

  const addReference = async () => {
    if (!newRef.name.trim() || !newRef.value.trim()) return
    const refs = { ...(serverSync().data.config.references ?? {}) }

    if (newRef.type === "git") {
      const entry: { repository: string; branch?: string; description?: string } = { repository: newRef.value.trim() }
      if (newRefOpts.branch.trim()) entry.branch = newRefOpts.branch.trim()
      if (newRefOpts.description.trim()) entry.description = newRefOpts.description.trim()
      refs[newRef.name.trim()] = entry
    } else if (newRef.type === "local") {
      const entry: { path: string; description?: string } = { path: newRef.value.trim() }
      if (newRefOpts.description.trim()) entry.description = newRefOpts.description.trim()
      refs[newRef.name.trim()] = entry
    } else {
      refs[newRef.name.trim()] = newRef.value.trim()
    }

    await serverSync().updateConfig({ references: refs })
    setNewRef({ name: "", type: "url", value: "" })
    setNewRefOpts({ branch: "", description: "", hidden: false })
  }

  const removeReference = async (name: string) => {
    const refs = { ...(serverSync().data.config.references ?? {}) }
    delete refs[name]
    await serverSync().updateConfig({ references: refs })
  }

  const displayValue = (cfg: RefValue) => {
    if (typeof cfg === "string") return cfg
    if ("repository" in cfg) return cfg.repository
    return cfg.path
  }

  return (
    <>
      <div class="settings-v2-tab-header">
        <h2 class="settings-v2-tab-title">References</h2>
        <p class="settings-v2-tab-description">
          Manage references that provide context to the agent, including local directories, git repositories, and URLs.
        </p>
      </div>

      <div class="settings-v2-tab-body">
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Add Reference</h3>
          <div class="flex flex-col gap-3 p-4 rounded-lg bg-v2-background-bg-layer-01 border border-v2-border-border-muted">
            <TextInputV2
              type="text"
              appearance="base"
              value={newRef.name}
              onInput={(e) => setNewRef("name", e.currentTarget.value)}
              placeholder="Reference name (e.g., 'docs')"
            />
            <SelectV2
              appearance="inline"
              options={REF_TYPE_OPTIONS}
              current={REF_TYPE_OPTIONS.find((o) => o.value === newRef.type)}
              value={(o: { value: string }) => o.value}
              label={(o: { value: string; label: string }) => o.label}
              onSelect={(option) => {
                if (option) {
                  setNewRef("type", option.value as RefType)
                  setNewRefOpts({ branch: "", description: "", hidden: false })
                }
              }}
            />
            <TextInputV2
              type="text"
              appearance="base"
              value={newRef.value}
              onInput={(e) => setNewRef("value", e.currentTarget.value)}
              placeholder={
                newRef.type === "git"
                  ? "https://github.com/user/repo.git"
                  : newRef.type === "local"
                    ? "./path/to/directory"
                    : "https://example.com/docs"
              }
            />
            <Show when={newRef.type === "git"}>
              <TextInputV2
                type="text"
                appearance="base"
                value={newRefOpts.branch}
                onInput={(e) => setNewRefOpts("branch", e.currentTarget.value)}
                placeholder="Branch (optional)"
              />
            </Show>
            <TextInputV2
              type="text"
              appearance="base"
              value={newRefOpts.description}
              onInput={(e) => setNewRefOpts("description", e.currentTarget.value)}
              placeholder="Description (optional)"
            />
            <div>
              <ButtonV2 variant="ghost-muted" icon="plus" onClick={addReference}>
                Add
              </ButtonV2>
            </div>
          </div>
        </div>

        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Configured References</h3>
          <Show
            when={references().length > 0}
            fallback={
              <div class="flex items-center justify-center py-12 text-13-regular text-text-muted">
                No references configured.
              </div>
            }
          >
            <SettingsListV2>
              <For each={references()}>
                {(ref) => (
                  <div class="flex items-center justify-between py-3">
                    <div class="flex flex-col min-w-0 flex-1 gap-1">
                      <div class="flex items-center gap-2">
                        <span class="text-13-medium text-text-base">{ref.name}</span>
                        <span class="text-11-regular text-text-weaker capitalize">{ref.type}</span>
                      </div>
                      <span class="text-11-regular text-text-muted truncate font-mono">{displayValue(ref.cfg)}</span>
                    </div>
                    <IconButtonV2
                      icon={<IconV2 name="close" size="small" />}
                      variant="ghost-muted"
                      size="small"
                      onClick={() => removeReference(ref.name)}
                    />
                  </div>
                )}
              </For>
            </SettingsListV2>
          </Show>
        </div>
      </div>
    </>
  )
}
