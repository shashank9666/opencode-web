import { createSignal, onCleanup } from "solid-js"
import { Dialog as Kobalte } from "@kobalte/core/dialog"
import { useI18n } from "../context/i18n"
import { IconButton } from "./icon-button"

export interface ImagePreviewProps {
  src: string
  alt?: string
}

const ZOOM_STEP = 0.25
const MIN_ZOOM = 0.25
const MAX_ZOOM = 5

function ToolbarBtn(props: { onClick: () => void; disabled?: boolean; children: any }) {
  return (
    <button
      type="button"
      class="flex items-center justify-center size-6 rounded text-icon-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors disabled:opacity-30"
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

export function ImagePreview(props: ImagePreviewProps) {
  const i18n = useI18n()
  const [zoom, setZoom] = createSignal(1)
  const [pan, setPan] = createSignal({ x: 0, y: 0 })
  const [dragging, setDragging] = createSignal(false)
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 })
  const [panStart, setPanStart] = createSignal({ x: 0, y: 0 })

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)))
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (zoom() <= 1) return
    setDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setPanStart({ x: pan().x, y: pan().y })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging()) return
    setPan({ x: panStart().x + e.clientX - dragStart().x, y: panStart().y + e.clientY - dragStart().y })
  }

  const handleMouseUp = () => setDragging(false)

  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP))
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP))
  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }) }
  const zoomPercent = () => Math.round(zoom() * 100)

  onCleanup(() => { setDragging(false) })

  return (
    <div data-component="image-preview" onWheel={handleWheel}>
      <div data-slot="image-preview-container">
        <Kobalte.Content data-slot="image-preview-content">
          <div data-slot="image-preview-header">
            <Kobalte.CloseButton
              data-slot="image-preview-close"
              as={IconButton}
              icon="close"
              variant="ghost"
              aria-label={i18n.t("ui.common.close")}
            />
          </div>
          <div
            data-slot="image-preview-body"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={props.src}
              alt={props.alt ?? i18n.t("ui.imagePreview.alt")}
              data-slot="image-preview-image"
              draggable={false}
              style={{
                transform: `translate(${pan().x}px, ${pan().y}px) scale(${zoom()})`,
                "max-width": zoom() > 1 ? "none" : undefined,
                "max-height": zoom() > 1 ? "none" : undefined,
              }}
            />
          </div>
          <div data-slot="image-preview-toolbar">
            <ToolbarBtn onClick={zoomOut} disabled={zoom() <= MIN_ZOOM}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
            </ToolbarBtn>
            <span data-slot="image-preview-zoom-label">{zoomPercent()}%</span>
            <ToolbarBtn onClick={zoomIn} disabled={zoom() >= MAX_ZOOM}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
            </ToolbarBtn>
            <div data-slot="image-preview-divider" />
            <button
              type="button"
              class="text-12-regular text-text-weak hover:text-text-strong px-2 py-0.5 rounded transition-colors"
              onClick={resetZoom}
            >
              Fit
            </button>
            <button
              type="button"
              class="text-12-regular text-text-weak hover:text-text-strong px-2 py-0.5 rounded transition-colors"
              onClick={resetZoom}
            >
              Actual
            </button>
          </div>
        </Kobalte.Content>
      </div>
    </div>
  )
}
