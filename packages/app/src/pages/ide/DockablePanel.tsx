import { type Component, createSignal, For, Show, type JSX, createEffect, onCleanup, splitProps } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"

export type PanelPosition = "left" | "right" | "bottom" | "center" | "floating"

export type PanelState = {
  id: string
  label: string
  icon: string
  position: PanelPosition
  visible: boolean
  width?: number
  height?: number
  x?: number
  y?: number
  order: number
}

export type DockRegion = "left" | "right" | "bottom" | "center"

export function createPanelManager(initial: PanelState[]) {
  const [panels, setPanels] = createSignal<PanelState[]>(initial)
  const [floatingPanels, setFloatingPanels] = createSignal<PanelState[]>([])
  const [dragState, setDragState] = createSignal<{
    panelId: string
    type: "dock" | "move" | "resize"
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    startXpos: number
    startYpos: number
  } | null>(null)

  const togglePanel = (id: string) => {
    setPanels(panels().map((p) => p.id === id ? { ...p, visible: !p.visible } : p))
  }

  const showPanel = (id: string) => {
    setPanels(panels().map((p) => p.id === id ? { ...p, visible: true } : p))
  }

  const hidePanel = (id: string) => {
    setPanels(panels().map((p) => p.id === id ? { ...p, visible: false } : p))
  }

  const movePanel = (id: string, position: PanelPosition) => {
    setPanels(panels().map((p) => p.id === id ? { ...p, position } : p))
  }

  const floatPanel = (id: string) => {
    const panel = panels().find((p) => p.id === id)
    if (!panel) return
    setPanels(panels().filter((p) => p.id !== id))
    setFloatingPanels([...floatingPanels(), { ...panel, position: "floating", x: 100, y: 100 }])
  }

  const dockPanel = (id: string, position: PanelPosition) => {
    const panel = floatingPanels().find((p) => p.id === id)
    if (!panel) return
    setFloatingPanels(floatingPanels().filter((p) => p.id !== id))
    setPanels([...panels(), { ...panel, position, x: undefined, y: undefined }])
  }

  const updateFloatingPanel = (id: string, updates: Partial<PanelState>) => {
    setFloatingPanels(floatingPanels().map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const closePanel = (id: string) => {
    const floating = floatingPanels().find((p) => p.id === id)
    if (floating) {
      setFloatingPanels(floatingPanels().filter((p) => p.id !== id))
    } else {
      hidePanel(id)
    }
  }

  const resizePanel = (id: string, width?: number, height?: number) => {
    setPanels(panels().map((p) => p.id === id ? { ...p, width: width ?? p.width, height: height ?? p.height } : p))
  }

  return {
    panels,
    floatingPanels,
    dragState,
    togglePanel,
    showPanel,
    hidePanel,
    movePanel,
    floatPanel,
    dockPanel,
    closePanel,
    resizePanel,
    updateFloatingPanel,
    setDragState,
  }
}

export type PanelManager = ReturnType<typeof createPanelManager>

export function DockablePanelHeader(props: {
  label: string
  icon: string
  actions?: JSX.Element
  onFloat?: () => void
  onClose?: () => void
  onDragStart?: (e: MouseEvent) => void
}) {
  return (
    <div
      class="flex items-center justify-between px-3 py-1.5 border-b border-border-base bg-surface-base shrink-0 select-none"
      style={{ "min-height": "34px" }}
      onMouseDown={props.onDragStart}
    >
      <div class="flex items-center gap-1.5 min-w-0">
        <Icon name={props.icon as any} size="small" class="text-icon-weak shrink-0" />
        <span class="text-11-medium text-text-weaker uppercase tracking-wider truncate">{props.label}</span>
      </div>
      <div class="flex items-center gap-0.5">
        {props.actions}
        <Show when={props.onFloat}>
          <Tooltip value="Float Panel" placement="bottom">
            <button
              type="button"
              class="size-5 flex items-center justify-center rounded hover:bg-surface-raised-base-hover transition-colors"
              onClick={props.onFloat}
            >
              <Icon name="expand" size="small" class="size-3 text-icon-weaker" />
            </button>
          </Tooltip>
        </Show>
        <Show when={props.onClose}>
          <Tooltip value="Close Panel" placement="bottom">
            <button
              type="button"
              class="size-5 flex items-center justify-center rounded hover:bg-surface-raised-base-hover transition-colors"
              onClick={props.onClose}
            >
              <Icon name="close" size="small" class="size-3 text-icon-weaker" />
            </button>
          </Tooltip>
        </Show>
      </div>
    </div>
  )
}

export function FloatingPanel(props: {
  panel: PanelState
  children: JSX.Element
  onDock?: (position: PanelPosition) => void
  onClose?: () => void
  onMove?: (pos: { x: number; y: number }) => void
  onResize?: (size: { width: number; height: number }) => void
}) {
  const [pos, setPos] = createSignal({ x: props.panel.x ?? 100, y: props.panel.y ?? 100 })
  const [size, setSize] = createSignal({ width: props.panel.width ?? 400, height: props.panel.height ?? 500 })
  const [dragging, setDragging] = createSignal(false)
  const [resizing, setResizing] = createSignal(false)
  const [showDockOptions, setShowDockOptions] = createSignal(false)

  const handleDragStart = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest("button")) return
    setDragging(true)
    const startX = e.clientX - pos().x
    const startY = e.clientY - pos().y

    const onMove = (ev: MouseEvent) => {
      setPos({ x: ev.clientX - startX, y: ev.clientY - startY })
    }
    const onUp = () => {
      setDragging(false)
      // Persist final position
      props.onMove?.(pos())
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  const handleResizeStart = (e: MouseEvent) => {
    e.preventDefault()
    setResizing(true)
    const startX = e.clientX
    const startY = e.clientY
    const startW = size().width
    const startH = size().height

    const onMove = (ev: MouseEvent) => {
      setSize({ width: Math.max(200, startW + ev.clientX - startX), height: Math.max(150, startH + ev.clientY - startY) })
    }
    const onUp = () => {
      setResizing(false)
      // Persist final size
      props.onResize?.(size())
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  return (
    <div
      class="fixed z-50 bg-surface-raised-base border border-border-base rounded-xl shadow-2xl flex flex-col overflow-hidden"
      classList={{ "transition-shadow duration-200": !dragging(), "shadow-3xl": dragging() }}
      style={{
        left: `${pos().x}px`,
        top: `${pos().y}px`,
        width: `${size().width}px`,
        height: `${size().height}px`,
      }}
    >
      {/* Header */}
      <div
        class="flex items-center justify-between px-3 py-2 border-b border-border-base cursor-grab shrink-0 select-none"
        classList={{ "cursor-grabbing": dragging() }}
        onMouseDown={handleDragStart}
      >
        <div class="flex items-center gap-2 min-w-0">
          <Icon name={props.panel.icon as any} size="small" class="text-accent-base shrink-0" />
          <span class="text-13-medium text-text-strong truncate">{props.panel.label}</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="relative">
            <Tooltip value="Dock to..." placement="bottom">
              <button
                type="button"
                class="size-6 flex items-center justify-center rounded hover:bg-surface-raised-base-hover transition-colors"
                onClick={() => setShowDockOptions(!showDockOptions())}
              >
                <Icon name="layout-left" size="small" class="text-icon-weak" />
              </button>
            </Tooltip>
            <Show when={showDockOptions()}>
              <div class="absolute top-full right-0 mt-1 z-50 bg-surface-raised-base border border-border-base rounded-lg shadow-xl py-1 w-36 animate-in fade-in slide-in-from-top-1 duration-100">
                <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { props.onDock?.("left"); setShowDockOptions(false) }}>Dock Left</button>
                <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { props.onDock?.("right"); setShowDockOptions(false) }}>Dock Right</button>
                <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { props.onDock?.("bottom"); setShowDockOptions(false) }}>Dock Bottom</button>
                <button class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-strong hover:bg-surface-raised-base-hover transition-colors" onClick={() => { props.onDock?.("center"); setShowDockOptions(false) }}>Dock Center</button>
              </div>
            </Show>
          </div>
          <Tooltip value="Close" placement="bottom">
            <button
              type="button"
              class="size-6 flex items-center justify-center rounded hover:bg-surface-raised-base-hover transition-colors"
              onClick={props.onClose}
            >
              <Icon name="close" size="small" class="text-icon-weak" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <div class="flex-1 min-h-0 overflow-auto">
        {props.children}
      </div>

      {/* Resize handle */}
      <div
        class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <div class="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-border-base rounded-sm" />
      </div>
    </div>
  )
}
