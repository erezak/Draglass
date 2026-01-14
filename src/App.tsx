import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import { open } from '@tauri-apps/plugin-dialog'
import { findBacklinks, listMarkdownFiles, readNote, writeNote } from './tauri'
import type { NoteEntry } from './types'
import { parseWikilinks } from './wikilinks'
import { fileStem } from './path'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FileTree } from './components/FileTree'

const NoteEditor = lazy(() => import('./components/NoteEditor'))

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [files, setFiles] = useState<NoteEntry[]>([])
  const [activeRelPath, setActiveRelPath] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savedText, setSavedText] = useState('')

  const noteTextRef = useRef('')
  useEffect(() => {
    noteTextRef.current = noteText
  }, [noteText])

  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backlinks, setBacklinks] = useState<string[]>([])
  const [backlinksBusy, setBacklinksBusy] = useState(false)

  const backlinksRequestIdRef = useRef(0)

  const noteTitle = useMemo(() => {
    if (!activeRelPath) return null
    return fileStem(activeRelPath)
  }, [activeRelPath])

  const outgoingLinks = useMemo(() => parseWikilinks(noteText), [noteText])
  const isDirty = noteText !== savedText

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
    async (relPath: string) => {
      if (!vaultPath) return
      setError(null)
      setBusy('Opening note…')
      try {
        const text = await readNote(vaultPath, relPath)
        setActiveRelPath(relPath)
        setNoteText(text)
        setSavedText(text)
        setBacklinks([])
        setBacklinksBusy(false)
      } catch (e) {
        setError(String(e))
      } finally {
        setBusy(null)
      }

      // Scan backlinks after the note is already open.
      const title = fileStem(relPath)
      void refreshBacklinks(vaultPath, title)
    },
    [refreshBacklinks, vaultPath],
  )

  const saveActiveNote = useCallback(async () => {
    if (!vaultPath || !activeRelPath) return
    const currentText = noteTextRef.current
    setError(null)
    setBusy('Saving…')
    try {
      await writeNote(vaultPath, activeRelPath, currentText)
      setSavedText(currentText)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }

    const title = fileStem(activeRelPath)
    void refreshBacklinks(vaultPath, title)
  }, [activeRelPath, refreshBacklinks, vaultPath])

  const tryOpenByTitle = useCallback(
    async (title: string) => {
      const match = files.find((f) => fileStem(f.rel_path) === title)
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
                onOpenFile={openNoteByRelPath}
              />
            )}
          </aside>

          <main className="editorPane">
            <div className="editorHeader">
              <div className="panelTitle">{noteTitle ?? 'Editor'}</div>
              <div className="spacer" />
              <button
                onClick={saveActiveNote}
                disabled={!vaultPath || !activeRelPath || !isDirty || !!busy}
              >
                Save
              </button>
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
                  value={noteText}
                  onChange={setNoteText}
                  onSaveRequest={saveActiveNote}
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
                    <li key={l}>
                      <button className="linkItem" onClick={() => tryOpenByTitle(l)}>
                        [[{l}]]
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
                      <button className="linkItem" onClick={() => openNoteByRelPath(p)}>
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
    </ErrorBoundary>
  )
}

export default App
