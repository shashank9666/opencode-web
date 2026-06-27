import { For, createMemo } from "solid-js";
import { Icon } from "@opencode-ai/ui/icon";
import { getFilename } from "@opencode-ai/core/util/path";

export function ReviewChangesPanel(props: { workspace: any }) {
  const diffFiles = createMemo(() => {
    if (!props.workspace) return [];
    return props.workspace.getGroups().flatMap((g: any) => 
      g.files.filter((f: any) => f.originalContent !== undefined && f.dirty)
      .map((f: any) => ({ ...f, groupId: g.id }))
    );
  });

  const approximateDiffCount = (original: string, modified: string) => {
    // This is just a rough approximation for the UI since we don't have a diff library
    const origLines = original.split('\n').length;
    const modLines = modified.split('\n').length;
    const diff = modLines - origLines;
    if (diff > 0) return { added: diff, removed: 0 };
    if (diff < 0) return { added: 0, removed: -diff };
    return { added: 1, removed: 1 }; // Assume modified
  };

  return (
    <div class="flex-1 flex flex-col h-full bg-surface-base min-h-0 overflow-y-auto custom-scrollbar p-6">
      <div class="max-w-4xl mx-auto w-full">
        <h2 class="text-2xl text-text-strong font-medium mb-6">Review Changes</h2>
        <div class="flex flex-col gap-[1px] bg-border-base border border-border-base rounded-md overflow-hidden shadow-sm">
          <For each={diffFiles()} fallback={
            <div class="p-8 text-center text-text-weak bg-surface-raised-base">No pending AI changes to review.</div>
          }>
            {(f) => {
              const diff = approximateDiffCount(f.originalContent || "", f.content || "");
              return (
                <div 
                  class="flex items-center gap-3 px-4 py-3 bg-surface-raised-base hover:bg-surface-base cursor-pointer transition-colors group"
                  onClick={() => props.workspace.openFile(f.path, f.content, f.groupId)}
                >
                  <div class="flex-1 min-w-0 flex items-center gap-2">
                    <Icon name="open-file" size="small" class="text-icon-muted" />
                    <span class="text-13-medium text-text-strong">{getFilename(f.path)}</span>
                    <span class="text-12-regular text-text-weak truncate opacity-60">{f.path}</span>
                  </div>
                  <div class="flex items-center gap-4 text-12-regular font-mono">
                    <span class="text-success-base">+{diff.added}</span>
                    <span class="text-danger-base">-{diff.removed}</span>
                    <Icon name="chevron-right" class="size-4 text-text-weak opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}
