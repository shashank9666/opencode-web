import { Component, Show, createMemo } from "solid-js"
import { Switch } from "@opencode-ai/ui/v2/switch-v2"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import { useLanguage } from "@/context/language"
import { useServerSync } from "@/context/server-sync"
import { SettingsListV2 } from "./parts/list"
import { SettingsRowV2 } from "./parts/row"
import "./settings-v2.css"

export const SettingsNetworkV2: Component = () => {
  const language = useLanguage()
  const serverSync = useServerSync()

  const config = createMemo(() => serverSync().data.config)
  const serverConfig = createMemo(() => config().server)

  const hostname = createMemo(() => serverConfig()?.hostname ?? "")
  const port = createMemo(() => serverConfig()?.port ?? "")
  const mdns = createMemo(() => serverConfig()?.mdns ?? true)
  const corsOrigins = createMemo(() => serverConfig()?.cors ?? [])

  const setServerConfig = async (patch: Record<string, unknown>) => {
    const current = serverConfig() ?? {}
    await serverSync().updateConfig({ server: { ...current, ...patch } })
  }

  const setCorsOrigins = async (value: string) => {
    const origins = value
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    await setServerConfig({ cors: origins })
  }

  return (
    <>
      <div class="settings-v2-tab-header">
        <h2 class="settings-v2-tab-title">Network</h2>
        <p class="settings-v2-tab-description">
          Configure server networking options.
        </p>
      </div>

      <div class="settings-v2-tab-body">
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Server</h3>
          <SettingsListV2>
            <SettingsRowV2
              title="Hostname"
              description="The hostname the server binds to"
            >
              <div class="w-full sm:w-[220px]">
                <TextInputV2
                  type="text"
                  appearance="base"
                  value={hostname()}
                  onInput={(e) => setServerConfig({ hostname: e.currentTarget.value || undefined })}
                  placeholder="e.g. 0.0.0.0"
                  spellcheck={false}
                />
              </div>
            </SettingsRowV2>

            <SettingsRowV2
              title="Port"
              description="The port the server listens on"
            >
              <div class="w-full sm:w-[120px]">
                <TextInputV2
                  type="number"
                  appearance="base"
                  value={port()}
                  onInput={(e) => setServerConfig({ port: Number(e.currentTarget.value) || undefined })}
                  placeholder="8080"
                  min={1}
                  max={65535}
                />
              </div>
            </SettingsRowV2>

            <SettingsRowV2
              title="mDNS discovery"
              description="Allow automatic server discovery on the local network"
            >
              <Switch checked={mdns()} onChange={(v) => setServerConfig({ mdns: v })} />
            </SettingsRowV2>

            <SettingsRowV2
              title="CORS origins"
              description="Allowed CORS origins (space or comma-separated)"
            >
              <div class="w-full sm:w-[300px]">
                <TextInputV2
                  type="text"
                  appearance="base"
                  value={corsOrigins().join(", ")}
                  onInput={(e) => setCorsOrigins(e.currentTarget.value)}
                  placeholder="https://app.example.com, https://*.example.com"
                  spellcheck={false}
                />
              </div>
            </SettingsRowV2>
          </SettingsListV2>
        </div>
      </div>
    </>
  )
}
