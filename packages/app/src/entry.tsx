// @refresh reload

import * as Sentry from "@sentry/solid"
import { render } from "solid-js/web"
import { HashRouter } from "@solidjs/router"
import { AppBaseProviders, AppInterface } from "@/app"
import { type Platform, PlatformProvider } from "@/context/platform"
import { dict as en } from "@/i18n/en"
import { handleNotificationClick } from "@/utils/notification-click"
import { authFromToken } from "@/utils/server"
import pkg from "../package.json"
import { ServerConnection } from "./context/server"

const DEFAULT_SERVER_URL_KEY = "opencode.settings.dat:defaultServerUrl"



const getRootNotFoundError = () => {
  const key = "error.dev.rootNotFound" as const
  return en[key]
}

const getStorage = (key: string) => {
  if (typeof localStorage === "undefined") return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const setStorage = (key: string, value: string | null) => {
  if (typeof localStorage === "undefined") return
  try {
    if (value !== null) {
      localStorage.setItem(key, value)
      return
    }
    localStorage.removeItem(key)
  } catch {
    return
  }
}

const readDefaultServerUrl = () => getStorage(DEFAULT_SERVER_URL_KEY)
const writeDefaultServerUrl = (url: string | null) => setStorage(DEFAULT_SERVER_URL_KEY, url)

const notify: Platform["notify"] = async (title, description, href) => {
  if (!("Notification" in window)) return

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission().catch(() => "denied")
      : Notification.permission

  if (permission !== "granted") return

  const inView = document.visibilityState === "visible" && document.hasFocus()
  if (inView) return

  const notification = new Notification(title, {
    body: description ?? "",
    icon: "https://opencode.ai/favicon-96x96-v3.png",
  })

  notification.onclick = () => {
    handleNotificationClick(href)
    notification.close()
  }
}

const openLink: Platform["openLink"] = (url) => {
  window.open(url, "_blank")
}

const back: Platform["back"] = () => {
  window.history.back()
}

const forward: Platform["forward"] = () => {
  window.history.forward()
}

const restart: Platform["restart"] = async () => {
  window.location.reload()
}

const root = document.getElementById("root")
if (!(root instanceof HTMLElement) && import.meta.env.DEV) {
  throw new Error(getRootNotFoundError())
}

const isTauri = typeof window !== "undefined" && "__TAURI__" in window
const isElectron = typeof window !== "undefined" && "api" in window
const platformName = (isTauri || isElectron) ? "desktop" as const : "web" as const

const getCurrentUrl = () => {
  if (location.hostname.includes("opencode.ai")) return "http://localhost:4098"
  if (isElectron || isTauri) return "http://localhost:4098"
  if (import.meta.env.DEV)
    return `http://${import.meta.env.VITE_OPENCODE_SERVER_HOST ?? "localhost"}:${import.meta.env.VITE_OPENCODE_SERVER_PORT ?? "4098"}`
  return location.origin
}

const getDefaultUrl = () => {
  const lsDefault = readDefaultServerUrl()
  if (lsDefault) return lsDefault
  return getCurrentUrl()
}

const clearAuthToken = () => {
  const params = new URLSearchParams(location.search)
  if (!params.has("auth_token")) return
  params.delete("auth_token")
  history.replaceState(null, "", location.pathname + (params.size ? `?${params}` : "") + location.hash)
}

const getOS = () => {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes("mac")) return "macos" as const
  if (ua.includes("win")) return "windows" as const
  return "linux" as const
}



const openDirectoryPickerDialog = async (opts?: { title?: string; multiple?: boolean }) => {
  if (isTauri) {
    try {
      const tauri = (window as any).__TAURI__
      if (tauri?.dialog?.open) {
        return await tauri.dialog.open({
          directory: true,
          multiple: opts?.multiple ?? false,
          title: opts?.title,
        })
      }
      if (tauri?.core?.invoke) {
        return await tauri.core.invoke("plugin:dialog|open", {
          directory: true,
          multiple: opts?.multiple ?? false,
          title: opts?.title,
        })
      }
      if (tauri?.invoke) {
        return await tauri.invoke("tauri", {
          __tauriModule: "Dialog",
          message: {
            cmd: "openDialog",
            options: {
              directory: true,
              multiple: opts?.multiple ?? false,
              title: opts?.title,
            }
          }
        })
      }
    } catch (e) {
      console.error("Tauri native directory picker failed:", e)
    }
  }
  if (isElectron) {
    try {
      const api = (window as any).api
      if (api?.openDirectory) {
        return await api.openDirectory(opts)
      }
    } catch (e) {
      console.error("Electron native directory picker failed:", e)
    }
  }
  return null
}

const platform: Platform = {
  platform: platformName,
  version: pkg.version,
  openLink,
  back,
  forward,
  restart,
  notify,
  getDefaultServer: async () => {
    const stored = readDefaultServerUrl()
    return stored ? ServerConnection.Key.make(stored) : null
  },
  setDefaultServer: writeDefaultServerUrl,
  ...(platformName === "desktop" ? {
    os: getOS(),
    openDirectoryPickerDialog,
    runDesktopMenuAction: (action: string) => {
      if (action === "view.toggleDevTools") {
        if (isElectron) {
          try { (window as any).api?.toggleDevTools?.() } catch {}
        }
      } else if (action === "view.reload" || action === "app.relaunch") {
        window.location.reload()
      } else if (action === "window.close") {
        window.close()
      } else if (action === "window.new") {
        window.open(window.location.href, "_blank")
      } else if (action.startsWith("edit.")) {
        const editCommand = action.replace("edit.", "")
        document.execCommand(editCommand)
      }
    },
  } : {}),
} as Platform


if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE ?? `web@${pkg.version}`,
    initialScope: {
      tags: {
        platform: "web",
      },
    },
    integrations: (integrations) => {
      return integrations.filter(
        (i) =>
          i.name !== "Breadcrumbs" && !(import.meta.env.OPENCODE_CHANNEL === "prod" && i.name === "GlobalHandlers"),
      )
    },
  })
}

if (root instanceof HTMLElement) {
  const auth = authFromToken(new URLSearchParams(location.search).get("auth_token"))
  clearAuthToken()
  const server: ServerConnection.Http = {
    type: "http",
    authToken: !!auth,
    http: {
      url: getCurrentUrl(),
      ...auth,
    },
  }
  render(
    () => (
      <PlatformProvider value={platform}>
        <AppBaseProviders>
          <AppInterface
            router={isElectron ? HashRouter : undefined}
            defaultServer={ServerConnection.Key.make(getDefaultUrl())}
            canonicalLocalServer={ServerConnection.key(server)}
            servers={[server]}
            disableHealthCheck
          />
        </AppBaseProviders>
      </PlatformProvider>
    ),
    root,
  )

  // Smoothly fade out the welcome loader
  const loader = document.getElementById("welcome-loader")
  if (loader) {
    loader.style.opacity = "0"
    loader.style.visibility = "hidden"
    setTimeout(() => loader.remove(), 600)
  }
}
