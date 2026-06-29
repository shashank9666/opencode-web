import { For, Show, createMemo, createSignal, createEffect } from "solid-js";
import { Icon } from "@opencode-ai/ui/icon";
import { getFilename } from "@opencode-ai/core/util/path";
import { IdeDiffEditor } from "./ide-editor";
import { FileIcon } from "@opencode-ai/ui/file-icon";
import { useSync } from "@/context/sync";
import { useSDK } from "@/context/sdk";
import { useFile } from "@/context/file";

import { diffLines } from "diff";

type FileChange = {
  path: string;
  before: string;
  after: string;
  additions?: number;
  deletions?: number;
};

const norm = (s: string) => s.replace(/\r\n/g, "\n").replace(/\n+$/, "") + "\n"

function lineDiff(before: string, after: string) {
  if (!before && !after) return { added: 0, removed: 0 };
  try {
    const diffs = diffLines(norm(before), norm(after));
    let added = 0;
    let removed = 0;
    for (const part of diffs) {
      if (part.added) added += part.count || 0;
      else if (part.removed) removed += part.count || 0;
    }
    return { added, removed };
  } catch {
    // Fallback if diffLines fails on extreme cases
    return { added: 0, removed: 0 };
  }
}

export function ReviewChangesPanel(props: { workspace: any }) {
  const sync = useSync();
  const sdk = useSDK();
  const file = useFile();
  const [selectedFile, setSelectedFile] = createSignal<FileChange | null>(null);
  const [loadedFiles, setLoadedFiles] = createSignal<Record<string, FileChange>>({});
  const [loading, setLoading] = createSignal(false);
  const [renderSideBySide, setRenderSideBySide] = createSignal(true);

  // Collect all file writes from the active session's message history
  const changedFilePaths = createMemo(() => {
    const parts = sync().data.part ?? {};
    const paths = new Set<string>();
    for (const partList of Object.values(parts)) {
      if (!Array.isArray(partList)) continue;
      for (const part of partList as any[]) {
        if (part.type !== "tool") continue;
        const input = part.state?.input;
        if (!input) continue;
        const path = input.path || input.filePath || input.target_file || input.TargetFile || "";
        const toolName = part.tool || "";
        if (
          path &&
          (
            toolName.includes("edit") ||
            toolName.includes("write") ||
            toolName.includes("replace") ||
            toolName.includes("patch")
          )
        ) {
          paths.add(path);
        }
      }
    }
    return [...paths];
  });

  const sessionDiffs = createMemo(() => {
    const diffs = sync().data.session_diff ?? {};
    const map = new Map<string, { additions: number, deletions: number }>();
    for (const fileDiffs of Object.values(diffs)) {
      if (!Array.isArray(fileDiffs)) continue;
      for (const d of fileDiffs as any[]) {
        if (d.file) {
          const existing = map.get(d.file) ?? { additions: 0, deletions: 0 };
          map.set(d.file, {
            additions: existing.additions + (d.additions || 0),
            deletions: existing.deletions + (d.deletions || 0),
          });
        }
      }
    }
    return map;
  });

  const workspaceChangedFiles = createMemo(() => {
    if (!props.workspace) return [] as FileChange[];
    return props.workspace.getGroups().flatMap((g: any) =>
      g.files
        .filter((f: any) => f.originalContent !== undefined && f.content !== f.originalContent)
        .map((f: any): FileChange => ({ path: f.path, before: f.originalContent, after: f.content }))
    );
  });

  const [loadingPaths, setLoadingPaths] = createSignal<Set<string>>(new Set());

  // Load before/after for SDK-tracked paths
  const loadFileDiff = async (path: string, autoSelect = true) => {
    if (loadedFiles()[path]) {
      if (autoSelect) setSelectedFile(loadedFiles()[path]!);
      return;
    }
    setLoadingPaths(prev => { const s = new Set(prev); s.add(path); return s; });
    try {
      await file.load(path);
      const state = file.get(path);
      const after = state?.content?.type === "text" ? state.content.content : "";
      // Try to get git original via vcsFile
      let before = after;
      try {
        let relPath = path;
        const dir = sdk().directory;
        if (dir && path.toLowerCase().startsWith(dir.toLowerCase())) {
          relPath = path.slice(dir.length);
          if (relPath.startsWith("/") || relPath.startsWith("\\")) {
            relPath = relPath.slice(1);
          }
        }
        relPath = relPath.replace(/\\/g, "/");
        const resp = await sdk().client.vcs.file({ path: relPath, ref: "HEAD" });
        if (resp && typeof resp.data === "string") {
          before = resp.data;
        }
      } catch {
        // fallback
        const wfile = props.workspace?.getGroups()
          .flatMap((g: any) => g.files)
          .find((f: any) => f.path === path);
        before = wfile?.originalContent ?? "";
      }
      const change: FileChange = { path, before, after };
      setLoadedFiles(prev => ({ ...prev, [path]: change }));
      if (autoSelect) setSelectedFile(change);
    } finally {
      setLoadingPaths(prev => { const s = new Set(prev); s.delete(path); return s; });
    }
  };

  createEffect(() => {
    // Eagerly load all missing diffs in the background
    for (const p of changedFilePaths()) {
      if (!loadedFiles()[p] && !loadingPaths().has(p)) {
        void loadFileDiff(p, false);
      }
    }
  });

  const allChanges = createMemo((): FileChange[] => {
    const wChanges = workspaceChangedFiles();
    const paths = new Set(wChanges.map((f: FileChange) => f.path));
    const sdkPaths = changedFilePaths().filter(p => !paths.has(p));
    const sdkChanges: FileChange[] = sdkPaths.map(p => {
      const stats = sessionDiffs().get(p);
      return {
        path: p,
        before: loadedFiles()[p]?.before ?? "",
        after: loadedFiles()[p]?.after ?? "",
        additions: stats?.additions,
        deletions: stats?.deletions,
      };
    });
    return [...wChanges, ...sdkChanges];
  });

  return (
    <div class="flex-1 flex h-full min-h-0 overflow-hidden bg-surface-base">
      {/* File list sidebar */}
      <div class="w-72 shrink-0 flex flex-col border-r border-border-base bg-surface-raised-base overflow-y-auto">
        <div class="px-4 py-3 border-b border-border-base">
          <h2 class="text-13-medium text-text-strong">Review AI Changes</h2>
          <p class="text-11-regular text-text-weak mt-0.5">{allChanges().length} file{allChanges().length !== 1 ? "s" : ""} modified</p>
        </div>

        <Show
          when={allChanges().length > 0}
          fallback={
            <div class="flex-1 flex flex-col items-center justify-center p-6 gap-3 text-center">
              <Icon name="review" class="size-8 text-icon-weaker opacity-30" />
              <p class="text-13-regular text-text-weak">No AI file changes found in this session.</p>
              <p class="text-11-regular text-text-weaker">Changes appear here when the AI edits files.</p>
            </div>
          }
        >
          <For each={allChanges()}>
            {(change) => {
              const diff = createMemo(() => {
                if (change.additions !== undefined && change.deletions !== undefined) {
                  return { added: change.additions, removed: change.deletions };
                }
                return lineDiff(change.before, change.after);
              });
              const isSelected = createMemo(() => selectedFile()?.path === change.path);
              return (
                <button
                  class={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors border-b border-border-base/50 ${isSelected() ? "bg-accent-base/10 border-l-2 border-l-accent-base" : "hover:bg-surface-base"}`}
                  onClick={() => {
                    if (change.before !== "" || change.after !== "") {
                      setSelectedFile(change);
                    } else {
                      void loadFileDiff(change.path);
                    }
                  }}
                >
                  <FileIcon node={{ path: change.path, type: "file" }} class="shrink-0 size-4" />
                  <div class="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
                    <span class="text-12-regular text-text-strong whitespace-nowrap">{getFilename(change.path)}</span>
                    <span class="text-11-regular text-text-weaker truncate">{change.path}</span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-11-regular text-success-base">+{diff().added}</span>
                    <span class="text-11-regular text-danger-base">-{diff().removed}</span>
                    <Icon name="chevron-right" size="small" class="text-icon-weaker shrink-0" />
                  </div>
                </button>
              );
            }}
          </For>
        </Show>
      </div>

      {/* Diff view */}
      <div class="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <Show
          when={selectedFile()}
          fallback={
            <div class="flex-1 flex flex-col items-center justify-center gap-3 text-center select-none">
              <Icon name="review" class="size-10 text-icon-weaker opacity-20" />
              <p class="text-14-regular text-text-weak">Select a file to view changes</p>
            </div>
          }
        >
          {(change) => (
            <>
              {/* Diff header */}
              <div class="flex items-center justify-between px-4 py-2.5 border-b border-border-base bg-surface-raised-base shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                  <Icon name="open-file" size="small" class="text-icon-muted shrink-0" />
                  <span class="text-13-medium text-text-strong truncate">{getFilename(change().path)}</span>
                  <span class="text-12-regular text-text-weak truncate opacity-60">{change().path}</span>
                </div>
                <div class="flex items-center gap-3">
                  <Show when={loading()}>
                    <div class="text-11-regular text-text-weak animate-pulse">Loading…</div>
                  </Show>
                  <button 
                    class="flex items-center gap-1.5 px-2 py-1 rounded text-11-medium text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors"
                    onClick={() => setRenderSideBySide(!renderSideBySide())}
                  >
                    <Icon name="layout-right" size="small" class="opacity-70" />
                    {renderSideBySide() ? "Side-by-Side" : "Inline"}
                  </button>
                </div>
              </div>

              {/* Monaco diff */}
              <div class="flex-1 min-h-0">
                <IdeDiffEditor
                  path={change().path}
                  original={change().before}
                  modified={change().after}
                  renderSideBySide={renderSideBySide()}
                  class="h-full"
                />
              </div>
            </>
          )}
        </Show>
      </div>
    </div>
  );
}
