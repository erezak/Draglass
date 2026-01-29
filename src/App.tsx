import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import { parseWikilinks } from './wikilinks'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FileTree } from './components/FileTree'
import type { NoteEditorHandle } from './components/NoteEditor'
import { QuickSwitcher } from './components/QuickSwitcher'
import { SettingsScreen } from './components/SettingsScreen'
import { Toolbox } from './components/Toolbox'
import { useSettings } from './settings'
import { useBacklinks } from './features/backlinks/useBacklinks'
import { useNoteManager } from './features/notes/useNoteManager'
import { useRecentNotes } from './features/recents/useRecentNotes'
import { useEditorTheme } from './features/theme/useEditorTheme'
import { useVault } from './features/vault/useVault'

const NoteEditor = lazy(() => import('./components/NoteEditor'))

function isModP(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey
  return mod && !e.altKey && !e.shiftKey && (e.key === 'p' || e.key === 'P')
}

function isModShiftP(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey
  return mod && !e.altKey && e.shiftKey && (e.key === 'p' || e.key === 'P')
}

function App() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [graphViewOpen, setGraphViewOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  const editorRef = useRef<NoteEditorHandle | null>(null)

  const { recentRelPaths, recordRecent } = useRecentNotes(settings.quickSwitcherMaxRecents)

  const { vaultPath, files, navFiles, vaultName, refreshFileList, pickVault } = useVault({
    rememberLast: settings.vaultRememberLast,
    showHidden: settings.filesShowHidden,
    onBusy: setBusy,
    onError: setError,
  })

  const { backlinks, backlinksBusy, scheduleBacklinksScan, resetBacklinks } = useBacklinks({
    enabled: settings.backlinksEnabled,
    debounceMs: settings.backlinksDebounceMs,
    onError: (message) => setError(message),
  })

  const {
    activeRelPath,
    noteText,
    setNoteText,
    noteTitle,
    autosave,
    openNoteByRelPath,
    tryOpenByTitle,
    openOrCreateWikilink,
    resetNoteState,
  } = useNoteManager({
    vaultPath,
    files,
    refreshFileList,
    scheduleBacklinksScan,
    resetBacklinks,
    autosaveEnabled: settings.autosaveEnabled,
    autosaveDebounceMs: settings.autosaveDebounceMs,
    recordRecent,
    setError,
    setBusy,
  })

  // Parsing wikilinks can be relatively expensive on large notes.
  // Defer derived UI updates to keep typing responsive.
  const deferredNoteText = useDeferredValue(noteText)
  const outgoingLinks = useMemo(() => parseWikilinks(deferredNoteText), [deferredNoteText])
  const { flush: flushAutosave, status: saveStatus, title: saveTitle, ariaLabel: saveAriaLabel } =
    autosave

  const onEditorSaveRequest = useCallback(() => {
    void flushAutosave()
  }, [flushAutosave])

  useEditorTheme(settings.editorTheme)

  useEffect(() => {
    resetNoteState()
    resetBacklinks()
  }, [resetBacklinks, resetNoteState, vaultPath])

  const closeQuickSwitcher = useCallback(() => {
    setQuickSwitcherOpen(false)
    if (activeRelPath) {
      queueMicrotask(() => editorRef.current?.focus())
    }
  }, [activeRelPath])

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false)
    if (activeRelPath) {
      queueMicrotask(() => editorRef.current?.focus())
    }
  }, [activeRelPath])

  const openQuickSwitcher = useCallback(() => {
    setCommandPaletteOpen(false)
    setQuickSwitcherOpen(true)
  }, [])

  const toggleGraphView = useCallback(() => {
    setQuickSwitcherOpen(false)
    setCommandPaletteOpen(false)
    setGraphViewOpen((prev) => !prev)
  }, [])

  const openCommandPalette = useCallback(() => {
    setQuickSwitcherOpen(false)
    setCommandPaletteOpen(true)
  }, [])

  const openNoteAndCloseGraph = useCallback(
    (relPath: string) => {
      setGraphViewOpen(false)
      return openNoteByRelPath(relPath)
    },
    [openNoteByRelPath],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isModShiftP(e)) {
        e.preventDefault()
        e.stopPropagation()
        setCommandPaletteOpen(true)
        return
      }

      if (isModP(e)) {
        e.preventDefault()
        e.stopPropagation()
        setQuickSwitcherOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  useEffect(() => {
    if (!commandPaletteOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeCommandPalette()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [closeCommandPalette, commandPaletteOpen])

  return (
    <ErrorBoundary fallbackTitle="Draglass hit an error">
      <div className="appShell">
        <header className="topbar">
          <div className="brand">Draglass</div>
          <button className="vaultButton" onClick={pickVault}>Select vault…</button>
          <div className="spacer" />
        </header>

        <div className="content">
          <Toolbox
            quickSwitcherActive={quickSwitcherOpen}
            graphViewActive={graphViewOpen}
            commandPaletteActive={commandPaletteOpen}
            onOpenQuickSwitcher={openQuickSwitcher}
            onToggleGraphView={toggleGraphView}
            onOpenCommandPalette={openCommandPalette}
          />
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
                    void openNoteAndCloseGraph(p)
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
              <div className="panelTitle">{graphViewOpen ? 'Graph View' : noteTitle ?? 'Editor'}</div>
              <div className="spacer" />
              {activeRelPath && !graphViewOpen ? (
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
              {activeRelPath && !graphViewOpen ? (
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

            {graphViewOpen ? (
              <div className="placeholderCard" role="status">
                <div className="placeholderTitle">Graph view is coming soon.</div>
                <div className="placeholderBody">
                  This space will visualize connections between your notes once the graph view ships.
                </div>
              </div>
            ) : !vaultPath ? (
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
                  renderDiagrams={settings.editorRenderDiagrams}
                  renderImages={settings.editorRenderImages}
                  vaultPath={vaultPath}
                  noteRelPath={activeRelPath}
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
                          setGraphViewOpen(false)
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
                          void openNoteAndCloseGraph(p)
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
        onOpenRelPath={openNoteAndCloseGraph}
      />

      <SettingsScreen
        open={settingsOpen}
        settings={settings}
        onChange={updateSettings}
        onReset={resetSettings}
        onClose={() => setSettingsOpen(false)}
      />

      {commandPaletteOpen ? (
        <div
          className="placeholderOverlay"
          role="presentation"
          onMouseDown={closeCommandPalette}
        >
          <div
            className="placeholderModal"
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="placeholderTitle">Command palette is coming soon.</div>
            <div className="placeholderBody">
              We’ll bring command-driven workflows here in a future release.
            </div>
            <div className="placeholderFooter">
              <button type="button" className="placeholderClose" onClick={closeCommandPalette}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ErrorBoundary>
  )
}

export default App
