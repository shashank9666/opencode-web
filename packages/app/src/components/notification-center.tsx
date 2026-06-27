import { For, Show, createMemo, createSignal } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Popover } from "@opencode-ai/ui/popover"
import { useNavigate } from "@solidjs/router"
import { useNotification } from "@/context/notification"
import { useLanguage } from "@/context/language"
import { useSessionLayout } from "@/pages/session/session-layout"
import { base64Encode } from "@opencode-ai/core/util/encode"

function formatTime(time: number) {
  const diff = Date.now() - time
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const notificationIcon = (type: "turn-complete" | "error") => {
  if (type === "error") return "warning"
  return "check-small"
}

const notificationLabel = (type: "turn-complete" | "error", language: ReturnType<typeof useLanguage>) => {
  if (type === "error") return language.t("notification.session.error.title")
  return language.t("notification.session.responseReady.title")
}

export function NotificationCenter() {
  const notification = useNotification()
  const language = useLanguage()
  const navigate = useNavigate()
  const { params } = useSessionLayout()

  const [open, setOpen] = createSignal(false)

  const sessionID = createMemo(() => params.id)

  const unseenCount = createMemo(() => {
    const id = sessionID()
    if (!id) return 0
    return notification.session.unseenCount(id)
  })

  const unseenNotifications = createMemo(() => {
    const id = sessionID()
    if (!id) return []
    return notification.session.unseen(id)
  })

  const hasNotifications = createMemo(() => unseenCount() > 0)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) return
    const id = sessionID()
    if (!id) return
    if (!hasNotifications()) return
    notification.session.markViewed(id)
  }

  const handleNotificationClick = (directory?: string, session?: string) => {
    setOpen(false)
    if (!directory) return
    if (!session) return
    navigate(`/${base64Encode(directory)}/session/${session}`)
  }

  return (
    <Popover
      open={open()}
      onOpenChange={handleOpenChange}
      placement="bottom-end"
      gutter={4}
      trigger={
        <button
          type="button"
          class="relative size-6 flex items-center justify-center rounded-md hover:bg-surface-base-hover"
          aria-label={language.t("common.moreOptions")}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 2.5C8.61929 2.5 7.5 3.61929 7.5 5V5.5C7.5 5.5 5 7 5 10.5C5 14 3.5 15.5 3.5 15.5H16.5C16.5 15.5 15 14 15 10.5C15 7 12.5 5.5 12.5 5.5V5C12.5 3.61929 11.3807 2.5 10 2.5Z"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M8 15.5C8 16.6046 8.89543 17.5 10 17.5C11.1046 17.5 12 16.6046 12 15.5" stroke="currentColor" />
          </svg>
          <Show when={hasNotifications()}>
            <span class="absolute -top-0.5 -right-0.5 size-3.5 flex items-center justify-center rounded-full bg-icon-critical-base text-[9px] leading-none text-white font-semibold">
              {unseenCount() > 9 ? "9+" : unseenCount()}
            </span>
          </Show>
        </button>
      }
    >
      <div class="w-80 max-h-80 overflow-y-auto" data-component="notification-list">
        <Show
          when={hasNotifications()}
          fallback={
            <div class="flex flex-col items-center justify-center py-8 px-4 text-text-weak text-14-regular">
              <Icon name="checklist" />
              <p class="mt-2">No new notifications</p>
            </div>
          }
        >
          <For each={unseenNotifications()}>
            {(item) => (
              <button
                type="button"
                class="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-surface-base-hover text-left border-b border-border-weak-base last:border-b-0"
                onClick={() => handleNotificationClick(item.directory, item.session)}
              >
                <div class="size-6 shrink-0 mt-0.5 flex items-center justify-center rounded bg-surface-base-active">
                  <Icon name={notificationIcon(item.type)} size="small" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-14-medium text-text-strong truncate">
                    {notificationLabel(item.type, language)}
                  </div>
                  <div class="text-12-regular text-text-weak mt-0.5 truncate">
                    <Show when={item.type === "error" && item.error}>
                      {(error) => (
                        <Show when={typeof error() === "string"} fallback={"An error occurred"}>
                          {error() as unknown as string}
                        </Show>
                      )}
                    </Show>
                    <Show when={item.type === "turn-complete"}>
                      Agent response is ready
                    </Show>
                  </div>
                  <div class="text-11-regular text-text-weak mt-1">
                    {formatTime(item.time)}
                  </div>
                </div>
              </button>
            )}
          </For>
        </Show>
      </div>
    </Popover>
  )
}
