import { useCallback, useEffect, useState } from 'react'

const RECENT_STORAGE_KEY = 'draglass.quickSwitcher.recent.v1'

function loadRecentFromStorage(maxRecent: number): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const next: string[] = []
    for (const v of parsed) {
      if (typeof v === 'string') next.push(v)
    }
    return next.slice(0, maxRecent)
  } catch {
    return []
  }
}

function saveRecentToStorage(recent: string[], maxRecent: number) {
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent.slice(0, maxRecent)))
  } catch {
    // ignore
  }
}

export function useRecentNotes(maxRecents: number): {
  recentRelPaths: string[]
  recordRecent: (relPath: string) => void
} {
  const [recentRelPaths, setRecentRelPaths] = useState<string[]>(() =>
    loadRecentFromStorage(maxRecents),
  )

  useEffect(() => {
    setRecentRelPaths((prev) => {
      const next = prev.slice(0, maxRecents)
      saveRecentToStorage(next, maxRecents)
      return next
    })
  }, [maxRecents])

  const recordRecent = useCallback(
    (relPath: string) => {
      setRecentRelPaths((prev) => {
        const next = [relPath, ...prev.filter((p) => p !== relPath)].slice(0, maxRecents)
        saveRecentToStorage(next, maxRecents)
        return next
      })
    },
    [maxRecents],
  )

  return { recentRelPaths, recordRecent }
}
