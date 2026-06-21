import { Component, For, Show } from "solid-js"
import { useLanguage } from "@/context/language"
import { useServerSync } from "@/context/server-sync"
import { useSync } from "@/context/sync"
import { createStore } from "solid-js/store"
import { TextField } from "@opencode-ai/ui/text-field"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Switch } from "@opencode-ai/ui/v2/switch-v2"
import { SettingsListV2 } from "./parts/list"

export const SettingsMcpV2: Component = () => {
  const language = useLanguage()
  const serverSync = useServerSync()
  const sync = useSync()
  const [state, setState] = createStore({
    newName: "",
    newJson: "{\n  \"type\": \"local\",\n  \"command\": [\n    \"npx\",\n    \"-y\",\n    \"@modelcontextprotocol/server-postgres\",\n    \"postgresql://localhost/mydb\"\n  ],\n  \"enabled\": true\n}",
    pending: false,
    error: "",
  })

  const mcpServers = () => serverSync().data.config.mcp ?? {}
  const activeMcp = () => sync().data.mcp ?? {}

  const combinedMcpNames = () => {
    const set = new Set<string>()
    Object.keys(mcpServers()).forEach((k) => set.add(k))
    Object.keys(activeMcp()).forEach((k) => set.add(k))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }

  const addMcp = async () => {
    const name = state.newName.trim()
    if (!name) {
      setState("error", "Name is required")
      return
    }

    let parsedConfig: any
    try {
      parsedConfig = JSON.parse(state.newJson)
      setState("error", "")
    } catch (e) {
      setState("error", "Invalid JSON")
      return
    }

    setState("pending", true)
    try {
      const nextMcp = { ...mcpServers(), [name]: parsedConfig }
      await serverSync().updateConfig({ mcp: nextMcp })
      setState("newName", "")
    } finally {
      setState("pending", false)
    }
  }

  const removeMcp = async (name: string) => {
    setState("pending", true)
    try {
      const nextMcp = { ...mcpServers() }
      delete nextMcp[name]
      await serverSync().updateConfig({ mcp: nextMcp })
    } finally {
      setState("pending", false)
    }
  }

  const toggleMcp = async (name: string, checked: boolean) => {
    setState("pending", true)
    try {
      const nextMcp = { ...mcpServers() }
      const cfg = nextMcp[name] as any
      if (cfg && typeof cfg === "object") {
        nextMcp[name] = { ...cfg, enabled: checked }
      } else {
        nextMcp[name] = { enabled: checked }
      }
      await serverSync().updateConfig({ mcp: nextMcp })
    } finally {
      setState("pending", false)
    }
  }

  return (
    <>
      <div class="settings-v2-tab-header">
        <h2 class="settings-v2-tab-title">MCP Servers</h2>
        <p class="settings-v2-tab-description">
          Manage your Model Context Protocol (MCP) servers. MCP servers extend the capabilities of the agent.
          <br /><br />
          <strong>Note:</strong> Playwright will be enabled by default and is recommended. Without it, browser-based testing won't work.
        </p>
      </div>

      <div class="settings-v2-tab-body">
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Configured MCP Servers</h3>
          
          <SettingsListV2>
            <Show
              when={combinedMcpNames().length > 0}
              fallback={
                <div class="settings-v2-provider-empty">No MCP servers configured</div>
              }
            >
              <For each={combinedMcpNames()}>
                {(name: string) => {
                  const config = mcpServers()[name] as any
                  const isUserConfigured = !!config
                  const typeLabel = config
                    ? config.type === "local" || config.type === "stdio"
                      ? `local: ${Array.isArray(config.command) ? config.command.join(" ") : config.command}${config.args ? " " + config.args.join(" ") : ""}`
                      : config.url
                        ? `remote: ${config.url}`
                        : "Unknown type"
                    : "Provided by workspace or plugin"

                  const isEnabled = () => {
                    const cfg = mcpServers()[name] as any
                    if (cfg && cfg.enabled !== undefined) return cfg.enabled
                    return true
                  }

                  return (
                    <div class="settings-v2-provider-row group">
                      <div class="settings-v2-provider-lead">
                        <div class="settings-v2-provider-main flex flex-col gap-1">
                          <span class="settings-v2-provider-name truncate">{name}</span>
                          <span class="text-12-regular text-text-weak truncate">
                            {typeLabel}
                          </span>
                        </div>
                      </div>
                      <div class="flex items-center gap-4">
                        <div class="flex items-center gap-2">
                          <span class="text-12-regular text-text-weak">{isEnabled() ? "Enabled" : "Disabled"}</span>
                          <Switch
                            checked={isEnabled()}
                            onChange={(checked) => void toggleMcp(name, checked)}
                            disabled={state.pending}
                          />
                        </div>
                        <Show when={isUserConfigured}>
                          <ButtonV2 
                            size="normal" 
                            variant="ghost-muted" 
                            onClick={() => void removeMcp(name)}
                            disabled={state.pending}
                          >
                            Remove
                          </ButtonV2>
                        </Show>
                      </div>
                    </div>
                  )
                }}
              </For>
            </Show>
          </SettingsListV2>
        </div>

        <div class="settings-v2-section mt-4 flex flex-col gap-4">
          <h3 class="settings-v2-section-title">Add MCP Server</h3>
          
          <TextField
            label="Name"
            placeholder="e.g., postgres"
            value={state.newName}
            onChange={(v) => setState("newName", v)}
          />

          <TextField
            multiline
            label="JSON Configuration"
            description="Enter the JSON configuration object for this MCP server."
            value={state.newJson}
            onChange={(v) => setState("newJson", v)}
            validationState={state.error ? "invalid" : undefined}
            error={state.error}
            class="min-h-[120px] font-mono text-12-regular"
          />

          <ButtonV2
            size="normal"
            variant="neutral"
            onClick={() => void addMcp()}
            disabled={state.pending || !state.newName.trim()}
            class="self-start"
          >
            Add Server
          </ButtonV2>
        </div>
      </div>
    </>
  )
}
