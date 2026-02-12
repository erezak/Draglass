import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { cancelRequest, searchV2, type SearchV2Hit } from '../tauri'

type GlobalSearchProps = {
  vaultPath: string | null
  showHidden: boolean
  isVaultUnlocked: boolean
  onOpenResult: (relPath: string, lineNumber: number) => void
}

type GroupedResults = {
  relPath: string
  title: string
  hits: SearchV2Hit[]
}

const SEARCH_PAGE_SIZE = 200

export function GlobalSearch({
  vaultPath,
  showHidden,
  isVaultUnlocked,
  onOpenResult,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [results, setResults] = useState<SearchV2Hit[]>([])
  const [total, setTotal] = useState(0)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeTokenRef = useRef<string | null>(null)

  const makeToken = useCallback((suffix: string) => `search-${Date.now()}-${suffix}`, [])

  const runSearch = useCallback(
    async (offset: number, append: boolean) => {
      if (!vaultPath || !query.trim()) {
        setResults([])
        setTotal(0)
        setNextOffset(null)
        setSearching(false)
        return
      }

      if (activeTokenRef.current) {
        void cancelRequest(activeTokenRef.current)
      }

      const token = makeToken(`${offset}`)
      activeTokenRef.current = token
      setSearching(true)
      setError(null)

      try {
        const response = await searchV2(
          vaultPath,
          query,
          {
            caseSensitive,
            includeHidden: showHidden,
            includeLocked: isVaultUnlocked,
          },
          SEARCH_PAGE_SIZE,
          offset,
          token,
        )

        if (response.canceled) return

        setResults((prev) => (append ? [...prev, ...response.results] : response.results))
        setTotal(response.total)
        setNextOffset(response.nextOffset)
      } catch (e) {
        setError(String(e))
      } finally {
        if (activeTokenRef.current === token) {
          activeTokenRef.current = null
        }
        setSearching(false)
      }
    },
    [caseSensitive, isVaultUnlocked, makeToken, query, showHidden, vaultPath],
  )

  useEffect(() => {
    if (!vaultPath || !query.trim()) {
      setResults([])
      setTotal(0)
      setNextOffset(null)
      setSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      await runSearch(0, false)
    }, 300)

    return () => {
      clearTimeout(timer)
      if (activeTokenRef.current) {
        void cancelRequest(activeTokenRef.current)
      }
    }
  }, [vaultPath, query, caseSensitive, isVaultUnlocked, showHidden, runSearch])

  const groupedResults = useMemo(() => {
    const groups: Record<string, GroupedResults> = {}
    for (const hit of results) {
      if (!groups[hit.relPath]) {
        groups[hit.relPath] = {
          relPath: hit.relPath,
          title: hit.title,
          hits: [],
        }
      }
      groups[hit.relPath].hits.push(hit)
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

  const renderHighlightedSnippet = useCallback((snippet: string, highlights: SearchV2Hit['highlights']) => {
    if (highlights.length === 0) return snippet

    const sorted = [...highlights].sort((a, b) => a.start - b.start)
    const pieces: ReactNode[] = []
    let cursor = 0

    for (let i = 0; i < sorted.length; i += 1) {
      const range = sorted[i]
      if (range.start > cursor) {
        pieces.push(snippet.slice(cursor, range.start))
      }
      pieces.push(
        <mark key={`hl-${i}-${range.start}-${range.end}`} className="searchHighlight">
          {snippet.slice(range.start, range.end)}
        </mark>,
      )
      cursor = Math.max(cursor, range.end)
    }

    if (cursor < snippet.length) {
      pieces.push(snippet.slice(cursor))
    }

    return <>{pieces}</>
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
                  key={`${hit.relPath}-${hit.lineNumber ?? 0}-${i}`}
                  className="searchHit"
                  onClick={() => onOpenResult(hit.relPath, hit.lineNumber ?? 1)}
                >
                  <div className="searchHitLineNumber">{hit.lineNumber ?? '-'}</div>
                  <div className="searchHitSnippet">
                    {hit.highlights.length > 0 ? (
                      renderHighlightedSnippet(hit.snippet, hit.highlights)
                    ) : (
                      highlightMatch(hit.snippet, query, caseSensitive)
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {!searching && nextOffset != null && (
          <div className="searchMoreWrap">
            <button
              type="button"
              className="searchMoreButton"
              onClick={() => {
                void runSearch(nextOffset, true)
              }}
            >
              Load more ({results.length}/{total})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
