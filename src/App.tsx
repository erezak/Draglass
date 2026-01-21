import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import { open } from '@tauri-apps/plugin-dialog'
import { createNote, findBacklinks, listMarkdownFiles, readNote, writeNote } from './tauri'
import type { NoteEntry } from './types'
import { normalizeWikiTarget, parseWikilinks } from './wikilinks'
import { fileStem } from './path'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FileTree } from './components/FileTree'
import { useNoteAutosave } from './components/useNoteAutosave'
import type { NoteEditorHandle } from './components/NoteEditor'
import { QuickSwitcher } from './components/QuickSwitcher'
import { SettingsScreen } from './components/SettingsScreen'
import { isIgnoredPath, isVisibleNoteForNavigation } from './ignore'
import { useSettings } from './settings'

const NoteEditor = lazy(() => import('./components/NoteEditor'))

const RECENT_STORAGE_KEY = 'draglass.quickSwitcher.recent.v1'

function stripWikilinkTarget(rawTarget: string): string {
  const base = rawTarget.split('|')[0] ?? ''
  return base.trim()
}

function targetToRelPath(rawTarget: string): string | null {
  const trimmed = stripWikilinkTarget(rawTarget)
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return trimmed
  return `${trimmed}.md`
}

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

function isModP(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey
  return mod && !e.altKey && !e.shiftKey && (e.key === 'p' || e.key === 'P')
}

function App() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [files, setFiles] = useState<NoteEntry[]>([])
  const [activeRelPath, setActiveRelPath] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savedText, setSavedText] = useState('')

  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backlinks, setBacklinks] = useState<string[]>([])
  const [backlinksBusy, setBacklinksBusy] = useState(false)

  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)
  const [recentRelPaths, setRecentRelPaths] = useState<string[]>(() =>
    loadRecentFromStorage(settings.quickSwitcherMaxRecents),
  )
  const [settingsOpen, setSettingsOpen] = useState(false)

  const editorRef = useRef<NoteEditorHandle | null>(null)
  const openRequestIdRef = useRef(0)

  const backlinksRequestIdRef = useRef(0)

  const noteTitle = useMemo(() => {
    if (!activeRelPath) return null
    return fileStem(activeRelPath)
  }, [activeRelPath])

  const vaultName = useMemo(() => {
    if (!vaultPath) return null
    const normalized = vaultPath.replace(/\\/g, '/').replace(/\/+$/, '')
    const parts = normalized.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? normalized
  }, [vaultPath])

  const navFiles = useMemo(() => {
    return files.filter((f) => isVisibleNoteForNavigation(f.rel_path, settings.filesShowHidden))
  }, [files, settings.filesShowHidden])

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
      if (!settings.backlinksEnabled) return
      const delayMs = settings.backlinksDebounceMs
      const title = normalizeWikiTarget(fileStem(relPath))
      backlinksTimerRef.current = window.setTimeout(() => {
        backlinksTimerRef.current = null
        void refreshBacklinks(vault, title)
      }, delayMs)
    },
    [refreshBacklinks, settings.backlinksDebounceMs, settings.backlinksEnabled],
  )

  const autosave = useNoteAutosave({
    enabled: settings.autosaveEnabled && !!vaultPath && !!activeRelPath,
    vaultPath,
    relPath: activeRelPath,
    text: noteText,
    isDirty,
    debounceMs: settings.autosaveDebounceMs,
    save: writeNote,
    onSaved: setSavedText,
  })

  const { flush: flushAutosave, status: saveStatus, title: saveTitle, ariaLabel: saveAriaLabel } =
    autosave

  const onEditorSaveRequest = useCallback(() => {
    void flushAutosave()
  }, [flushAutosave])

  useEffect(() => {
    setRecentRelPaths((prev) => {
      const next = prev.slice(0, settings.quickSwitcherMaxRecents)
      saveRecentToStorage(next, settings.quickSwitcherMaxRecents)
      return next
    })
  }, [settings.quickSwitcherMaxRecents])

  useEffect(() => {
    if (settings.backlinksEnabled) return
    if (backlinksTimerRef.current != null) {
      window.clearTimeout(backlinksTimerRef.current)
      backlinksTimerRef.current = null
    }
    setBacklinksBusy(false)
  }, [settings.backlinksEnabled])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = settings.editorTheme
  }, [settings.editorTheme])

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
          const next = [relPath, ...prev.filter((p) => p !== relPath)].slice(
            0,
            settings.quickSwitcherMaxRecents,
          )
          saveRecentToStorage(next, settings.quickSwitcherMaxRecents)
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
    [activeRelPath, flushAutosave, isDirty, scheduleBacklinksScan, settings.quickSwitcherMaxRecents, vaultPath],
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

  const openOrCreateWikilink = useCallback(
    async (rawTarget: string) => {
      if (!vaultPath) return
      const trimmed = stripWikilinkTarget(rawTarget)
      if (!trimmed) return

      const normalized = normalizeWikiTarget(trimmed)
      const match = files.find((f) => normalizeWikiTarget(fileStem(f.rel_path)) === normalized)
      if (match) {
        await openNoteByRelPath(match.rel_path)
        return
      }

      const relPath = targetToRelPath(rawTarget)
      if (!relPath) return
      if (isIgnoredPath(relPath)) {
        setError(`Cannot create note in ignored path: ${relPath}`)
        return
      }

      const confirmed = window.confirm(`Create note "${trimmed}"?`)
      if (!confirmed) return

      setError(null)
      setBusy('Creating note…')
      try {
        await createNote(vaultPath, relPath, '')
        await refreshFileList(vaultPath)
        await openNoteByRelPath(relPath)
      } catch (e) {
        setError(String(e))
      } finally {
        setBusy(null)
      }
    },
    [files, openNoteByRelPath, refreshFileList, vaultPath],
  )

  return (
    <ErrorBoundary fallbackTitle="Draglass hit an error">
      <div className="appShell">
        <header className="topbar">
          <div className="brand">Draglass</div>
          <button className="vaultButton" onClick={pickVault}>Select vault…</button>
          <div className="spacer" />
        </header>

        <div className="content">
          <aside className="sidebar">
            <div className="sidebarBody">
              <div className="paneHeader">
                <div className="panelTitle">Files</div>
                <div className="spacer" />
              </div>
              {!vaultPath ? (
                <div className="panelEmpty">Pick a vault folder to begin.</div>
              ) : files.length === 0 ? (
                <div className="panelEmpty">No Markdown files found.</div>
              ) : (
                <FileTree
                  files={navFiles}
                  activeRelPath={activeRelPath}
                  rememberExpanded={settings.filesRememberExpandedFolders}
                  onOpenFile={(p) => {
                    void openNoteByRelPath(p)
                  }}
                />
              )}
            </div>
            <div className="sidebarFooter">
              <div className="sidebarVault" title={vaultPath ?? 'No vault selected'}>
                {vaultName ? vaultName : <span className="muted">No vault selected</span>}
              </div>
              <button
                type="button"
                className="settingsButton settingsButton--icon"
                onClick={() => setSettingsOpen(true)}
                aria-label="Open settings"
                title="Settings"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="settingsIcon"
                  focusable="false"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.94 3.06-1.74-.3a7.12 7.12 0 0 0-.64-1.55l1.02-1.43a.9.9 0 0 0-.1-1.15l-1.41-1.41a.9.9 0 0 0-1.15-.1l-1.43 1.02c-.5-.28-1.02-.5-1.55-.64l-.3-1.74a.9.9 0 0 0-.9-.75h-2a.9.9 0 0 0-.9.75l-.3 1.74c-.53.14-1.05.36-1.55.64L7.44 5.62a.9.9 0 0 0-1.15.1L4.88 7.13a.9.9 0 0 0-.1 1.15l1.02 1.43c-.28.5-.5 1.02-.64 1.55l-1.74.3a.9.9 0 0 0-.75.9v2c0 .44.31.82.75.9l1.74.3c.14.53.36 1.05.64 1.55l-1.02 1.43a.9.9 0 0 0 .1 1.15l1.41 1.41c.32.32.82.36 1.15.1l1.43-1.02c.5.28 1.02.5 1.55.64l.3 1.74c.08.44.46.75.9.75h2c.44 0 .82-.31.9-.75l.3-1.74c.53-.14 1.05-.36 1.55-.64l1.43 1.02c.34.26.83.22 1.15-.1l1.41-1.41c.32-.32.36-.82.1-1.15l-1.02-1.43c.28-.5.5-1.02.64-1.55l1.74-.3c.44-.08.75-.46.75-.9v-2a.9.9 0 0 0-.75-.9Z"
                  />
                </svg>
              </button>
            </div>
          </aside>

          <main className="editorPane">
            <div className="editorHeader">
              <div className="panelTitle">{noteTitle ?? 'Editor'}</div>
              <div className="spacer" />
              {activeRelPath ? (
                <button
                  type="button"
                  className={`livePreviewToggle ${
                    settings.editorLivePreview ? 'livePreviewToggle--on' : ''
                  }`}
                  onClick={() => updateSettings({ editorLivePreview: !settings.editorLivePreview })}
                  title={settings.editorLivePreview ? 'Switch to source mode' : 'Switch to live preview'}
                >
                  {settings.editorLivePreview ? 'Live Preview' : 'Source'}
                </button>
              ) : null}
              {activeRelPath ? (
                <>
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
                  wrap={settings.editorWrap}
                  livePreview={settings.editorLivePreview}
                  onOpenWikilink={openOrCreateWikilink}
                  theme={settings.editorTheme}
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
              {!settings.backlinksEnabled ? (
                <div className="panelEmpty">Backlinks are disabled in settings.</div>
              ) : !noteTitle ? (
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
        files={navFiles}
        recentRelPaths={recentRelPaths}
        debounceMs={settings.quickSwitcherDebounceMs}
        maxResults={settings.quickSwitcherMaxResults}
        maxRecents={settings.quickSwitcherMaxRecents}
        onRequestClose={closeQuickSwitcher}
        onOpenRelPath={openNoteByRelPath}
      />

      <SettingsScreen
        open={settingsOpen}
        settings={settings}
        onChange={updateSettings}
        onReset={resetSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </ErrorBoundary>
  )
}

export default App
