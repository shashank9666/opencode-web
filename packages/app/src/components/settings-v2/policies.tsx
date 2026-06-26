import { Component, For, Show, createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import { Icon as IconV2 } from "@opencode-ai/ui/v2/icon"
import { IconButtonV2 } from "@opencode-ai/ui/v2/icon-button-v2"
import { useLanguage } from "@/context/language"
import { useServerSync } from "@/context/server-sync"
import { SettingsListV2 } from "./parts/list"
import "./settings-v2.css"

type PolicyAction = "provider.use"
type PolicyEffect = "allow" | "deny"

const ACTIONS: { value: PolicyAction; label: string }[] = [
  { value: "provider.use", label: "provider.use" },
]
const EFFECTS: { value: PolicyEffect; label: string }[] = [
  { value: "allow", label: "Allow" },
  { value: "deny", label: "Deny" },
]

export const SettingsPoliciesV2: Component = () => {
  const language = useLanguage()
  const serverSync = useServerSync()

  const policies = createMemo(() => {
    return serverSync().data.config.experimental?.policies ?? []
  })

  const [newPolicy, setNewPolicy] = createStore({ action: "provider.use" as PolicyAction, effect: "deny" as PolicyEffect, resource: "" })

  const addPolicy = async () => {
    if (!newPolicy.resource.trim()) return
    const current = policies()
    const exp = { ...(serverSync().data.config.experimental ?? {}) }
    exp.policies = [...current, { action: newPolicy.action, effect: newPolicy.effect, resource: newPolicy.resource.trim() }]
    await serverSync().updateConfig({ experimental: exp })
    setNewPolicy({ action: "provider.use", effect: "deny", resource: "" })
  }

  const removePolicy = async (index: number) => {
    const current = policies()
    const exp = { ...(serverSync().data.config.experimental ?? {}) }
    exp.policies = current.filter((_, i) => i !== index)
    await serverSync().updateConfig({ experimental: exp })
  }

  return (
    <>
      <div class="settings-v2-tab-header">
        <h2 class="settings-v2-tab-title">Policies</h2>
        <p class="settings-v2-tab-description">
          Configure experimental policies that define access controls for providers.
        </p>
      </div>

      <div class="settings-v2-tab-body">
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Add Policy</h3>
          <div class="flex flex-col gap-3 p-4 rounded-lg bg-v2-background-bg-layer-01 border border-v2-border-border-muted">
            <SelectV2
              appearance="inline"
              options={EFFECTS}
              current={EFFECTS.find((o) => o.value === newPolicy.effect)}
              value={(o: { value: PolicyEffect }) => o.value}
              label={(o: { value: PolicyEffect; label: string }) => o.label}
              onSelect={(option) => option && setNewPolicy("effect", option.value)}
            />
            <SelectV2
              appearance="inline"
              options={ACTIONS}
              current={ACTIONS.find((o) => o.value === newPolicy.action)}
              value={(o: { value: PolicyAction }) => o.value}
              label={(o: { value: PolicyAction; label: string }) => o.label}
              onSelect={(option) => option && setNewPolicy("action", option.value)}
            />
            <TextInputV2
              type="text"
              appearance="base"
              value={newPolicy.resource}
              onInput={(e) => setNewPolicy("resource", e.currentTarget.value)}
              placeholder="Resource (e.g., 'openai:*' or 'openai:gpt-4')"
            />
            <div>
              <ButtonV2 variant="ghost-muted" icon="plus" onClick={addPolicy}>
                Add
              </ButtonV2>
            </div>
          </div>
        </div>

        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Configured Policies</h3>
          <Show
            when={policies().length > 0}
            fallback={
              <div class="flex items-center justify-center py-12 text-13-regular text-text-muted">
                No policies configured.
              </div>
            }
          >
            <SettingsListV2>
              <For each={policies()}>
                {(policy, index) => (
                  <div class="flex items-center justify-between py-3">
                    <div class="flex flex-col min-w-0 flex-1 gap-1">
                      <div class="flex items-center gap-2">
                        <span class="text-13-medium text-text-base">{policy.effect}</span>
                        <span class="text-11-regular text-text-weaker">{policy.action}</span>
                      </div>
                      <span class="text-11-regular text-text-muted truncate font-mono">{policy.resource}</span>
                    </div>
                    <IconButtonV2
                      icon={<IconV2 name="close" size="small" />}
                      variant="ghost-muted"
                      size="small"
                      onClick={() => removePolicy(index())}
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
