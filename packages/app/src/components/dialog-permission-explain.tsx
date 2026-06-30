import { Dialog } from "@opencode-ai/ui/dialog"
import { Icon } from "@opencode-ai/ui/icon"
import { useLanguage } from "@/context/language"
import type { PermissionRequest } from "@opencode-ai/sdk/v2"
import { For, Show } from "solid-js"

type PermissionInfo = {
  title: string
  shortDescription: string
  longDescription: string
  examples: string[]
  safetyNote?: string
}

const PERMISSION_INFO: Record<string, PermissionInfo> = {
  read: {
    title: "Read files",
    shortDescription: "The agent wants to read files in your project.",
    longDescription:
      "This allows the AI to inspect your code, configuration, and documentation to understand your project and answer questions accurately.",
    examples: ["Read `src/config.ts` to understand settings", "Inspect `README.md` for setup instructions"],
    safetyNote: "The agent can only read files — it cannot modify or delete anything.",
  },
  read_file: {
    title: "Read a file",
    shortDescription: "The agent wants to read the contents of a specific file.",
    longDescription:
      "Reading a file lets the agent see its current content so it can help you edit, debug, or explain it.",
    examples: ["Inspect `package.json` dependencies", "Review `auth.ts` implementation"],
    safetyNote: "This is read-only — no changes will be made to the file.",
  },
  view_file: {
    title: "View file",
    shortDescription: "The agent wants to view a file.",
    longDescription: "Viewing lets the agent read a file's contents to understand context.",
    examples: ["View configuration files", "Review source code"],
    safetyNote: "This is read-only.",
  },
  list_dir: {
    title: "List directory contents",
    shortDescription: "The agent wants to see files and folders in a directory.",
    longDescription:
      "Listing a directory helps the agent understand your project structure and locate relevant files.",
    examples: ["List `src/components/` to find UI files", "Explore `tests/` to understand test coverage"],
    safetyNote: "This only shows file names and structure — no file contents are read.",
  },
  grep_search: {
    title: "Search file contents",
    shortDescription: "The agent wants to search for text across your files.",
    longDescription:
      "Searching lets the agent find specific patterns, functions, or references across your entire codebase.",
    examples: [`Search for "TODO" comments`, `Find all uses of "useEffect"`, 'Locate "apiKey" references'],
    safetyNote: "This only returns matching lines and file paths — no files are modified.",
  },
  read_url: {
    title: "Read content from a URL",
    shortDescription: "The agent wants to fetch content from a web address.",
    longDescription:
      "Fetching URLs lets the agent retrieve documentation, API specs, or other web resources.",
    examples: ["Fetch https://docs.example.com/api", "Retrieve package documentation"],
    safetyNote: "The agent only reads web content — it cannot submit forms or interact with authenticated pages.",
  },
  filesystem_read_project: {
    title: "Read project files",
    shortDescription: "The agent wants read access to your project files.",
    longDescription:
      "Granting read access allows the agent to explore your codebase, understand architecture, and provide accurate assistance.",
    examples: ["Explore project structure", "Read configuration files"],
    safetyNote: "Read access only — the agent cannot modify files.",
  },
  edit: {
    title: "Edit files",
    shortDescription: "The agent wants to modify a file in your project.",
    longDescription:
      "Editing lets the agent make targeted changes to your code, such as fixing bugs, adding features, or refactoring.",
    examples: ["Fix a typo in `README.md`", "Patch a bug in `src/auth.ts`", "Update a configuration value"],
    safetyNote: "Edits are applied as patches. You can review and undo changes.",
  },
  write: {
    title: "Write a new file",
    shortDescription: "The agent wants to create a new file in your project.",
    longDescription:
      "Writing allows the agent to add new files like components, tests, documentation, or scripts.",
    examples: ["Create `src/utils/helpers.ts`", "Add `tests/api.test.ts`", "Generate `docs/API.md`"],
    safetyNote: "You'll see a preview of the new file before it's created.",
  },
  write_to_file: {
    title: "Write to a file",
    shortDescription: "The agent wants to create or overwrite a file.",
    longDescription: "Writing creates new files or replaces existing ones entirely.",
    examples: ["Create a new component file", "Generate a configuration file"],
    safetyNote: "You can review the file contents before the change is applied.",
  },
  replace_file_content: {
    title: "Replace file contents",
    shortDescription: "The agent wants to replace the entire contents of a file.",
    longDescription:
      "This replaces all content in a file with new content. Useful for major rewrites or file generation.",
    examples: ["Replace `index.html` with a new version", "Overwrite a config file with updated settings"],
    safetyNote: "The entire file will be replaced. You can review and revert if needed.",
  },
  multi_replace_file_content: {
    title: "Replace multiple files",
    shortDescription: "The agent wants to update multiple files at once.",
    longDescription:
      "This applies the same or different replacements across multiple files in a single operation.",
    examples: ["Update imports across 3 files", "Apply a codemod to many files"],
    safetyNote: "All changes are tracked and reviewable.",
  },
  filesystem_write_project: {
    title: "Write project files",
    shortDescription: "The agent wants write access to create or modify files in your project.",
    longDescription:
      "Write access allows the agent to implement changes, add features, fix bugs, and update configurations.",
    examples: ["Implement a new component", "Fix a bug across multiple files", "Add unit tests"],
    safetyNote: "All writes go through a safe patch system. Changes are reviewable.",
  },
  execute: {
    title: "Run shell commands",
    shortDescription: "The agent wants to execute a shell command on your machine.",
    longDescription:
      "Running commands lets the agent install dependencies, run build scripts, start servers, or perform other system tasks.",
    examples: ["Run `npm install`", "Execute `bun run build`", "Start the dev server with `npm start`"],
    safetyNote: "Commands run with your user permissions. Destructive commands (like `rm -rf`) are blocked by default.",
  },
  bash: {
    title: "Run bash commands",
    shortDescription: "The agent wants to execute a bash command.",
    longDescription: "Bash commands allow the agent to interact with your system, run scripts, and manage processes.",
    examples: ["Install dependencies", "Run build scripts", "Execute tests"],
    safetyNote: "Commands are validated before execution. Dangerous commands require explicit approval.",
  },
  run_command: {
    title: "Run a command",
    shortDescription: "The agent wants to run a system command.",
    longDescription: "This allows the agent to execute commands for building, testing, or managing your project.",
    examples: ["Run tests", "Build the project", "Lint code"],
    safetyNote: "Commands are checked for safety before running.",
  },
  terminal_all: {
    title: "Use the terminal",
    shortDescription: "The agent wants full terminal access.",
    longDescription: "Full terminal access lets the agent run complex command sequences, install tools, and debug issues.",
    examples: ["Run a local server", "Install system packages", "Debug with verbose logging"],
    safetyNote: "The terminal runs with your user permissions. All commands are logged.",
  },
  terminal_safe: {
    title: "Use the terminal (safe mode)",
    shortDescription: "The agent wants to run safe, non-destructive terminal commands.",
    longDescription:
      "Safe mode allows read-only and development commands while blocking potentially dangerous operations.",
    examples: ["List files", "Check git status", "Read environment variables"],
    safetyNote: "Only non-destructive commands are allowed in safe mode.",
  },
  browser: {
    title: "Use the browser",
    shortDescription: "The agent wants to control a web browser.",
    longDescription:
      "Browser control lets the agent navigate websites, take screenshots, fill forms, and test web applications.",
    examples: ["Open localhost:3000 to test the app", "Take a screenshot of the homepage", "Fill a login form"],
    safetyNote: "Browser actions are limited to what a human user can do. No background or hidden browsing.",
  },
  mcp: {
    title: "Use MCP servers",
    shortDescription: "The agent wants to connect to MCP (Model Context Protocol) servers.",
    longDescription:
      "MCP servers extend the agent's capabilities with external tools and data sources.",
    examples: ["Query a database via MCP", "Use a specialized analysis tool", "Access third-party APIs"],
    safetyNote: "MCP servers are sandboxed and you can review their tools before granting access.",
  },
}

function getPermissionInfo(permission: string): PermissionInfo | undefined {
  return PERMISSION_INFO[permission] ?? {
    title: permission,
    shortDescription: "The agent is requesting permission.",
    longDescription: "The agent needs this permission to complete the requested action.",
    examples: [],
  }
}

export function DialogPermissionExplain(props: { request: PermissionRequest; onClose?: () => void }) {
  const language = useLanguage()
  const info = getPermissionInfo(props.request.permission)

  return (
    <Dialog
      title={
        <div class="flex items-center gap-2">
          <Icon name="warning" size="normal" class="text-icon-warning-base" />
          <span>{info.title}</span>
        </div>
      }
      onClose={props.onClose}
    >
      <div class="flex flex-col gap-5 px-2.5 pb-4">
        <p class="text-14-regular text-text-base">{info.shortDescription}</p>

        <div class="flex flex-col gap-2">
          <h4 class="text-12-medium text-text-strong">What this allows</h4>
          <p class="text-13-regular text-text-base">{info.longDescription}</p>
        </div>

        <Show when={info.examples.length > 0}>
          <div class="flex flex-col gap-2">
            <h4 class="text-12-medium text-text-strong">Examples</h4>
            <ul class="flex flex-col gap-1.5 list-disc list-inside">
              <For each={info.examples}>
                {(example) => (
                  <li class="text-13-regular text-text-base">{example}</li>
                )}
              </For>
            </ul>
          </div>
        </Show>

        <Show when={info.safetyNote}>
          <div class="rounded-md bg-background-base px-3 py-2.5 flex items-start gap-2">
            <Icon name="help" size="small" class="text-icon-info-base mt-0.5 shrink-0" />
            <p class="text-12-regular text-text-base">{info.safetyNote}</p>
          </div>
        </Show>

        <div class="flex flex-col gap-1.5 pt-2 border-t border-border-weak-base">
          <h4 class="text-12-medium text-text-strong">Affected paths</h4>
          <Show
            when={props.request.patterns.length > 0}
            fallback={<p class="text-12-regular text-text-weak">No specific paths requested</p>}
          >
            <div class="flex flex-col gap-1">
              <For each={props.request.patterns}>
                {(pattern) => (
                  <code class="text-12-regular text-text-base bg-background-base px-2 py-1 rounded">{pattern}</code>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </Dialog>
  )
}