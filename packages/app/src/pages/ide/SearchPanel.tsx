import { createSignal, For, Show, createMemo } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"

interface SubMatch {
  match: { text: string }
  start: number
  end: number
}

interface SearchResultItem {
  path: { text: string }
  lines: { text: string }
  line_number: number
  absolute_offset: number
  submatches: SubMatch[]
}

function HighlightedLine(props: { text: string; submatches: SubMatch[] }) {
  const line = props.text
  const matches = props.submatches ?? []

  if (matches.length === 0) {
    return <span class="text-text-strong">{line.trim()}</span>
  }

  // Build segments
  const segments: { text: string; highlight: boolean }[] = []
  // Compute trim offset
  const trimmed = line.trimStart()
  const trimOffset = line.length - trimmed.length

  let lastEnd = 0
  for (const m of matches) {
    const start = m.start - trimOffset
    const end = m.end - trimOffset
    if (start > lastEnd) {
      segments.push({ text: trimmed.slice(lastEnd, start), highlight: false })
    }
    segments.push({ text: trimmed.slice(Math.max(0, start), Math.max(0, end)), highlight: true })
    lastEnd = Math.max(0, end)
  }
  if (lastEnd < trimmed.length) {
    segments.push({ text: trimmed.slice(lastEnd), highlight: false })
  }

  return (
    <span class="text-text-strong font-mono truncate">
      <For each={segments}>
        {(seg) =>
          seg.highlight ? (
            <mark class="bg-[#f9c74f]/30 text-[#f9c74f] rounded-[2px] px-[1px]">{seg.text}</mark>
          ) : (
            <span>{seg.text}</span>
          )
        }
      </For>
    </span>
  )
}

export default function SearchPanel(props: {
  onSearch: (pattern: string) => Promise<SearchResultItem[]>
  onResultClick: (result: { path: string; line: number; column?: number }) => void
  onReplace?: (pattern: string, replacement: string) => Promise<void>
  onReplaceAll?: (pattern: string, replacement: string) => Promise<void>
  onSymbolSearch?: (pattern: string) => Promise<Array<{ name: string; kind: string; path: string; line: number }>>
}) {
  const [searchQuery, setSearchQuery] = createSignal("")
  const [replaceText, setReplaceText] = createSignal("")
  const [results, setResults] = createSignal<SearchResultItem[]>([])
  const [searching, setSearching] = createSignal(false)
  const [showReplace, setShowReplace] = createSignal(false)
  const [caseSensitive, setCaseSensitive] = createSignal(false)
  const [matchWholeWord, setMatchWholeWord] = createSignal(false)
  const [useRegex, setUseRegex] = createSignal(false)
  const [includePattern, setIncludePattern] = createSignal("")
  const [excludePattern, setExcludePattern] = createSignal("")
  const [showFilters, setShowFilters] = createSignal(false)
  const [collapsedAll, setCollapsedAll] = createSignal(false)
  const [collapsedFiles, setCollapsedFiles] = createSignal<Set<string>>(new Set())
  const [viewAsTree, setViewAsTree] = createSignal(false)
  const [searchMode, setSearchMode] = createSignal<"files" | "symbols">("files")
  const [symbolResults, setSymbolResults] = createSignal<Array<{ name: string; kind: string; path: string; line: number }>>([])
  const [selectedResultIndex, setSelectedResultIndex] = createSignal(-1)
  let searchInputRef: HTMLInputElement | undefined

  const groupedResults = createMemo(() => {
    const groups = new Map<string, SearchResultItem[]>()
    for (const r of results()) {
      const existing = groups.get(r.path.text) ?? []
      existing.push(r)
      groups.set(r.path.text, existing)
    }
    return [...groups.entries()]
  })

  const totalMatches = () => results().length
  const totalFiles = () => groupedResults().length

  const isFileCollapsed = (path: string) => {
    if (collapsedAll()) return true
    return collapsedFiles().has(path)
  }

  const toggleFileCollapse = (path: string) => {
    setCollapsedFiles(prev => {
      const next = new Set<string>(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const toggleCollapseAll = () => {
    const next = !collapsedAll()
    setCollapsedAll(next)
    if (!next) setCollapsedFiles(new Set<string>())
  }

  const performSearch = async () => {
    const q = searchQuery()
    if (!q) return
    setSearching(true)
    setCollapsedAll(false)
    setCollapsedFiles(new Set<string>())
    setSelectedResultIndex(-1)
    try {
      if (searchMode() === "symbols" && props.onSymbolSearch) {
        const syms = await props.onSymbolSearch(q)
        setSymbolResults(syms ?? [])
      } else {
        const result = await props.onSearch(q)
        setResults(result ?? [])
      }
    } catch {
      setResults([])
      setSymbolResults([])
    } finally {
      setSearching(false)
    }
  }

  const refreshSearch = () => {
    if (searchQuery()) performSearch()
  }

  const clearResults = () => {
    setSearchQuery("")
    setResults([])
    setSymbolResults([])
    setSelectedResultIndex(-1)
  }

  // Keyboard navigation in results — only when not typing in input
  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA"

    // In the search input, Enter performs search (handled by input's own onKeyDown).
    // Arrow keys in input should work normally (cursor movement).
    if (isInput) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedResultIndex(prev => Math.min(prev + 1, totalResultCount() - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedResultIndex(prev => Math.max(0, prev - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const idx = selectedResultIndex()
      if (idx < 0) return
      if (searchMode() === "symbols") {
        const sym = symbolResults()[idx]
        if (sym) props.onResultClick({ path: sym.path, line: sym.line })
      } else {
        const grouped = groupedResults()
        let count = 0
        for (const [, fileResults] of grouped) {
          for (const r of fileResults) {
            if (count === idx) {
              props.onResultClick({ path: r.path.text, line: r.line_number, column: r.submatches?.[0]?.start ?? 0 })
              return
            }
            count++
          }
        }
      }
    }
  }

  // Total number of results for keyboard navigation bounds
  const totalResultCount = () => {
    if (searchMode() === "symbols") return symbolResults().length
    return results().length
  }

  // Symbol kind icon mapping
  const symbolKindIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case "function":
      case "method":
        return "code"
      case "class":
      case "struct":
        return "layout"
      case "interface":
        return "layout-sidebar"
      case "variable":
      case "property":
        return "open-file"
      case "enum":
        return "bullet-list"
      case "module":
      case "namespace":
        return "folder"
      default:
        return "open-file"
    }
  }

  const getFilename = (path: string) => path.split("/").pop() ?? path

  return (
    <div class="size-full flex flex-col" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-2 shrink-0">
        <span class="text-12-medium text-text-weak uppercase tracking-wider">SEARCH</span>
        <div class="flex items-center gap-1">
          <Show when={results().length > 0 || symbolResults().length > 0}>
            <Tooltip value="Refresh" placement="bottom">
              <IconButton
                icon="reset"
                variant="ghost"
                size="small"
                class="size-6 rounded-md"
                onClick={refreshSearch}
                aria-label="Refresh search results"
              />
            </Tooltip>
            <Show when={searchMode() === "files"}>
              <Tooltip value={collapsedAll() ? "Expand All" : "Collapse All"} placement="bottom">
                <IconButton
                  icon="collapse"
                  variant="ghost"
                  size="small"
                  class="size-6 rounded-md"
                  classList={{ "text-accent-base": collapsedAll() }}
                  onClick={toggleCollapseAll}
                  aria-label="Collapse All"
                />
              </Tooltip>
              <Tooltip value={viewAsTree() ? "View as List" : "View as Tree"} placement="bottom">
                <IconButton
                  icon={viewAsTree() ? "bullet-list" : "file-tree"}
                  variant="ghost"
                  size="small"
                  class="size-6 rounded-md"
                  onClick={() => setViewAsTree(!viewAsTree())}
                  aria-label="Toggle view mode"
                />
              </Tooltip>
            </Show>
          </Show>
          <Tooltip value="Toggle Replace" placement="bottom">
            <IconButton
              icon="edit-small-2"
              variant="ghost"
              size="small"
              class="size-6 rounded-md"
              classList={{ "text-accent-base": showReplace() }}
              onClick={() => setShowReplace(!showReplace())}
              aria-label="Toggle Replace"
            />
          </Tooltip>
        </div>
      </div>

      {/* Search mode tabs */}
      <div class="flex items-center border-b border-border-base px-2 shrink-0">
        <button
          type="button"
          class="px-3 py-1.5 text-11-medium transition-colors relative"
          classList={{
            "text-text-strong": searchMode() === "files",
            "text-text-weaker hover:text-text-weak": searchMode() !== "files",
          }}
          onClick={() => { setSearchMode("files"); setSymbolResults([]) }}
        >
          <span class="flex items-center gap-1.5">
            <Icon name="magnifying-glass" size="small" />
            Files
          </span>
          {searchMode() === "files" && <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-base" />}
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-11-medium transition-colors relative"
          classList={{
            "text-text-strong": searchMode() === "symbols",
            "text-text-weaker hover:text-text-weak": searchMode() !== "symbols",
          }}
          onClick={() => { setSearchMode("symbols"); setResults([]) }}
        >
          <span class="flex items-center gap-1.5">
            <Icon name="code" size="small" />
            Symbols
          </span>
          {searchMode() === "symbols" && <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-base" />}
        </button>
      </div>

      {/* Search input */}
      <div class="p-2 border-b border-border-base shrink-0">
        <div class="flex gap-1 mb-1">
          <div class="flex-1 relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <Icon name="magnifying-glass" size="small" class="text-icon-weaker" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              class="w-full pl-7 pr-2 py-1.5 text-13-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong"
              placeholder={searchMode() === "symbols" ? "Search symbols (function, class, variable...)" : "Search files..."}
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  if (e.altKey) {
                    // Alt+Enter to navigate to selected result
                    const idx = selectedResultIndex()
                    if (idx >= 0) {
                      if (searchMode() === "symbols") {
                        const sym = symbolResults()[idx]
                        if (sym) props.onResultClick({ path: sym.path, line: sym.line })
                      } else {
                        const grouped = groupedResults()
                        let count = 0
                        for (const [, fileResults] of grouped) {
                          for (const r of fileResults) {
                            if (count === idx) {
                              props.onResultClick({ path: r.path.text, line: r.line_number })
                              return
                            }
                            count++
                          }
                        }
                      }
                    }
                  } else {
                    performSearch()
                  }
                }
              }}
            />
            <Show when={searchQuery()}>
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center pr-2 text-text-weaker hover:text-text-strong transition-colors"
                onClick={() => { setSearchQuery(""); setResults([]) }}
                aria-label="Clear search"
              >
                <Icon name="close" size="small" />
              </button>
            </Show>
          </div>
          <IconButton
            icon="magnifying-glass"
            variant={searchQuery() && results().length > 0 ? "secondary" : "ghost"}
            size="small"
            class="size-7 rounded-md shrink-0"
            onClick={performSearch}
            aria-label="Search"
          />
        </div>

        {/* Replace row */}
        <Show when={showReplace()}>
          <div class="flex gap-1 mb-1">
            <input
              type="text"
              class="flex-1 px-2 py-1.5 text-13-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong"
              placeholder="Replace with..."
              value={replaceText()}
              onInput={(e) => setReplaceText(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === "Enter") performSearch() }}
            />
            <button
              type="button"
              class="px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded-md text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors shrink-0"
              onClick={() => props.onReplace?.(searchQuery(), replaceText())}
              title="Replace"
            >
              Replace
            </button>
            <button
              type="button"
              class="px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded-md text-text-weak hover:text-text-strong hover:bg-surface-raised-base-hover transition-colors shrink-0"
              onClick={() => props.onReplaceAll?.(searchQuery(), replaceText())}
              title="Replace All"
            >
              All
            </button>
          </div>
        </Show>

        {/* Filter options */}
        <Show when={showFilters()}>
          <div class="mt-1 flex flex-col gap-1">
            <input
              type="text"
              class="w-full px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong"
              placeholder="Files to include (e.g. *.ts, src/**)"
              value={includePattern()}
              onInput={(e) => setIncludePattern(e.currentTarget.value)}
            />
            <input
              type="text"
              class="w-full px-2 py-1 text-12-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong"
              placeholder="Files to exclude (e.g. node_modules, dist)"
              value={excludePattern()}
              onInput={(e) => setExcludePattern(e.currentTarget.value)}
            />
          </div>
        </Show>

        {/* Options row */}
        <div class="flex items-center gap-2 mt-1">
          <button
            type="button"
            class="text-11-medium px-1.5 py-0.5 rounded transition-colors"
            classList={{
              "bg-accent-base/10 text-accent-base": caseSensitive(),
              "text-text-weaker hover:text-text-weak hover:bg-surface-raised-base-hover": !caseSensitive(),
            }}
            onClick={() => setCaseSensitive(!caseSensitive())}
            title="Case Sensitive"
          >
            Aa
          </button>
          <button
            type="button"
            class="text-11-medium px-1.5 py-0.5 rounded transition-colors"
            classList={{
              "bg-accent-base/10 text-accent-base": matchWholeWord(),
              "text-text-weaker hover:text-text-weak hover:bg-surface-raised-base-hover": !matchWholeWord(),
            }}
            onClick={() => setMatchWholeWord(!matchWholeWord())}
            title="Match Whole Word"
          >
            ab
          </button>
          <button
            type="button"
            class="text-11-medium px-1.5 py-0.5 rounded transition-colors"
            classList={{
              "bg-accent-base/10 text-accent-base": useRegex(),
              "text-text-weaker hover:text-text-weak hover:bg-surface-raised-base-hover": !useRegex(),
            }}
            onClick={() => setUseRegex(!useRegex())}
            title="Use Regular Expression"
          >
            .*
          </button>
          <button
            type="button"
            class="text-11-medium px-1.5 py-0.5 rounded text-text-weaker hover:text-text-weak hover:bg-surface-raised-base-hover transition-colors"
            classList={{ "text-accent-base": showFilters() }}
            onClick={() => setShowFilters(!showFilters())}
            title="Toggle Filters"
          >
            ...
          </button>
          <div class="flex-1" />
          <Show when={searchMode() === "files" && results().length > 0}>
            <span class="text-11-regular text-text-weaker">
              {totalMatches()} in {totalFiles()} file{totalFiles() !== 1 ? "s" : ""}
            </span>
          </Show>
          <Show when={searchMode() === "symbols" && symbolResults().length > 0}>
            <span class="text-11-regular text-text-weaker">
              {symbolResults().length} symbol{symbolResults().length !== 1 ? "s" : ""}
            </span>
          </Show>
          <Show when={(searchMode() === "files" && results().length > 0) || (searchMode() === "symbols" && symbolResults().length > 0)}>
            <button
              type="button"
              class="text-11-medium px-1.5 py-0.5 rounded text-text-weaker hover:text-text-weak hover:bg-surface-raised-base-hover transition-colors"
              onClick={clearResults}
            >
              Clear
            </button>
          </Show>
        </div>
      </div>

      {/* Results */}
      <div class="flex-1 overflow-y-auto min-h-0">
        <Show when={searching()}>
          <div class="flex items-center justify-center py-4 text-13-regular text-text-weak gap-2">
            <span class="animate-pulse">Searching...</span>
          </div>
        </Show>

        {/* Symbol results */}
        <Show when={!searching() && searchMode() === "symbols" && symbolResults().length > 0}>
          <For each={symbolResults()}>
            {(sym, i) => (
              <button
                type="button"
                class="w-full flex items-center gap-2 px-3 py-1.5 text-12-regular hover:bg-surface-raised-base-hover cursor-pointer text-left transition-colors group"
                classList={{
                  "bg-accent-base/10": i() === selectedResultIndex(),
                }}
                onClick={() => props.onResultClick({ path: sym.path, line: sym.line })}
              >
                <Icon name={symbolKindIcon(sym.kind) as any} size="small" class="text-icon-weaker shrink-0" />
                <div class="flex-1 min-w-0">
                  <span class="text-text-strong">{sym.name}</span>
                  <span class="text-text-weaker ml-1.5 text-11-regular">{sym.kind}</span>
                </div>
                <span class="text-text-weaker text-11-regular truncate shrink-0 max-w-40">{getFilename(sym.path)}:{sym.line}</span>
              </button>
            )}
          </For>
        </Show>

        {/* File search results */}
        <Show when={!searching() && searchMode() === "files" && results().length > 0}>
          <For each={groupedResults()}>
            {([path, fileResults]) => (
              <div class="border-b border-border-base/30 last:border-0">
                {/* File header row */}
                <button
                  type="button"
                  class="w-full flex items-center gap-1.5 px-2 py-1 text-12-medium text-text-strong hover:bg-surface-raised-base-hover cursor-pointer transition-colors group"
                  onClick={() => toggleFileCollapse(path)}
                >
                  <Icon
                    name={isFileCollapsed(path) ? "chevron-right" : "chevron-down"}
                    size="small"
                    class="text-icon-weaker shrink-0 transition-transform"
                  />
                  <Icon name="open-file" size="small" class="text-icon-weak shrink-0" />
                  <span class="truncate flex-1 text-left" title={path}>{getFilename(path)}</span>
                  <span class="shrink-0 text-11-medium px-1.5 py-0.5 rounded-full bg-accent-base/15 text-accent-base tabular-nums">
                    {fileResults.length}
                  </span>
                </button>
                {/* Match rows */}
                <Show when={!isFileCollapsed(path)}>
                  <For each={fileResults}>
                    {(result) => {
                      const col = result.submatches?.[0]?.start ?? 0
                      return (
                        <button
                          type="button"
                          class="w-full flex items-start gap-2 px-4 py-0.5 text-12-regular hover:bg-surface-raised-base-hover cursor-pointer text-left transition-colors group"
                          onClick={() => props.onResultClick({
                            path: result.path.text,
                            line: result.line_number,
                            column: col + 1,
                          })}
                        >
                          <span class="text-text-weaker shrink-0 w-8 text-right tabular-nums text-11-regular mt-0.5">{result.line_number}</span>
                          <div class="flex-1 min-w-0 overflow-hidden">
                            <HighlightedLine text={result.lines.text} submatches={result.submatches} />
                          </div>
                        </button>
                      )
                    }}
                  </For>
                </Show>
              </div>
            )}
          </For>
        </Show>

        <Show when={!searching() && searchQuery() && (searchMode() === "files" ? results().length === 0 : symbolResults().length === 0)}>
          <div class="flex flex-col items-center justify-center py-8 text-13-regular text-text-weaker gap-2">
            <Icon name="circle-x" size="large" class="text-icon-weaker opacity-40" />
            <span>No results found</span>
            <span class="text-12-regular">for "{searchQuery()}"</span>
          </div>
        </Show>
        <Show when={!searching() && !searchQuery()}>
          <div class="flex flex-col items-center justify-center py-8 text-13-regular text-text-weaker gap-2 px-4 text-center">
            <Icon name={searchMode() === "symbols" ? "code" : "magnifying-glass"} size="large" class="text-icon-weaker opacity-40" />
            <span>{searchMode() === "symbols" ? "Search for symbols" : "Search across your project files"}</span>
            <span class="text-12-regular">
              {searchMode() === "symbols"
                ? "Search for functions, classes, variables..."
                : "Type a search term and press Enter"
              }
            </span>
          </div>
        </Show>
      </div>
    </div>
  )
}
