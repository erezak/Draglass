import { useCallback, useState } from 'react'

const RECENT_COMMANDS_STORAGE_KEY = 'draglass.commandPalette.recent.v1'

function loadRecentCommandsFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COMMANDS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

function saveRecentCommandsToStorage(recentCommandIds: string[]) {
  try {
    localStorage.setItem(RECENT_COMMANDS_STORAGE_KEY, JSON.stringify(recentCommandIds))
  } catch {
    // ignore
  }
}

export function useRecentCommands(): {
  recentCommandIds: string[]
  recordRecentCommand: (commandId: string) => void
} {
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>(() =>
    loadRecentCommandsFromStorage(),
  )

  const recordRecentCommand = useCallback((commandId: string) => {
    setRecentCommandIds((prev) => {
      const next = [commandId, ...prev.filter((id) => id !== commandId)]
      saveRecentCommandsToStorage(next)
      return next
    })
  }, [])

  return { recentCommandIds, recordRecentCommand }
}
