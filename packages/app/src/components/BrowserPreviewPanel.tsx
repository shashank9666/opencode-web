import { createSignal, createMemo } from "solid-js";
import { Icon } from "@opencode-ai/ui/icon";
import { IconButton } from "@opencode-ai/ui/icon-button";

export function BrowserPreviewPanel() {
  const [url, setUrl] = createSignal("");

  const iframeSrc = createMemo(() => {
    const raw = url().trim();
    if (!raw) return "";
    if (raw.match(/^\d+$/)) return `http://localhost:${raw}`;
    if (!raw.startsWith("http://") && !raw.startsWith("https://")) return `http://${raw}`;
    return raw;
  });

  return (
    <div class="flex-1 flex flex-col min-h-0 min-w-0 bg-surface-base">
      <div class="flex items-center gap-2 px-3 py-2 border-b border-border-base bg-surface-raised-base shrink-0">
        <Icon name="browser" class="text-icon-base" />
        <span class="text-13-medium text-text-strong">Playwright UI</span>

        <div class="w-px h-4 bg-border-base mx-2" />

        <IconButton
          icon="reset"
          variant="ghost"
          size="small"
          onClick={() => {
            const current = url();
            setUrl("");
            setTimeout(() => setUrl(current), 10);
          }}
          title="Reload"
        />

        <div class="flex-1" />

        <div class="flex items-center gap-2 bg-surface-base border border-border-base rounded px-2 py-1 text-12-regular text-text-weak focus-within:border-border-strong transition-colors">
          <Icon name="link" size="small" />
          <input
            type="text"
            value={url()}
            onInput={(e) => setUrl(e.currentTarget.value)}
            class="bg-transparent border-none outline-none w-80 text-text-strong"
            placeholder="http://localhost:8080"
          />
        </div>
      </div>

      <div class="flex-1 relative overflow-hidden bg-background-stronger flex items-center justify-center">
        {url() ? (
          <div class="relative w-full h-full bg-white border-t border-border-base overflow-hidden">
            <iframe
              src={iframeSrc()}
              class="w-full h-full border-none bg-white"
              title="Browser Preview"
            />
          </div>
        ) : (
          <div class="text-text-weak text-13-regular flex flex-col items-center gap-2">
            <Icon name="browser" size="large" />
            <p>Enter Playwright UI URL (e.g. http://localhost:8080)</p>
            <p class="text-12-regular opacity-75">Run `npx playwright test --ui --ui-port=8080 --ui-host=127.0.0.1` in your terminal.</p>
          </div>
        )}
      </div>
    </div>
  );
}
