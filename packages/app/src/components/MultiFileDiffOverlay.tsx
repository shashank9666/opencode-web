import { For, Show, createMemo } from "solid-js";
import { Icon } from "@opencode-ai/ui/icon";
import { IconButton } from "@opencode-ai/ui/icon-button";
import { getFilename } from "@opencode-ai/core/util/path";

export function MultiFileDiffOverlay(props: { workspace: any, onAccept?: (path: string) => void, onReject?: (path: string) => void }) {
  const diffFiles = createMemo(() => {
    if (!props.workspace) return [];
    return props.workspace.getGroups().flatMap((g: any) => 
      g.files.filter((f: any) => f.originalContent !== undefined && f.dirty)
      .map((f: any) => ({ ...f, groupId: g.id }))
    );
  });

  return (
    <Show when={diffFiles().length > 0}>
      <div class="absolute top-4 right-4 z-50 flex flex-col gap-2 bg-surface-raised-base border border-border-base rounded-xl shadow-xl p-3 w-80 animate-in fade-in slide-in-from-top-4 duration-200">
        <div class="flex items-center justify-between pb-2">
          <span class="text-12-medium text-text-strong">
            {diffFiles().length} pending edit{diffFiles().length === 1 ? "" : "s"}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 text-text-weak flex-1">
            <IconButton icon="open-file" size="small" variant="ghost" class="size-6" />
            <IconButton icon="branch" size="small" variant="ghost" class="size-6" />
            <IconButton icon="browser" size="small" variant="ghost" class="size-6" />
            <IconButton icon="edit" size="small" variant="ghost" class="size-6" />
          </div>
          <button 
            class="flex items-center gap-1.5 px-2 py-1 text-12-medium text-text-weak hover:text-text-strong border border-border-base rounded-md hover:bg-surface-base transition-colors"
            onClick={() => { props.workspace.openFile("review://changes", "", "") }}
          >
            <Icon name="review" size="small" class="size-3.5" />
            Review Changes
          </button>
        </div>

      </div>
    </Show>
  );
}
