import { useState, useEffect, useCallback, useMemo } from 'react'
import { searchVault } from '../tauri'
import type { SearchHit } from '../types'

type GlobalSearchProps = {
  vaultPath: string | null
  showHidden: boolean
  isVaultUnlocked: boolean
  onOpenResult: (relPath: string, lineNumber: number) => void
}

type GroupedResults = {
  relPath: string
  title: string
  hits: SearchHit[]
}

export function GlobalSearch({
  vaultPath,
  showHidden,
  isVaultUnlocked,
  onOpenResult,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [results, setResults] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vaultPath || !query.trim()) {
      setResults([])
      setSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      setError(null)
      try {
        const hits = await searchVault(
          vaultPath,
          query,
          caseSensitive,
          !isVaultUnlocked, // excludeLocked
          showHidden
        )
        setResults(hits)
      } catch (e) {
        setError(String(e))
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [vaultPath, query, caseSensitive, isVaultUnlocked, showHidden])

  const groupedResults = useMemo(() => {
    const groups: Record<string, GroupedResults> = {}
    for (const hit of results) {
      if (!groups[hit.rel_path]) {
        groups[hit.rel_path] = {
          relPath: hit.rel_path,
          title: hit.rel_path.split('/').pop()?.replace(/\.(md|markdown)$/i, '') || hit.rel_path,
          hits: [],
        }
      }
      groups[hit.rel_path].hits.push(hit)
    }
    return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title))
  }, [results])

  const highlightMatch = useCallback((text: string, match: string, isCaseSensitive: boolean) => {
    if (!match) return text
    const flags = isCaseSensitive ? 'g' : 'gi'
    const parts = text.split(new RegExp(`(${match.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, flags))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === match.toLowerCase() ? (
            <mark key={i} className="searchHighlight">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }, [])

  return (
    <div className="globalSearch">
      <div className="searchBar">
        <input
          autoFocus
          className="searchInput"
          placeholder="Search vault..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search"
        />
        <button
          type="button"
          className={`searchExtraToggle ${caseSensitive ? 'searchExtraToggle--active' : ''}`}
          onClick={() => setCaseSensitive(!caseSensitive)}
          title="Match Case"
        >
          Aa
        </button>
      </div>

      <div className="searchResults">
        {searching && <div className="searchStatus">Searching...</div>}
        {error && <div className="searchError">{error}</div>}
        {!searching && query.trim() && results.length === 0 && (
          <div className="searchEmpty">No matches found.</div>
        )}
        {groupedResults.map((group) => (
          <div key={group.relPath} className="searchGroup">
            <div className="searchGroupHeader">{group.title}</div>
            <div className="searchGroupHits">
              {group.hits.map((hit, i) => (
                <button
                  key={`${hit.rel_path}-${hit.line_number}-${i}`}
                  className="searchHit"
                  onClick={() => onOpenResult(hit.rel_path, hit.line_number)}
                >
                  <div className="searchHitLineNumber">{hit.line_number}</div>
                  <div className="searchHitSnippet">
                    {highlightMatch(hit.snippet, query, caseSensitive)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
