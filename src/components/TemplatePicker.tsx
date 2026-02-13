import { useEffect, useMemo, useRef, useState } from 'react'

type TemplatePickerProps = {
  open: boolean
  title: string
  templates: string[]
  onRequestClose: () => void
  onPickTemplate: (templateRelPath: string) => Promise<void>
}

export function TemplatePicker({
  open,
  title,
  templates,
  onRequestClose,
  onPickTemplate,
}: TemplatePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return templates
    return templates.filter((item) => item.toLowerCase().includes(q))
  }, [query, templates])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelectedIndex(0)
    setBusy(false)
    queueMicrotask(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  const openSelected = async () => {
    if (busy) return
    const selected = filtered[selectedIndex]
    if (!selected) return
    setBusy(true)
    try {
      await onPickTemplate(selected)
      onRequestClose()
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="qsOverlay" role="presentation" onMouseDown={onRequestClose}>
      <div
        className="qsCard"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDownCapture={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            onRequestClose()
            return
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)))
            return
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex((i) => Math.max(0, i - 1))
            return
          }
          if (e.key === 'Enter') {
            e.preventDefault()
            void openSelected()
          }
        }}
      >
        <input
          ref={inputRef}
          className="qsInput"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to filter templates…"
          aria-label="Search templates"
        />
        <div className="qsMeta">
          {title} ({filtered.length})
          {busy ? <span className="qsBusy">Applying…</span> : null}
        </div>
        <div className="qsList" role="listbox" aria-label={title}>
          {filtered.length === 0 ? (
            <div className="qsEmpty">No templates found.</div>
          ) : (
            filtered.map((relPath, idx) => {
              const selected = idx === selectedIndex
              const fileName = relPath.split('/').pop() ?? relPath
              return (
                <button
                  key={relPath}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={selected ? 'qsItem qsItem--selected' : 'qsItem'}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    setSelectedIndex(idx)
                    void openSelected()
                  }}
                >
                  <div className="qsItemPrimary">{fileName}</div>
                  <div className="qsItemSecondary">{relPath}</div>
                </button>
              )
            })
          )}
        </div>
        <div className="qsHint">Esc to close · ↑↓ to navigate · Enter to apply</div>
      </div>
    </div>
  )
}

export default TemplatePicker
