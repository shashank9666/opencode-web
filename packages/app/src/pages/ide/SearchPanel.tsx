import { createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"

interface SearchResultItem {
  path: { text: string }
  lines: { text: string }
  line_number: number
  absolute_offset: number
  submatches: Array<{ match: { text: string }; start: number; end: number }>
}

export default function SearchPanel(props: {
  onSearch: (pattern: string) => Promise<SearchResultItem[]>
  onResultClick: (result: { path: string; line: number }) => void
  onReplace?: (pattern: string, replacement: string) => Promise<void>
  onReplaceAll?: (pattern: string, replacement: string) => Promise<void>
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
  const [collapsed, setCollapsed] = createSignal(false)
  const [viewAsTree, setViewAsTree] = createSignal(false)

  const groupedResults = () => {
    const groups = new Map<string, SearchResultItem[]>()
    for (const r of results()) {
      const existing = groups.get(r.path.text) ?? []
      existing.push(r)
      groups.set(r.path.text, existing)
    }
    return [...groups.entries()]
  }

  const totalMatches = () => results().length
  const totalFiles = () => groupedResults().length

  const performSearch = async () => {
    const q = searchQuery()
    if (!q) return
    setSearching(true)
    try {
      const result = await props.onSearch(q)
      setResults(result ?? [])
    } catch {
      setResults([])
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
  }

  return (
    <div class="size-full flex flex-col">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-2 shrink-0">
        <span class="text-12-medium text-text-weak uppercase tracking-wider">SEARCH</span>
        <div class="flex items-center gap-1">
          <Show when={results().length > 0}>
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
            <Tooltip value="Collapse All" placement="bottom">
              <IconButton
                icon="collapse"
                variant="ghost"
                size="small"
                class="size-6 rounded-md"
                onClick={() => setCollapsed(!collapsed())}
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

      {/* Search input */}
      <div class="p-2 border-b border-border-base shrink-0">
        <div class="flex gap-1 mb-1">
          <div class="flex-1 relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <Icon name="magnifying-glass" size="small" class="text-icon-weaker" />
            </div>
            <input
              type="text"
              class="w-full pl-7 pr-2 py-1.5 text-13-regular bg-surface-base border border-border-base rounded-md outline-none focus:border-accent-base text-text-strong"
              placeholder="Search files..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === "Enter") performSearch() }}
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
          >
            .*
          </button>
          <button
            type="button"
            class="text-11-medium px-1.5 py-0.5 rounded text-text-weaker hover:text-text-weak hover:bg-surface-raised-base-hover transition-colors"
            classList={{ "text-accent-base": showFilters() }}
            onClick={() => setShowFilters(!showFilters())}
          >
            ...
          </button>
          <div class="flex-1" />
          <Show when={results().length > 0}>
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
        <Show when={!searching() && results().length > 0}>
          <div class="px-3 py-1.5 text-12-medium text-text-weak border-b border-border-base">
            {totalMatches()} results in {totalFiles()} file{totalFiles() !== 1 ? "s" : ""}
          </div>
          <For each={groupedResults()}>
            {([path, fileResults]) => (
              <div class="py-1">
                <div class="flex items-center gap-1 px-3 py-0.5 text-12-medium text-text-strong hover:bg-surface-raised-base-hover cursor-pointer transition-colors">
                  <Icon name="open-file" size="small" class="text-icon-weak shrink-0" />
                  <span class="truncate">{path}</span>
                </div>
                <For each={fileResults}>
                  {(result) => (
                    <button
                      type="button"
                      class="w-full flex items-start gap-2 px-6 py-0.5 text-12-regular hover:bg-surface-raised-base-hover cursor-pointer text-left transition-colors"
                      onClick={() => props.onResultClick({ path: result.path.text, line: result.line_number })}
                    >
                      <span class="text-text-weaker shrink-0 w-8 text-right tabular-nums">{result.line_number}</span>
                      <span class="text-text-strong truncate">{result.lines.text.trim()}</span>
                    </button>
                  )}
                </For>
              </div>
            )}
          </For>
        </Show>
        <Show when={!searching() && searchQuery() && results().length === 0}>
          <div class="flex flex-col items-center justify-center py-8 text-13-regular text-text-weaker gap-2">

            <Icon name="circle-x" size="large" class="text-icon-weaker opacity-40" />
            <span>No results found</span>
          </div>
        </Show>
        <Show when={!searching() && !searchQuery()}>
          <div class="flex flex-col items-center justify-center py-8 text-13-regular text-text-weaker gap-2 px-4 text-center">

            <Icon name="magnifying-glass" size="large" class="text-icon-weaker opacity-40" />
            <span>Search across your project files</span>
            <span class="text-12-regular">Type a search term and press Enter</span>
          </div>
        </Show>
      </div>
    </div>
  )
}
