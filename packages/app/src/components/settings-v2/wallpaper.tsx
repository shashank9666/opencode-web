import { Component, For, Show, createMemo, createSignal, batch } from "solid-js"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Switch } from "@opencode-ai/ui/v2/switch-v2"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import { Icon } from "@opencode-ai/ui/icon"
import { useSettings, type WallpaperProvider, type WallpaperProviderType } from "@/context/settings"
import { SettingsListV2 } from "./parts/list"
import { SettingsRowV2 } from "./parts/row"
import "./settings-v2.css"

// ─── Provider catalogue ───────────────────────────────────────────────────────

type ProviderMeta = {
  type: WallpaperProviderType
  name: string
  icon: string
  color: string
  description: string
  needsKey: boolean
  keyLink: string
  defaultQuery: string
  placeholder: string
}

// ─── Preset wallpapers ──────────────────────────────────────────────────────────

type WallpaperPreset = {
  id: string
  name: string
  url: string
}

const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: "anime-chilling",
    name: "Anime-chilling",
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80",
  },
  {
    id: "anime-room",
    name: "Anime-room",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80",
  },
  {
    id: "rainy-neon",
    name: "Rainy Neon Tokyo",
    url: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=400&q=80",
  },
  {
    id: "space-theme",
    name: "Space Theme",
    url: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=400&q=80",
  },
  {
    id: "weathering-with-you",
    name: "Weathering With You",
    url: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=400&q=80",
  },
]

const PROVIDER_META: ProviderMeta[] = [
  {
    type: "wallhaven",
    name: "Wallhaven",
    icon: "🖼️",
    color: "#7c3aed",
    description: "1.2M+ wallpapers. Best anime, nature & abstract selection.",
    needsKey: false,
    keyLink: "https://wallhaven.cc/settings/account",
    defaultQuery: "anime landscape",
    placeholder: "e.g. anime room, makoto shinkai, night city",
  },
  {
    type: "unsplash",
    name: "Unsplash",
    icon: "📷",
    color: "#0ea5e9",
    description: "Professional photography. Landscapes, architecture, minimal.",
    needsKey: true,
    keyLink: "https://unsplash.com/developers",
    defaultQuery: "landscape mountains",
    placeholder: "e.g. nature, city, abstract",
  },
  {
    type: "pexels",
    name: "Pexels",
    icon: "🌄",
    color: "#10b981",
    description: "Free stock photos. Great for office, nature & cities.",
    needsKey: true,
    keyLink: "https://www.pexels.com/api/",
    defaultQuery: "landscape",
    placeholder: "e.g. forest, ocean, mountains",
  },
  {
    type: "pixabay",
    name: "Pixabay",
    icon: "🎨",
    color: "#f59e0b",
    description: "Photos, illustrations & vectors. Free with API key.",
    needsKey: true,
    keyLink: "https://pixabay.com/api/docs/",
    defaultQuery: "nature wallpaper",
    placeholder: "e.g. galaxy, sunset, forest",
  },
  {
    type: "nasa",
    name: "NASA APOD",
    icon: "🚀",
    color: "#6366f1",
    description: "Astronomy Picture of the Day. Galaxies, nebulae & Earth.",
    needsKey: true,
    keyLink: "https://api.nasa.gov/",
    defaultQuery: "",
    placeholder: "No query needed — gets daily space photo",
  },
  {
    type: "custom",
    name: "Custom URL",
    icon: "🔗",
    color: "#64748b",
    description: "Enter any API endpoint that returns a direct image URL.",
    needsKey: false,
    keyLink: "",
    defaultQuery: "",
    placeholder: "https://your-api.example.com/random-image",
  },
]

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchWallhaven(query: string, apiKey: string): Promise<string> {
  const params = new URLSearchParams({
    q: query || "anime landscape",
    categories: "010",
    purity: "100",
    atleast: "1920x1080",
    ratios: "16x9",
    sorting: "random",
    ...(apiKey ? { apikey: apiKey } : {}),
  })
  const res = await fetch(`https://wallhaven.cc/api/v1/search?${params}`)
  const data = await res.json()
  const items: { path: string }[] = data?.data ?? []
  if (!items.length) throw new Error("No results from Wallhaven")
  const pick = items[Math.floor(Math.random() * items.length)]
  return pick.path
}

async function fetchUnsplash(query: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error("Unsplash requires an API key")
  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query || "landscape")}&orientation=landscape&client_id=${apiKey}`,
  )
  const data = await res.json()
  return data?.urls?.full ?? data?.urls?.regular
}

async function fetchPexels(query: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error("Pexels requires an API key")
  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query || "landscape")}&orientation=landscape&per_page=15`, {
    headers: { Authorization: apiKey },
  })
  const data = await res.json()
  const photos: { src: { original: string } }[] = data?.photos ?? []
  if (!photos.length) throw new Error("No results from Pexels")
  return photos[Math.floor(Math.random() * photos.length)].src.original
}

async function fetchPixabay(query: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error("Pixabay requires an API key")
  const res = await fetch(
    `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query || "nature")}&image_type=photo&orientation=horizontal&min_width=1920&per_page=15&order=popular`,
  )
  const data = await res.json()
  const hits: { largeImageURL: string }[] = data?.hits ?? []
  if (!hits.length) throw new Error("No results from Pixabay")
  return hits[Math.floor(Math.random() * hits.length)].largeImageURL
}

async function fetchNasa(apiKey: string): Promise<string> {
  const key = apiKey || "DEMO_KEY"
  const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${key}`)
  const data = await res.json()
  if (data?.media_type !== "image") throw new Error("Today's APOD is not an image")
  return data.hdurl ?? data.url
}

async function fetchFromProvider(p: WallpaperProvider): Promise<string> {
  switch (p.type) {
    case "wallhaven": return fetchWallhaven(p.query, p.apiKey)
    case "unsplash": return fetchUnsplash(p.query, p.apiKey)
    case "pexels": return fetchPexels(p.query, p.apiKey)
    case "pixabay": return fetchPixabay(p.query, p.apiKey)
    case "nasa": return fetchNasa(p.apiKey)
    case "custom": {
      if (!p.query) throw new Error("Enter the endpoint URL in the Query field")
      const res = await fetch(p.query)
      const ct = res.headers.get("content-type") ?? ""
      if (ct.startsWith("image/")) return p.query
      const data = await res.json()
      const url = data?.url ?? data?.path ?? data?.data?.[0]?.path
      if (!url) throw new Error("Could not extract an image URL from the API response")
      return url
    }
  }
}

// ─── Provider card ────────────────────────────────────────────────────────────

function ProviderCard(props: {
  provider: WallpaperProvider
  meta: ProviderMeta
  onUpdate: (update: Partial<WallpaperProvider>) => void
  onRemove: () => void
  onFetch: () => Promise<void>
  fetching: boolean
}) {
  const [open, setOpen] = createSignal(false)

  return (
    <div
      class="wallpaper-provider-card"
      style={{ "--provider-color": props.meta.color }}
      data-enabled={props.provider.enabled}
    >
      {/* Header row */}
      <div class="wallpaper-provider-header">
        <div class="wallpaper-provider-header-left">
          <span class="wallpaper-provider-icon">{props.meta.icon}</span>
          <div>
            <span class="wallpaper-provider-name">{props.meta.name}</span>
            <Show when={props.provider.query}>
              <span class="wallpaper-provider-query">{props.provider.query}</span>
            </Show>
          </div>
        </div>

        <div class="wallpaper-provider-header-actions">
          <ButtonV2
            variant="ghost"
            size="small"
            onClick={props.onFetch}
            disabled={props.fetching}
            title="Fetch a random wallpaper from this provider"
          >
            <Show when={props.fetching} fallback={<Icon name="reset" />}>
              <div class="wallpaper-fetching-spinner" />
            </Show>
          </ButtonV2>

          <Switch
            checked={props.provider.enabled}
            onChange={(v) => props.onUpdate({ enabled: v })}
          />

          <ButtonV2 variant="ghost" size="small" onClick={() => setOpen((v) => !v)} title="Configure">
            <Icon name={open() ? "collapse" : "settings-gear"} />
          </ButtonV2>

          <ButtonV2
            variant="ghost"
            size="small"
            onClick={props.onRemove}
            class="wallpaper-remove-btn"
            title="Remove provider"
          >
            <Icon name="trash" />
          </ButtonV2>
        </div>
      </div>

      {/* Expanded config */}
      <Show when={open()}>
        <div class="wallpaper-provider-config">
          <div class="wallpaper-provider-field">
            <label class="wallpaper-provider-field-label">Search Query</label>
            <TextInputV2
              type="text"
              appearance="base"
              value={props.provider.query}
              onInput={(e) => props.onUpdate({ query: e.currentTarget.value })}
              placeholder={props.meta.placeholder}
              spellcheck={false}
            />
          </div>

          <Show when={props.meta.needsKey}>
            <div class="wallpaper-provider-field">
              <label class="wallpaper-provider-field-label">
                API Key
                <Show when={props.meta.keyLink}>
                  {" · "}
                  <a href={props.meta.keyLink} target="_blank" rel="noopener noreferrer" class="wallpaper-key-link">
                    Get key ↗
                  </a>
                </Show>
              </label>
              <TextInputV2
                type="password"
                appearance="base"
                value={props.provider.apiKey}
                onInput={(e) => props.onUpdate({ apiKey: e.currentTarget.value })}
                placeholder="Paste API key…"
                spellcheck={false}
                autocomplete="off"
              />
            </div>
          </Show>

          <Show when={props.provider.label !== props.meta.name}>
            <div class="wallpaper-provider-field">
              <label class="wallpaper-provider-field-label">Label</label>
              <TextInputV2
                type="text"
                appearance="base"
                value={props.provider.label}
                onInput={(e) => props.onUpdate({ label: e.currentTarget.value })}
                placeholder={props.meta.name}
                spellcheck={false}
              />
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}

// ─── Add provider picker ──────────────────────────────────────────────────────

function AddProviderPicker(props: { onAdd: (type: WallpaperProviderType) => void }) {
  return (
    <div class="wallpaper-add-grid">
      <For each={PROVIDER_META}>
        {(meta) => (
          <button
            class="wallpaper-add-card"
            style={{ "--provider-color": meta.color }}
            onClick={() => props.onAdd(meta.type)}
            type="button"
          >
            <span class="wallpaper-add-card-icon">{meta.icon}</span>
            <div>
              <span class="wallpaper-add-card-name">{meta.name}</span>
              <span class="wallpaper-add-card-desc">{meta.description}</span>
            </div>
          </button>
        )}
      </For>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export const SettingsWallpaperV2: Component = () => {
  const settings = useSettings()

  const providers = createMemo(() => settings.appearance.wallpaperProviders())
  const [fetchingId, setFetchingId] = createSignal<string | null>(null)
  const [fetchError, setFetchError] = createSignal<string | null>(null)
  const [showPicker, setShowPicker] = createSignal(false)

  const intervalOptions = [
    { label: "1 minute", value: 60 },
    { label: "5 minutes", value: 300 },
    { label: "15 minutes", value: 900 },
    { label: "30 minutes", value: 1800 },
    { label: "1 hour", value: 3600 },
  ]

  const addProvider = (type: WallpaperProviderType) => {
    const meta = PROVIDER_META.find((m) => m.type === type)!
    settings.appearance.addWallpaperProvider({
      id: crypto.randomUUID(),
      type,
      label: meta.name,
      apiKey: "",
      query: meta.defaultQuery,
      enabled: true,
    })
    setShowPicker(false)
  }

  const fetchFromCard = async (provider: WallpaperProvider) => {
    batch(() => {
      setFetchingId(provider.id)
      setFetchError(null)
    })
    try {
      const url = await fetchFromProvider(provider)
      settings.appearance.setWallpaperUrl(url)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetchingId(null)
    }
  }

  const fetchFromAnyEnabled = async () => {
    const enabled = providers().filter((p) => p.enabled)
    if (!enabled.length) {
      setFetchError("Enable at least one provider first.")
      return
    }
    const pick = enabled[Math.floor(Math.random() * enabled.length)]
    await fetchFromCard(pick)
  }

  return (
    <>
      <div class="settings-v2-tab-header">
        <h2 class="settings-v2-tab-title">Wallpaper Providers</h2>
      </div>

      <div class="settings-v2-tab-body">
        {/* ── Current wallpaper preview ── */}
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Current Wallpaper</h3>
          <SettingsListV2>
            <SettingsRowV2
              title="Active wallpaper"
              description="The background image currently applied to the IDE"
            >
              <div class="wallpaper-preview-wrap">
                <Show
                  when={settings.appearance.wallpaperUrl()}
                  fallback={<div class="wallpaper-preview-empty">No wallpaper set</div>}
                >
                  <img
                    src={settings.appearance.wallpaperUrl()}
                    alt="Current wallpaper"
                    class="wallpaper-preview-thumb"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = "none"
                      const fallback = target.parentElement?.querySelector(".wallpaper-preview-error")
                      if (fallback) fallback.style.display = "flex"
                    }}
                  />
                  <div class="wallpaper-preview-error" style="display: none;">
                    <span>⚠️</span>
                    <span>Failed to load image</span>
                  </div>
                </Show>
                <div class="flex flex-col gap-1">
                  <ButtonV2 variant="neutral" size="small" onClick={fetchFromAnyEnabled}>
                    <Icon name="reset" />
                    Fetch Random
                  </ButtonV2>
                </div>
              </div>
            </SettingsRowV2>
          </SettingsListV2>

          <Show when={fetchError()}>
            <div class="wallpaper-error">{fetchError()}</div>
          </Show>
        </div>

        {/* ── Image URL / file / presets ── */}
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Image Source</h3>
          <SettingsListV2>
            <SettingsRowV2
              title="Image URL"
              description="Set a custom background image (URL or local file)"
            >
              <div class="flex flex-col gap-2 w-full sm:w-[220px]">
                <TextInputV2
                  type="text"
                  appearance="base"
                  value={settings.appearance.wallpaperUrl()}
                  onInput={(event) => settings.appearance.setWallpaperUrl(event.currentTarget.value)}
                  placeholder="Image URL"
                  spellcheck={false}
                />
                <div class="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (e) => {
                          const result = e.target?.result as string
                          settings.appearance.setWallpaperUrl(result)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    class="text-12-regular text-text-weak file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-12-medium file:bg-surface-raised-base file:text-text-strong hover:file:bg-surface-raised-base-hover cursor-pointer"
                  />
                  <Show when={settings.appearance.wallpaperUrl()}>
                    <ButtonV2
                      variant="ghost"
                      size="small"
                      onClick={() => settings.appearance.setWallpaperUrl("")}
                      class="text-text-danger-base hover:text-text-danger-strong"
                    >
                      Remove
                    </ButtonV2>
                  </Show>
                </div>
              </div>
            </SettingsRowV2>
          </SettingsListV2>

          <div class="wallpaper-presets-grid">
            <For each={WALLPAPER_PRESETS}>
              {(wp) => (
                <button
                  class={`wallpaper-preset-thumb ${settings.appearance.wallpaperUrl() === wp.url ? "active" : ""}`}
                  onClick={() => settings.appearance.setWallpaperUrl(wp.url)}
                  title={wp.name}
                >
                  <img
                    src={wp.url}
                    alt={wp.name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                  <span class="wallpaper-preset-label">{wp.name}</span>
                </button>
              )}
            </For>
          </div>
        </div>

        {/* ── Auto-rotate ── */}
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Auto-Rotate</h3>
          <SettingsListV2>
            <SettingsRowV2
              title="Auto-rotate wallpaper"
              description="Automatically fetch a new wallpaper from an enabled provider on a schedule"
            >
              <Switch
                checked={settings.appearance.wallpaperAutoRotate()}
                onChange={(v) => settings.appearance.setWallpaperAutoRotate(v)}
              />
            </SettingsRowV2>

            <Show when={settings.appearance.wallpaperAutoRotate()}>
              <SettingsRowV2
                title="Rotate every"
                description="How often to change the background"
              >
                <div class="wallpaper-interval-group">
                  <For each={intervalOptions}>
                    {(opt) => (
                      <button
                        type="button"
                        class="wallpaper-interval-chip"
                        data-active={settings.appearance.wallpaperRotateInterval() === opt.value}
                        onClick={() => settings.appearance.setWallpaperRotateInterval(opt.value)}
                      >
                        {opt.label}
                      </button>
                    )}
                  </For>
                </div>
              </SettingsRowV2>
            </Show>
          </SettingsListV2>
        </div>

        {/* ── Configured providers ── */}
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Providers</h3>

          <Show
            when={providers().length > 0}
            fallback={
              <div class="wallpaper-empty-state">
                <span class="wallpaper-empty-icon">🖼️</span>
                <p class="wallpaper-empty-text">No providers configured yet.</p>
                <p class="wallpaper-empty-sub">Add a provider below to start fetching wallpapers on demand.</p>
              </div>
            }
          >
            <div class="wallpaper-providers-list">
              <For each={providers()}>
                {(provider) => {
                  const meta = PROVIDER_META.find((m) => m.type === provider.type) ?? PROVIDER_META[5]
                  return (
                    <ProviderCard
                      provider={provider}
                      meta={meta}
                      onUpdate={(update) => settings.appearance.updateWallpaperProvider(provider.id, update)}
                      onRemove={() => settings.appearance.removeWallpaperProvider(provider.id)}
                      onFetch={() => fetchFromCard(provider)}
                      fetching={fetchingId() === provider.id}
                    />
                  )
                }}
              </For>
            </div>
          </Show>

          {/* Add provider */}
          <Show
            when={showPicker()}
            fallback={
              <ButtonV2 variant="neutral" onClick={() => setShowPicker(true)}>
                <Icon name="plus" />
                Add Provider
              </ButtonV2>
            }
          >
            <div class="wallpaper-picker-wrap">
              <div class="flex items-center justify-between mb-3">
                <span class="wallpaper-picker-title">Choose a wallpaper source</span>
                <ButtonV2 variant="ghost" size="small" onClick={() => setShowPicker(false)}>
                  <Icon name="close" />
                </ButtonV2>
              </div>
              <AddProviderPicker onAdd={addProvider} />
            </div>
          </Show>
        </div>

        {/* ── Tips ── */}
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">Tips</h3>
          <div class="wallpaper-tips">
            <div class="wallpaper-tip">
              <span class="wallpaper-tip-icon">⭐</span>
              <div>
                <strong>Wallhaven</strong> works without an API key. Add one from{" "}
                <a href="https://wallhaven.cc/settings/account" target="_blank" rel="noopener noreferrer" class="wallpaper-key-link">
                  wallhaven.cc ↗
                </a>{" "}
                to unlock adult filters and higher rate limits.
              </div>
            </div>
            <div class="wallpaper-tip">
              <span class="wallpaper-tip-icon">🎯</span>
              <div>
                <strong>Search queries for Wallhaven:</strong> try <code>anime room</code>,{" "}
                <code>makoto shinkai</code>, <code>lofi aesthetic</code>, <code>cyberpunk city</code>.
              </div>
            </div>
            <div class="wallpaper-tip">
              <span class="wallpaper-tip-icon">🔄</span>
              <div>
                Enable <strong>Auto-Rotate</strong> and add multiple providers — the IDE will cycle
                through them randomly so your background stays fresh.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
