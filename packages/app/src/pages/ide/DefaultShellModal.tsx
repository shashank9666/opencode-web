import { createSignal, createEffect, For, Show, onCleanup } from "solid-js"
import { useSettings } from "@/context/settings"

export type DefaultShellModalProps = {
  open: boolean
  onClose: () => void
}

export default function DefaultShellModal(props: DefaultShellModalProps) {
  const settings = useSettings()
  const [selectedIndex, setSelectedIndex] = createSignal(0)

  const shells = [
    { label: "bash", value: "bash" },
    { label: "zsh", value: "zsh" },
    { label: "sh", value: "sh" },
    { label: "powershell.exe", value: "powershell.exe" },
    { label: "cmd.exe", value: "cmd.exe" },
  ]

  createEffect(() => {
    if (props.open) {
      const current = settings.terminal.defaultShell()
      const index = shells.findIndex(s => s.value === current)
      setSelectedIndex(index >= 0 ? index : 0)
    }
  })

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.open) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % shells.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + shells.length) % shells.length)
    } else if (e.key === "Escape") {
      e.preventDefault()
      props.onClose()
    } else if (e.key === "Enter") {
      e.preventDefault()
      handleSelect()
    }
  }

  const handleSelect = () => {
    const selected = shells[selectedIndex()]
    if (selected) {
      settings.terminal.setDefaultShell(selected.value)
    }
    props.onClose()
  }

  createEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown))
  })

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 pt-[50px] animate-in fade-in duration-100"
        onClick={props.onClose}
      >
        <div
          class="bg-surface-raised-base border border-border-base rounded-lg shadow-2xl w-[600px] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="p-2 border-b border-border-base">
            <input
              type="text"
              class="w-full px-3 py-1.5 text-13-regular bg-surface-base border border-accent-base rounded outline-none text-text-strong placeholder-text-weaker"
              placeholder="Select Default Shell"
              readonly
              autofocus
            />
          </div>
          <div class="max-h-[300px] overflow-y-auto py-1">
            <For each={shells}>
              {(shell, idx) => (
                <button
                  type="button"
                  class="w-full flex items-center justify-between px-4 py-2 text-13-regular text-left select-none transition-colors"
                  classList={{
                    "bg-accent-base text-white": selectedIndex() === idx(),
                    "text-text-strong hover:bg-surface-raised-base-hover": selectedIndex() !== idx(),
                  }}
                  onClick={() => {
                    setSelectedIndex(idx())
                    handleSelect()
                  }}
                >
                  <span>{shell.label}</span>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  )
}
