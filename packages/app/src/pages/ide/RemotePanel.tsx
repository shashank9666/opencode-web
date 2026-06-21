import { For, Show, createSignal } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"

type RemoteConnection = {
  type: "WSL" | "SSH" | "Container"
  target: string
} | null

type FileEntry = {
  name: string
  type: "file" | "directory"
  size?: string
  modified?: string
  children?: FileEntry[]
  expanded?: boolean
}

// Mock directory structure for WSL/SSH/Container after connecting
const MOCK_ROOTS: Record<string, FileEntry[]> = {
  WSL: [
    {
      name: "home", type: "directory", children: [
        {
          name: "ubuntu", type: "directory", children: [
            { name: "projects", type: "directory", children: [
              { name: "web-app", type: "directory", children: [
                { name: "src", type: "directory", children: [
                  { name: "index.ts", type: "file", size: "2.1 KB" },
                  { name: "app.ts", type: "file", size: "5.3 KB" },
                ]},
                { name: "package.json", type: "file", size: "1.2 KB" },
                { name: "README.md", type: "file", size: "3.0 KB" },
              ]},
              { name: "api-server", type: "directory", children: [
                { name: "main.go", type: "file", size: "4.1 KB" },
                { name: "go.mod", type: "file", size: "0.8 KB" },
              ]},
            ]},
            { name: ".bashrc", type: "file", size: "3.5 KB" },
            { name: ".profile", type: "file", size: "0.6 KB" },
          ]
        }
      ]
    },
    {
      name: "etc", type: "directory", children: [
        { name: "hosts", type: "file", size: "0.2 KB" },
        { name: "fstab", type: "file", size: "0.4 KB" },
        { name: "environment", type: "file", size: "0.1 KB" },
      ]
    },
    { name: "var", type: "directory", children: [
      { name: "log", type: "directory", children: [
        { name: "syslog", type: "file", size: "12 MB" },
        { name: "auth.log", type: "file", size: "2.3 MB" },
      ]},
    ]},
    { name: "tmp", type: "directory", children: [] },
  ],
  SSH: [
    { name: "home", type: "directory", children: [
      { name: "ubuntu", type: "directory", children: [
        { name: "app", type: "directory", children: [
          { name: "server.py", type: "file", size: "8.2 KB" },
          { name: "requirements.txt", type: "file", size: "0.4 KB" },
          { name: "Dockerfile", type: "file", size: "1.1 KB" },
        ]},
        { name: ".ssh", type: "directory", children: [
          { name: "authorized_keys", type: "file", size: "0.6 KB" },
        ]},
      ]},
    ]},
    { name: "var", type: "directory", children: [
      { name: "www", type: "directory", children: [
        { name: "html", type: "directory", children: [
          { name: "index.html", type: "file", size: "0.8 KB" },
        ]},
      ]},
    ]},
  ],
  Container: [
    { name: "app", type: "directory", children: [
      { name: "src", type: "directory", children: [
        { name: "main.ts", type: "file", size: "3.2 KB" },
        { name: "config.ts", type: "file", size: "1.8 KB" },
      ]},
      { name: "dist", type: "directory", children: [
        { name: "bundle.js", type: "file", size: "120 KB" },
      ]},
      { name: "Dockerfile", type: "file", size: "1.2 KB" },
      { name: "docker-compose.yml", type: "file", size: "2.1 KB" },
    ]},
    { name: "etc", type: "directory", children: [
      { name: "nginx", type: "directory", children: [
        { name: "nginx.conf", type: "file", size: "2.4 KB" },
      ]},
    ]},
  ],
}

function FileIcon(props: { type: "file" | "directory"; name: string; expanded?: boolean }) {
  if (props.type === "directory") {
    return (
      <Icon
        name="folder"
        size="small"
        class={`shrink-0 ${props.expanded ? "text-[#f9c74f]" : "text-[#e8b55b]"}`}
      />
    )
  }
  const ext = props.name.split(".").pop() ?? ""
  const iconName = ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx" ? "open-file"
    : ext === "json" ? "open-file"
    : ext === "md" ? "open-file"
    : ext === "py" ? "open-file"
    : ext === "go" ? "open-file"
    : ext === "sh" || ext === "bash" ? "open-file"
    : "open-file"
  return <Icon name={iconName} size="small" class="shrink-0 text-icon-weak" />
}

function FileTreeNode(props: {
  entry: FileEntry
  depth: number
  onFileClick?: (path: string) => void
  buildPath: (name: string) => string
}) {
  const [expanded, setExpanded] = createSignal(false)
  const path = () => props.buildPath(props.entry.name)

  return (
    <div>
      <div
        class="flex items-center gap-1 py-0.5 hover:bg-surface-raised-base-hover cursor-pointer transition-colors rounded-sm group"
        style={{ "padding-left": `${props.depth * 12 + 8}px` }}
        onClick={() => {
          if (props.entry.type === "directory") {
            setExpanded(v => !v)
          } else {
            props.onFileClick?.(path())
          }
        }}
      >
        <Show when={props.entry.type === "directory"}>
          <Icon
            name={expanded() ? "chevron-down" : "chevron-right"}
            size="small"
            class="text-icon-weaker shrink-0 w-3"
          />
        </Show>
        <Show when={props.entry.type === "file"}>
          <span class="w-3 shrink-0" />
        </Show>
        <FileIcon type={props.entry.type} name={props.entry.name} expanded={expanded()} />
        <span class="text-12-regular truncate flex-1" classList={{
          "text-text-strong": props.entry.type === "file",
          "text-text-weak": props.entry.type === "directory",
        }}>
          {props.entry.name}
        </span>
        <Show when={props.entry.size && props.entry.type === "file"}>
          <span class="text-11-regular text-text-weaker shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
            {props.entry.size}
          </span>
        </Show>
      </div>
      <Show when={expanded() && props.entry.children && props.entry.children.length > 0}>
        <For each={props.entry.children}>
          {(child) => (
            <FileTreeNode
              entry={child}
              depth={props.depth + 1}
              onFileClick={props.onFileClick}
              buildPath={(name) => `${path()}/${name}`}
            />
          )}
        </For>
      </Show>
      <Show when={expanded() && props.entry.type === "directory" && (!props.entry.children || props.entry.children.length === 0)}>
        <div class="text-11-regular text-text-weaker py-1" style={{ "padding-left": `${(props.depth + 1) * 12 + 8}px` }}>
          Empty directory
        </div>
      </Show>
    </div>
  )
}

export default function RemotePanel(props: {
  connection?: string | null
  onFileClick?: (path: string) => void
}) {
  const [currentPath, setCurrentPath] = createSignal("/")

  const connectionInfo = () => {
    const conn = props.connection
    if (!conn) return null
    const str = typeof conn === "string" ? conn : String(conn)
    const parts = str.split(": ")
    const type = (parts[0] ?? "WSL") as "WSL" | "SSH" | "Container"
    const target = parts[1] ?? ""
    return { type, target }
  }

  const fileTree = () => {
    const info = connectionInfo()
    if (!info) return []
    return MOCK_ROOTS[info.type] ?? []
  }

  const typeColor = (type: string) => {
    if (type === "WSL") return "text-[#f97316]"
    if (type === "SSH") return "text-[#3b82f6]"
    return "text-[#8b5cf6]"
  }

  const typeIcon = (type: string) => {
    if (type === "WSL") return ">"
    if (type === "SSH") return "⚡"
    return "◈"
  }

  return (
    <div class="size-full flex flex-col bg-surface-base">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-base shrink-0" style={{ "min-height": "34px" }}>
        <span class="text-11-medium text-text-weaker uppercase tracking-wider">REMOTE EXPLORER</span>
        <Show when={connectionInfo()}>
          <IconButton icon="reset" variant="ghost" size="small" class="size-5" aria-label="Refresh" />
        </Show>
      </div>

      <Show
        when={connectionInfo()}
        fallback={
          <div class="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
            <div class="w-12 h-12 rounded-full bg-surface-raised-base flex items-center justify-center">
              <Icon name="server" size="large" class="text-icon-weaker opacity-50" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-13-medium text-text-weak">No Remote Connection</span>
              <span class="text-12-regular text-text-weaker">Connect to a remote via the activity bar remote button</span>
            </div>
          </div>
        }
      >
        {(info) => (
          <>
            {/* Connection badge */}
            <div class="px-3 py-2 border-b border-border-base shrink-0">
              <div class="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-raised-base border border-border-base/50">
                <span class={`text-14-medium font-mono shrink-0 ${typeColor(info().type)}`}>
                  {typeIcon(info().type)}
                </span>
                <div class="flex-1 min-w-0">
                  <div class="text-12-medium text-text-strong truncate">{info().type}: {info().target}</div>
                  <div class="text-11-regular text-text-success-base flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-text-success-base inline-block" />
                    Connected
                  </div>
                </div>
              </div>
            </div>

            {/* Current path breadcrumb */}
            <div class="flex items-center gap-1 px-3 py-1 border-b border-border-base shrink-0 overflow-x-auto">
              <button
                class="text-11-regular text-accent-base hover:underline shrink-0"
                onClick={() => setCurrentPath("/")}
              >
                /
              </button>
              <For each={currentPath().split("/").filter(Boolean)}>
                {(segment, i) => (
                  <>
                    <span class="text-11-regular text-text-weaker">/</span>
                    <button class="text-11-regular text-accent-base hover:underline shrink-0 truncate max-w-24">
                      {segment}
                    </button>
                  </>
                )}
              </For>
            </div>

            {/* File tree */}
            <div class="flex-1 overflow-y-auto py-1">
              <For each={fileTree()}>
                {(entry) => (
                  <FileTreeNode
                    entry={entry}
                    depth={0}
                    onFileClick={props.onFileClick}
                    buildPath={(name) => `/${name}`}
                  />
                )}
              </For>
            </div>
          </>
        )}
      </Show>
    </div>
  )
}