import { useCallback, useRef, useState } from 'react'

import type { GraphScope } from './graphTypes'

type GraphHeaderProps = {
  scope: GraphScope
  isLoading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onScopeChange: (scope: GraphScope) => void
  onRefresh: () => void
  onToggleSettings: () => void
}

export function GraphHeader({
  scope,
  isLoading,
  searchQuery,
  onSearchChange,
  onScopeChange,
  onRefresh,
  onToggleSettings,
}: GraphHeaderProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const debounceRef = useRef<number | null>(null)

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setLocalSearch(value)

      // Debounce search updates
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
      debounceRef.current = window.setTimeout(() => {
        onSearchChange(value)
      }, 200)
    },
    [onSearchChange],
  )

  const handleScopeClick = useCallback(() => {
    onScopeChange(scope === 'global' ? 'local' : 'global')
  }, [scope, onScopeChange])

  return (
    <div className="graphHeader">
      <div className="graphHeaderSearch">
        <input
          type="text"
          className="graphSearchInput"
          placeholder="Search nodes..."
          value={localSearch}
          onChange={handleSearchChange}
          aria-label="Search graph nodes"
        />
      </div>

      <div className="graphHeaderActions">
        <button
          type="button"
          className={`graphScopeToggle ${scope === 'local' ? 'graphScopeToggle--local' : ''}`}
          onClick={handleScopeClick}
          title={scope === 'global' ? 'Switch to local graph' : 'Switch to global graph'}
        >
          {scope === 'global' ? 'Global' : 'Local'}
        </button>

        <button
          type="button"
          className="graphRefreshButton"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh graph"
          aria-label="Refresh graph"
        >
          <svg
            viewBox="0 0 24 24"
            className={`graphRefreshIcon ${isLoading ? 'graphRefreshIcon--spinning' : ''}`}
            aria-hidden="true"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              d="M4 12a8 8 0 0 1 14.2-5M20 12a8 8 0 0 1-14.2 5"
            />
            <path fill="currentColor" d="M19 2v6h-6l2-2h4V2z" transform="rotate(45 16 5)" />
            <path fill="currentColor" d="M5 22v-6h6l-2 2H5v4z" transform="rotate(45 8 19)" />
          </svg>
        </button>

        <button
          type="button"
          className="graphSettingsButton"
          onClick={onToggleSettings}
          title="Graph settings"
          aria-label="Graph settings"
        >
          <svg viewBox="0 0 24 24" className="graphSettingsIcon" aria-hidden="true">
            <circle cx="12" cy="5" r="2" fill="currentColor" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="12" cy="19" r="2" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  )
}
