import { createSignal, createEffect, For, Show, onCleanup } from "solid-js"


export type RemoteType = "SSH" | "WSL" | "Container"

export type RemoteConnectionModalProps = {
  open: boolean
  onClose: () => void
  onConnect: (type: RemoteType, target: string) => void
}

type MainOption = {
  id: string
  label: string
  category?: string
  action: () => void
}

export default function RemoteConnectionModal(props: RemoteConnectionModalProps) {
  const [step, setStep] = createSignal<"main" | "ssh" | "wsl" | "container">("main")
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [sshInput, setSshInput] = createSignal("")

  // Mock data
  const wslDistros = ["Ubuntu", "Debian", "Alpine", "Kali-Linux"]
  const containers = ["node-app-dev", "python-data-sandbox", "go-backend-env", "rust-dev-container"]

  const mainOptions: MainOption[] = [
    {
      id: "ssh-connect",
      label: "Connect to SSH Host...",
      category: "Remote-SSH",
      action: () => setStep("ssh"),
    },
    {
      id: "ssh-current",
      label: "Connect to SSH Host in Current Window...",
      category: "Remote-SSH",
      action: () => setStep("ssh"),
    },
    {
      id: "container-open",
      label: "Open Folder in Container",
      category: "Dev Containers",
      action: () => setStep("container"),
    },
    {
      id: "container-attach",
      label: "Attach to Running Container",
      category: "Dev Containers",
      action: () => setStep("container"),
    },
    {
      id: "container-reopen",
      label: "Reopen in Container",
      category: "Dev Containers",
      action: () => setStep("container"),
    },
    {
      id: "wsl-connect",
      label: "Connect to WSL",
      category: "Remote-WSL",
      action: () => setStep("wsl"),
    },
    {
      id: "wsl-distro",
      label: "Connect to WSL using Distro...",
      category: "Remote-WSL",
      action: () => setStep("wsl"),
    },
  ]

  // Reset when open changes
  createEffect(() => {
    if (props.open) {
      setStep("main")
      setSelectedIndex(0)
      setSshInput("")
    }
  })

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.open) return

    const currentStep = step()
    let max = 0
    if (currentStep === "main") max = mainOptions.length
    else if (currentStep === "wsl") max = wslDistros.length
    else if (currentStep === "container") max = containers.length

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % max)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + max) % max)
    } else if (e.key === "Escape") {
      e.preventDefault()
      if (currentStep !== "main") {
        setStep("main")
        setSelectedIndex(0)
      } else {
        props.onClose()
      }
    } else if (e.key === "Enter") {
      e.preventDefault()
      handleSelect()
    }
  }

  const handleSelect = () => {
    const currentStep = step()
    const index = selectedIndex()

    if (currentStep === "main") {
      mainOptions[index].action()
      setSelectedIndex(0)
    } else if (currentStep === "ssh") {
      const host = sshInput().trim()
      if (host) {
        props.onConnect("SSH", host)
      }
    } else if (currentStep === "wsl") {
      props.onConnect("WSL", wslDistros[index])
    } else if (currentStep === "container") {
      props.onConnect("Container", containers[index])
    }
  }

  createEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown))
  })

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[50px] animate-in fade-in duration-100"
        onClick={props.onClose}
      >
        <div
          class="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-[600px] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Select Step */}
          <Show when={step() === "main"}>
            <div class="p-2 border-b border-[#3c3c3c]">
              <input
                type="text"
                class="w-full px-3 py-1.5 text-13-regular bg-[#3c3c3c] border border-[#007acc] rounded outline-none text-text-strong placeholder-text-weaker"
                placeholder="Select an option to open a Remote Window"
                readonly
                autofocus
              />
            </div>
            <div class="max-h-[300px] overflow-y-auto py-1">
              <For each={mainOptions}>
                {(opt, idx) => (
                  <button
                    type="button"
                    class="w-full flex items-center justify-between px-4 py-2 text-13-regular text-left select-none transition-colors"
                    classList={{
                      "bg-[#004b72] text-white": selectedIndex() === idx(),
                      "text-text-strong hover:bg-[#2a2d2e]": selectedIndex() !== idx(),
                    }}
                    onClick={() => {
                      setSelectedIndex(idx())
                      handleSelect()
                    }}
                  >
                    <span>{opt.label}</span>
                    <Show when={opt.category}>
                      <span
                        class="text-11-regular tracking-wide"
                        classList={{
                          "text-blue-300": selectedIndex() === idx(),
                          "text-accent-base": selectedIndex() !== idx(),
                        }}
                      >
                        {opt.category}
                      </span>
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </Show>

          {/* SSH Host Input Step */}
          <Show when={step() === "ssh"}>
            <div class="p-3 border-b border-[#3c3c3c]">
              <div class="text-11-bold text-text-weaker mb-1.5 uppercase tracking-wide">Connect to SSH Host</div>
              <input
                type="text"
                class="w-full px-3 py-1.5 text-13-regular bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] rounded outline-none text-text-strong placeholder-text-weaker"
                placeholder="Enter SSH Host (e.g. user@hostname or Host)"
                value={sshInput()}
                onInput={(e) => setSshInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSelect()
                  if (e.key === "Escape") {
                    e.preventDefault()
                    setStep("main")
                    setSelectedIndex(0)
                  }
                }}
                autofocus
              />
              <div class="text-11-regular text-text-weaker mt-2">
                Press Enter to connect, Escape to go back.
              </div>
            </div>
          </Show>

          {/* WSL Distro Select Step */}
          <Show when={step() === "wsl"}>
            <div class="p-2 border-b border-[#3c3c3c] bg-[#1e1e1e] px-4 py-2">
              <span class="text-11-bold text-text-weaker uppercase tracking-wide">Select WSL Distro</span>
            </div>
            <div class="max-h-[300px] overflow-y-auto py-1">
              <For each={wslDistros}>
                {(distro, idx) => (
                  <button
                    type="button"
                    class="w-full flex items-center justify-between px-4 py-2 text-13-regular text-left select-none transition-colors"
                    classList={{
                      "bg-[#004b72] text-white": selectedIndex() === idx(),
                      "text-text-strong hover:bg-[#2a2d2e]": selectedIndex() !== idx(),
                    }}
                    onClick={() => {
                      setSelectedIndex(idx())
                      handleSelect()
                    }}
                  >
                    <span>{distro}</span>
                    <span
                      class="text-11-regular"
                      classList={{
                        "text-blue-300": selectedIndex() === idx(),
                        "text-text-weaker": selectedIndex() !== idx(),
                      }}
                    >
                      WSL Distro
                    </span>
                  </button>
                )}
              </For>
            </div>
          </Show>

          {/* Container Select Step */}
          <Show when={step() === "container"}>
            <div class="p-2 border-b border-[#3c3c3c] bg-[#1e1e1e] px-4 py-2">
              <span class="text-11-bold text-text-weaker uppercase tracking-wide">Select Dev Container</span>
            </div>
            <div class="max-h-[300px] overflow-y-auto py-1">
              <For each={containers}>
                {(container, idx) => (
                  <button
                    type="button"
                    class="w-full flex items-center justify-between px-4 py-2 text-13-regular text-left select-none transition-colors"
                    classList={{
                      "bg-[#004b72] text-white": selectedIndex() === idx(),
                      "text-text-strong hover:bg-[#2a2d2e]": selectedIndex() !== idx(),
                    }}
                    onClick={() => {
                      setSelectedIndex(idx())
                      handleSelect()
                    }}
                  >
                    <span>{container}</span>
                    <span
                      class="text-11-regular"
                      classList={{
                        "text-blue-300": selectedIndex() === idx(),
                        "text-text-weaker": selectedIndex() !== idx(),
                      }}
                    >
                      Container
                    </span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  )
}
