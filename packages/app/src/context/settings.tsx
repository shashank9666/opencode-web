import { createStore, reconcile } from "solid-js/store"
import { createEffect, createMemo } from "solid-js"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { persisted } from "@/utils/persist"

export interface NotificationSettings {
  agent: boolean
  permissions: boolean
  errors: boolean
}

export interface SoundSettings {
  agentEnabled: boolean
  agent: string
  permissionsEnabled: boolean
  permissions: string
  errorsEnabled: boolean
  errors: string
}

export interface Settings {
  general: {
    autoSave: boolean
    releaseNotes: boolean
    followup: "queue" | "steer"
    showFileTree: boolean
    showNavigation: boolean
    showSearch: boolean
    showStatus: boolean
    showTerminal: boolean
    showReasoningSummaries: boolean
    shellToolPartsExpanded: boolean
    editToolPartsExpanded: boolean
    showSessionProgressBar: boolean
    showCustomAgents: boolean
    newLayoutDesigns?: boolean
    showDebugBar: boolean
    inlineCodeSuggestions: boolean
    fastMode: boolean
  }
  appearance: {
    fontSize: number
    mono: string
    sans: string
    terminal: string
    colorfulIcons: boolean
    customAccentColor: string
    customBackgroundColor: string
    glassmorphism: boolean
    opacity: number
    blurIntensity: number
    wallpaperUrl: string
  }
  keybinds: Record<string, string>
  permissions: {
    autoApprove: boolean
  }
  notifications: NotificationSettings
  sounds: SoundSettings
  terminal: {
    defaultShell: string
  }
}

export const monoDefault = "System Mono"
export const sansDefault = "System Sans"
export const terminalDefault = "JetBrainsMono Nerd Font Mono"
export const newLayoutDesignsDefault = import.meta.env.VITE_OPENCODE_CHANNEL !== "prod"

const monoFallback =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
const sansFallback = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const terminalFallback =
  '"JetBrainsMono Nerd Font Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'

const monoBase = monoFallback
const sansBase = sansFallback
const terminalBase = terminalFallback

function input(font: string | undefined) {
  return font ?? ""
}

function family(font: string) {
  if (/^[\w-]+$/.test(font)) return font
  return `"${font.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
}

function stack(font: string | undefined, base: string) {
  const value = font?.trim() ?? ""
  if (!value) return base
  return `${family(value)}, ${base}`
}

export function monoInput(font: string | undefined) {
  return input(font)
}

export function sansInput(font: string | undefined) {
  return input(font)
}

export function monoFontFamily(font: string | undefined) {
  return stack(font, monoBase)
}

export function sansFontFamily(font: string | undefined) {
  return stack(font, sansBase)
}

export function terminalInput(font: string | undefined) {
  return input(font)
}

export function terminalFontFamily(font: string | undefined) {
  return stack(font, terminalBase)
}

const defaultSettings: Settings = {
  general: {
    autoSave: true,
    releaseNotes: true,
    followup: "steer",
    showFileTree: false,
    showNavigation: false,
    showSearch: false,
    showStatus: false,
    showTerminal: false,
    showReasoningSummaries: false,
    shellToolPartsExpanded: false,
    editToolPartsExpanded: false,
    showSessionProgressBar: true,
    showCustomAgents: false,
    showDebugBar: false,
    inlineCodeSuggestions: false,
    fastMode: false,
  },
  appearance: {
    fontSize: 14,
    mono: "",
    sans: "",
    terminal: "",
    colorfulIcons: false,
    customAccentColor: "",
    customBackgroundColor: "",
    glassmorphism: false,
    opacity: 0.8,
    blurIntensity: 20,
    wallpaperUrl: "",
  },
  keybinds: {},
  permissions: {
    autoApprove: false,
  },
  notifications: {
    agent: true,
    permissions: true,
    errors: false,
  },
  sounds: {
    agentEnabled: true,
    agent: "staplebops-01",
    permissionsEnabled: true,
    permissions: "staplebops-01",
    errorsEnabled: false,
    errors: "staplebops-01",
  },
  terminal: {
    defaultShell: "",
  },
}

function withFallback<T>(read: () => T | undefined, fallback: T) {
  return createMemo(() => read() ?? fallback)
}

export const { use: useSettings, provider: SettingsProvider } = createSimpleContext({
  name: "Settings",
  gate: false,
  init: () => {
    const [store, setStore, _, ready] = persisted("settings.v3", createStore<Settings>(defaultSettings))
    const showFileTree = withFallback(() => store.general?.showFileTree, defaultSettings.general.showFileTree)
    const showSearch = withFallback(() => store.general?.showSearch, defaultSettings.general.showSearch)
    const showStatus = withFallback(() => store.general?.showStatus, defaultSettings.general.showStatus)
    const showCustomAgents = withFallback(
      () => store.general?.showCustomAgents,
      defaultSettings.general.showCustomAgents,
    )
    const newLayoutDesigns = withFallback(() => store.general?.newLayoutDesigns, newLayoutDesignsDefault)
    const visible = (preference: () => boolean) => createMemo(() => !newLayoutDesigns() || preference())

    createEffect(() => {
      if (typeof document === "undefined") return
      const root = document.documentElement
      root.style.setProperty("--font-family-mono", monoFontFamily(store.appearance?.mono))
      root.style.setProperty("--font-family-sans", sansFontFamily(store.appearance?.sans))

      const accent = store.appearance?.customAccentColor
      if (accent) {
        root.style.setProperty("--surface-brand-base", accent)
        root.style.setProperty("--surface-brand-hover", accent)
        root.style.setProperty("--surface-interactive-base", accent)
        root.style.setProperty("--surface-interactive-hover", accent)
        root.style.setProperty("--border-selected", accent)
        root.style.setProperty("--border-interactive-base", accent)
        root.style.setProperty("--border-interactive-hover", accent)
        root.style.setProperty("--icon-interactive-base", accent)
        root.style.setProperty("--v2-text-text-accent", accent)
        root.style.setProperty("--v2-text-text-accent-hover", accent)
        root.style.setProperty("--v2-border-border-accent", accent)
        root.style.setProperty("--v2-icon-icon-accent", accent)
      } else {
        root.style.removeProperty("--surface-brand-base")
        root.style.removeProperty("--surface-brand-hover")
        root.style.removeProperty("--surface-interactive-base")
        root.style.removeProperty("--surface-interactive-hover")
        root.style.removeProperty("--border-selected")
        root.style.removeProperty("--border-interactive-base")
        root.style.removeProperty("--border-interactive-hover")
        root.style.removeProperty("--icon-interactive-base")
        root.style.removeProperty("--v2-text-text-accent")
        root.style.removeProperty("--v2-text-text-accent-hover")
        root.style.removeProperty("--v2-border-border-accent")
        root.style.removeProperty("--v2-icon-icon-accent")
      }

      const bg = store.appearance?.customBackgroundColor
      if (bg) {
        root.style.setProperty("--background-base", bg)
        root.style.setProperty("--input-base", bg)
        root.style.setProperty("--v2-background-bg-base", bg)
      } else {
        root.style.removeProperty("--background-base")
        root.style.removeProperty("--input-base")
        root.style.removeProperty("--v2-background-bg-base")
      }
    })

    createEffect(() => {
      if (store.general?.followup !== "queue") return
      setStore("general", "followup", "steer")
    })

    return {
      ready,
      get current() {
        return store
      },
      general: {
        autoSave: withFallback(() => store.general?.autoSave, defaultSettings.general.autoSave),
        setAutoSave(value: boolean) {
          setStore("general", "autoSave", value)
        },
        releaseNotes: withFallback(() => store.general?.releaseNotes, defaultSettings.general.releaseNotes),
        setReleaseNotes(value: boolean) {
          setStore("general", "releaseNotes", value)
        },
        followup: withFallback(
          () => (store.general?.followup === "queue" ? "steer" : store.general?.followup),
          defaultSettings.general.followup,
        ),
        setFollowup(value: "queue" | "steer") {
          setStore("general", "followup", value === "queue" ? "steer" : value)
        },
        showFileTree,
        setShowFileTree(value: boolean) {
          setStore("general", "showFileTree", value)
        },
        showNavigation: withFallback(() => store.general?.showNavigation, defaultSettings.general.showNavigation),
        setShowNavigation(value: boolean) {
          setStore("general", "showNavigation", value)
        },
        showSearch,
        setShowSearch(value: boolean) {
          setStore("general", "showSearch", value)
        },
        showStatus,
        setShowStatus(value: boolean) {
          setStore("general", "showStatus", value)
        },
        showTerminal: withFallback(() => store.general?.showTerminal, defaultSettings.general.showTerminal),
        setShowTerminal(value: boolean) {
          setStore("general", "showTerminal", value)
        },
        showReasoningSummaries: withFallback(
          () => store.general?.showReasoningSummaries,
          defaultSettings.general.showReasoningSummaries,
        ),
        setShowReasoningSummaries(value: boolean) {
          setStore("general", "showReasoningSummaries", value)
        },
        shellToolPartsExpanded: withFallback(
          () => store.general?.shellToolPartsExpanded,
          defaultSettings.general.shellToolPartsExpanded,
        ),
        setShellToolPartsExpanded(value: boolean) {
          setStore("general", "shellToolPartsExpanded", value)
        },
        editToolPartsExpanded: withFallback(
          () => store.general?.editToolPartsExpanded,
          defaultSettings.general.editToolPartsExpanded,
        ),
        setEditToolPartsExpanded(value: boolean) {
          setStore("general", "editToolPartsExpanded", value)
        },
        showSessionProgressBar: withFallback(
          () => store.general?.showSessionProgressBar,
          defaultSettings.general.showSessionProgressBar,
        ),
        setShowSessionProgressBar(value: boolean) {
          setStore("general", "showSessionProgressBar", value)
        },
        showCustomAgents,
        setShowCustomAgents(value: boolean) {
          setStore("general", "showCustomAgents", value)
        },
        newLayoutDesigns,
        setNewLayoutDesigns(value: boolean) {
          setStore("general", "newLayoutDesigns", value)
        },
        showDebugBar: withFallback(
          () => store.general?.showDebugBar,
          defaultSettings.general.showDebugBar,
        ),
        setShowDebugBar(value: boolean) {
          setStore("general", "showDebugBar", value)
        },
        inlineCodeSuggestions: withFallback(
          () => store.general?.inlineCodeSuggestions,
          defaultSettings.general.inlineCodeSuggestions,
        ),
        setInlineCodeSuggestions(value: boolean) {
          setStore("general", "inlineCodeSuggestions", value)
        },
        fastMode: withFallback(
          () => store.general?.fastMode,
          defaultSettings.general.fastMode,
        ),
        setFastMode(value: boolean) {
          setStore("general", "fastMode", value)
        },
      },
      visibility: {
        fileTree: visible(showFileTree),
        search: visible(showSearch),
        status: visible(showStatus),
        customAgents: visible(showCustomAgents),
      },
      appearance: {
        fontSize: withFallback(() => store.appearance?.fontSize, defaultSettings.appearance.fontSize),
        setFontSize(value: number) {
          setStore("appearance", "fontSize", value)
        },
        font: withFallback(() => store.appearance?.mono, defaultSettings.appearance.mono),
        setFont(value: string) {
          setStore("appearance", "mono", value.trim() ? value : "")
        },
        uiFont: withFallback(() => store.appearance?.sans, defaultSettings.appearance.sans),
        setUIFont(value: string) {
          setStore("appearance", "sans", value.trim() ? value : "")
        },
        terminalFont: withFallback(() => store.appearance?.terminal, defaultSettings.appearance.terminal),
        setTerminalFont(value: string) {
          setStore("appearance", "terminal", value.trim() ? value : "")
        },
        colorfulIcons: withFallback(() => store.appearance?.colorfulIcons, defaultSettings.appearance.colorfulIcons),
        setColorfulIcons(value: boolean) {
          setStore("appearance", "colorfulIcons", value)
        },
        glassmorphism: withFallback(() => store.appearance?.glassmorphism, defaultSettings.appearance.glassmorphism),
        setGlassmorphism(value: boolean) {
          setStore("appearance", "glassmorphism", value)
        },
        opacity: withFallback(() => store.appearance?.opacity, defaultSettings.appearance.opacity),
        setOpacity(value: number) {
          setStore("appearance", "opacity", value)
        },
        blurIntensity: withFallback(() => store.appearance?.blurIntensity, defaultSettings.appearance.blurIntensity),
        setBlurIntensity(value: number) {
          setStore("appearance", "blurIntensity", value)
        },
        wallpaperUrl: withFallback(() => store.appearance?.wallpaperUrl, defaultSettings.appearance.wallpaperUrl),
        setWallpaperUrl(value: string) {
          setStore("appearance", "wallpaperUrl", value)
        },
      },
      keybinds: {
        get: (action: string) => store.keybinds?.[action],
        set(action: string, keybind: string) {
          setStore("keybinds", action, keybind)
        },
        reset(action: string) {
          setStore("keybinds", (current) => {
            if (!Object.prototype.hasOwnProperty.call(current, action)) return current
            const next = { ...current }
            delete next[action]
            return next
          })
        },
        resetAll() {
          setStore("keybinds", reconcile({}))
        },
      },
      permissions: {
        autoApprove: withFallback(() => store.permissions?.autoApprove, defaultSettings.permissions.autoApprove),
        setAutoApprove(value: boolean) {
          setStore("permissions", "autoApprove", value)
        },
      },
      notifications: {
        agent: withFallback(() => store.notifications?.agent, defaultSettings.notifications.agent),
        setAgent(value: boolean) {
          setStore("notifications", "agent", value)
        },
        permissions: withFallback(() => store.notifications?.permissions, defaultSettings.notifications.permissions),
        setPermissions(value: boolean) {
          setStore("notifications", "permissions", value)
        },
        errors: withFallback(() => store.notifications?.errors, defaultSettings.notifications.errors),
        setErrors(value: boolean) {
          setStore("notifications", "errors", value)
        },
      },
      sounds: {
        agentEnabled: withFallback(() => store.sounds?.agentEnabled, defaultSettings.sounds.agentEnabled),
        setAgentEnabled(value: boolean) {
          setStore("sounds", "agentEnabled", value)
        },
        agent: withFallback(() => store.sounds?.agent, defaultSettings.sounds.agent),
        setAgent(value: string) {
          setStore("sounds", "agent", value)
        },
        permissionsEnabled: withFallback(
          () => store.sounds?.permissionsEnabled,
          defaultSettings.sounds.permissionsEnabled,
        ),
        setPermissionsEnabled(value: boolean) {
          setStore("sounds", "permissionsEnabled", value)
        },
        permissions: withFallback(() => store.sounds?.permissions, defaultSettings.sounds.permissions),
        setPermissions(value: string) {
          setStore("sounds", "permissions", value)
        },
        errorsEnabled: withFallback(() => store.sounds?.errorsEnabled, defaultSettings.sounds.errorsEnabled),
        setErrorsEnabled(value: boolean) {
          setStore("sounds", "errorsEnabled", value)
        },
        errors: withFallback(() => store.sounds?.errors, defaultSettings.sounds.errors),
        setErrors(value: string) {
          setStore("sounds", "errors", value)
        },
      },
      terminal: {
        defaultShell: withFallback(() => store.terminal?.defaultShell, defaultSettings.terminal.defaultShell),
        setDefaultShell(value: string) {
          setStore("terminal", "defaultShell", value)
        },
      },
    }
  },
})
