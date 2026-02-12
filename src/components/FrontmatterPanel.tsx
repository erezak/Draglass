import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  buildFrontmatter,
  inferEntryType,
  normalizeEntryValue,
  parseFrontmatter,
  type FrontmatterEntry,
} from '../frontmatter'

type FrontmatterPanelProps = {
  noteText: string
  onChange: (next: string) => void
  disabled?: boolean
}

function formatInputValue(entry: FrontmatterEntry): string {
  if (entry.type === 'boolean') {
    return entry.value.toLowerCase() === 'true' ? 'true' : 'false'
  }
  return entry.value
}

export function FrontmatterPanel({ noteText, onChange, disabled = false }: FrontmatterPanelProps) {
  const { entries } = useMemo(() => parseFrontmatter(noteText), [noteText])
  const [adding, setAdding] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [openTypeIndex, setOpenTypeIndex] = useState<number | 'new' | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [newType, setNewType] = useState<FrontmatterEntry['type']>('text')
  const [collapsed, setCollapsed] = useState(false)

  const typeOptions: Array<{ label: string; value: FrontmatterEntry['type'] }> = [
    { label: 'Text', value: 'text' },
    { label: 'Checkbox', value: 'boolean' },
    { label: 'Date', value: 'date' },
    { label: 'Date & time', value: 'datetime' },
    { label: 'Number', value: 'number' },
  ]

  const renderIcon = (entry: FrontmatterEntry) => {
    const type = entry.type
    if (type === 'date') {
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="frontmatterIcon">
          <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="8" y1="3.5" x2="8" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="16" y1="3.5" x2="16" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    }
    if (type === 'boolean') {
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="frontmatterIcon">
          <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M7 12.5l3 3L17 8.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    }
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="frontmatterIcon">
        <line x1="6" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="6" y1="17" x2="18" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  const applyEntries = useCallback(
    (nextEntries: FrontmatterEntry[]) => {
      const next = buildFrontmatter(noteText, nextEntries)
      if (next !== noteText) {
        onChange(next)
      }
    },
    [noteText, onChange],
  )

  const updateEntry = useCallback(
    (index: number, patch: Partial<FrontmatterEntry>) => {
      const nextEntries = entries.map((entry, idx) =>
        idx === index
          ? {
              ...entry,
              ...patch,
            }
          : entry,
      )
      applyEntries(nextEntries)
    },
    [applyEntries, entries],
  )

  const updateEntryType = useCallback(
    (index: number, nextType: FrontmatterEntry['type']) => {
      const entry = entries[index]
      if (!entry) return
      let nextValue = entry.value
      if (nextType === 'boolean') {
        nextValue = entry.value.toLowerCase() === 'true' ? 'true' : 'false'
      }
      updateEntry(index, { type: nextType, value: nextValue })
      setOpenTypeIndex(null)
    },
    [entries, updateEntry],
  )

  const commitAdd = useCallback(() => {
    const key = newKey.trim()
    if (!key) return
    const value = newValue.trim()
    const type = newType || inferEntryType(value)
    const nextEntries = entries.filter((entry) => entry.key !== key)
    nextEntries.push({ key, value, type })
    applyEntries(nextEntries)
    setAdding(false)
    setNewKey('')
    setNewValue('')
    setNewType('text')
    setOpenTypeIndex(null)
  }, [applyEntries, entries, newKey, newType, newValue])

  const cancelAdd = useCallback(() => {
    setAdding(false)
    setNewKey('')
    setNewValue('')
    setNewType('text')
    setOpenTypeIndex(null)
  }, [])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!panelRef.current) return
      if (!panelRef.current.contains(event.target as Node)) {
        setOpenTypeIndex(null)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  return (
    <section
      className={`frontmatterPanel${collapsed ? ' frontmatterPanel--collapsed' : ''}`}
      aria-label="Properties"
      ref={panelRef}
    >
      <button
        type="button"
        className="frontmatterHeaderRow"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <span className="frontmatterToggle" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="frontmatterHeader">Properties</span>
      </button>
      <div className="frontmatterList" hidden={collapsed}>
        {entries.map((entry, index) => (
          <div className="frontmatterRow" key={`${entry.key}-${index}`}>
            <div className="frontmatterKey">
              <button
                type="button"
                className="frontmatterTypeButton"
                onClick={() => setOpenTypeIndex((prev) => (prev === index ? null : index))}
                aria-label="Select property type"
              >
                {renderIcon(entry)}
              </button>
              <input
                className="frontmatterKeyInput"
                value={entry.key}
                disabled={disabled}
                onChange={(event) => updateEntry(index, { key: event.target.value })}
              />
            </div>
            <div className="frontmatterValue">
              {entry.type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={entry.value.toLowerCase() === 'true'}
                  disabled={disabled}
                  onChange={(event) =>
                    updateEntry(index, {
                      value: event.target.checked ? 'true' : 'false',
                      type: 'boolean',
                    })
                  }
                />
              ) : (
                <input
                  type={
                    entry.type === 'date'
                      ? 'date'
                      : entry.type === 'datetime'
                        ? 'datetime-local'
                        : entry.type === 'number'
                          ? 'number'
                          : 'text'
                  }
                  value={formatInputValue(entry)}
                  className="frontmatterValueInput"
                  placeholder="Empty"
                  disabled={disabled}
                  onChange={(event) =>
                    updateEntry(index, {
                      value: normalizeEntryValue(event.target.value, entry.type),
                      type: entry.type,
                    })
                  }
                />
              )}
            </div>
            {openTypeIndex === index ? (
              <div className="frontmatterTypeMenu" role="menu">
                {typeOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className="frontmatterTypeMenuItem"
                    onClick={() => updateEntryType(index, option.value)}
                    role="menuitem"
                  >
                    <span>{option.label}</span>
                    {option.value === entry.type ? (
                      <span className="frontmatterTypeMenuCheck">✓</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        {adding ? (
          <div className="frontmatterRow frontmatterRow--adding">
            <div className="frontmatterKey">
              <button
                type="button"
                className="frontmatterTypeButton"
                onClick={() => setOpenTypeIndex((prev) => (prev === 'new' ? null : 'new'))}
                aria-label="Select property type"
              >
                {renderIcon({ key: '', value: '', type: newType })}
              </button>
              <input
                className="frontmatterKeyInput"
                placeholder="Property name"
                value={newKey}
                onChange={(event) => setNewKey(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    commitAdd()
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelAdd()
                  }
                }}
              />
            </div>
            <div className="frontmatterValue">
              {newType === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={newValue.toLowerCase() === 'true'}
                  onChange={(event) => setNewValue(event.target.checked ? 'true' : 'false')}
                />
              ) : (
                <input
                  type={
                    newType === 'date'
                      ? 'date'
                      : newType === 'datetime'
                        ? 'datetime-local'
                        : newType === 'number'
                          ? 'number'
                          : 'text'
                  }
                  placeholder="Value"
                  value={newValue}
                  className="frontmatterValueInput"
                  onChange={(event) => setNewValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitAdd()
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      cancelAdd()
                    }
                  }}
                />
              )}
            </div>
            <div className="frontmatterActions">
              <button type="button" onClick={commitAdd} className="frontmatterActionButton">
                Add
              </button>
              <button type="button" onClick={cancelAdd} className="frontmatterActionButton">
                Cancel
              </button>
            </div>
            {openTypeIndex === 'new' ? (
              <div className="frontmatterTypeMenu" role="menu">
                {typeOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className="frontmatterTypeMenuItem"
                    onClick={() => {
                      setNewType(option.value)
                      setOpenTypeIndex(null)
                    }}
                    role="menuitem"
                  >
                    <span>{option.label}</span>
                    {option.value === newType ? (
                      <span className="frontmatterTypeMenuCheck">✓</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className="frontmatterAdd"
          onClick={() => setAdding(true)}
          disabled={disabled}
        >
          + Add property
        </button>
      </div>
    </section>
  )
}

export default FrontmatterPanel
