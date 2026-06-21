import { Component } from "solid-js"
import { usePermission, type GranularPermissions } from "@/context/permission"
import { SettingsListV2 } from "./parts/list"
import { SettingsRowV2 } from "./parts/row"
import { Switch } from "@opencode-ai/ui/v2/switch-v2"
import "./settings-v2.css"

export const SettingsAutoApproveV2: Component = () => {
  const permission = usePermission()

  const s = () => permission.autoApproveSettings()

  const toggle = (key: keyof GranularPermissions) => {
    permission.setAutoApproveSettings({ [key]: !s()[key] })
  }

  return (
    <div class="settings-v2-container">
      <div class="settings-v2-header">
        <h1>Auto-Approve Permissions</h1>
        <p class="settings-v2-description">Control which actions the AI can perform without asking for explicit approval.</p>
      </div>

      <SettingsListV2>
        <SettingsRowV2
          title="Read project files"
          description="Allow reading files within the current workspace."
        >
          <Switch checked={s().readProjectFiles} onChange={() => toggle("readProjectFiles")} />
        </SettingsRowV2>
        <div class="pl-8 -mt-2 mb-2">
          <SettingsRowV2
            title="Read all files"
            description="Allow reading files outside the workspace."
          >
            <Switch checked={s().readAllFiles} onChange={() => toggle("readAllFiles")} disabled={!s().readProjectFiles} />
          </SettingsRowV2>
        </div>

        <SettingsRowV2
          title="Edit project files"
          description="Allow creating and editing files within the workspace."
        >
          <Switch checked={s().editProjectFiles} onChange={() => toggle("editProjectFiles")} />
        </SettingsRowV2>
        <div class="pl-8 -mt-2 mb-2">
          <SettingsRowV2
            title="Edit all files"
            description="Allow creating and editing files outside the workspace."
          >
            <Switch checked={s().editAllFiles} onChange={() => toggle("editAllFiles")} disabled={!s().editProjectFiles} />
          </SettingsRowV2>
        </div>

        <SettingsRowV2
          title="Execute safe commands"
          description="Allow running non-destructive terminal commands."
        >
          <Switch checked={s().executeSafeCommands} onChange={() => toggle("executeSafeCommands")} />
        </SettingsRowV2>
        <div class="pl-8 -mt-2 mb-2">
          <SettingsRowV2
            title="Execute all commands"
            description="Allow running any terminal command."
          >
            <Switch checked={s().executeAllCommands} onChange={() => toggle("executeAllCommands")} disabled={!s().executeSafeCommands} />
          </SettingsRowV2>
        </div>

        <SettingsRowV2
          title="Use the browser"
          description="Allow navigating and interacting with web pages."
        >
          <Switch checked={s().useBrowser} onChange={() => toggle("useBrowser")} />
        </SettingsRowV2>

        <SettingsRowV2
          title="Use MCP servers"
          description="Allow interacting with configured MCP servers."
        >
          <Switch checked={s().useMcpServers} onChange={() => toggle("useMcpServers")} />
        </SettingsRowV2>
      </SettingsListV2>
    </div>
  )
}
