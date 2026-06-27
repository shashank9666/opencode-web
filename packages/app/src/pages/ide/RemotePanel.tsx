import { For, Show, createEffect, createSignal, createMemo } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { DropdownMenu } from "@opencode-ai/ui/dropdown-menu"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useRemote, type RemoteType, type RemoteConnection, type SavedRemoteConnection, type RemoteSection } from "@/context/remote"

// Common paths for each remote type
const COMMON_PATHS: Record<RemoteType, string[]> = {
  WSL: ["/home", "/tmp", "/var/log", "/etc", "/opt"],
  SSH: ["/home", "/var/www", "/etc/nginx", "/opt", "/srv"],
  Container: ["/app", "/var/log", "/etc", "/tmp", "/root"],
}

// Remote type info
const TYPE_INFO: Record<RemoteType, { color: string; icon: string; label: string; command: string }> = {
  WSL: { color: "text-[#f97316]", icon: ">_", label: "WSL", command: "wsl" },
  SSH: { color: "text-[#3b82f6]", icon: "⚡", label: "SSH", command: "ssh" },
  Container: { color: "text-[#8b5cf6]", icon: "◈", label: "Docker", command: "docker exec -it" },
}

const STATUS_INFO: Record<RemoteConnection["status"], { label: string; className: string; dotClassName: string }> = {
  connected: {
    label: "Connected",
    className: "text-text-success-base",
    dotClassName: "bg-text-success-base",
  },
  connecting: {
    label: "Connecting…",
    className: "text-text-warning-base",
    dotClassName: "bg-text-warning-base",
  },
  error: {
    label: "Auth Failed",
    className: "text-text-danger-base",
    dotClassName: "bg-text-danger-base",
  },
  idle: {
    label: "Offline",
    className: "text-text-weaker",
    dotClassName: "bg-text-weaker",
  },
}

const SETTINGS_SCOPES = ["User", "Workspace", "Remote"] as const
const CONNECTION_FLOW = [
  "SSH Auth",
  "Start Remote Agent",
  "Init File System",
  "Open Workspace",
  "Start Language Servers",
  "Ready",
]

function QuickConnectButton(props: {
  type: RemoteType
  onConnect: (type: RemoteType, target: string) => void
}) {
  const [input, setInput] = createSignal("")
  const typeInfo = TYPE_INFO[props.type]

  return (
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center gap-2">
        <span class={`text-12-medium font-mono ${typeInfo.color}`}>{typeInfo.icon}</span>
        <span class="text-12-medium text-text-strong">{typeInfo.label}</span>
      </div>
      <div class="flex items-center gap-1">
        <input
          type="text"
          class="flex-1 px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded text-text-strong placeholder:text-text-weaker"
          placeholder={
            props.type === "WSL" ? "e.g. ubuntu" :
            props.type === "SSH" ? "e.g. user@host" :
            "e.g. container-name"
          }
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input().trim()) {
              props.onConnect(props.type, input().trim())
            }
          }}
        />
        <button
          type="button"
          class="px-2 py-1 text-12-medium bg-accent-base text-white rounded hover:bg-accent-base-hover transition-colors"
          onClick={() => {
            if (input().trim()) props.onConnect(props.type, input().trim())
          }}
        >
          Connect
        </button>
      </div>
    </div>
  )
}

export default function RemotePanel(props: {
  connection?: string | null
  onFileClick?: (path: string) => void
  onDisconnect?: () => void
  onOpenTerminal?: (command: string, title: string) => void
}) {
  const remote = useRemote()
  const [connectors, setConnectors] = createSignal(false)
  const [currentPath, setCurrentPath] = createSignal("/")
  const [selectedRemoteType, setSelectedRemoteType] = createSignal<RemoteType>("WSL")
  const [settingsScope, setSettingsScope] = createSignal<(typeof SETTINGS_SCOPES)[number]>("Remote")

  createEffect(() => {
    const value = props.connection
    const current = remote.connection()
    if (!value) return

    const [type, ...targetParts] = value.split(": ")
    if ((type === "WSL" || type === "SSH" || type === "Container")) {
      const target = targetParts.join(": ")
      if (!current || current.type !== type || current.target !== target) {
        void remote.connect(type, target)
      }
    }
  })

  const isConnected = () => remote.connection()?.status === "connected"
  const isConnecting = () => remote.connection()?.status === "connecting"

  const handleConnect = (type: RemoteType, target: string) => {
    void remote.connect(type, target)
    setCurrentPath("/")
  }

  const handleDisconnect = () => {
    remote.disconnect()
    props.onDisconnect?.()
  }

  const connectSaved = (item: SavedRemoteConnection) => {
    handleConnect(item.type, item.target)
  }

  const updateRecentConnectionTarget = (type: RemoteType, previousTarget: string, nextTarget: string) => {
    remote.saveRecent(type, nextTarget)
  }

  const removeRecentConnection = (item: SavedRemoteConnection) => {
    remote.removeRecent(item)
  }

  const copyHost = async (target: string) => {
    await navigator.clipboard.writeText(target)
  }

  const renameConnection = (type: RemoteType, target: string) => {
    const nextTarget = window.prompt(`Rename ${TYPE_INFO[type].label} target`, target)?.trim()
    if (!nextTarget || nextTarget === target) return
    updateRecentConnectionTarget(type, target, nextTarget)
  }

  const editRemoteConfig = (type: RemoteType, target: string) => {
    const configPath = type === "SSH" ? "/remote/config/.ssh/config" : `/remote/config/${type.toLowerCase()}-${target}.json`
    props.onFileClick?.(configPath)
  }

  const showLogs = (type: RemoteType, target: string) => {
    remote.setLogTarget(`${type}: ${target}`)
    props.onFileClick?.(`/remote/logs/${type.toLowerCase()}/${target}.log`)
  }

  const installServer = (type: RemoteType, target: string) => {
    props.onOpenTerminal?.(
      type === "SSH" ? `ssh ${target} "install-remote-server"` : `remote-${type.toLowerCase()} install ${target}`,
      `${TYPE_INFO[type].label}: Install Server`,
    )
  }

  const killServer = (type: RemoteType, target: string) => {
    props.onOpenTerminal?.(
      type === "SSH" ? `ssh ${target} "kill-remote-server"` : `remote-${type.toLowerCase()} kill ${target}`,
      `${TYPE_INFO[type].label}: Kill Server`,
    )
  }

  const forwardPort = (type: RemoteType, target: string) => {
    remote.setForwardTarget(`${type}: ${target}`)
    props.onOpenTerminal?.(
      type === "SSH" ? `ssh -L 3000:localhost:3000 ${target}` : `remote-${type.toLowerCase()} forward-port ${target}`,
      `${TYPE_INFO[type].label}: Forward Port`,
    )
  }

  const reconnect = () => {
    remote.reconnect()
  }

  const openRemoteCommand = (label: string, command: string) => {
    props.onOpenTerminal?.(command, label)
  }

  const openProcessAction = (pid: number, action: string) => {
    const conn = remote.connection()
    if (!conn) return
    openRemoteCommand(
      `${action} PID ${pid}`,
      action === "Kill"
        ? `remote-${conn.type.toLowerCase()} kill ${pid}`
        : `remote-${conn.type.toLowerCase()} inspect ${pid}`,
    )
  }

  const remoteFileOperation = (action: string) => {
    const conn = remote.connection()
    if (!conn) return
    openRemoteCommand(
      `${action} in ${conn.type}`,
      `remote-${conn.type.toLowerCase()} ${action.toLowerCase().replaceAll(" ", "-")} ${conn.target}`,
    )
  }

  const openTerminal = () => {
    const conn = remote.connection()
    if (!conn) return
    let cmd: string
    let title: string
    if (conn.type === "WSL") {
      cmd = `wsl -d ${conn.target || "Ubuntu"}`
      title = `WSL: ${conn.target || "Ubuntu"}`
    } else if (conn.type === "SSH") {
      cmd = `ssh ${conn.target}`
      title = `SSH: ${conn.target}`
    } else {
      cmd = `docker exec -it ${conn.target} /bin/sh`
      title = `Docker: ${conn.target}`
    }
    props.onOpenTerminal?.(cmd, title)
  }

  const openFolder = (type: RemoteType, target: string) => {
    const path = `/remote/${type.toLowerCase()}/${target}`
    props.onFileClick?.(path)
  }

  const openPathInTerminal = (path: string) => {
    const conn = remote.connection()
    if (!conn) return
    if (conn.type === "WSL") {
      props.onOpenTerminal?.(`wsl -d ${conn.target || "Ubuntu"} -- ls -la ${path}`, `WSL: ${path}`)
    } else if (conn.type === "SSH") {
      props.onOpenTerminal?.(`ssh ${conn.target} "ls -la ${path}"`, `SSH: ${path}`)
    } else {
      props.onOpenTerminal?.(`docker exec ${conn.target} ls -la ${path}`, `Docker: ${path}`)
    }
  }

  const commonPaths = createMemo(() => {
    const conn = remote.connection()
    return conn ? COMMON_PATHS[conn.type] : []
  })

  const typeColor = (type: string) => {
    if (type === "WSL") return "text-[#f97316]"
    if (type === "SSH") return "text-[#3b82f6]"
    return "text-[#8b5cf6]"
  }

  const remoteStatus = (type: RemoteType, target: string) => {
    const conn = remote.connection()
    if (conn?.type === type && conn.target === target) return STATUS_INFO[conn.status]
    return STATUS_INFO.idle
  }

  const flowStep = () => {
    const state = remote.connection()?.status ?? "idle"
    if (state === "connecting") return 1
    if (state === "connected") return CONNECTION_FLOW.length
    if (state === "error") return 0
    return 0
  }

  return (
    <div class="size-full flex flex-col bg-surface-base">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-base shrink-0" style={{ "min-height": "34px" }}>
        <span class="text-11-medium text-text-weaker uppercase tracking-wider">REMOTE EXPLORER</span>
        <div class="flex items-center gap-1">
          <Show when={isConnected()}>
            <Tooltip value="Open Remote Terminal" placement="bottom">
              <IconButton
                icon="terminal"
                variant="ghost"
                size="small"
                class="size-5"
                onClick={openTerminal}
                aria-label="Open Remote Terminal"
              />
            </Tooltip>
          </Show>
          <Tooltip value="Refresh" placement="bottom">
            <IconButton
              icon="reset"
              variant="ghost"
              size="small"
              class="size-5"
              aria-label="Refresh"
            />
          </Tooltip>
        </div>
      </div>

      <Show
        when={isConnected()}
        fallback={
          <div class="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
            <div class="w-12 h-12 rounded-full bg-surface-raised-base flex items-center justify-center">
              <Icon name="server" size="large" class="text-icon-weaker opacity-50" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-13-medium text-text-weak">Remote Connections</span>
              <span class="text-12-regular text-text-weaker">Connect to WSL, SSH, or Docker environments</span>
            </div>

            {/* Connection options */}
            <div class="w-full max-w-xs space-y-3">
              <For each={(["WSL", "SSH", "Container"] as RemoteType[])}>
                {(type) => {
                  const typeInfo = TYPE_INFO[type]
                  return (
                    <button
                      type="button"
                      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border-base hover:border-border-strong bg-surface-raised-base hover:bg-surface-raised-base-hover transition-all text-left group"
                      onClick={() => {
                        setSelectedRemoteType(type)
                        setConnectors(true)
                      }}
                    >
                      <span class={`text-14-medium font-mono ${typeInfo.color}`}>{typeInfo.icon}</span>
                      <div class="flex-1 min-w-0">
                        <div class="text-13-medium text-text-strong">{typeInfo.label}</div>
                        <div class="text-11-regular text-text-weaker">
                          {type === "WSL" ? "Windows Subsystem for Linux" :
                           type === "SSH" ? "Secure Shell Connection" :
                           "Docker Container Access"}
                        </div>
                      </div>
                      <Icon name="chevron-right" size="small" class="text-icon-weaker group-hover:text-text-weak transition-colors" />
                    </button>
                  )
                }}
              </For>

              <Show when={connectors()}>
                <div class="border border-border-base rounded-lg p-3 space-y-2 bg-surface-raised-base">
                  <div class="flex items-center justify-between">
                    <span class="text-12-medium text-text-strong">
                      Connect to {TYPE_INFO[selectedRemoteType()].label}
                    </span>
                    <IconButton
                      icon="close-small"
                      variant="ghost"
                      size="small"
                      class="size-4"
                      onClick={() => setConnectors(false)}
                    />
                  </div>
                  <QuickConnectButton type={selectedRemoteType()} onConnect={handleConnect} />
                </div>
              </Show>
            </div>

            <span class="text-11-regular text-text-weaker mt-1">
              Remote connections run through the integrated terminal
            </span>

            <Show when={remote.recent().length > 0}>
              <div class="w-full max-w-xs space-y-2 border border-border-base rounded-lg p-3 bg-surface-raised-base">
                <div class="flex items-center justify-between">
                  <span class="text-12-medium text-text-strong">Recent Connections</span>
                  <button
                    type="button"
                    class="text-11-regular text-text-weaker hover:text-text-strong"
                    onClick={() => {
                      for (const item of remote.recent()) {
                        remote.removeRecent(item)
                      }
                    }}
                  >
                    Clear
                  </button>
                </div>
                <div class="space-y-1">
                  <For each={remote.recent()}>
                    {(item) => (
                      <button
                        type="button"
                        class="group w-full flex items-center gap-2 px-2 py-1.5 text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-base rounded transition-colors text-left"
                        onClick={() => connectSaved(item)}
                      >
                        <span class={`shrink-0 font-mono ${TYPE_INFO[item.type].color}`}>{TYPE_INFO[item.type].icon}</span>
                        <span class="truncate flex-1">{item.type}: {item.target}</span>
                        <span class={`flex items-center gap-1 text-10-medium ${remoteStatus(item.type, item.target).className}`}>
                          <span class={`size-1.5 rounded-full ${remoteStatus(item.type, item.target).dotClassName}`} />
                          <span>{remoteStatus(item.type, item.target).label}</span>
                        </span>
                        <IconButton
                          icon="close"
                          variant="ghost"
                          size="small"
                          class="size-4 shrink-0 opacity-0 group-hover:opacity-100"
                          aria-label={`Forget ${item.type} ${item.target}`}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            removeRecentConnection(item)
                          }}
                        />
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>
        }
      >
        {/* Connected state */}
        <>
          <div class="px-3 py-2 border-b border-border-base shrink-0">
            <div class="text-11-medium text-text-weaker uppercase tracking-wider mb-2">Remote Commands</div>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                class="px-2 py-1.5 rounded bg-surface-raised-base text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors text-left"
                onClick={reconnect}
              >
                Reconnect
              </button>
              <button
                type="button"
                class="px-2 py-1.5 rounded bg-surface-raised-base text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors text-left"
                onClick={() => remote.connection() && handleDisconnect()}
              >
                Close Connection
              </button>
              <button
                type="button"
                class="px-2 py-1.5 rounded bg-surface-raised-base text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors text-left"
                onClick={() => remote.connection() && installServer(remote.connection()!.type, remote.connection()!.target)}
              >
                Install Server
              </button>
              <button
                type="button"
                class="px-2 py-1.5 rounded bg-surface-raised-base text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors text-left"
                onClick={() => remote.connection() && showLogs(remote.connection()!.type, remote.connection()!.target)}
              >
                Show Log
              </button>
            </div>
          </div>

          <div class="px-3 py-2 border-b border-border-base shrink-0">
            <div class="text-11-medium text-text-weaker uppercase tracking-wider mb-2">Remote File Ops</div>
            <div class="grid grid-cols-2 gap-1.5">
              <button type="button" class="px-2 py-1.5 rounded bg-surface-raised-base text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors text-left" onClick={() => remoteFileOperation("Create File")}>Create</button>
              <button type="button" class="px-2 py-1.5 rounded bg-surface-raised-base text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors text-left" onClick={() => remoteFileOperation("Rename File")}>Rename</button>
              <button type="button" class="px-2 py-1.5 rounded bg-surface-raised-base text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors text-left" onClick={() => remoteFileOperation("Delete File")}>Delete</button>
              <button type="button" class="px-2 py-1.5 rounded bg-surface-raised-base text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors text-left" onClick={() => remoteFileOperation("Move File")}>Move</button>
              <button type="button" class="px-2 py-1.5 rounded bg-surface-raised-base text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors text-left" onClick={() => remoteFileOperation("Copy File")}>Copy</button>
              <button type="button" class="px-2 py-1.5 rounded bg-surface-raised-base text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors text-left" onClick={() => remoteFileOperation("Drag Drop File")}>Drag &amp; Drop</button>
            </div>
          </div>

          <div class="px-3 py-2 border-b border-border-base shrink-0">
            <div class="text-11-medium text-text-weaker uppercase tracking-wider mb-2">Remote Logs</div>
            <div class="flex flex-wrap gap-1.5">
              <For each={remote.logStreams()}>
                {(stream) => (
                  <button
                    type="button"
                    class="px-2 py-1 rounded bg-surface-raised-base text-11-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors"
                    onClick={() => showLogs(remote.connection()!.type, `${remote.connection()!.target} • ${stream}`)}
                  >
                    {stream}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Connection badge */}
          <div class="px-3 py-2 border-b border-border-base shrink-0 flex items-center justify-between gap-2">
            <div class="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-raised-base border border-border-base/50 min-w-0">
              <span class={`text-14-medium font-mono shrink-0 ${typeColor(remote.connection()!.type)}`}>
                {TYPE_INFO[remote.connection()!.type].icon}
              </span>
              <div class="flex-1 min-w-0">
                <div class="text-12-medium text-text-strong truncate">
                  {remote.connection()!.type}: {remote.connection()!.target}
                </div>
                <div class="text-11-regular text-text-success-base flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-text-success-base inline-block" />
                  Connected
                  <Show when={remote.duration() > 0}>
                    <span class="text-text-weaker">· {remote.formatDuration(remote.duration())}</span>
                  </Show>
                </div>
              </div>
            </div>
            <Show when={props.onDisconnect}>
              <IconButton
                icon="close"
                variant="ghost"
                size="small"
                class="size-7 rounded hover:bg-surface-raised-base hover:text-text-danger-base transition-colors shrink-0"
                title="Disconnect"
                onClick={handleDisconnect}
              />
            </Show>
          </div>

          {/* Quick actions */}
          <div class="px-3 py-2 border-b border-border-base shrink-0">
            <div class="text-11-medium text-text-weaker uppercase tracking-wider mb-2">Quick Actions</div>
            <div class="space-y-1.5">
              <button
                type="button"
                class="w-full flex items-center gap-2 px-2 py-1.5 text-12-regular text-text-weak hover:text-text-strong bg-surface-raised-base rounded transition-colors"
                onClick={openTerminal}
              >
                <Icon name="terminal" size="small" class="shrink-0" />
                <span>Open Remote Terminal</span>
              </button>
              <Show when={remote.connection()!.type === "WSL"}>
                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-2 py-1.5 text-12-regular text-text-weak hover:text-text-strong bg-surface-raised-base rounded transition-colors"
                  onClick={() => props.onOpenTerminal?.(`wsl -d ${connection()!.target || "Ubuntu"} -- bash`, `WSL: ${connection()!.target || "Ubuntu"} (bash)`)}
                >
                  <Icon name="terminal" size="small" class="shrink-0" />
                  <span>Open Bash Shell</span>
                </button>
              </Show>
            </div>
          </div>

          {/* Common paths */}
          <div class="px-3 py-2 border-b border-border-base shrink-0">
            <div class="text-11-medium text-text-weaker uppercase tracking-wider mb-2">Common Paths</div>
            <div class="space-y-0.5">
              <For each={commonPaths()}>
                {(path) => (
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 px-2 py-1 text-12-regular text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover rounded transition-colors"
                    onClick={() => openPathInTerminal(path)}
                  >
                    <Icon name="folder" size="small" class="shrink-0 text-icon-weaker" />
                    <span class="truncate">{path}</span>
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="px-3 py-2 border-b border-border-base shrink-0">
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="text-11-medium text-text-weaker uppercase tracking-wider">Process Explorer</div>
              <button
                type="button"
                class="text-11-regular text-text-weaker hover:text-text-strong"
                onClick={() => openRemoteCommand("Refresh Processes", `remote-${connection()!.type.toLowerCase()} ps`)}
              >
                Refresh
              </button>
            </div>
            <div class="space-y-1">
              <For each={remote.processes()}>
                {(process) => (
                  <div class="flex items-center justify-between gap-2 rounded bg-surface-raised-base px-2 py-1.5">
                    <div class="min-w-0">
                      <div class="text-12-regular text-text-strong truncate">{process.name}</div>
                      <div class="text-11-regular text-text-weaker">PID {process.pid}</div>
                    </div>
                    <button
                      type="button"
                      class="text-11-regular text-text-weak hover:text-text-strong"
                      onClick={() => openProcessAction(process.pid, process.action)}
                    >
                      {process.action}
                    </button>
                  </div>
                )}
              </For>
            </div>
          </div>

          <div class="px-3 py-2 border-b border-border-base shrink-0">
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="text-11-medium text-text-weaker uppercase tracking-wider">Remote Settings</div>
              <div class="flex items-center gap-1">
                <For each={SETTINGS_SCOPES}>
                  {(scope) => (
                    <button
                      type="button"
                      class={`px-2 py-1 rounded text-11-regular transition-colors ${
                        settingsScope() === scope
                          ? "bg-accent-base text-white"
                          : "bg-surface-raised-base text-text-weak hover:text-text-strong"
                      }`}
                      onClick={() => setSettingsScope(scope)}
                    >
                      {scope}
                    </button>
                  )}
                </For>
              </div>
            </div>
            <div class="rounded bg-surface-raised-base px-2 py-2 text-11-regular text-text-weak">
              {settingsScope() === "User" && "User settings are shared across all workspaces and remote targets."}
              {settingsScope() === "Workspace" && "Workspace settings are stored with the current project and can be synced remotely."}
              {settingsScope() === "Remote" && "Remote settings are stored on the connected host and apply only to that environment."}
            </div>
          </div>

          <div class="px-3 py-2 border-b border-border-base shrink-0">
            <div class="text-11-medium text-text-weaker uppercase tracking-wider mb-2">Connection Flow</div>
            <div class="space-y-1">
              <For each={CONNECTION_FLOW}>
                {(step, index) => (
                  <div class="flex items-center gap-2 rounded bg-surface-raised-base px-2 py-1.5">
                    <span
                      class={`size-2 rounded-full ${
                        index() < flowStep()
                          ? "bg-text-success-base"
                          : index() === flowStep()
                            ? "bg-text-warning-base"
                            : "bg-text-weaker"
                      }`}
                    />
                    <span class="text-11-regular text-text-weak">{step}</span>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Tree */}
          <div class="flex-1 overflow-y-auto px-3 py-3">
            <div class="text-11-medium text-text-weaker uppercase tracking-wider mb-2">Remote Tree</div>
            <div class="space-y-3">
              <For each={remote.sections()}>
                {(section) => (
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="text-11-medium text-text-weaker uppercase tracking-wider">{section.title}</span>
                      <button
                        type="button"
                        class="text-11-regular text-text-weaker hover:text-text-strong"
                        onClick={() => setSelectedRemoteType(section.type)}
                      >
                        New
                      </button>
                    </div>
                    <div class="space-y-0.5">
                      <For each={section.items}>
                        {(item) => (
                          <div class="group flex items-center gap-1 rounded bg-surface-raised-base px-2 py-1.5">
                            <DropdownMenu>
                              <DropdownMenu.Trigger as="button" class="flex min-w-0 flex-1 items-center gap-2 text-left text-12-regular text-text-weak hover:text-text-strong transition-colors">
                                <Icon name="folder" size="small" class="shrink-0 text-icon-weaker" />
                                <span class="truncate">{item}</span>
                              </DropdownMenu.Trigger>
                              <span class={`flex items-center gap-1 text-10-medium ${remoteStatus(section.type, item).className}`}>
                                <span class={`size-1.5 rounded-full ${remoteStatus(section.type, item).dotClassName}`} />
                                <span>{remoteStatus(section.type, item).label}</span>
                              </span>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content class="min-w-56">
                                  <DropdownMenu.Item onSelect={() => handleConnect(section.type, item)}>
                                    <DropdownMenu.ItemLabel>Connect</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onSelect={() => openFolder(section.type, item)}>
                                    <DropdownMenu.ItemLabel>Open Folder</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onSelect={() => handleConnect(section.type, item)}>
                                    <DropdownMenu.ItemLabel>Open in New Window</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item
                                    onSelect={() => {
                                      if (connection()?.type === section.type && connection()?.target === item) {
                                        handleDisconnect()
                                      }
                                    }}
                                  >
                                    <DropdownMenu.ItemLabel>Disconnect</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onSelect={() => renameConnection(section.type, item)}>
                                    <DropdownMenu.ItemLabel>Rename</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onSelect={() => editRemoteConfig(section.type, item)}>
                                    <DropdownMenu.ItemLabel>Edit SSH Config</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onSelect={() => showLogs(section.type, item)}>
                                    <DropdownMenu.ItemLabel>Show Logs</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onSelect={() => installServer(section.type, item)}>
                                    <DropdownMenu.ItemLabel>Install Server</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onSelect={() => killServer(section.type, item)}>
                                    <DropdownMenu.ItemLabel>Kill Server</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onSelect={() => forwardPort(section.type, item)}>
                                    <DropdownMenu.ItemLabel>Forward Port</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onSelect={() => openRemoteCommand(`Open ${item} in Browser`, `open http://${item}`)}>
                                    <DropdownMenu.ItemLabel>Open in Browser</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onSelect={() => copyHost(item)}>
                                    <DropdownMenu.ItemLabel>Copy Host</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onSelect={() => removeRecentConnection({ type: section.type, target: item })}>
                                    <DropdownMenu.ItemLabel>Delete</DropdownMenu.ItemLabel>
                                  </DropdownMenu.Item>
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu>
                            <Tooltip value="Open terminal" placement="left">
                              <IconButton
                                icon="terminal"
                                variant="ghost"
                                size="small"
                                class="size-5 opacity-0 group-hover:opacity-100"
                                onClick={() => handleConnect(section.type, item)}
                              />
                            </Tooltip>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>

          <Show when={remote.logTarget() || remote.forwardTarget()}>
            <div class="px-3 py-2 border-t border-border-base text-11-regular text-text-weaker">
              <div class="flex items-center justify-between gap-2">
                <span class="truncate">
                  {remote.logTarget() ? `Logs: ${remote.logTarget()}` : `Port forwarding: ${remote.forwardTarget()}`}
                </span>
                <button
                  type="button"
                  class="text-text-weak hover:text-text-strong"
                  onClick={() => {
                    remote.setLogTarget(null)
                    remote.setForwardTarget(null)
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </Show>
        </>
      </Show>
    </div>
  )
}
