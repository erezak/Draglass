import { useEffect, useMemo, useRef, useState } from 'react'

export type Command = {
  id: string
  label: string
  description?: string
  shortcut?: string
  enabled?: boolean
  onExecute: () => void
}

type CommandPaletteProps = {
  open: boolean
  commands: Command[]
  onRequestClose: () => void
}

function isModShiftP(e: KeyboardEvent | React.KeyboardEvent): boolean {
  const mod = (e as KeyboardEvent).metaKey || (e as KeyboardEvent).ctrlKey
  return mod && !e.altKey && e.shiftKey && (e.key === 'p' || e.key === 'P')
}

function scoreCommand(queryLower: string, cmd: Command): number | null {
  if (!queryLower) return 0

  const labelLower = cmd.label.toLowerCase()
  const descLower = (cmd.description ?? '').toLowerCase()

  if (labelLower === queryLower) return 1000
  if (labelLower.startsWith(queryLower)) return 900 - Math.min(labelLower.length - queryLower.length, 50)

  const labelIdx = labelLower.indexOf(queryLower)
  if (labelIdx !== -1) return 800 - Math.min(labelIdx, 200)

  const descIdx = descLower.indexOf(queryLower)
  if (descIdx !== -1) return 600 - Math.min(descIdx, 300)

  return null
}

export function CommandPalette({
  open,
  commands,
  onRequestClose,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const enabledCommands = useMemo(() => commands.filter((c) => c.enabled !== false), [commands])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!open) return []

    if (!q) {
      return enabledCommands
    }

    const scored: Array<{ cmd: Command; score: number }> = []
    for (const cmd of enabledCommands) {
      const score = scoreCommand(q, cmd)
      if (score == null) continue
      scored.push({ cmd, score })
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.cmd.label.localeCompare(b.cmd.label)
    })

    return scored.map((x) => x.cmd)
  }, [enabledCommands, open, query])

  // Reset state when palette opens (render-time adjustment, not an effect)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open && !prevOpen) {
    setQuery('')
    setSelectedIndex(0)
  }
  if (open !== prevOpen) setPrevOpen(open)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [open])

  // Clamp selectedIndex when results shrink (render-time adjustment)
  const clampedIndex = results.length === 0 ? 0 : Math.min(selectedIndex, results.length - 1)
  if (clampedIndex !== selectedIndex) {
    setSelectedIndex(clampedIndex)
  }

  useEffect(() => {
    if (!open) return
    const selected = results[selectedIndex]
    if (!selected) return

    const el = document.getElementById(`cp-opt-${selectedIndex}`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, results, selectedIndex])

  const executeSelected = () => {
    const selected = results[selectedIndex]
    if (!selected) return
    onRequestClose()
    selected.onExecute()
  }

  const executeCommand = (cmd: Command) => {
    onRequestClose()
    cmd.onExecute()
  }

  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    if (isModShiftP(e)) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onRequestClose()
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
      executeSelected()
      return
    }
  }

  if (!open) return null

  return (
    <div className="qsOverlay" role="presentation" onMouseDown={onRequestClose}>
      <div
        className="qsCard"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDownCapture={onKeyDownCapture}
      >
        <input
          ref={inputRef}
          className="qsInput"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command…"
          aria-label="Search commands"
        />

        <div className="qsMeta">
          Commands ({results.length})
        </div>

        <div className="qsList" ref={listRef} role="listbox" aria-label="Commands">
          {results.length === 0 ? (
            <div className="qsEmpty">No matching commands.</div>
          ) : (
            results.map((cmd, idx) => {
              const selected = idx === selectedIndex
              return (
                <button
                  id={`cp-opt-${idx}`}
                  key={cmd.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={selected ? 'qsItem qsItem--selected' : 'qsItem'}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => executeCommand(cmd)}
                  title={cmd.description}
                >
                  <div className="qsItemPrimary">{cmd.label}</div>
                  {cmd.description ? (
                    <div className="qsItemSecondary">{cmd.description}</div>
                  ) : null}
                  {cmd.shortcut ? (
                    <div className="qsItemShortcut">{cmd.shortcut}</div>
                  ) : null}
                </button>
              )
            })
          )}
        </div>

        <div className="qsHint">Esc to close · ↑↓ to navigate · Enter to run</div>
      </div>
    </div>
  )
}

export default CommandPalette
