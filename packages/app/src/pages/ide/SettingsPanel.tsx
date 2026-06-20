import { For, Show, createSignal } from "solid-js"
import { Button } from "@opencode-ai/ui/button"

export type SettingsTab = "general" | "editor" | "theme" | "keybinds" | "config"

export default function SettingsPanel(props: {
  fontSize: number
  setFontSize: (v: number) => void
  tabSize: number
  setTabSize: (v: number) => void
  wordWrap: string
  setWordWrap: (v: string) => void
  theme: string
  setTheme: (v: string) => void
  minimap: boolean
  setMinimap: (v: boolean) => void
  wordWrapCol: number
  setWordWrapCol: (v: number) => void
  onCloseKeybindings: () => void
  onOpenConfig?: () => void
}) {
  const [tab, setTab] = createSignal<SettingsTab>("general")

  return (
    <div class="flex-1 min-h-0 flex flex-col">
      {/* Tabs */}
      <div class="flex items-center gap-0 border-b border-border-base px-2 shrink-0">
        {(["general", "editor", "theme", "keybinds", "config"] as SettingsTab[]).map((t) => (
          <button
            class="px-3 py-2 text-13-regular transition-colors border-b-2"
            classList={{
              "border-b-accent-base text-text-strong": tab() === t,
              "border-b-transparent text-text-weak hover:text-text-strong": tab() !== t,
            }}
            onClick={() => setTab(t)}
          >
            {t === "general" ? "General" : t === "editor" ? "Editor" : t === "theme" ? "Theme" : t === "keybinds" ? "Keybinds" : "Config"}
          </button>
        ))}
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <Show when={tab() === "general"}>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-13-regular text-text-strong">Save files automatically</label>
              <input type="checkbox" checked class="accent-accent-base" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-13-regular text-text-strong">Confirm before closing with dirty files</label>
              <input type="checkbox" checked class="accent-accent-base" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-13-regular text-text-strong">Enable Telemetry</label>
              <input type="checkbox" checked class="accent-accent-base" />
            </div>
          </div>
        </Show>

        <Show when={tab() === "editor"}>
          <div class="flex flex-col gap-5">
            <div class="flex flex-col gap-1.5">
              <label class="text-13-regular text-text-strong">Font Size: {props.fontSize}px</label>
              <input type="range" min="8" max="24" value={props.fontSize} onInput={(e) => props.setFontSize(Number(e.currentTarget.value))} class="w-full" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-13-regular text-text-strong">Tab Size: {props.tabSize}</label>
              <div class="flex items-center gap-2">
                <button class={`px-3 py-1 rounded border ${props.tabSize === 2 ? "bg-accent-base text-white border-accent-base" : "border-border-base hover:bg-surface-raised-base-hover"}`} onClick={() => props.setTabSize(2)}>2</button>
                <button class={`px-3 py-1 rounded border ${props.tabSize === 4 ? "bg-accent-base text-white border-accent-base" : "border-border-base hover:bg-surface-raised-base-hover"}`} onClick={() => props.setTabSize(4)}>4</button>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-13-regular text-text-strong">Word Wrap</label>
              <select class="px-3 py-1.5 bg-surface-base border border-border-base rounded-md text-13-regular text-text-strong" value={props.wordWrap} onChange={(e) => props.setWordWrap(e.currentTarget.value)}>
                <option value="off">Off</option>
                <option value="on">On</option>
                <option value="wordWrapColumn">At Column</option>
                <option value="bounded">Bounded</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-13-regular text-text-strong">Word Wrap Column: {props.wordWrapCol}</label>
              <input type="range" min="40" max="200" value={props.wordWrapCol} onInput={(e) => props.setWordWrapCol(Number(e.currentTarget.value))} class="w-full" />
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="minimap" checked={props.minimap} onChange={(e) => props.setMinimap(e.currentTarget.checked)} class="accent-accent-base" />
              <label for="minimap" class="text-13-regular text-text-strong">Show Minimap</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" checked class="accent-accent-base" />
              <label class="text-13-regular text-text-strong">Enable Breadcrumbs</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" checked class="accent-accent-base" />
              <label class="text-13-regular text-text-strong">Enable Sticky Scroll</label>
            </div>
          </div>
        </Show>

        <Show when={tab() === "theme"}>
          <div class="flex flex-col gap-3">
            <For each={["vs-dark", "vs-light", "hc-black"]}>{(t) => (
              <button
                class={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${props.theme === t ? "border-accent-base bg-surface-raised-base-hover" : "border-border-base hover:border-accent-base/50"}`}
                onClick={() => props.setTheme(t)}
              >
                <div class={`w-8 h-8 rounded ${t === "vs-dark" ? "bg-[#1e1e1e]" : t === "vs-light" ? "bg-white" : "bg-black"}`} />
                <span class="text-13-regular text-text-strong">{t === "vs-dark" ? "Dark" : t === "vs-light" ? "Light" : "High Contrast"}</span>
              </button>
            )}</For>
          </div>
        </Show>

        <Show when={tab() === "keybinds"}>
          <div class="text-13-regular text-text-weak">
            Use <button class="text-accent-base underline" onClick={props.onCloseKeybindings}>Keyboard Shortcuts editor</button> for full customization.
          </div>
        </Show>

        <Show when={tab() === "config"}>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <h3 class="text-14-medium text-text-strong">Project Configuration</h3>
              <p class="text-12-regular text-text-weak">
                Edit <code class="px-1 py-0.5 bg-surface-base rounded text-11-medium">opencode.jsonc</code> to configure your project settings, plugins, MCP servers, and more.
              </p>
            </div>
            <Button
              variant="primary"
              size="normal"
              onClick={() => props.onOpenConfig?.()}
            >
              Open opencode.jsonc
            </Button>
            <div class="text-12-regular text-text-weak mt-2">
              <p>You can also configure via the Settings dialog (File &rarr; Preferences &rarr; Settings).</p>
              <p class="mt-1">See <a class="text-accent-base underline" href="https://opencode.ai/docs/config/" target="_blank" rel="noopener noreferrer">online documentation</a> for all available options.</p>
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}