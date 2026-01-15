import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import { open } from '@tauri-apps/plugin-dialog'
import { findBacklinks, listMarkdownFiles, readNote, writeNote } from './tauri'
import type { NoteEntry } from './types'
import { normalizeWikiTarget, parseWikilinks } from './wikilinks'
import { fileStem } from './path'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FileTree } from './components/FileTree'
import { useNoteAutosave } from './components/useNoteAutosave'
import type { NoteEditorHandle } from './components/NoteEditor'
import { QuickSwitcher } from './components/QuickSwitcher'

const NoteEditor = lazy(() => import('./components/NoteEditor'))

const WRAP_STORAGE_KEY = 'draglass.editor.wrap.v1'
const RECENT_STORAGE_KEY = 'draglass.quickSwitcher.recent.v1'
const MAX_RECENT = 20

function loadWrapEnabledFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(WRAP_STORAGE_KEY)
    if (raw == null) return true
    if (raw === 'true') return true
    if (raw === 'false') return false
    return true
  } catch {
    return true
  }
}

function loadRecentFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const next: string[] = []
    for (const v of parsed) {
      if (typeof v === 'string') next.push(v)
    }
    return next.slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

function saveRecentToStorage(recent: string[]) {
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {
    // ignore
  }
}

function isModP(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey
  return mod && !e.altKey && !e.shiftKey && (e.key === 'p' || e.key === 'P')
}

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [files, setFiles] = useState<NoteEntry[]>([])
  const [activeRelPath, setActiveRelPath] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savedText, setSavedText] = useState('')

  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backlinks, setBacklinks] = useState<string[]>([])
  const [backlinksBusy, setBacklinksBusy] = useState(false)

  const [wrapEnabled, setWrapEnabled] = useState<boolean>(() => loadWrapEnabledFromStorage())

  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)
  const [recentRelPaths, setRecentRelPaths] = useState<string[]>(() => loadRecentFromStorage())

  const editorRef = useRef<NoteEditorHandle | null>(null)
  const openRequestIdRef = useRef(0)

  const backlinksRequestIdRef = useRef(0)

  const noteTitle = useMemo(() => {
    if (!activeRelPath) return null
    return fileStem(activeRelPath)
  }, [activeRelPath])

  // Parsing wikilinks can be relatively expensive on large notes.
  // Defer derived UI updates to keep typing responsive.
  const deferredNoteText = useDeferredValue(noteText)
  const outgoingLinks = useMemo(() => parseWikilinks(deferredNoteText), [deferredNoteText])
  const isDirty = noteText !== savedText

  const backlinksTimerRef = useRef<number | null>(null)

  const refreshFileList = useCallback(async (vault: string) => {
    const nextFiles = await listMarkdownFiles(vault)
    setFiles(nextFiles)
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
          setError(String(e))
        }
      } finally {
        if (backlinksRequestIdRef.current === requestId) {
          setBacklinksBusy(false)
        }
      }
    },
    [],
  )

  const scheduleBacklinksScan = useCallback(
    (vault: string, relPath: string) => {
      if (backlinksTimerRef.current != null) {
        window.clearTimeout(backlinksTimerRef.current)
        backlinksTimerRef.current = null
      }

      // Backlinks are O(files) reads right now; debounce scans to avoid churn
      // when switching notes quickly.
      const delayMs = 250
      const title = normalizeWikiTarget(fileStem(relPath))
      backlinksTimerRef.current = window.setTimeout(() => {
        backlinksTimerRef.current = null
        void refreshBacklinks(vault, title)
      }, delayMs)
    },
    [refreshBacklinks],
  )

  const autosave = useNoteAutosave({
    enabled: !!vaultPath && !!activeRelPath,
    vaultPath,
    relPath: activeRelPath,
    text: noteText,
    isDirty,
    debounceMs: 750,
    save: writeNote,
    onSaved: setSavedText,
  })

  const { flush: flushAutosave, status: saveStatus, title: saveTitle, ariaLabel: saveAriaLabel } =
    autosave

  const onEditorSaveRequest = useCallback(() => {
    void flushAutosave()
  }, [flushAutosave])

  const toggleWrap = useCallback(() => {
    setWrapEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem(WRAP_STORAGE_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const closeQuickSwitcher = useCallback(() => {
    setQuickSwitcherOpen(false)
    if (activeRelPath) {
      queueMicrotask(() => editorRef.current?.focus())
    }
  }, [activeRelPath])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isModP(e)) return
      e.preventDefault()
      e.stopPropagation()

      setQuickSwitcherOpen(true)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  const pickVault = useCallback(async () => {
    setError(null)
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Vault Folder',
    })

    if (!selected || Array.isArray(selected)) return

    setVaultPath(selected)
    setActiveRelPath(null)
    setNoteText('')
    setSavedText('')
    setBacklinks([])
    setBacklinksBusy(false)
    if (backlinksTimerRef.current != null) {
      window.clearTimeout(backlinksTimerRef.current)
      backlinksTimerRef.current = null
    }
    setBusy('Loading files…')
    try {
      await refreshFileList(selected)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }, [refreshFileList])

  const openNoteByRelPath = useCallback(
    async (relPath: string): Promise<boolean> => {
      if (!vaultPath) return false

      const requestId = ++openRequestIdRef.current

      if (activeRelPath && isDirty) {
        const ok = await flushAutosave()
        if (!ok) return false
      }

      setError(null)
      setBusy('Opening note…')
      try {
        const text = await readNote(vaultPath, relPath)

        if (openRequestIdRef.current !== requestId) return false

        setActiveRelPath(relPath)
        setNoteText(text)
        setSavedText(text)
        setBacklinks([])
        setBacklinksBusy(false)

        // Scan backlinks after the note is already open, but debounce to avoid
        // expensive rescans when switching notes quickly.
        scheduleBacklinksScan(vaultPath, relPath)

        setRecentRelPaths((prev) => {
          const next = [relPath, ...prev.filter((p) => p !== relPath)].slice(0, MAX_RECENT)
          saveRecentToStorage(next)
          return next
        })

        return true
      } catch (e) {
        if (openRequestIdRef.current === requestId) {
          setError(String(e))
        }
        return false
      } finally {
        if (openRequestIdRef.current === requestId) {
          setBusy(null)
        }
      }
    },
    [activeRelPath, flushAutosave, isDirty, scheduleBacklinksScan, vaultPath],
  )

  const tryOpenByTitle = useCallback(
    async (title: string) => {
      const normalized = normalizeWikiTarget(title)
      const match = files.find((f) => normalizeWikiTarget(fileStem(f.rel_path)) === normalized)
      if (match) {
        await openNoteByRelPath(match.rel_path)
      }
    },
    [files, openNoteByRelPath],
  )

  return (
    <ErrorBoundary fallbackTitle="Draglass hit an error">
      <div className="appShell">
        <header className="topbar">
          <div className="brand">Draglass</div>
          <button onClick={pickVault}>Select vault…</button>
          <div className="spacer" />
          <div className="status">
            {vaultPath ? (
              <span className="vaultPath" title={vaultPath}>
                {vaultPath}
              </span>
            ) : (
              <span className="muted">No vault selected</span>
            )}
          </div>
        </header>

        <div className="content">
          <aside className="sidebar">
            <div className="panelTitle">Files</div>
            {!vaultPath ? (
              <div className="panelEmpty">Pick a vault folder to begin.</div>
            ) : files.length === 0 ? (
              <div className="panelEmpty">No Markdown files found.</div>
            ) : (
              <FileTree
                files={files}
                activeRelPath={activeRelPath}
                onOpenFile={(p) => {
                  void openNoteByRelPath(p)
                }}
              />
            )}
          </aside>

          <main className="editorPane">
            <div className="editorHeader">
              <div className="panelTitle">{noteTitle ?? 'Editor'}</div>
              <div className="spacer" />
              {activeRelPath ? (
                <>
                  <button
                    type="button"
                    className={wrapEnabled ? 'wrapToggle wrapToggle--on' : 'wrapToggle'}
                    aria-pressed={wrapEnabled}
                    onClick={toggleWrap}
                    title={wrapEnabled ? 'Soft wrap: On' : 'Soft wrap: Off'}
                  >
                    Wrap
                  </button>
                  <span
                    className={`saveDot saveDot--${saveStatus}`}
                    title={saveTitle}
                    role="img"
                    aria-label={saveAriaLabel}
                  />
                </>
              ) : null}
            </div>

            {error ? <div className="error">{error}</div> : null}
            {busy ? <div className="busy">{busy}</div> : null}

            {!vaultPath ? (
              <div className="panelEmpty">Select a vault to edit notes.</div>
            ) : !activeRelPath ? (
              <div className="panelEmpty">Select a file from the list.</div>
            ) : (
              <Suspense fallback={<div className="panelEmpty">Loading editor…</div>}>
                <NoteEditor
                  ref={editorRef}
                  value={noteText}
                  onChange={setNoteText}
                  onSaveRequest={onEditorSaveRequest}
                  wrap={wrapEnabled}
                />
              </Suspense>
            )}
          </main>

          <aside className="rightPane">
            <div className="panel">
              <div className="panelTitle">Outgoing links</div>
              {outgoingLinks.length === 0 ? (
                <div className="panelEmpty">No wikilinks detected.</div>
              ) : (
                <ul className="linkList">
                  {outgoingLinks.map((l) => (
                    <li key={l.normalized}>
                      <button
                        className="linkItem"
                        onClick={() => {
                          void tryOpenByTitle(l.normalized)
                        }}
                      >
                        [[{l.target}]]
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel">
              <div className="panelTitle">Backlinks</div>
              {!noteTitle ? (
                <div className="panelEmpty">Open a note to see backlinks.</div>
              ) : backlinksBusy ? (
                <div className="panelEmpty">Scanning backlinks…</div>
              ) : backlinks.length === 0 ? (
                <div className="panelEmpty">No backlinks found.</div>
              ) : (
                <ul className="linkList">
                  {backlinks.map((p) => (
                    <li key={p}>
                      <button
                        className="linkItem"
                        onClick={() => {
                          void openNoteByRelPath(p)
                        }}
                      >
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>

      <QuickSwitcher
        open={quickSwitcherOpen}
        files={files}
        recentRelPaths={recentRelPaths}
        onRequestClose={closeQuickSwitcher}
        onOpenRelPath={openNoteByRelPath}
      />
    </ErrorBoundary>
  )
}

export default App
