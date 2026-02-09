import { useCallback, useMemo, useRef, useState } from 'react'

import type { NoteEntry } from '../../types'
import { createNote, deleteNote, readNote, renameNote, writeNote } from '../../tauri'
import { fileStem } from '../../path'
import { isIgnoredPath } from '../../ignore'
import { normalizeWikiTarget } from '../../wikilinks'
import { useNoteAutosave } from '../../components/useNoteAutosave'
import { stripWikilinkTarget, targetToRelPath } from './noteTargets'

type UseNoteManagerArgs = {
  vaultPath: string | null
  files: NoteEntry[]
  refreshFileList: (vault: string) => Promise<NoteEntry[]>
  scheduleBacklinksScan: (vault: string, relPath: string) => void
  resetBacklinks: () => void
  autosaveEnabled: boolean
  autosaveDebounceMs: number
  onDidSaveNote?: (relPath: string, contents: string) => void
  recordRecent: (relPath: string) => void
  setError: (message: string | null) => void
  setBusy: (message: string | null) => void
}

export function useNoteManager({
  vaultPath,
  files,
  refreshFileList,
  scheduleBacklinksScan,
  resetBacklinks,
  autosaveEnabled,
  autosaveDebounceMs,
  onDidSaveNote,
  recordRecent,
  setError,
  setBusy,
}: UseNoteManagerArgs): {
  activeRelPath: string | null
  noteText: string
  setNoteText: (value: string) => void
  savedText: string
  noteTitle: string | null
  isDirty: boolean
  autosave: ReturnType<typeof useNoteAutosave>
  openNoteByRelPath: (relPath: string) => Promise<boolean>
  tryOpenByTitle: (title: string) => Promise<void>
  openOrCreateWikilink: (rawTarget: string) => Promise<void>
  renameActiveNote: (nextTitle: string) => Promise<boolean>
  deleteActiveNote: () => Promise<boolean>
  resetNoteState: () => void
} {
  const [activeRelPath, setActiveRelPath] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savedText, setSavedText] = useState('')

  const openRequestIdRef = useRef(0)

  const noteTitle = useMemo(() => {
    if (!activeRelPath) return null
    return fileStem(activeRelPath)
  }, [activeRelPath])

  const isDirty = noteText !== savedText

  const handleSaved = useCallback(
    (contents: string) => {
      setSavedText(contents)
      if (activeRelPath) {
        onDidSaveNote?.(activeRelPath, contents)
      }
    },
    [activeRelPath, onDidSaveNote],
  )

  const autosave = useNoteAutosave({
    enabled: autosaveEnabled && !!vaultPath && !!activeRelPath,
    vaultPath,
    relPath: activeRelPath,
    text: noteText,
    isDirty,
    debounceMs: autosaveDebounceMs,
    save: writeNote,
    onSaved: handleSaved,
  })

  const resetNoteState = useCallback(() => {
    setActiveRelPath(null)
    setNoteText('')
    setSavedText('')
  }, [])

  const openNoteByRelPath = useCallback(
    async (relPath: string): Promise<boolean> => {
      if (!vaultPath) return false

      const requestId = ++openRequestIdRef.current

      if (activeRelPath && isDirty) {
        const ok = await autosave.flush()
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
        resetBacklinks()

        // Scan backlinks after the note is already open, but debounce to avoid
        // expensive rescans when switching notes quickly.
        scheduleBacklinksScan(vaultPath, relPath)

        recordRecent(relPath)
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
    [activeRelPath, autosave, isDirty, recordRecent, resetBacklinks, scheduleBacklinksScan, setBusy, setError, vaultPath],
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
    [files, openNoteByRelPath, refreshFileList, setBusy, setError, vaultPath],
  )

  const renameActiveNote = useCallback(
    async (nextTitle: string): Promise<boolean> => {
      if (!vaultPath || !activeRelPath) return false

      const trimmed = nextTitle.trim()
      if (!trimmed) {
        setError('Filename cannot be empty')
        return false
      }

      const sanitized = trimmed.replace(/[\\/]/g, '-').replace(/\s+/g, ' ')
      const lower = sanitized.toLowerCase()

      // Preserve the extension of the current file type
      const currentLower = activeRelPath.toLowerCase()
      const isExcalidrawMd = currentLower.endsWith('.excalidraw.md')
      const isExcalidraw = !isExcalidrawMd && currentLower.endsWith('.excalidraw')
      const defaultExt = isExcalidrawMd ? '.excalidraw.md' : isExcalidraw ? '.excalidraw' : '.md'
      const fileName = lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.excalidraw') || lower.endsWith('.excalidraw.md')
        ? sanitized
        : `${sanitized}${defaultExt}`

      const parts = activeRelPath.split('/')
      const dir = parts.slice(0, -1).join('/')
      const nextRelPath = dir ? `${dir}/${fileName}` : fileName

      if (nextRelPath === activeRelPath) return true
      if (isIgnoredPath(nextRelPath)) {
        setError(`Cannot rename to ignored path: ${nextRelPath}`)
        return false
      }

      if (isDirty) {
        const ok = await autosave.flush()
        if (!ok) return false
      }

      setError(null)
      setBusy('Renaming note…')
      try {
        await renameNote(vaultPath, activeRelPath, nextRelPath)
        await refreshFileList(vaultPath)
        setActiveRelPath(nextRelPath)
        resetBacklinks()
        scheduleBacklinksScan(vaultPath, nextRelPath)
        recordRecent(nextRelPath)
        return true
      } catch (e) {
        setError(String(e))
        return false
      } finally {
        setBusy(null)
      }
    },
    [activeRelPath, autosave, isDirty, recordRecent, refreshFileList, resetBacklinks, scheduleBacklinksScan, setBusy, setError, vaultPath],
  )

  const deleteActiveNote = useCallback(
    async (): Promise<boolean> => {
      if (!vaultPath || !activeRelPath) return false

      if (isDirty) {
        const ok = await autosave.flush()
        if (!ok) return false
      }

      setError(null)
      setBusy('Deleting note…')
      try {
        await deleteNote(vaultPath, activeRelPath)
        await refreshFileList(vaultPath)
        resetNoteState()
        resetBacklinks()
        return true
      } catch (e) {
        setError(String(e))
        return false
      } finally {
        setBusy(null)
      }
    },
    [activeRelPath, autosave, isDirty, refreshFileList, resetBacklinks, resetNoteState, setBusy, setError, vaultPath],
  )

  return {
    activeRelPath,
    noteText,
    setNoteText,
    savedText,
    noteTitle,
    isDirty,
    autosave,
    openNoteByRelPath,
    tryOpenByTitle,
    openOrCreateWikilink,
    renameActiveNote,
    deleteActiveNote,
    resetNoteState,
  }
}
