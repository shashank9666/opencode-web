import { createEffect, createSignal, onCleanup } from "solid-js"
import { createSimpleContext } from "@opencode-ai/ui/context"

export type RemoteType = "WSL" | "SSH" | "Container"

export interface RemoteConnection {
  type: RemoteType
  target: string
  status: "idle" | "connecting" | "connected" | "error"
  error?: string
  connectedAt?: number
}

export type SavedRemoteConnection = {
  type: RemoteType
  target: string
}

export type RemoteSection = {
  id: string
  title: string
  type: RemoteType
  items: string[]
}

export type RemoteProcess = {
  pid: number
  name: string
  action: "Kill" | "Inspect"
}

const RECENT_CONNECTIONS_KEY = "opencode-remote-recent-connections"
const SSH_HOSTS_KEY = "opencode-remote-ssh-hosts"
const WSL_DISTROS_KEY = "opencode-remote-wsl-distros"
const CONTAINERS_KEY = "opencode-remote-containers"

function loadJSON<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

async function discoverSSHHosts(): Promise<string[]> {
  return loadJSON<string[]>(SSH_HOSTS_KEY) ?? ["user@localhost", "dev@server.local", "build@10.0.0.12"]
}

async function discoverWSLDistros(): Promise<string[]> {
  return loadJSON<string[]>(WSL_DISTROS_KEY) ?? ["Ubuntu", "Debian"]
}

async function discoverContainers(): Promise<string[]> {
  return loadJSON<string[]>(CONTAINERS_KEY) ?? ["node-app-dev", "rust-dev-container"]
}

const SAMPLE_PROCESSES: RemoteProcess[] = [
  { pid: 1342, name: "remote-agent", action: "Kill" },
  { pid: 2104, name: "extension-host", action: "Inspect" },
  { pid: 3880, name: "git", action: "Inspect" },
]

async function listRemoteProcesses(_type: RemoteType, _target: string): Promise<RemoteProcess[]> {
  return SAMPLE_PROCESSES
}

const DEFAULT_LOG_STREAMS = ["Connection", "SSH", "Extension Host", "Server", "Terminal", "Git"]

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const remM = m % 60
  return `${h}h ${remM}m`
}

export const { use: useRemote, provider: RemoteProvider } = createSimpleContext({
  name: "Remote",
  gate: false,
  init: () => {
    const [connection, setConnection] = createSignal<RemoteConnection | null>(null)
    const [recent, setRecent] = createSignal<SavedRemoteConnection[]>(loadJSON<SavedRemoteConnection[]>(RECENT_CONNECTIONS_KEY) ?? [])
    const [sections, setSections] = createSignal<RemoteSection[]>([])
    const [processes, setProcesses] = createSignal<RemoteProcess[]>([])
    const [logStreams, setLogStreams] = createSignal<string[]>(DEFAULT_LOG_STREAMS)
    const [duration, setDuration] = createSignal(0)
    const [logTarget, setLogTarget] = createSignal<string | null>(null)
    const [forwardTarget, setForwardTarget] = createSignal<string | null>(null)

    let durationInterval: ReturnType<typeof setInterval> | undefined

    const stopDurationTimer = () => {
      if (durationInterval !== undefined) {
        clearInterval(durationInterval)
        durationInterval = undefined
      }
    }

    const startDurationTimer = () => {
      stopDurationTimer()
      durationInterval = setInterval(() => {
        const conn = connection()
        if (conn?.status === "connected" && conn.connectedAt) {
          setDuration(Math.floor((Date.now() - conn.connectedAt) / 1000))
        }
      }, 1000)
    }

    onCleanup(stopDurationTimer)

    const persistRecent = (items: SavedRemoteConnection[]) => {
      saveJSON(RECENT_CONNECTIONS_KEY, items)
    }

    const connect = async (type: RemoteType, target: string) => {
      setConnection({ type, target, status: "connecting" })
      setDuration(0)

      saveRecent(type, target)

      await new Promise((resolve) => setTimeout(resolve, 800))

      setConnection({ type, target, status: "connected", connectedAt: Date.now() })
      startDurationTimer()
      void refreshSections(type)
    }

    const disconnect = () => {
      stopDurationTimer()
      setDuration(0)
      setConnection(null)
      setProcesses([])
    }

    const reconnect = () => {
      const conn = connection()
      if (!conn) return
      void connect(conn.type, conn.target)
    }

    const listRecent = () => recent()

    const saveRecent = (type: RemoteType, target: string) => {
      setRecent((prev) => {
        const next = [{ type, target }, ...prev.filter((item) => item.type !== type || item.target !== target)]
        persistRecent(next)
        return next
      })
    }

    const removeRecent = (item: SavedRemoteConnection) => {
      setRecent((prev) => {
        const next = prev.filter((entry) => entry.type !== item.type || entry.target !== item.target)
        persistRecent(next)
        return next
      })
    }

    const refreshSections = async (type?: RemoteType) => {
      const parts: RemoteSection[] = []

      if (!type || type === "SSH") {
        parts.push({ id: "ssh", title: "SSH Targets", type: "SSH", items: await discoverSSHHosts() })
      }
      if (!type || type === "WSL") {
        parts.push({ id: "wsl", title: "WSL Distros", type: "WSL", items: await discoverWSLDistros() })
      }
      if (!type || type === "Container") {
        parts.push({ id: "container", title: "Dev Containers", type: "Container", items: await discoverContainers() })
      }

      parts.push({ id: "tunnels", title: "Tunnels", type: "SSH", items: ["localhost:3000", "localhost:4173"] })

      setSections(parts)
    }

    const refreshProcesses = async () => {
      const conn = connection()
      if (conn && conn.status === "connected") {
        setProcesses(await listRemoteProcesses(conn.type, conn.target))
      }
    }

    const addSSHHost = (host: string) => {
      const current = loadJSON<string[]>(SSH_HOSTS_KEY) ?? []
      if (!current.includes(host)) {
        saveJSON(SSH_HOSTS_KEY, [...current, host])
      }
    }

    const addWSLDistro = (distro: string) => {
      const current = loadJSON<string[]>(WSL_DISTROS_KEY) ?? []
      if (!current.includes(distro)) {
        saveJSON(WSL_DISTROS_KEY, [...current, distro])
      }
    }

    const addContainer = (container: string) => {
      const current = loadJSON<string[]>(CONTAINERS_KEY) ?? []
      if (!current.includes(container)) {
        saveJSON(CONTAINERS_KEY, [...current, container])
      }
    }

    void refreshSections()

    return {
      connection,
      recent,
      sections,
      processes,
      logStreams,
      duration,
      logTarget,
      forwardTarget,
      setLogTarget,
      setForwardTarget,
      connect,
      disconnect,
      reconnect,
      listRecent,
      saveRecent,
      removeRecent,
      refreshSections,
      refreshProcesses,
      addSSHHost,
      addWSLDistro,
      addContainer,
      formatDuration,
    }
  },
})
