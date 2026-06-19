import { createSignal } from "solid-js"
import * as monaco from "monaco-editor"

export type ProblemMarker = {
  file: string
  line: number
  column: number
  message: string
  severity: "error" | "warning" | "info"
  code?: string
  source?: string
}

function severityFromMonaco(s: monaco.MarkerSeverity): ProblemMarker["severity"] {
  if (s === monaco.MarkerSeverity.Error) return "error"
  if (s === monaco.MarkerSeverity.Warning) return "warning"
  return "info"
}

export function monacoMarkersToProblems(markers: monaco.editor.IMarker[]): ProblemMarker[] {
  return markers
    .filter((m) => m.severity !== undefined)
    .map((m) => ({
      file: m.resource.fsPath,
      line: m.startLineNumber,
      column: m.startColumn,
      message: m.message,
      severity: severityFromMonaco(m.severity),
      code: typeof m.code === "string" ? m.code : undefined,
      source: m.source ?? undefined,
    }))
    .sort((a, b) => {
      // Sort by severity (error > warning > info), then by file, then by line
      const sevOrder = { error: 0, warning: 1, info: 2 }
      if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity]
      if (a.file !== b.file) return a.file.localeCompare(b.file)
      return a.line - b.line
    })
}

export function createProblemTracker() {
  const [problems, setProblems] = createSignal<ProblemMarker[]>([])
  const [filter, setFilter] = createSignal<{ errors: boolean; warnings: boolean; info: boolean }>({
    errors: true,
    warnings: true,
    info: true,
  })

  const refresh = () => {
    const all = monaco.editor.getModelMarkers({})
    setProblems(monacoMarkersToProblems(all))
  }

  let interval: ReturnType<typeof setInterval> | undefined

  const start = () => {
    refresh()
    interval = setInterval(refresh, 2000)
  }

  const stop = () => {
    if (interval) clearInterval(interval)
    interval = undefined
  }

  // Start polling immediately
  start()

  const filtered = () => {
    const f = filter()
    return problems().filter((p) => {
      if (p.severity === "error" && !f.errors) return false
      if (p.severity === "warning" && !f.warnings) return false
      if (p.severity === "info" && !f.info) return false
      return true
    })
  }

  const counts = () => {
    const p = problems()
    return {
      errors: p.filter((x) => x.severity === "error").length,
      warnings: p.filter((x) => x.severity === "warning").length,
      info: p.filter((x) => x.severity === "info").length,
    }
  }

  return {
    problems: filtered,
    allProblems: problems,
    filter,
    setFilter,
    counts,
    refresh,
    dispose: stop,
  }
}
