import { createSignal, onCleanup, onMount } from "solid-js";
import { Icon } from "@opencode-ai/ui/icon";
import { IconButton } from "@opencode-ai/ui/icon-button";
import { Button } from "@opencode-ai/ui/button";

export function BrowserPreviewPanel() {
  const [status, setStatus] = createSignal<"playing" | "paused" | "stopped">("playing");
  const [url, setUrl] = createSignal("http://localhost:3000");
  const [actionLabel, setActionLabel] = createSignal("Navigating to index...");
  const [pointer, setPointer] = createSignal({ x: 200, y: 150, visible: true });

  // Simulate a playwright run
  let interval: number;
  onMount(() => {
    let tick = 0;
    interval = window.setInterval(() => {
      if (status() !== "playing") return;
      tick++;
      if (tick % 5 === 0) {
        setActionLabel("Clicking button...");
        setPointer({ x: 400 + Math.random() * 50, y: 300 + Math.random() * 50, visible: true });
      } else if (tick % 5 === 2) {
        setActionLabel("Typing 'hello world'...");
        setPointer({ x: 300, y: 250, visible: true });
      } else {
        setActionLabel("Waiting for selector '.result'...");
        setPointer({ x: pointer().x, y: pointer().y, visible: false });
      }
    }, 2000);
  });

  onCleanup(() => {
    clearInterval(interval);
  });

  return (
    <div class="flex-1 flex flex-col min-h-0 min-w-0 bg-surface-base">
      <div class="flex items-center gap-2 px-3 py-2 border-b border-border-base bg-surface-raised-base shrink-0">
        <Icon name="browser" class="text-icon-base" />
        <span class="text-13-medium text-text-strong">Playwright Stream</span>
        
        <div class="w-px h-4 bg-border-base mx-2" />
        
        <IconButton 
          icon="play" 
          variant="ghost" 
          size="small" 
          disabled={status() === "playing"}
          onClick={() => setStatus("playing")}
          title="Play"
        />
        <IconButton 
          icon="pause" 
          variant="ghost" 
          size="small"
          disabled={status() === "paused"} 
          onClick={() => setStatus("paused")}
          title="Pause"
        />
        <IconButton 
          icon="stop" 
          variant="ghost" 
          size="small" 
          disabled={status() === "stopped"}
          onClick={() => { setStatus("stopped"); setActionLabel("Stopped"); setPointer({ ...pointer(), visible: false }) }}
          title="Stop"
        />
        
        <div class="flex-1" />
        
        <div class="flex items-center gap-2 bg-surface-base border border-border-base rounded px-2 py-1 text-12-regular text-text-weak">
          <Icon name="link" size="small" />
          <input 
            type="text" 
            value={url()} 
            readonly 
            class="bg-transparent border-none outline-none w-64 text-text-strong" 
          />
        </div>
      </div>
      
      <div class="flex-1 relative overflow-hidden bg-background-stronger flex items-center justify-center">
        {status() === "stopped" ? (
          <div class="text-text-weak text-13-regular flex flex-col items-center gap-2">
            <Icon name="video-off" size="large" />
            <p>Session stopped</p>
          </div>
        ) : (
          <div class="relative w-full h-full bg-white shadow-xl max-w-4xl max-h-[800px] border border-border-base mx-4 my-4 overflow-hidden rounded-md">
            {/* Mock Browser Content */}
            <div class="absolute inset-0 flex flex-col pointer-events-none opacity-50">
              <div class="h-12 bg-gray-100 border-b border-gray-200 flex items-center px-4">
                <div class="w-full max-w-lg h-6 bg-white rounded border border-gray-300"></div>
              </div>
              <div class="flex-1 bg-white p-8 space-y-4">
                <div class="w-32 h-8 bg-blue-500 rounded"></div>
                <div class="w-64 h-10 bg-gray-50 border border-gray-300 rounded"></div>
                <div class="w-48 h-4 bg-gray-200 rounded mt-8"></div>
                <div class="w-full h-32 bg-gray-100 rounded"></div>
              </div>
            </div>

            {/* Simulated CDP Pointer */}
            {pointer().visible && (
              <div 
                class="absolute z-50 pointer-events-none transition-all duration-300 ease-out flex items-center gap-2"
                style={{ left: `${pointer().x}px`, top: `${pointer().y}px` }}
              >
                <div class="w-4 h-4 bg-red-500 rounded-full opacity-50 animate-ping absolute"></div>
                <Icon name="cursor" class="text-black drop-shadow-md relative z-10" />
                <div class="bg-black/80 text-white text-11-medium px-2 py-1 rounded shadow whitespace-nowrap">
                  {actionLabel()}
                </div>
              </div>
            )}
            
            {/* Status Overlay */}
            <div class="absolute bottom-4 right-4 bg-black/80 text-white text-11-regular px-2 py-1 rounded shadow flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {actionLabel()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
