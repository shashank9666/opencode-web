import { Dialog } from "@opencode-ai/ui/dialog"
import { Splash } from "@opencode-ai/ui/logo"

export function AboutDialog() {
  return (
    <Dialog title="About opencode-web">
      <div class="flex flex-col items-center justify-center p-6 gap-4">
        <Splash class="w-24 h-24" />
        <h2 class="text-20-medium">opencode-web</h2>
        <p class="text-14-regular text-text-weak text-center">
          An advanced agentic coding assistant built for the web and desktop.
        </p>
        <div class="flex flex-col items-center gap-1 mt-4 text-12-regular text-text-weaker">
          <p>Version: 1.0.0 (Local)</p>
          <p>&copy; {new Date().getFullYear()} opencode-web</p>
        </div>
      </div>
    </Dialog>
  )
}
