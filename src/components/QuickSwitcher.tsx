import { useEffect, useMemo, useRef, useState } from 'react'

import type { NoteEntry } from '../types'
import { fileStem } from '../path'

type QuickSwitcherProps = {
  open: boolean
  files: NoteEntry[]
  recentRelPaths: string[]
  debounceMs: number
  maxResults: number
  maxRecents: number
  onRequestClose: () => void
  onOpenRelPath: (relPath: string) => Promise<boolean>
}

type Candidate = {
  relPath: string
  name: string
  nameLower: string
  pathLower: string
}

function isModP(e: KeyboardEvent | React.KeyboardEvent): boolean {
  // Cmd on macOS, Ctrl elsewhere.
  const mod = (e as KeyboardEvent).metaKey || (e as KeyboardEvent).ctrlKey
  return mod && !e.altKey && !e.shiftKey && (e.key === 'p' || e.key === 'P')
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (!needle) return true
  let i = 0
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++
  }
  return i === needle.length
}

function scoreCandidate(queryLower: string, c: Candidate): number | null {
  if (!queryLower) return 0

  const name = c.nameLower
  const path = c.pathLower

  if (name === queryLower) return 1000

  if (name.startsWith(queryLower)) return 900 - Math.min(name.length - queryLower.length, 50)

  const nameIdx = name.indexOf(queryLower)
  if (nameIdx !== -1) return 800 - Math.min(nameIdx, 200)

  const pathIdx = path.indexOf(queryLower)
  if (pathIdx !== -1) return 600 - Math.min(pathIdx, 300)

  // Lightweight fuzzy: subsequence match on name, then path.
  if (isSubsequence(queryLower, name)) return 450 - Math.min(name.length, 200)
  if (isSubsequence(queryLower, path)) return 350 - Math.min(path.length, 300)

  return null
}

export function QuickSwitcher({
  open,
  files,
  recentRelPaths,
  debounceMs,
  maxResults,
  maxRecents,
  onRequestClose,
  onOpenRelPath,
}: QuickSwitcherProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [opening, setOpening] = useState(false)

  const candidates = useMemo<Candidate[]>(() => {
    return files.map((f) => {
      const relPath = f.rel_path
      const name = fileStem(relPath) || relPath.split('/').pop() || relPath
      return {
        relPath,
        name,
        nameLower: name.toLowerCase(),
        pathLower: relPath.toLowerCase(),
      }
    })
  }, [files])

  const fileSet = useMemo(() => new Set(files.map((f) => f.rel_path)), [files])

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!open) return []

    if (!q) {
      const recent = recentRelPaths.filter((p) => fileSet.has(p))
      const top = recent.slice(0, maxRecents)
      return top
        .map((relPath) => {
          const c = candidates.find((x) => x.relPath === relPath)
          return c ? { c, score: 0 } : null
        })
        .filter((x): x is { c: Candidate; score: number } => x != null)
        .map((x) => x.c)
    }

    const scored: Array<{ c: Candidate; score: number }> = []
    for (const c of candidates) {
      const score = scoreCandidate(q, c)
      if (score == null) continue
      scored.push({ c, score })
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.c.nameLower.localeCompare(b.c.nameLower)
    })

    return scored.slice(0, maxResults).map((x) => x.c)
  }, [candidates, debouncedQuery, fileSet, maxRecents, maxResults, open, recentRelPaths])

  const modeLabel = debouncedQuery.trim() ? 'Search results' : 'Recent'

  useEffect(() => {
    if (!open) return
    setQuery('')
    setDebouncedQuery('')
    setSelectedIndex(0)
    setOpening(false)

    queueMicrotask(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [open])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), debounceMs)
    return () => window.clearTimeout(t)
  }, [debounceMs, query])

  useEffect(() => {
    // Keep selection in range when results change.
    setSelectedIndex((prev) => {
      if (results.length === 0) return 0
      return Math.max(0, Math.min(prev, results.length - 1))
    })
  }, [results.length])

  useEffect(() => {
    if (!open) return
    const selected = results[selectedIndex]
    if (!selected) return

    const el = document.getElementById(`qs-opt-${selectedIndex}`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, results, selectedIndex])

  const requestClose = () => {
    if (opening) return
    onRequestClose()
  }

  const openRelPath = async (relPath: string) => {
    setOpening(true)
    try {
      const ok = await onOpenRelPath(relPath)
      if (ok) {
        onRequestClose()
      }
    } finally {
      setOpening(false)
    }
  }

  const openSelected = async () => {
    const selected = results[selectedIndex]
    if (!selected) return
    await openRelPath(selected.relPath)
  }

  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    // Prevent print dialog while modal is open.
    if (isModP(e)) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      requestClose()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      void openSelected()
      return
    }
  }

  if (!open) return null

  return (
    <div className="qsOverlay" role="presentation" onMouseDown={requestClose}>
      <div
        className="qsCard"
        role="dialog"
        aria-modal="true"
        aria-label="Quick Switcher"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDownCapture={onKeyDownCapture}
      >
        <input
          ref={inputRef}
          className="qsInput"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={files.length ? 'Type to search notes…' : 'Select a vault to search notes…'}
          aria-label="Search notes"
          disabled={files.length === 0}
        />

        <div className="qsMeta" title={modeLabel}>
          {files.length === 0 ? 'No vault selected' : `${modeLabel} (${results.length})`}
          {opening ? <span className="qsBusy">Opening…</span> : null}
        </div>

        <div className="qsList" ref={listRef} role="listbox" aria-label={modeLabel}>
          {results.length === 0 ? (
            <div className="qsEmpty">No matches.</div>
          ) : (
            results.map((r, idx) => {
              const selected = idx === selectedIndex
              return (
                <button
                  id={`qs-opt-${idx}`}
                  key={r.relPath}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={selected ? 'qsItem qsItem--selected' : 'qsItem'}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => void openRelPath(r.relPath)}
                  title={r.relPath}
                >
                  <div className="qsItemPrimary">{r.name}</div>
                  <div className="qsItemSecondary">{r.relPath}</div>
                </button>
              )
            })
          )}
        </div>

        <div className="qsHint">Esc to close · ↑↓ to navigate · Enter to open</div>
      </div>
    </div>
  )
}

export default QuickSwitcher
