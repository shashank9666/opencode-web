import { Component, For, Show, createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Switch } from "@opencode-ai/ui/v2/switch-v2"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import { Icon as IconV2 } from "@opencode-ai/ui/v2/icon"
import { IconButtonV2 } from "@opencode-ai/ui/v2/icon-button-v2"
import { useLanguage } from "@/context/language"
import { useServerSync } from "@/context/server-sync"
import { SettingsListV2 } from "./parts/list"
import { SettingsRowV2 } from "./parts/row"
import "./settings-v2.css"

type LspConfigValue = { disabled: true } | { command: string[]; extensions?: string[]; disabled?: boolean }

export const SettingsLspV2: Component = () => {
  const language = useLanguage()
  const serverSync = useServerSync()

  const lspEnabled = createMemo(() => {
    const v = serverSync().data.config.lsp
    return v !== false && v !== undefined
  })

  const lspMap = createMemo(() => {
    const v = serverSync().data.config.lsp
    if (typeof v === "object" && v !== null) return v as Record<string, LspConfigValue>
    return {} as Record<string, LspConfigValue>
  })

  const [newLsp, setNewLsp] = createStore({ name: "", command: "", extensions: "" })

  const setLspEnabled = async (checked: boolean) => {
    if (checked) {
      const current = serverSync().data.config.lsp
      if (current === false || current === undefined) {
        await serverSync().updateConfig({ lsp: true })
      }
    } else {
      await serverSync().updateConfig({ lsp: false })
    }
  }

  const addLsp = async () => {
    if (!newLsp.name.trim()) return
    const commandArr = newLsp.command.trim() ? newLsp.command.trim().split(/\s+/) : undefined
    const extensionsArr = newLsp.extensions.trim() ? newLsp.extensions.trim().split(/,\s*/) : undefined
    const map = lspMap()
    map[newLsp.name.trim()] = {
      command: commandArr ?? ["true"],
      extensions: extensionsArr,
    } as LspConfigValue
    await serverSync().updateConfig({ lsp: { ...map } as any })
    setNewLsp({ name: "", command: "", extensions: "" })
  }

  const removeLsp = async (name: string) => {
    const map = { ...lspMap() }
    delete map[name]
    await serverSync().updateConfig({ lsp: Object.keys(map).length > 0 ? ({ ...map } as any) : true })
  }

  const toggleLsp = async (name: string, disabled: boolean) => {
    const map = { ...lspMap() }
    const existing = map[name]
    if (existing && "disabled" in existing && existing.disabled === true) {
      map[name] = { command: ["true"], disabled: false } as LspConfigValue
    } else if (existing && "command" in existing) {
      map[name] = { ...existing, disabled }
    } else {
      map[name] = { disabled: true } as LspConfigValue
    }
    await serverSync().updateConfig({ lsp: { ...map } as any })
  }

  const isDisabled = (cfg: LspConfigValue) => "disabled" in cfg && cfg.disabled === true
  const getCommand = (cfg: LspConfigValue) => "command" in cfg ? cfg.command : undefined
  const getExtensions = (cfg: LspConfigValue) => "extensions" in cfg ? cfg.extensions : undefined

  return (
    <>
      <div class="settings-v2-tab-header">
        <h2 class="settings-v2-tab-title">LSP Servers</h2>
        <p class="settings-v2-tab-description">
          Manage Language Server Protocol servers that provide code intelligence.
        </p>
      </div>

      <div class="settings-v2-tab-body">
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Status</h3>
          <SettingsListV2>
            <SettingsRowV2
              title="Enable LSP"
              description="Enable or disable built-in LSP servers"
            >
              <Switch checked={lspEnabled()} onChange={setLspEnabled} />
            </SettingsRowV2>
          </SettingsListV2>
        </div>

        <Show when={lspEnabled()}>
          <div class="settings-v2-section">
            <h3 class="settings-v2-section-title">Custom LSP Server</h3>
            <div class="flex flex-col gap-3 p-4 rounded-lg bg-v2-background-bg-layer-01 border border-v2-border-border-muted">
              <TextInputV2
                type="text"
                appearance="base"
                value={newLsp.name}
                onInput={(e) => setNewLsp("name", e.currentTarget.value)}
                placeholder="Server name (e.g., 'typescript-language-server')"
              />
              <TextInputV2
                type="text"
                appearance="base"
                value={newLsp.command}
                onInput={(e) => setNewLsp("command", e.currentTarget.value)}
                placeholder="Command (e.g., 'typescript-language-server --stdio')"
              />
              <TextInputV2
                type="text"
                appearance="base"
                value={newLsp.extensions}
                onInput={(e) => setNewLsp("extensions", e.currentTarget.value)}
                placeholder="File extensions (comma-separated, e.g., .ts,.tsx,.js)"
              />
              <div>
                <ButtonV2 variant="ghost-muted" icon="plus" onClick={addLsp}>
                  Add
                </ButtonV2>
              </div>
            </div>
          </div>

          <div class="settings-v2-section">
            <h3 class="settings-v2-section-title">Configured LSP Servers</h3>
            <Show
              when={Object.keys(lspMap()).length > 0}
              fallback={
                <div class="flex items-center justify-center py-12 text-13-regular text-text-muted">
                  No custom LSP servers configured. Built-in servers are active.
                </div>
              }
            >
              <SettingsListV2>
                <For each={Object.entries(lspMap())}>
                  {([name, cfg]) => (
                    <div class="flex items-center justify-between py-3">
                      <div class="flex flex-col min-w-0 flex-1 gap-1">
                        <div class="flex items-center gap-2">
                          <span class="text-13-medium text-text-base">{name}</span>
                        </div>
                        <Show when={getCommand(cfg)}>
                          <span class="text-11-regular text-text-muted font-mono truncate">{getCommand(cfg)?.join(" ")}</span>
                        </Show>
                        <Show when={getExtensions(cfg)}>
                          <span class="text-11-regular text-text-muted">{getExtensions(cfg)?.join(", ")}</span>
                        </Show>
                      </div>
                      <div class="flex items-center gap-2">
                        <Switch
                          checked={!isDisabled(cfg)}
                          onChange={(v) => toggleLsp(name, !v)}
                        />
                        <IconButtonV2
                          icon={<IconV2 name="close" size="small" />}
                          variant="ghost-muted"
                          size="small"
                          onClick={() => removeLsp(name)}
                        />
                      </div>
                    </div>
                  )}
                </For>
              </SettingsListV2>
            </Show>
          </div>
        </Show>
      </div>
    </>
  )
}
