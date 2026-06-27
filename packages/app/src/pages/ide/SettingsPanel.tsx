import { For, Show, createSignal, createMemo } from "solid-js"
import { Button } from "@opencode-ai/ui/button"
import { useTheme } from "@opencode-ai/ui/theme/context"
import { useSettings } from "@/context/settings"
import { useServerSync } from "@/context/server-sync"

export type SettingsTab = "general" | "editor" | "theme" | "keybinds" | "config"

const SCHEME_LABELS: Record<string, string> = { light: "Light", dark: "Dark", system: "System" }

export default function SettingsPanel(props: {
  fontSize: number
  setFontSize: (v: number) => void
  tabSize: number
  setTabSize: (v: number) => void
  wordWrap: string
  setWordWrap: (v: string) => void
  monacoTheme: string
  setMonacoTheme: (v: string) => void
  minimap: boolean
  setMinimap: (v: boolean) => void
  wordWrapCol: number
  setWordWrapCol: (v: number) => void
  onCloseKeybindings: () => void
  onOpenConfig?: () => void
}) {
  const theme = useTheme()
  const settings = useSettings()
  const serverSync = useServerSync()
  const config = createMemo(() => serverSync().data.config)
  const [tab, setTab] = createSignal<SettingsTab>("general")

  const themeList = createMemo(() =>
    Object.entries(theme.themes()).map(([id, t]) => ({ id, name: t.name }))
  )

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
            <div class="flex items-center gap-2">
              <input type="checkbox" id="colorfulIcons" checked={settings.appearance.colorfulIcons()} onChange={(e) => settings.appearance.setColorfulIcons(e.currentTarget.checked)} class="accent-accent-base" />
              <label for="colorfulIcons" class="text-13-regular text-text-strong">Colorful File Icons</label>
            </div>
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
          <div class="flex flex-col gap-4">
            {/* Color scheme */}
            <div>
              <label class="text-12-medium text-text-weaker uppercase tracking-wider block mb-2">Color Scheme</label>
              <div class="flex items-center gap-2">
                {(["light", "dark", "system"] as const).map((s) => (
                  <button
                    class={`flex-1 px-3 py-1.5 rounded-lg border text-13-regular transition-colors ${theme.colorScheme() === s ? "border-accent-base bg-surface-raised-base-hover text-text-strong" : "border-border-base text-text-weak hover:text-text-strong hover:border-accent-base/50"}`}
                    onClick={() => theme.setColorScheme(s)}
                  >
                    {SCHEME_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* App themes */}
            <div>
              <label class="text-12-medium text-text-weaker uppercase tracking-wider block mb-2">App Theme</label>
              <div class="grid grid-cols-3 gap-2">
                <For each={themeList()}>
                  {(t) => (
                    <button
                      class={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-colors ${theme.themeId() === t.id ? "border-accent-base bg-surface-raised-base-hover" : "border-border-base hover:border-accent-base/50"}`}
                      onClick={() => theme.setTheme(t.id)}
                    >
                      <div class="w-full h-10 rounded bg-surface-base flex items-center justify-center overflow-hidden border border-border-base">
                        <div class="flex gap-px w-full h-full">
                          <div class="flex-1 bg-[var(--v2-background-bg-deep,var(--background-base))]" />
                          <div class="flex-1 bg-[var(--v2-background-bg,var(--surface-base))]" />
                        </div>
                      </div>
                      <span class="text-11-regular text-text-strong truncate w-full text-center">{t.name}</span>
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Monaco editor theme */}
            <div class="pt-2 border-t border-border-base">
              <label class="text-12-medium text-text-weaker uppercase tracking-wider block mb-2">Editor Theme</label>
              <div class="flex items-center gap-2">
                {(["vs-dark", "vs-light", "hc-black"] as const).map((t) => (
                  <button
                    class={`flex-1 px-3 py-1.5 rounded-lg border text-13-regular transition-colors ${props.monacoTheme === t ? "border-accent-base bg-surface-raised-base-hover text-text-strong" : "border-border-base text-text-weak hover:text-text-strong hover:border-accent-base/50"}`}
                    onClick={() => props.setMonacoTheme(t)}
                  >
                    {t === "vs-dark" ? "Dark" : t === "vs-light" ? "Light" : "High Contrast"}
                  </button>
                ))}
              </div>
            </div>

            {/* Glassmorphism & Wallpaper */}
            <div class="pt-2 border-t border-border-base flex flex-col gap-4">
              <label class="text-12-medium text-text-weaker uppercase tracking-wider block">Appearance & Background</label>
              
              <div class="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="glassmorphism" 
                  checked={settings.appearance.glassmorphism()} 
                  onChange={(e) => settings.appearance.setGlassmorphism(e.currentTarget.checked)} 
                  class="accent-accent-base" 
                />
                <label for="glassmorphism" class="text-13-regular text-text-strong">Enable Glassmorphism (Blur effect)</label>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-13-regular text-text-strong">Background Opacity: {Math.round(settings.appearance.opacity() * 100)}%</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={settings.appearance.opacity() * 100} 
                  onInput={(e) => settings.appearance.setOpacity(Number(e.currentTarget.value) / 100)} 
                  class="w-full accent-accent-base" 
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-13-regular text-text-strong">Blur Intensity: {settings.appearance.blurIntensity()}px</label>
                <input 
                  type="range" 
                  min="0" 
                  max="64" 
                  value={settings.appearance.blurIntensity()} 
                  onInput={(e) => settings.appearance.setBlurIntensity(Number(e.currentTarget.value))} 
                  class="w-full accent-accent-base" 
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-13-regular text-text-strong">Wallpaper URL (or Base64)</label>
                <input 
                  type="text" 
                  placeholder="https://example.com/wallpaper.jpg"
                  value={settings.appearance.wallpaperUrl()} 
                  onInput={(e) => settings.appearance.setWallpaperUrl(e.currentTarget.value)} 
                  class="w-full px-2 py-1.5 bg-surface-base border border-border-base rounded text-13-regular text-text-strong" 
                />
                <label class="text-13-regular text-text-strong mt-2">Upload Local Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const result = e.target?.result as string;
                        settings.appearance.setWallpaperUrl(result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  class="text-12-regular text-text-weak file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-12-medium file:bg-surface-raised-base file:text-text-strong hover:file:bg-surface-raised-base-hover cursor-pointer"
                />
              </div>
            </div>
          </div>
        </Show>

        <Show when={tab() === "keybinds"}>
          <div class="text-13-regular text-text-weak">
            Use <button class="text-accent-base underline" onClick={props.onCloseKeybindings}>Keyboard Shortcuts editor</button> for full customization.
          </div>
        </Show>

        <Show when={tab() === "config"}>
          <div class="flex flex-col gap-5">
            <div class="flex flex-col gap-1.5 border-b border-border-base pb-3">
              <h3 class="text-14-medium text-text-strong">Project Configuration</h3>
              <p class="text-12-regular text-text-weak">
                Edit <code class="px-1 py-0.5 bg-surface-base rounded text-11-medium">opencode.jsonc</code> to configure your project settings, plugins, MCP servers, and more.
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-13-regular text-text-strong">Default Model</label>
              <input 
                type="text" 
                class="px-3 py-1.5 bg-surface-base border border-border-base rounded-md text-13-regular text-text-strong w-full"
                value={config().model ?? ""}
                placeholder="e.g. claude-3-5-sonnet-20241022"
                onChange={(e) => serverSync().updateConfig({ model: e.currentTarget.value || undefined })}
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-13-regular text-text-strong">Default Primary Agent</label>
              <input 
                type="text" 
                class="px-3 py-1.5 bg-surface-base border border-border-base rounded-md text-13-regular text-text-strong w-full"
                value={config().default_agent ?? ""}
                placeholder="e.g. coder"
                onChange={(e) => serverSync().updateConfig({ default_agent: e.currentTarget.value || undefined })}
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-13-regular text-text-strong">Terminal Shell</label>
              <input 
                type="text" 
                class="px-3 py-1.5 bg-surface-base border border-border-base rounded-md text-13-regular text-text-strong w-full"
                value={config().shell ?? ""}
                placeholder="e.g. /bin/zsh"
                onChange={(e) => serverSync().updateConfig({ shell: e.currentTarget.value || undefined })}
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-13-regular text-text-strong">Telemetry/Conversational Identity (Username)</label>
              <input 
                type="text" 
                class="px-3 py-1.5 bg-surface-base border border-border-base rounded-md text-13-regular text-text-strong w-full"
                value={config().username ?? ""}
                onChange={(e) => serverSync().updateConfig({ username: e.currentTarget.value || undefined })}
              />
            </div>

            <div class="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="snapshot" 
                checked={config().snapshot ?? false} 
                onChange={(e) => serverSync().updateConfig({ snapshot: e.currentTarget.checked })} 
                class="accent-accent-base" 
              />
              <label for="snapshot" class="text-13-regular text-text-strong">Enable Snapshots (Undo/Revert)</label>
            </div>

            <div class="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="autoupdate" 
                checked={config().autoupdate === true} 
                onChange={(e) => serverSync().updateConfig({ autoupdate: e.currentTarget.checked })} 
                class="accent-accent-base" 
              />
              <label for="autoupdate" class="text-13-regular text-text-strong">Automatically Update OpenCode</label>
            </div>

            <div class="mt-4">
              <Button
                variant="secondary"
                size="normal"
                onClick={() => props.onOpenConfig?.()}
              >
                Open opencode.jsonc file directly
              </Button>
            </div>

            <div class="text-12-regular text-text-weak mt-2">
              <p>See <a class="text-accent-base underline" href="https://opencode.ai/docs/config/" target="_blank" rel="noopener noreferrer">online documentation</a> for all available options.</p>
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}