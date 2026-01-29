import { useCallback, useEffect, useRef, useState } from 'react'

import { findBacklinks } from '../../tauri'
import { fileStem } from '../../path'
import { normalizeWikiTarget } from '../../wikilinks'

type UseBacklinksArgs = {
  enabled: boolean
  debounceMs: number
  onError: (message: string) => void
}

export function useBacklinks({ enabled, debounceMs, onError }: UseBacklinksArgs): {
  backlinks: string[]
  backlinksBusy: boolean
  scheduleBacklinksScan: (vault: string, relPath: string) => void
  resetBacklinks: () => void
} {
  const [backlinks, setBacklinks] = useState<string[]>([])
  const [backlinksBusy, setBacklinksBusy] = useState(false)

  const backlinksRequestIdRef = useRef(0)
  const backlinksTimerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (backlinksTimerRef.current != null) {
      window.clearTimeout(backlinksTimerRef.current)
      backlinksTimerRef.current = null
    }
  }, [])

  const refreshBacklinks = useCallback(
    async (vault: string, title: string) => {
      const requestId = ++backlinksRequestIdRef.current
      setBacklinksBusy(true)
      try {
        const links = await findBacklinks(vault, title)
        if (backlinksRequestIdRef.current === requestId) {
          setBacklinks(links)
        }
      } catch (e) {
        if (backlinksRequestIdRef.current === requestId) {
          setBacklinks([])
          onError(String(e))
        }
      } finally {
        if (backlinksRequestIdRef.current === requestId) {
          setBacklinksBusy(false)
        }
      }
    },
    [onError],
  )

  const scheduleBacklinksScan = useCallback(
    (vault: string, relPath: string) => {
      clearTimer()

      // Backlinks are O(files) reads right now; debounce scans to avoid churn
      // when switching notes quickly.
      if (!enabled) return
      const title = normalizeWikiTarget(fileStem(relPath))
      backlinksTimerRef.current = window.setTimeout(() => {
        backlinksTimerRef.current = null
        void refreshBacklinks(vault, title)
      }, debounceMs)
    },
    [clearTimer, debounceMs, enabled, refreshBacklinks],
  )

  const resetBacklinks = useCallback(() => {
    clearTimer()
    setBacklinks([])
    setBacklinksBusy(false)
  }, [clearTimer])

  useEffect(() => {
    if (enabled) return
    resetBacklinks()
  }, [enabled, resetBacklinks])

  return { backlinks, backlinksBusy, scheduleBacklinksScan, resetBacklinks }
}
