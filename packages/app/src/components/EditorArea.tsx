import { createSignal, createMemo, createEffect, onCleanup, For, Match, Switch, Show } from "solid-js";
import { Icon } from "@opencode-ai/ui/icon";
import { IconButton } from "@opencode-ai/ui/icon-button";
import { ContextMenu } from "@opencode-ai/ui/context-menu";
import { getFilename } from "@opencode-ai/core/util/path";
import IdeEditor, { IdeDiffEditor } from "./ide-editor";
import InlineAIToolbar from "./inline-ai-toolbar";
import { SplitPane } from "./SplitPane";
import type { EditorNode, EditorGroup, OpenFile } from "./editor-workspace";
import * as monaco from "monaco-editor";
import { useFile } from "@/context/file";
import { useSettings } from "@/context/settings";
import { useSDK } from "@/context/sdk";

import { Button } from "@opencode-ai/ui/button";
import { MarkdownPreviewPanel } from "./MarkdownPreviewPanel";

let draggedTab: { path: string; sourceGroupId: string } | null = null

export function EditorArea(props: {
  node: EditorNode;
  activeGroupId: string;
  workspace: ReturnType<typeof import("./editor-workspace").createEditorWorkspace>;
  onSaveFile: (path: string, groupId: string) => Promise<void>;
  diffMode: boolean;
  onToggleDiff: () => void;
  fontSize: number;
  tabSize: number;
  wordWrap: "off" | "on" | "wordWrapColumn" | "bounded";
  formatTrigger: number;
  onInlineAIAction: (payload: any, groupId: string) => void;
  previewDiff?: { path: string; modified: string; original?: string };
  onAcceptDiff?: () => void;
  onRejectDiff?: () => void;
  onCursorChange?: (line: number, column: number) => void;
}) {
  return (
    <Switch>
      <Match when={props.node.type === "split" ? (props.node as Extract<EditorNode, { type: "split" }>) : null}>
        {(splitNode) => (
          <SplitPane direction={splitNode().direction} initialSizes={splitNode().sizes}>
            <For each={splitNode().children}>
              {(child) => <EditorArea {...props} node={child} />}
            </For>
          </SplitPane>
        )}
      </Match>
      <Match when={props.node.type === "group"}>
        <EditorAreaGroup {...props} />
      </Match>
    </Switch>
  );
}

export function EditorAreaGroup(props: {
  node: EditorNode;
  activeGroupId: string;
  workspace: ReturnType<typeof import("./editor-workspace").createEditorWorkspace>;
  onSaveFile: (path: string, groupId: string) => Promise<void>;
  diffMode: boolean;
  onToggleDiff: () => void;
  fontSize: number;
  tabSize: number;
  wordWrap: "off" | "on" | "wordWrapColumn" | "bounded";
  formatTrigger: number;
  onInlineAIAction: (payload: any, groupId: string) => void;
  previewDiff?: { path: string; modified: string; original?: string };
  onAcceptDiff?: () => void;
  onRejectDiff?: () => void;
  onCursorChange?: (line: number, column: number) => void;
}) {
  const group = () => (props.node as Extract<EditorNode, { type: "group" }>).group;
  const activeFile = () => group().activeFile;
  const isActiveGroup = () => props.activeGroupId === group().id;

  const activeFileState = createMemo(() => {
    const currentActiveFile = activeFile();
    if (!currentActiveFile) return null;
    return group().files.find(f => f.path === currentActiveFile) || null;
  });

  const [editorInstance, setEditorInstance] = createSignal<monaco.editor.IStandaloneCodeEditor | undefined>(undefined);
  const [editorLine, setEditorLine] = createSignal(1);
  const [editorColumn, setEditorColumn] = createSignal(1);
  const [showPreview, setShowPreview] = createSignal(false)
  const isMarkdownFile = () => {
    const f = activeFile()
    return f ? f.toLowerCase().endsWith(".md") : false
  }

  const file = useFile();
  const settings = useSettings();
  const sdk = useSDK();

  let prevActiveFile: string | null = null;
  createEffect(() => {
    const currentActive = activeFile();
    if (settings.general.autoSave() && prevActiveFile && prevActiveFile !== currentActive) {
      const prevFile = group().files.find(f => f.path === prevActiveFile);
      if (prevFile && prevFile.dirty) {
        void props.onSaveFile(prevActiveFile, group().id);
      }
    }
    prevActiveFile = currentActive;
  });

  // Auto-reload file content from disk when it changes (e.g. from AI edits)
  createEffect(() => {
    for (const openFile of group().files) {
      if (openFile.dirty) continue; // Don't auto-reload if user has unsaved changes

      const state = file.get(openFile.path);
      if (state && state.content && state.content.type === "text") {
        const diskContent = state.content.content;
        if (diskContent !== openFile.savedContent) {
          props.workspace.reloadFileContent(openFile.path, diskContent, group().id);
        }
      }
    }
  });

  createEffect(() => {
    if (isActiveGroup()) {
      props.onCursorChange?.(editorLine(), editorColumn());
    }
  });

  const activeFileLanguage = createMemo(() => {
    const currentActiveFile = activeFile();
    if (!currentActiveFile) return "plaintext";
    const ext = currentActiveFile.slice(currentActiveFile.lastIndexOf("."));
    return new Map([
      [".ts", "TypeScript"], [".tsx", "TypeScript"], [".js", "JavaScript"], [".jsx", "JavaScript"],
      [".json", "JSON"], [".md", "Markdown"], [".css", "CSS"], [".html", "HTML"],
      [".rs", "Rust"], [".py", "Python"], [".go", "Go"],
    ]).get(ext) ?? "Plain Text";
  });

  const hasDiff = createMemo(() => {
    const state = activeFileState();
    return state ? state.originalContent !== undefined : false;
  });

  // Auto-enable diff mode when content diverges from original (live edits)
  const autoDiffMode = createMemo(() => {
    const state = activeFileState();
    if (!state || state.originalContent === undefined) return false;
    return state.content !== state.originalContent;
  });

  // Sync auto-diff into the prop, but respect manual toggle override
  const effectiveDiffMode = () => props.diffMode || (autoDiffMode() && !props.previewDiff);

  createEffect(() => {
    if (!props.previewDiff) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.altKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        props.onAcceptDiff?.();
      } else if (e.ctrlKey && e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        props.onRejectDiff?.();
      } else if (e.altKey && e.shiftKey && e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        props.onRejectDiff?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown, { capture: true }));
  });

  return (
    <div
      class="flex-1 flex flex-col min-w-0 min-h-0 bg-background-base overflow-hidden relative"
      onClick={() => props.workspace.setActiveGroupId(group().id)}
      onDragOver={(e) => { e.preventDefault() }}
      onDrop={(e) => {
        e.preventDefault()
        const dt = draggedTab
        if (dt && dt.sourceGroupId !== group().id) {
          const targetFiles = group().files
          if (!targetFiles.find(f => f.path === dt.path)) {
            const state = props.workspace.getFileState(dt.path, dt.sourceGroupId)
            if (state) {
              props.workspace.openFile(dt.path, state.content, group().id)
              props.workspace.closeFile(dt.path, dt.sourceGroupId)
            }
          }
          draggedTab = null
        }
      }}
    >
      <Show when={group().files.length > 0}>
        <div class="flex items-center border-b border-border-base bg-surface-base overflow-x-auto shrink-0 select-none" style={{ "min-height": "36px" }}>
          <For each={group().files}>
            {(openFile: OpenFile) => (
              <ContextMenu>
                <ContextMenu.Trigger
                  as="button"
                  draggable="true"
                  class={`flex items-center gap-1.5 px-3 py-1.5 text-13-regular border-r border-border-base whitespace-nowrap shrink-0 transition-colors ${openFile.path === activeFile()
                    ? (isActiveGroup() ? "bg-background-base text-text-strong border-b-2 border-b-accent-base" : "bg-background-base text-text-strong opacity-80")
                    : "text-text-weak hover:bg-surface-raised-base-hover"
                    }`}
                  onDragStart={() => { draggedTab = { path: openFile.path, sourceGroupId: group().id } }}
                  onDragEnd={() => { draggedTab = null }}
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    // Auto-save the current file when switching tabs
                    const currentActiveFile = activeFile();
                    if (settings.general.autoSave() && currentActiveFile && currentActiveFile !== openFile.path) {
                      const current = group().files.find(f => f.path === currentActiveFile);
                      if (current?.dirty) {
                        void props.onSaveFile(currentActiveFile, group().id);
                      }
                    }
                    props.workspace.setActiveFile(openFile.path, group().id);
                  }}
                >
                  <Icon name="open-file" size="small" class="text-icon-weak shrink-0" />
                  <span class="truncate max-w-32">{getFilename(openFile.path)}</span>
                  <Show when={openFile.dirty}><span class="text-12-medium text-text-warning-base">●</span></Show>
                  <IconButton
                    icon="close"
                    variant="ghost"
                    size="small"
                    class="size-4 rounded ml-0.5 opacity-60 hover:opacity-100"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      if (settings.general.autoSave() && openFile.dirty) {
                        void props.onSaveFile(openFile.path, group().id);
                      }
                      props.workspace.closeFile(openFile.path, group().id);
                    }}
                  />
                </ContextMenu.Trigger>
                <ContextMenu.Portal>
                  <ContextMenu.Content class="min-w-[220px]">
                    <ContextMenu.Item onSelect={() => {
                      if (settings.general.autoSave() && openFile.dirty) {
                        void props.onSaveFile(openFile.path, group().id);
                      }
                      props.workspace.closeFile(openFile.path, group().id);
                    }}>
                      <div class="flex items-center justify-between w-full">
                        <ContextMenu.ItemLabel>Close</ContextMenu.ItemLabel>
                        <span class="text-12-regular text-text-weak">Ctrl+F4</span>
                      </div>
                    </ContextMenu.Item>
                    <ContextMenu.Item onSelect={() => {
                      if (settings.general.autoSave()) {
                        group().files
                          .filter(f => f.path !== openFile.path && f.dirty)
                          .forEach(f => void props.onSaveFile(f.path, group().id));
                      }
                      props.workspace.closeOthers(openFile.path, group().id);
                    }}>
                      <ContextMenu.ItemLabel>Close Others</ContextMenu.ItemLabel>
                    </ContextMenu.Item>
                    <ContextMenu.Item onSelect={() => {
                      if (settings.general.autoSave()) {
                        const idx = group().files.findIndex(f => f.path === openFile.path);
                        if (idx !== -1) {
                          group().files.slice(idx + 1)
                            .filter(f => f.dirty)
                            .forEach(f => void props.onSaveFile(f.path, group().id));
                        }
                      }
                      props.workspace.closeToTheRight(openFile.path, group().id);
                    }}>
                      <ContextMenu.ItemLabel>Close to the Right</ContextMenu.ItemLabel>
                    </ContextMenu.Item>
                    <ContextMenu.Item onSelect={() => props.workspace.closeSaved(group().id)}>
                      <div class="flex items-center justify-between w-full">
                        <ContextMenu.ItemLabel>Close Saved</ContextMenu.ItemLabel>
                        <span class="text-12-regular text-text-weak">Ctrl+K U</span>
                      </div>
                    </ContextMenu.Item>
                    <ContextMenu.Item onSelect={() => {
                      if (settings.general.autoSave()) {
                        group().files
                          .filter(f => f.dirty)
                          .forEach(f => void props.onSaveFile(f.path, group().id));
                      }
                      props.workspace.closeAll(group().id);
                    }}>
                      <div class="flex items-center justify-between w-full">
                        <ContextMenu.ItemLabel>Close All</ContextMenu.ItemLabel>
                        <span class="text-12-regular text-text-weak">Ctrl+K W</span>
                      </div>
                    </ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item onSelect={() => void navigator.clipboard.writeText(openFile.path)}>
                      <div class="flex items-center justify-between w-full">
                        <ContextMenu.ItemLabel>Copy Path</ContextMenu.ItemLabel>
                        <span class="text-12-regular text-text-weak">Shift+Alt+C</span>
                      </div>
                    </ContextMenu.Item>
                    <ContextMenu.Item onSelect={() => void navigator.clipboard.writeText(getFilename(openFile.path))}>
                      <div class="flex items-center justify-between w-full">
                        <ContextMenu.ItemLabel>Copy Relative Path</ContextMenu.ItemLabel>
                        <span class="text-12-regular text-text-weak">Ctrl+K Ctrl+Shift+C</span>
                      </div>
                    </ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item onSelect={() => props.workspace.splitGroup(group().id, "horizontal")}>
                      <div class="flex items-center justify-between w-full">
                        <ContextMenu.ItemLabel>Split Right</ContextMenu.ItemLabel>
                        <span class="text-12-regular text-text-weak">Ctrl+\</span>
                      </div>
                    </ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item onSelect={() => {
                      if (openFile.dirty) {
                        props.workspace.setActiveFile(openFile.path, group().id);
                        if (!props.diffMode) {
                          props.onToggleDiff();
                        }
                      }
                    }} disabled={!openFile.dirty}>
                      <div class="flex items-center justify-between w-full">
                        <ContextMenu.ItemLabel>Open Changes</ContextMenu.ItemLabel>
                      </div>
                    </ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item onSelect={() => {
                      // @ts-ignore
                      window.opencode?.showItemInFolder(openFile.path);
                    }}>
                      <div class="flex items-center justify-between w-full">
                        <ContextMenu.ItemLabel>Reveal in File Explorer</ContextMenu.ItemLabel>
                        <span class="text-12-regular text-text-weak">Shift+Alt+R</span>
                      </div>
                    </ContextMenu.Item>
                    <ContextMenu.Item onSelect={() => {
                      // Dispatch a custom event that FileTree could theoretically listen to, or just skip it
                      const event = new CustomEvent('reveal-in-explorer', { detail: { path: openFile.path } });
                      window.dispatchEvent(event);
                    }}>
                      <div class="flex items-center justify-between w-full">
                        <ContextMenu.ItemLabel>Reveal in Explorer View</ContextMenu.ItemLabel>
                      </div>
                    </ContextMenu.Item>
                  </ContextMenu.Content>
                </ContextMenu.Portal>
              </ContextMenu>
            )}
          </For>
          <div class="flex-1 flex justify-end gap-1 px-1">
            <Show when={isMarkdownFile()}>
              <IconButton
                icon={showPreview() ? "code" : "eye"}
                variant="ghost"
                size="small"
                class="size-6 rounded"
                title={showPreview() ? "Hide Preview" : "Open Preview"}
                classList={{ "text-accent-base": showPreview() }}
                onClick={(e: MouseEvent) => { e.stopPropagation(); setShowPreview((p) => !p) }}
              />
            </Show>
            <IconButton icon="layout-right" variant="ghost" size="small" class="size-6 rounded" title="Split Right" onClick={(e) => { e.stopPropagation(); props.workspace.splitGroup(group().id, "horizontal"); }} />
            <IconButton icon="layout-bottom" variant="ghost" size="small" class="size-6 rounded" title="Split Down" onClick={(e) => { e.stopPropagation(); props.workspace.splitGroup(group().id, "vertical"); }} />
          </div>
        </div>
      </Show>

      {/* Breadcrumbs */}
      <Show when={activeFile()}>
        <div class="flex items-center gap-1 px-3 py-0.5 text-12-regular text-text-weak bg-surface-base border-b border-border-base shrink-0 overflow-x-auto">
          {activeFile()?.split("/").map((crumb, i, arr) => (
            <>
              <Show when={i > 0}><span class="text-text-weaker">/</span></Show>
              <span
                class="hover:text-text-strong cursor-pointer truncate"
                onClick={() => {
                  const dir = arr.slice(0, i + 1).join("/")
                  if (i < arr.length - 1) {
                    window.dispatchEvent(new CustomEvent("reveal-in-explorer", { detail: { path: dir } }))
                  }
                }}
              >{crumb}</span>
            </>
          ))}
          <div class="flex-1" />
          <Show when={hasDiff()}>
            <button class="text-12-regular px-2 py-0.5 rounded transition-colors" classList={{ "bg-accent-base text-white": effectiveDiffMode(), "text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover": !effectiveDiffMode() }} onClick={props.onToggleDiff}>{effectiveDiffMode() ? "Exit Diff" : "Show Diff"}</button>
          </Show>
        </div>
      </Show>

      <Show when={activeFileState()} fallback={
        <div class="flex-1 flex flex-col items-center justify-center text-text-weak gap-3 select-none">
          <Icon name="open-file" size="large" class="text-icon-weaker opacity-30" style={{ "font-size": "48px" }} />
          <div class="text-14-regular">Open a file from the Explorer</div>
          <div class="text-12-regular text-text-weaker">or press <kbd class="px-1.5 py-0.5 bg-surface-base border border-border-base rounded text-11-medium">Ctrl+P</kbd> to search</div>
        </div>
      }>
        {(state) => (
          <div class="flex-1 relative min-h-0 flex" classList={{ "flex-row": showPreview() && isMarkdownFile(), "flex-col": !(showPreview() && isMarkdownFile()) }}>
            <div class="flex-1 flex flex-col min-h-0">
              <Show when={!props.previewDiff && (!effectiveDiffMode() || !hasDiff())}>
                <>
                  <IdeEditor
                    path={state().path}
                    content={state().content}
                    onChange={(v) => {
                      props.workspace.setContent(state().path, v, group().id);
                    }}
                    onCursorChange={(line, col) => {
                      setEditorLine(line);
                      setEditorColumn(col);
                      if (isActiveGroup()) {
                        props.onCursorChange?.(line, col);
                      }
                    }}
                    onEditorReady={(e) => setEditorInstance(e)}
                    formatTrigger={props.formatTrigger}
                    class="flex-1 min-h-0"
                    fontSize={props.fontSize} tabSize={props.tabSize} wordWrap={props.wordWrap}
                    onProvideCompletionItems={settings.general.inlineCodeSuggestions() ? async (model, position) => {
                      const offset = model.getOffsetAt(position);
                      const text = model.getValue();
                      const prefix = text.substring(0, offset).slice(-2000);
                      const suffix = text.substring(offset).slice(0, 2000);

                      const promptText = `You are a code autocomplete assistant. Generate the code that should be inserted at the cursor position.
Respond with ONLY the code to be inserted, without markdown formatting or code blocks.

CODE BEFORE CURSOR:
${prefix}

CODE AFTER CURSOR:
${suffix}

Completion:`;

                      let sessionID = "";
                      try {
                        const createResult = await sdk().client.session.create({
                          title: "Autocomplete Helper",
                          directory: sdk().directory
                        });
                        sessionID = (createResult as any).data?.id ?? "";
                        if (!sessionID) return { items: [] };

                        await (sdk().client.session as any).prompt({
                          sessionID: sessionID,
                          parts: [{ type: "text", text: promptText }]
                        });

                        await (sdk().client.session as any).wait({ sessionID: sessionID });

                        const msgResponse = await (sdk().client.session as any).messages({
                          sessionID: sessionID,
                          limit: 10
                        });

                        const msgs = msgResponse?.data ?? [];
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const assistantMsg = (msgs as any[]).find((m: any) => m.type === "assistant");
                        if (assistantMsg?.content) {
                          const content = assistantMsg.content as Array<{ type: string; text: string }>
                          const completionText = content
                            .filter(c => c.type === "text")
                            .map(c => c.text)
                            .join("");

                          let insertText = completionText;
                          if (insertText.startsWith("```")) {
                            const lines = insertText.split("\n");
                            if (lines[0].startsWith("```")) {
                              lines.shift();
                            }
                            if (lines[lines.length - 1].startsWith("```")) {
                              lines.pop();
                            }
                            insertText = lines.join("\n");
                          }

                          if (insertText) {
                            return {
                              items: [{
                                insertText: insertText,
                                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
                              }]
                            };
                          }
                        }
                      } catch (e) {
                        console.error("Autocomplete failed:", e);
                      } finally {
                        if (sessionID) {
                          void sdk().client.session.delete({ sessionID }).catch(() => {});
                        }
                      }
                      return { items: [] };
                    } : undefined}
                  />
                  <InlineAIToolbar
                    editor={editorInstance()}
                    filePath={state().path}
                    language={activeFileLanguage()}
                    onAction={(payload) => props.onInlineAIAction(payload, group().id)}
                  />
                </>
              </Show>
              <Show when={!(!props.previewDiff && (!effectiveDiffMode() || !hasDiff()))}>
                <>
                  <IdeDiffEditor
                    path={props.previewDiff?.path ?? state().path}
                    original={props.previewDiff?.original ?? state().originalContent ?? state().savedContent ?? ""}
                    modified={props.previewDiff?.modified ?? state().content}
                    class="flex-1 min-h-0"
                    fontSize={props.fontSize} tabSize={props.tabSize} wordWrap={props.wordWrap}
                    onAccept={props.onAcceptDiff}
                    onReject={props.onRejectDiff}
                    onChange={(v) => props.workspace.setContent(state().path, v, group().id)}
                  />
                  <Show when={props.previewDiff && (props.onAcceptDiff || props.onRejectDiff)}>
                    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-raised-base border border-border-base shadow-lg backdrop-blur-sm">
                      <Show when={props.onAcceptDiff}>
                        <Button variant="primary" size="normal" onClick={props.onAcceptDiff}>
                          <span class="flex items-center gap-1.5">
                            Accept Changes <span class="opacity-70 text-11-regular">Ctrl+Enter</span>
                          </span>
                        </Button>
                      </Show>
                      <Show when={props.onRejectDiff}>
                        <Button variant="ghost" size="normal" onClick={props.onRejectDiff}>
                          <span class="flex items-center gap-1.5">
                            Reject <span class="opacity-70 text-11-regular">Ctrl+⌫</span>
                          </span>
                        </Button>
                      </Show>
                      <div class="w-px h-4 bg-border-base mx-1" />
                      <div class="flex items-center gap-1 text-text-weak text-12-regular">
                        <Icon name="arrow-up" size="small" />
                        <Icon name="chevron-down" size="small" />
                        <span class="opacity-70">Alt+J</span>
                      </div>
                    </div>
                  </Show>
                </>
              </Show>
            </div>
            <Show when={showPreview() && isMarkdownFile()}>
              <MarkdownPreviewPanel content={state().content} visible={true} />
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
