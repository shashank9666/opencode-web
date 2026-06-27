import { For } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"

export interface BrowserEmptyStateProps {
  onNavigate: (url: string) => void
  recentUrls: string[]
}

const QUICK_CONNECT = [
  { port: 3000, label: "React / Next.js", icon: "react" },
  { port: 5173, label: "Vite", icon: "vite" },
  { port: 8080, label: "Vue", icon: "vue" },
  { port: 4200, label: "Angular", icon: "angular" },
  { port: 8000, label: "Django / Python", icon: "python" },
]

export function BrowserEmptyState(props: BrowserEmptyStateProps) {
  let inputRef!: HTMLInputElement

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (inputRef.value.trim()) {
      props.onNavigate(inputRef.value.trim())
    }
  }

  return (
    <div class="flex-1 w-full h-full bg-[#1e1e1e] flex flex-col items-center pt-24 px-6 overflow-y-auto">
      <div class="flex flex-col items-center gap-4 mb-8">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#00C6FF] flex items-center justify-center shadow-lg">
          <Icon name="browser" size="large" class="text-white drop-shadow-md" />
        </div>
        <h1 class="text-24-medium text-[#cccccc]">Browser Preview</h1>
      </div>

      <form onSubmit={handleSubmit} class="w-full max-w-xl mb-12 relative group">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon name="search" class="text-[#8a8a8a] size-5 group-focus-within:text-[#007AFF] transition-colors" />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search or enter URL"
          class="w-full bg-[#252526] border border-[#3c3c3c] rounded-full py-3.5 pl-12 pr-6 text-14-regular text-[#cccccc] placeholder:text-[#8a8a8a] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all shadow-sm"
        />
      </form>

      <div class="w-full max-w-xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent */}
        <div class="flex flex-col gap-3">
          <h2 class="text-12-medium text-[#8a8a8a] uppercase tracking-wider">Recent</h2>
          <div class="flex flex-col gap-1">
            {props.recentUrls.length === 0 ? (
              <div class="text-13-regular text-[#8a8a8a] italic py-2">No recent pages</div>
            ) : (
              <For each={props.recentUrls.slice(0, 5)}>
                {(url) => (
                  <button
                    class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#2a2d2e] transition-colors text-left group"
                    onClick={() => props.onNavigate(url)}
                  >
                    <Icon name="history" class="text-[#8a8a8a] group-hover:text-[#cccccc] size-4" />
                    <span class="text-13-regular text-[#cccccc] truncate">{url}</span>
                  </button>
                )}
              </For>
            )}
          </div>
        </div>

        {/* Quick Connect */}
        <div class="flex flex-col gap-3">
          <h2 class="text-12-medium text-[#8a8a8a] uppercase tracking-wider">Quick Connect</h2>
          <div class="grid grid-cols-1 gap-2">
            <For each={QUICK_CONNECT}>
              {(item) => (
                <button
                  class="flex items-center gap-3 px-3 py-2 rounded-lg border border-[#3c3c3c] bg-[#252526] hover:bg-[#2a2d2e] hover:border-[#4c4c4c] transition-all text-left group"
                  onClick={() => props.onNavigate(String(item.port))}
                >
                  <div class="w-8 h-8 rounded bg-[#1e1e1e] border border-[#3c3c3c] flex items-center justify-center group-hover:border-[#007AFF] transition-colors">
                    {/* Placeholder icon since we might not have all specific icons */}
                    <Icon name="server" class="text-[#8a8a8a] group-hover:text-[#007AFF] size-4" />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-13-medium text-[#cccccc]">{item.label}</span>
                    <span class="text-11-regular text-[#8a8a8a] font-mono">localhost:{item.port}</span>
                  </div>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  )
}
