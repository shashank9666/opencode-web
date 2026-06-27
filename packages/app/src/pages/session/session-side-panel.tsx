import { For, Match, Show, Switch, createEffect, createMemo, createSignal, onCleanup, type JSX } from "solid-js"
import { Portal } from "solid-js/web"
import { createStore } from "solid-js/store"
import { createMediaQuery } from "@solid-primitives/media"
import { Tabs } from "@opencode-ai/ui/tabs"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { TooltipKeybind } from "@opencode-ai/ui/tooltip"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { Mark } from "@opencode-ai/ui/logo"
import { DragDropProvider, DragDropSensors, DragOverlay, SortableProvider, closestCenter } from "@thisbeyond/solid-dnd"
import type { DragEvent } from "@thisbeyond/solid-dnd"
import type { SnapshotFileDiff, VcsFileDiff } from "@opencode-ai/sdk/v2"
import { ConstrainDragYAxis, getDraggableId } from "@/utils/solid-dnd"
import { useDialog } from "@opencode-ai/ui/context/dialog"

import FileTree from "@/components/file-tree"
import { SessionContextUsage } from "@/components/session-context-usage"
import { ToolTimeline } from "@/components/session/tool-timeline"
import { AgentCapabilities } from "@/components/session/agent-capabilities"
import { AgentCapabilitiesProvider } from "@/context/agent-capabilities"
import { KnowledgePanel } from "@/components/session/knowledge-panel"
import { ProductionFeatures } from "@/components/session/production-features"
import { BackgroundTasksPanel } from "@/components/session/background-tasks"
import { MultiAgentView, type SubAgent, type MasterMergeStatus } from "@/components/session/multi-agent-view"
import { VerificationPipeline } from "@/components/session/verification-pipeline"
import { FileChangeTracking, SessionContextTab, SortableTab, FileVisual } from "@/components/session"
import { useCommand } from "@/context/command"
import { useFile, type SelectedLineRange } from "@/context/file"
import { useSDK } from "@/context/sdk"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { usePlatform } from "@/context/platform"
import { useSettings } from "@/context/settings"
import { useSync } from "@/context/sync"
import { getFilename } from "@opencode-ai/core/util/path"
import { createFileTabListSync } from "@/pages/session/file-tab-scroll"
import { FileTabContent } from "@/pages/session/file-tabs"
import {
  createOpenSessionFileTab,
  createSessionTabs,
  getTabReorderIndex,
  shouldShowFileTree,
  type Sizing,
} from "@/pages/session/helpers"
import { setSessionHandoff } from "@/pages/session/handoff"
import { useSessionLayout } from "@/pages/session/session-layout"

type RenderDiff = (SnapshotFileDiff & { file: string }) | VcsFileDiff

function renderDiff(value: SnapshotFileDiff | VcsFileDiff): value is RenderDiff {
  return typeof value.file === "string"
}

export function SessionSidePanel(props: {
  canReview: () => boolean
  diffs: () => (SnapshotFileDiff | VcsFileDiff)[]
  diffsReady: () => boolean
  empty: () => string
  hasReview: () => boolean
  reviewCount: () => number
  reviewPanel: () => JSX.Element
  activeDiff?: string
  focusReviewDiff: (path: string) => void
  reviewSnap: boolean
  size: Sizing
  multiAgent?: { agents: SubAgent[]; mergeStatus: MasterMergeStatus }
  showVerification?: boolean
}) {
  const layout = useLayout()
  const settings = useSettings()
  const sync = useSync()
  const file = useFile()
  const language = useLanguage()
  const command = useCommand()
  const dialog = useDialog()
  const sdk = useSDK()
  const { sessionKey, tabs, view, params } = useSessionLayout()

  const isDesktop = createMediaQuery("(min-width: 768px)")
  const shown = settings.visibility.fileTree

  const reviewOpen = createMemo(() => isDesktop() && view().reviewPanel.opened())
  const fileOpen = createMemo(
    () =>
      isDesktop() &&
      shouldShowFileTree({
        visible: shown(),
        opened: layout.fileTree.opened(),
      }),
  )
  const open = createMemo(() => reviewOpen() || fileOpen())
  const reviewTab = createMemo(() => isDesktop())
  const panelWidth = createMemo(() => {
    if (!open()) return "0px"
    if (reviewOpen()) return "auto"
    return `${layout.fileTree.width()}px`
  })
  const treeWidth = createMemo(() => (fileOpen() ? `${layout.fileTree.width()}px` : "0px"))

  const diffs = createMemo(() => props.diffs().filter(renderDiff))
  const diffFiles = createMemo(() => diffs().map((d) => d.file))
  const kinds = createMemo(() => {
    const merge = (a: "add" | "del" | "mix" | undefined, b: "add" | "del" | "mix") => {
      if (!a) return b
      if (a === b) return a
      return "mix" as const
    }

    const normalize = (p: string) => p.replaceAll("\\\\", "/").replace(/\/+$/, "")

    const out = new Map<string, "add" | "del" | "mix">()
    for (const diff of diffs()) {
      const file = normalize(diff.file)
      const kind = diff.status === "added" ? "add" : diff.status === "deleted" ? "del" : "mix"

      out.set(file, kind)

      const parts = file.split("/")
      for (const [idx] of parts.slice(0, -1).entries()) {
        const dir = parts.slice(0, idx + 1).join("/")
        if (!dir) continue
        out.set(dir, merge(out.get(dir), kind))
      }
    }
    return out
  })

  const empty = (msg: string) => (
    <div class="h-full flex flex-col">
      <div class="h-6 shrink-0" aria-hidden />
      <div class="flex-1 pb-64 flex items-center justify-center text-center">
        <div class="text-12-regular text-text-weak">{msg}</div>
      </div>
    </div>
  )

  const nofiles = createMemo(() => {
    const state = file.tree.state("")
    if (!state?.loaded) return false
    return file.tree.children("").length === 0
  })

  const normalizeTab = (tab: string) => {
    if (!tab.startsWith("file://")) return tab
    return file.tab(tab)
  }

  const openReviewPanel = () => {
    if (!view().reviewPanel.opened()) view().reviewPanel.open()
  }

  const openTab = createOpenSessionFileTab({
    normalizeTab,
    openTab: tabs().open,
    pathFromTab: file.pathFromTab,
    loadFile: file.load,
    openReviewPanel,
    setActive: tabs().setActive,
  })

  const tabState = createSessionTabs({
    tabs,
    pathFromTab: file.pathFromTab,
    normalizeTab,
    review: reviewTab,
    hasReview: props.canReview,
  })
  const contextOpen = tabState.contextOpen
  const openedTabs = tabState.openedTabs
  const activeTab = tabState.activeTab
  const activeFileTab = tabState.activeFileTab

  const fileTreeTab = () => layout.fileTree.tab()

  const setFileTreeTabValue = (value: string) => {
    if (value !== "changes" && value !== "all") return
    layout.fileTree.setTab(value)
  }

  const showAllFiles = () => {
    if (fileTreeTab() !== "changes") return
    layout.fileTree.setTab("all")
  }

  const platform = usePlatform()

  const [changesActive, setChangesActive] = createSignal(false)
  const effectiveTab = createMemo(() => changesActive() ? "changes" : activeTab())

  const handleTabChange = (value: string) => {
    if (value === "changes") {
      setChangesActive(true)
      tabs().open("changes")
      tabs().setActive("changes")
      return
    }
    setChangesActive(false)
    openTab(value)
  }

  const acceptDiff = async (filePath: string) => {
    const data = (await sdk().client.file.read({ path: filePath })) as { data?: string | null }
    const content = data.data ?? ""
    await sdk().client.v2.fs.write({ path: filePath, content })
  }

  const rejectDiff = async (filePath: string) => {
    try { await sdk().client.v2.fs.delete({ path: filePath }) } catch {}
  }

  const viewDiff = (filePath: string) => {
    setChangesActive(false)
    props.focusReviewDiff(filePath)
    if (!view().reviewPanel.opened()) view().reviewPanel.open()
  }

  const editFile = (filePath: string) => {
    setChangesActive(false)
    const tab = file.tab(filePath)
    tabs().open(tab)
    tabs().setActive(tab)
    void file.load(filePath)
  }

  const [store, setStore] = createStore({
    activeDraggable: undefined as string | undefined,
    contextMenu: undefined as { x: number; y: number; node: { path: string; type: string } } | undefined,
  })

  const handleFileContextMenu = (e: MouseEvent, node: { path: string; type: string }) => {
    e.preventDefault()
    e.stopPropagation()
    setStore("contextMenu", { x: e.clientX, y: e.clientY, node })
  }

  const closeContextMenu = () => setStore("contextMenu", undefined)

  const copyToClipboard = (text: string) => {
    try { if (navigator.clipboard) navigator.clipboard.writeText(text) } catch {}
  }

  const copyPath = () => {
    const node = store.contextMenu?.node
    if (!node) return
    copyToClipboard(node.path)
    closeContextMenu()
  }

  const copyRelativePath = () => {
    const node = store.contextMenu?.node
    if (!node) return
    copyToClipboard(node.path)
    closeContextMenu()
  }

  const openInTerminal = () => {
    const node = store.contextMenu?.node
    if (!node || platform.platform !== "desktop" || !platform.openPath) return
    const dir = node.type === "directory" ? node.path : node.path.split("/").slice(0, -1).join("/")
    if (dir) platform.openPath(dir)
    closeContextMenu()
  }

  const revealInExplorer = () => {
    const node = store.contextMenu?.node
    if (!node) return
    window.dispatchEvent(new CustomEvent("reveal-in-explorer", { detail: { path: node.path } }))
    closeContextMenu()
  }

  const deleteFile = async () => {
    const node = store.contextMenu?.node
    if (!node) return
    try {
      await sdk().client.v2.fs.delete({ path: node.path })
    } catch (err) {
      console.error("Failed to delete file:", err)
    }
    closeContextMenu()
  }

  const handleDragStart = (event: unknown) => {
    const id = getDraggableId(event)
    if (!id) return
    setStore("activeDraggable", id)
  }

  const handleDragOver = (event: DragEvent) => {
    const { draggable, droppable } = event
    if (!draggable || !droppable) return

    const currentTabs = tabs().all()
    const toIndex = getTabReorderIndex(currentTabs, draggable.id.toString(), droppable.id.toString())
    if (toIndex === undefined) return
    tabs().move(draggable.id.toString(), toIndex)
  }

  const handleDragEnd = () => {
    setStore("activeDraggable", undefined)
  }

  createEffect(() => {
    if (!file.ready()) return

    setSessionHandoff(sessionKey(), {
      files: tabs()
        .all()
        .reduce<Record<string, SelectedLineRange | null>>((acc, tab) => {
          const path = file.pathFromTab(tab)
          if (!path) return acc

          const selected = file.selectedLines(path)
          acc[path] =
            selected && typeof selected === "object" && "start" in selected && "end" in selected
              ? (selected as SelectedLineRange)
              : null

          return acc
        }, {}),
    })
  })

  return (
    <Show when={isDesktop() && !(settings.general.newLayoutDesigns() && !params.id)}>
      <aside
        id="review-panel"
        aria-label={language.t("session.panel.reviewAndFiles")}
        aria-hidden={!open()}
        inert={!open()}
        class="relative min-w-0 h-full flex shrink-0 overflow-hidden bg-background-base"
        classList={{
          "pointer-events-none": !open(),
          "transition-[width] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] motion-reduce:transition-none":
            !props.size.active() && !props.reviewSnap,
          "rounded-[10px] shadow-[var(--v2-elevation-raised)] overflow-hidden": settings.general.newLayoutDesigns(),
          "flex-1": reviewOpen(),
        }}
        style={{ width: panelWidth() }}
      >
        <Show when={open()}>
          <div
            class="size-full flex"
            classList={{
              "border-l border-border-weaker-base": !settings.general.newLayoutDesigns(),
            }}
          >
            <div
              aria-hidden={!reviewOpen()}
              inert={!reviewOpen()}
              class="relative min-w-0 h-full flex-1 overflow-hidden bg-background-base"
              classList={{
                "pointer-events-none": !reviewOpen(),
              }}
            >
              <div class="size-full min-w-0 h-full bg-background-base">
                <DragDropProvider
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  collisionDetector={closestCenter}
                >
                  <DragDropSensors />
                  <ConstrainDragYAxis />
                  <Tabs value={effectiveTab()} onChange={handleTabChange}>
                    <div class="sticky top-0 shrink-0 flex">
                      <Tabs.List
                        ref={(el: HTMLDivElement) => {
                          const stop = createFileTabListSync({ el, contextOpen })
                          onCleanup(stop)
                        }}
                      >
                        <Show when={reviewTab() && props.canReview()}>
                          <Tabs.Trigger value="review">
                            <div class="flex items-center gap-1.5">
                              <div>{language.t("session.tab.review")}</div>
                              <Show when={props.hasReview()}>
                                <div>{props.reviewCount()}</div>
                              </Show>
                            </div>
                          </Tabs.Trigger>
                        </Show>
                        <Show when={contextOpen()}>
                          <Tabs.Trigger
                            value="context"
                            closeButton={
                              <TooltipKeybind
                                title={language.t("common.closeTab")}
                                keybind={command.keybind("tab.close")}
                                placement="bottom"
                                gutter={10}
                              >
                                <IconButton
                                  icon="close-small"
                                  variant="ghost"
                                  class="h-5 w-5"
                                  onClick={() => tabs().close("context")}
                                  aria-label={language.t("common.closeTab")}
                                />
                              </TooltipKeybind>
                            }
                            hideCloseButton
                            onMiddleClick={() => tabs().close("context")}
                          >
                            <div class="flex items-center gap-2">
                              <SessionContextUsage variant="indicator" />
                              <div>{language.t("session.tab.context")}</div>
                            </div>
                          </Tabs.Trigger>
                        </Show>
                        <Tabs.Trigger value="tools">
                          <div class="flex items-center gap-1.5">
                            <Icon name="mcp" size="small" />
                            <div>Tools</div>
                          </div>
                        </Tabs.Trigger>
                        <Tabs.Trigger value="capabilities">
                          <div class="flex items-center gap-1.5">
                            <Icon name="sliders" size="small" />
                            <div>Capabilities</div>
                          </div>
                        </Tabs.Trigger>
                        <Show when={props.canReview() && props.diffsReady() && props.diffs().length > 0}>
                          <Tabs.Trigger value="changes">
                            <div class="flex items-center gap-1.5">
                              <Icon name="branch" size="small" />
                              <div>Changes</div>
                              <div>{props.reviewCount()}</div>
                            </div>
                          </Tabs.Trigger>
                        </Show>
                        <Tabs.Trigger value="knowledge">
                          <div class="flex items-center gap-1.5">
                            <Icon name="brain" size="small" />
                            <div>Knowledge</div>
                          </div>
                        </Tabs.Trigger>
                        <Tabs.Trigger value="production">
                          <div class="flex items-center gap-1.5">
                            <Icon name="settings-gear" size="small" />
                            <div>Production</div>
                          </div>
                        </Tabs.Trigger>
                        <Tabs.Trigger value="background">
                          <div class="flex items-center gap-1.5">
                            <Icon name="checklist" size="small" />
                            <div>Background</div>
                          </div>
                        </Tabs.Trigger>
                        <Show when={props.multiAgent}>
                          <Tabs.Trigger value="multi-agent">
                            <div class="flex items-center gap-1.5">
                              <Icon name="branch" size="small" />
                              <div>Multi-Agent</div>
                            </div>
                          </Tabs.Trigger>
                        </Show>
                        <Show when={props.showVerification}>
                          <Tabs.Trigger value="verify">
                            <div class="flex items-center gap-1.5">
                              <Icon name="shield" size="small" />
                              <div>Verify</div>
                            </div>
                          </Tabs.Trigger>
                        </Show>
                        <SortableProvider ids={openedTabs()}>
                          <For each={openedTabs()}>{(tab) => <SortableTab tab={tab} onTabClose={tabs().close} />}</For>
                        </SortableProvider>
                        <div class="bg-background-stronger h-full shrink-0 sticky right-0 z-10 flex items-center justify-center pr-3">
                          <TooltipKeybind
                            title={language.t("command.file.open")}
                            keybind={command.keybind("file.open")}
                            class="flex items-center"
                          >
                            <IconButton
                              icon="plus-small"
                              variant="ghost"
                              iconSize="large"
                              class="!rounded-md"
                              onClick={() => {
                                void import("@/components/dialog-select-file").then((x) => {
                                  dialog.show(() => <x.DialogSelectFile mode="files" onOpenFile={showAllFiles} />)
                                })
                              }}
                              aria-label={language.t("command.file.open")}
                            />
                          </TooltipKeybind>
                        </div>
                      </Tabs.List>
                    </div>

                    <Show when={reviewTab() && props.canReview()}>
                      <Tabs.Content value="review" class="flex flex-col h-full overflow-hidden contain-strict">
                        <Show when={reviewOpen() && activeTab() === "review"}>{props.reviewPanel()}</Show>
                      </Tabs.Content>
                    </Show>

                    <Tabs.Content value="empty" class="flex flex-col h-full overflow-hidden contain-strict">
                      <Show when={activeTab() === "empty"}>
                        <div class="relative pt-2 flex-1 min-h-0 overflow-hidden">
                          <div class="h-full px-6 pb-42 -mt-4 flex flex-col items-center justify-center text-center gap-6">
                            <Mark class="w-14 opacity-10" />
                            <div class="text-14-regular text-text-weak max-w-56">
                              {language.t("session.files.selectToOpen")}
                            </div>
                          </div>
                        </div>
                      </Show>
                    </Tabs.Content>

                    <Show when={contextOpen()}>
                      <Tabs.Content value="context" class="flex flex-col h-full overflow-hidden contain-strict">
                        <Show when={activeTab() === "context"}>
                          <div class="relative pt-2 flex-1 min-h-0 overflow-hidden">
                            <SessionContextTab />
                          </div>
                        </Show>
                      </Tabs.Content>
                    </Show>

                    <Tabs.Content value="tools" class="flex flex-col h-full overflow-hidden contain-strict">
                      <Show when={activeTab() === "tools"}>
                        <ToolTimeline />
                      </Show>
                    </Tabs.Content>

                    <Tabs.Content value="capabilities" class="flex flex-col h-full overflow-hidden contain-strict">
                      <Show when={activeTab() === "capabilities"}>
                        <AgentCapabilitiesProvider>
                          <AgentCapabilities />
                        </AgentCapabilitiesProvider>
                      </Show>
                    </Tabs.Content>

                    <Tabs.Content value="changes" class="flex flex-col h-full overflow-hidden contain-strict">
                      <Show when={effectiveTab() === "changes"}>
                        <FileChangeTracking
                          diffs={diffs()}
                          onAccept={async (file) => {
                            try {
                              const result = (await sdk().client.file.read({ path: file })) as { data?: string | null }
                              if (result.data) await sdk().client.v2.fs.write({ path: file, content: result.data })
                            } catch {}
                          }}
                          onReject={async (file) => {
                            try { await sdk().client.v2.fs.delete({ path: file }) } catch {}
                          }}
                          onViewDiff={viewDiff}
                          onEdit={editFile}
                          onAcceptAll={() => {
                            for (const d of diffs()) {
                              if (d.file) acceptDiff(d.file)
                            }
                          }}
                          onRejectAll={() => {
                            for (const d of diffs()) {
                              if (d.file) rejectDiff(d.file)
                            }
                          }}
                          class="flex-1 overflow-y-auto"
                        />
                      </Show>
                    </Tabs.Content>

                    <Tabs.Content value="knowledge" class="flex flex-col h-full overflow-hidden contain-strict">
                      <Show when={activeTab() === "knowledge"}>
                        <KnowledgePanel />
                      </Show>
                    </Tabs.Content>

                    <Tabs.Content value="production" class="flex flex-col h-full overflow-hidden contain-strict">
                      <Show when={activeTab() === "production"}>
                        <ProductionFeatures />
                      </Show>
                    </Tabs.Content>

                    <Tabs.Content value="background" class="flex flex-col h-full overflow-hidden contain-strict">
                      <Show when={activeTab() === "background"}>
                        <BackgroundTasksPanel />
                      </Show>
                    </Tabs.Content>

                    <Show when={props.multiAgent}>
                      <Tabs.Content value="multi-agent" class="flex flex-col h-full overflow-hidden contain-strict">
                        <Show when={activeTab() === "multi-agent"}>
                          <MultiAgentView agents={props.multiAgent!.agents} mergeStatus={props.multiAgent!.mergeStatus} />
                        </Show>
                      </Tabs.Content>
                    </Show>

                    <Show when={props.showVerification}>
                      <Tabs.Content value="verify" class="flex flex-col h-full overflow-hidden contain-strict">
                        <Show when={activeTab() === "verify"}>
                          <VerificationPipeline />
                        </Show>
                      </Tabs.Content>
                    </Show>

                    <Show when={activeFileTab()} keyed>
                      {(tab) => <FileTabContent tab={tab} />}
                    </Show>
                  </Tabs>
                  <DragOverlay>
                    <Show when={store.activeDraggable} keyed>
                      {(tab) => {
                        const path = file.pathFromTab(tab)
                        return (
                          <div data-component="tabs-drag-preview">
                            <Show when={path}>{(p) => <FileVisual active path={p()} />}</Show>
                          </div>
                        )
                      }}
                    </Show>
                  </DragOverlay>
                </DragDropProvider>
              </div>
            </div>

            <Show when={shown()}>
              <div
                id="file-tree-panel"
                aria-hidden={!fileOpen()}
                inert={!fileOpen()}
                class="relative min-w-0 h-full shrink-0 overflow-hidden"
                classList={{
                  "pointer-events-none": !fileOpen(),
                  "transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] motion-reduce:transition-none":
                    !props.size.active(),
                }}
                style={{ width: treeWidth() }}
              >
                <div
                  class="h-full flex flex-col overflow-hidden group/filetree"
                  classList={{ "border-l border-border-weaker-base": reviewOpen() }}
                >
                  <Tabs
                    variant="pill"
                    value={fileTreeTab()}
                    onChange={setFileTreeTabValue}
                    class="h-full"
                    data-scope="filetree"
                  >
                    <Tabs.List>
                      <Tabs.Trigger value="changes" class="flex-1" classes={{ button: "w-full" }}>
                        {props.reviewCount()}{" "}
                        {language.t(
                          props.reviewCount() === 1 ? "session.review.change.one" : "session.review.change.other",
                        )}
                      </Tabs.Trigger>
                      <Tabs.Trigger value="all" class="flex-1" classes={{ button: "w-full" }}>
                        {language.t("session.files.all")}
                      </Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content value="changes" class="bg-background-stronger px-3 py-0">
                      <Switch>
                        <Match when={props.hasReview() || !props.diffsReady()}>
                          <Show
                            when={props.diffsReady()}
                            fallback={
                              <div class="px-2 py-2 text-12-regular text-text-weak">
                                {language.t("common.loading")}
                                {language.t("common.loading.ellipsis")}
                              </div>
                            }
                          >
                            <FileTree
                              path=""
                              class="pt-3"
                              allowed={diffFiles()}
                              kinds={kinds()}
                              draggable={false}
                              active={props.activeDiff}
                              onFileClick={(node) => props.focusReviewDiff(node.path)}
                              onContextMenu={handleFileContextMenu}
                            />
                          </Show>
                        </Match>
                      </Switch>
                    </Tabs.Content>
                    <Tabs.Content value="all" class="bg-background-stronger px-3 py-0">
                      <Switch>
                        <Match when={nofiles()}>{empty(language.t("session.files.empty"))}</Match>
                        <Match when={true}>
                          <FileTree
                            path=""
                            class="pt-3"
                            modified={diffFiles()}
                            kinds={kinds()}
                            onFileClick={(node) => openTab(file.tab(node.path))}
                            onContextMenu={handleFileContextMenu}
                          />
                        </Match>
                      </Switch>
                    </Tabs.Content>
                  </Tabs>
                </div>
                <Show when={fileOpen()}>
                  <div onPointerDown={() => props.size.start()}>
                    <ResizeHandle
                      direction="horizontal"
                      edge="start"
                      size={layout.fileTree.width()}
                      min={200}
                      max={480}
                      onResize={(width) => {
                        props.size.touch()
                        layout.fileTree.resize(width)
                      }}
                    />
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
      </aside>
      <Show when={store.contextMenu}>
        <Portal>
          <div
            class="fixed inset-0 z-50"
            onPointerDown={closeContextMenu}
            onContextMenu={(e) => { e.preventDefault(); closeContextMenu() }}
          >
            <div
              class="absolute min-w-[180px] py-1 bg-background-base border border-border-base rounded-lg shadow-lg overflow-hidden"
              style={{ left: `${store.contextMenu!.x}px`, top: `${store.contextMenu!.y}px` }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-base hover:bg-surface-raised-base-hover text-left"
                onClick={copyPath}
              >
                <Icon name="copy" size="small" class="text-icon-weak shrink-0" />
                Copy Path
              </button>
              <button
                type="button"
                class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-base hover:bg-surface-raised-base-hover text-left"
                onClick={copyRelativePath}
              >
                <Icon name="copy" size="small" class="text-icon-weak shrink-0" />
                Copy Relative Path
              </button>
              <div class="h-px bg-border-base mx-2 my-1" />
              <Show when={platform.platform === "desktop"}>
                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-base hover:bg-surface-raised-base-hover text-left"
                  onClick={revealInExplorer}
                >
                  <Icon name="folder" size="small" class="text-icon-weak shrink-0" />
                  Reveal in Explorer
                </button>
                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-base hover:bg-surface-raised-base-hover text-left"
                  onClick={openInTerminal}
                >
                  <Icon name="terminal" size="small" class="text-icon-weak shrink-0" />
                  Open in Terminal
                </button>
              </Show>
              <div class="h-px bg-border-base mx-2 my-1" />
              <button
                type="button"
                class="w-full flex items-center gap-2 px-3 py-1.5 text-13-regular text-text-danger-base hover:bg-surface-raised-base-hover text-left"
                onClick={deleteFile}
              >
                <Icon name="trash" size="small" class="text-icon-weak shrink-0" />
                Delete
              </button>
            </div>
          </div>
        </Portal>
      </Show>
    </Show>
  )
}
