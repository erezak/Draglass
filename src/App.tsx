import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { confirm } from '@tauri-apps/plugin-dialog'
import './App.css'

import { parseWikilinks } from './wikilinks'
import { filterLockedContent, type HeadingSection, type LockedBodyRange } from './lockedSections'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FileTree } from './components/FileTree'
import { LeftPaneToolbar } from './components/LeftPaneToolbar'
import type { NoteEditorHandle } from './components/NoteEditor'
import { QuickSwitcher } from './components/QuickSwitcher'
import { SettingsScreen } from './components/SettingsScreen'
import { Toolbox } from './components/Toolbox'
import { PaneIcon } from './components/icons/PaneIcon'
import { VaultAuthModal, type VaultAuthModalMode } from './components/VaultAuthModal'
import { CommandPalette, type Command } from './components/CommandPalette'
import { GlobalSearch } from './components/GlobalSearch'
import { GraphView } from './features/graph'
import { createUniqueFolder, createUniqueNote } from './fs'
import { useSettings } from './settings'
import { useBacklinks } from './features/backlinks/useBacklinks'
import { useNoteManager } from './features/notes/useNoteManager'
import { useRecentNotes } from './features/recents/useRecentNotes'
import { useTasks } from './features/tasks/useTasks'
import { useEditorTheme } from './features/theme/useEditorTheme'
import { useVault } from './features/vault/useVault'
import { useVaultAuth, hasVaultPassword, checkVaultPassword } from './features/vault/useVaultAuth'

const NoteEditor = lazy(() => import('./components/NoteEditor'))
import { ExcalidrawEditor } from './components/ExcalidrawEditor'

const TOOLBOX_WIDTH = 52
const LEFT_PANE_COLLAPSE_GAP = 8
const RIGHT_PANE_MIN_WIDTH = 160

type DragState = {
  side: 'left' | 'right'
  startX: number
  startLeftTotalWidth: number
  startRightWidth: number
  contentWidth: number
  minLeftTotalWidth?: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isExcalidrawFile(relPath: string): boolean {
  const lower = relPath.toLowerCase()
  return lower.endsWith('.excalidraw') || lower.endsWith('.excalidraw.md')
}

function isModP(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey
  return mod && !e.altKey && !e.shiftKey && (e.key === 'p' || e.key === 'P')
}

function isModShiftP(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey
  return mod && !e.altKey && e.shiftKey && (e.key === 'p' || e.key === 'P')
}

function isModShiftF(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey
  return mod && !e.altKey && e.shiftKey && (e.key === 'f' || e.key === 'F')
}

function isModB(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey
  return mod && !e.altKey && !e.shiftKey && (e.key === 'b' || e.key === 'B')
}

function isModShiftB(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey
  return mod && !e.altKey && e.shiftKey && (e.key === 'b' || e.key === 'B')
}

function isModAltB(e: KeyboardEvent): boolean {
  const mod = e.metaKey || e.ctrlKey
  return mod && e.altKey && !e.shiftKey && (e.key === 'b' || e.key === 'B')
}

function App() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [graphViewOpen, setGraphViewOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [leftPaneView, setLeftPaneView] = useState<'files' | 'search'>('files')
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null)
  const [revealFolderPath, setRevealFolderPath] = useState<string | null>(null)
  const [extraFolders, setExtraFolders] = useState<string[]>([])

  const leftPaneOpen = settings.leftPaneOpen
  const rightPaneOpen = settings.rightPaneOpen

  const [leftPaneWidth, setLeftPaneWidth] = useState(settings.leftPaneWidth)
  const [rightPaneWidth, setRightPaneWidth] = useState(settings.rightPaneWidth)
  const [leftPaneMinTotalWidth, setLeftPaneMinTotalWidth] = useState(TOOLBOX_WIDTH + 160)

  const leftPaneWidthRef = useRef(leftPaneWidth)
  const rightPaneWidthRef = useRef(rightPaneWidth)
  const isDraggingRef = useRef(false)
  const dragStateRef = useRef<DragState | null>(null)
  const appShellRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const leftPaneViewToggleRef = useRef<HTMLDivElement | null>(null)
  const leftPaneCollapseRef = useRef<HTMLButtonElement | null>(null)

  const editorRef = useRef<NoteEditorHandle | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const scheduleTasksScanRef = useRef<() => void>(() => {})

  const { recentRelPaths, recordRecent } = useRecentNotes(settings.quickSwitcherMaxRecents)

  const { vaultPath, files, navFiles, vaultName, refreshFileList, pickVault, loadVault } = useVault({
    rememberLast: settings.vaultRememberLast,
    showHidden: settings.filesShowHidden,
    openDemoOnEmpty: true, // Auto-open demo vault if no vault is loaded
    onBusy: setBusy,
    onError: setError,
  })

  // Vault authentication for locked sections
  // Must be early so other hooks can use vaultAuthState
  const {
    authState: vaultAuthState,
    authBusy: vaultAuthBusy,
    authError: vaultAuthError,
    unlock: unlockVault,
    lock: lockVault,
    setPassword: setVaultPassword,
    hasLockedContent,
    setHasLockedContent,
  } = useVaultAuth({
    vaultPath,
    onError: (message) => setError(message),
  })

  const isVaultUnlocked = vaultAuthState === 'unlocked'

  const { backlinks, backlinksBusy, scheduleBacklinksScan, resetBacklinks } = useBacklinks({
    enabled: settings.backlinksEnabled,
    debounceMs: settings.backlinksDebounceMs,
    onError: (message) => setError(message),
    isVaultUnlocked,
  })

  const onDidSaveNote = useCallback(() => {
    scheduleTasksScanRef.current()
  }, [])

  const {
    activeRelPath,
    noteText,
    setNoteText,
    noteTitle,
    autosave,
    openNoteByRelPath,
    tryOpenByTitle,
    openOrCreateWikilink,
    renameActiveNote,
    deleteActiveNote,
    resetNoteState,
  } = useNoteManager({
    vaultPath,
    files,
    refreshFileList,
    scheduleBacklinksScan,
    resetBacklinks,
    autosaveEnabled: settings.autosaveEnabled,
    autosaveDebounceMs: settings.autosaveDebounceMs,
    onDidSaveNote,
    recordRecent,
    setError,
    setBusy,
  })

  const { tasks, tasksBusy, scheduleTasksScan, resetTasks } = useTasks({
    vaultPath,
    files,
    showHidden: settings.filesShowHidden,
    debounceMs: 400,
    onError: (message) => setError(message),
    activeRelPath,
    activeNoteText: noteText,
    isVaultUnlocked,
  })

  const [vaultAuthModalOpen, setVaultAuthModalOpen] = useState(false)
  const [vaultAuthModalMode, setVaultAuthModalMode] = useState<VaultAuthModalMode>('reveal')
  const [vaultAuthModalError, setVaultAuthModalError] = useState<string | null>(null)
  const [currentLockedRanges, setCurrentLockedRanges] = useState<LockedBodyRange[]>([])
  const [titleDraft, setTitleDraft] = useState('')
  const [titleEditing, setTitleEditing] = useState(false)

  const onRequestUnlock = useCallback(() => {
    if (!vaultPath) return
    const hasPassword = hasVaultPassword(vaultPath)
    setVaultAuthModalMode(hasPassword ? 'reveal' : 'set-password')
    setVaultAuthModalOpen(true)
  }, [vaultPath])

  const onVaultAuthModalClose = useCallback(() => {
    setVaultAuthModalOpen(false)
    setVaultAuthModalError(null)
  }, [])

  const onVaultAuthModalSubmit = useCallback(
    async (password: string, confirmPassword?: string, currentPassword?: string) => {
      setVaultAuthModalError(null)
      if (vaultAuthModalMode === 'change-password' && confirmPassword !== undefined && currentPassword !== undefined) {
        // Verify current password first
        if (!vaultPath) return
        const isValid = await checkVaultPassword(vaultPath, currentPassword)
        if (!isValid) {
          setVaultAuthModalError('Current password is incorrect')
          return
        }
        // Set new password
        const success = await setVaultPassword(password)
        if (success) {
          setVaultAuthModalOpen(false)
          setVaultAuthModalError(null)
        }
      } else if (vaultAuthModalMode === 'set-password' && confirmPassword !== undefined) {
        const success = await setVaultPassword(password)
        if (success) {
          setVaultAuthModalOpen(false)
        }
      } else {
        const success = await unlockVault(password)
        if (success) {
          setVaultAuthModalOpen(false)
        }
      }
    },
    [vaultAuthModalMode, vaultPath, setVaultPassword, unlockVault],
  )

  const openChangePasswordModal = useCallback(() => {
    if (!vaultPath) return
    setVaultAuthModalMode('change-password')
    setVaultAuthModalOpen(true)
  }, [vaultPath])

  const onLockedSectionsDetected = useCallback(
    (sections: HeadingSection[], ranges: LockedBodyRange[]) => {
      const hasLocked = sections.some((s) => s.isExplicitlyLocked || s.isLockedByParent)
      setHasLockedContent(hasLocked)
      setCurrentLockedRanges(ranges)
    },
    [setHasLockedContent],
  )

  useEffect(() => {
    scheduleTasksScanRef.current = scheduleTasksScan
  }, [scheduleTasksScan])

  // Parsing wikilinks can be relatively expensive on large notes.
  // Defer derived UI updates to keep typing responsive.
  // Filter out locked content when vault is not authenticated
  const deferredNoteText = useDeferredValue(noteText)
  const visibleNoteText = useMemo(() => {
    if (isVaultUnlocked || currentLockedRanges.length === 0) {
      return deferredNoteText
    }
    return filterLockedContent(deferredNoteText, currentLockedRanges)
  }, [deferredNoteText, isVaultUnlocked, currentLockedRanges])
  const outgoingLinks = useMemo(() => parseWikilinks(visibleNoteText), [visibleNoteText])
  const { flush: flushAutosave, status: saveStatus, title: saveTitle, ariaLabel: saveAriaLabel } =
    autosave

  const onEditorSaveRequest = useCallback(() => {
    void flushAutosave()
  }, [flushAutosave])

  useEditorTheme(settings.editorTheme)

  useEffect(() => {
    resetNoteState()
    resetBacklinks()
    resetTasks()
    setSelectedFolderPath(null)
    setExtraFolders([])
  }, [resetBacklinks, resetNoteState, resetTasks, vaultPath])

  useEffect(() => {
    if (titleEditing) return
    setTitleDraft(noteTitle ?? '')
  }, [noteTitle, titleEditing])

  useEffect(() => {
    if (isDraggingRef.current) return
    setLeftPaneWidth(settings.leftPaneWidth)
  }, [settings.leftPaneWidth])

  useEffect(() => {
    if (isDraggingRef.current) return
    setRightPaneWidth(settings.rightPaneWidth)
  }, [settings.rightPaneWidth])

  useEffect(() => {
    leftPaneWidthRef.current = leftPaneWidth
  }, [leftPaneWidth])

  useEffect(() => {
    rightPaneWidthRef.current = rightPaneWidth
  }, [rightPaneWidth])

  const computeLeftPaneMinTotalWidth = useCallback(() => {
    const viewToggle = leftPaneViewToggleRef.current
    const collapseButton = leftPaneCollapseRef.current
    const shell = appShellRef.current
    if (!viewToggle || !collapseButton || !shell) return leftPaneMinTotalWidth
    const viewWidth = viewToggle.getBoundingClientRect().width
    const collapseWidth = collapseButton.getBoundingClientRect().width
    const computed = getComputedStyle(shell)
    const borderGapRaw = computed.getPropertyValue('--left-pane-border-gap')
    const borderGap = Number.parseFloat(borderGapRaw) || 0
    return Math.ceil(viewWidth + collapseWidth + LEFT_PANE_COLLAPSE_GAP + borderGap)
  }, [leftPaneMinTotalWidth])

  useEffect(() => {
    const updateMinWidth = () => {
      setLeftPaneMinTotalWidth(computeLeftPaneMinTotalWidth())
    }

    updateMinWidth()
    window.addEventListener('resize', updateMinWidth)
    return () => window.removeEventListener('resize', updateMinWidth)
  }, [computeLeftPaneMinTotalWidth])

  useEffect(() => {
    if (!leftPaneOpen || isDraggingRef.current) return
    const minSidebar = Math.max(0, leftPaneMinTotalWidth - TOOLBOX_WIDTH)
    if (leftPaneWidthRef.current >= minSidebar) return
    setLeftPaneWidth(minSidebar)
    updateSettings({ leftPaneWidth: Math.round(minSidebar) })
  }, [leftPaneMinTotalWidth, leftPaneOpen, updateSettings])

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

  const toggleLeftPane = useCallback(() => {
    updateSettings((prev) => ({
      ...prev,
      leftPaneOpen: !prev.leftPaneOpen,
    }))
  }, [updateSettings])

  const toggleRightPane = useCallback(() => {
    updateSettings((prev) => ({
      ...prev,
      rightPaneOpen: !prev.rightPaneOpen,
    }))
  }, [updateSettings])

  const toggleBothPanes = useCallback(() => {
    updateSettings((prev) => {
      const nextOpen = !(prev.leftPaneOpen || prev.rightPaneOpen)
      return {
        ...prev,
        leftPaneOpen: nextOpen,
        rightPaneOpen: nextOpen,
      }
    })
  }, [updateSettings])

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

  const createNewNote = useCallback(async () => {
    if (!vaultPath) return
    setError(null)
    setBusy('Creating note…')
    try {
      const relPath = await createUniqueNote(vaultPath, selectedFolderPath)
      await refreshFileList(vaultPath)
      const opened = await openNoteByRelPath(relPath)
      if (opened) {
        queueMicrotask(() => editorRef.current?.focus())
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }, [openNoteByRelPath, refreshFileList, selectedFolderPath, setBusy, setError, vaultPath])

  const createNewFolder = useCallback(async () => {
    if (!vaultPath) return
    setError(null)
    setBusy('Creating folder…')
    try {
      const relPath = await createUniqueFolder(vaultPath, selectedFolderPath)
      await refreshFileList(vaultPath)
      setSelectedFolderPath(relPath)
      setRevealFolderPath(relPath)
      setExtraFolders((prev) => (prev.includes(relPath) ? prev : [...prev, relPath]))
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }, [refreshFileList, selectedFolderPath, setBusy, setError, vaultPath])

  // Command palette commands
  const vaultHasPassword = vaultPath ? hasVaultPassword(vaultPath) : false
  const commands = useMemo<Command[]>(() => [
    {
      id: 'new-note',
      label: 'New Note',
      description: 'Create a new note in the current folder',
      enabled: !!vaultPath,
      onExecute: () => {
        void createNewNote()
      },
    },
    {
      id: 'rename-current-note',
      label: 'Rename Current Note',
      description: 'Edit the current note filename',
      enabled: !!activeRelPath && !graphViewOpen,
      onExecute: () => {
        setTitleEditing(true)
        queueMicrotask(() => {
          titleInputRef.current?.focus()
          titleInputRef.current?.select()
        })
      },
    },
    {
      id: 'delete-current-note',
      label: 'Delete Current Note',
      description: 'Delete the active note (confirmation required)',
      enabled: !!activeRelPath && !graphViewOpen,
      onExecute: () => {
        void (async () => {
          if (!noteTitle) return
          const ok = await confirm(`Delete note "${noteTitle}"?`, {
            title: 'Delete Note',
            kind: 'warning',
          })
          if (!ok) return
          await deleteActiveNote()
        })()
      },
    },
    {
      id: 'lock-current-heading',
      label: 'Lock Current Heading',
      description: 'Add {locked} marker to the heading containing cursor',
      enabled: !!activeRelPath,
      onExecute: () => {
        editorRef.current?.lockCurrentHeading()
      },
    },
    {
      id: 'reveal-private-sections',
      label: 'Reveal Private Sections',
      description: 'Enter password to view and edit locked sections',
      enabled: !isVaultUnlocked && hasLockedContent && vaultHasPassword,
      onExecute: () => {
        onRequestUnlock()
      },
    },
    {
      id: 'hide-private-sections',
      label: 'Hide Private Sections',
      description: 'Hide all private sections until password is entered again',
      enabled: isVaultUnlocked && hasLockedContent,
      onExecute: () => {
        lockVault()
      },
    },
    {
      id: 'change-vault-password',
      label: 'Change Vault Password',
      description: 'Set a new password for this vault',
      enabled: vaultHasPassword,
      onExecute: () => {
        openChangePasswordModal()
      },
    },
    {
      id: 'open-demo-vault',
      label: 'Open Demo Vault',
      description: 'Open the demo vault with example notes',
      enabled: true,
      onExecute: () => {
        void (async () => {
          try {
            const { getDemoVaultPath } = await import('./tauri')
            const demoPath = await getDemoVaultPath()
            await loadVault(demoPath)
          } catch (e) {
            setError(String(e))
          }
        })()
      },
    },
  ], [activeRelPath, createNewNote, deleteActiveNote, graphViewOpen, hasLockedContent, isVaultUnlocked, loadVault, lockVault, noteTitle, onRequestUnlock, openChangePasswordModal, setError, vaultHasPassword, vaultPath])

  const onTaskClick = useCallback(
    async (relPath: string, lineNumber: number) => {
      setGraphViewOpen(false)
      const opened = await openNoteByRelPath(relPath)
      if (!opened) return
      queueMicrotask(() => editorRef.current?.revealLine(lineNumber))
    },
    [openNoteByRelPath],
  )

  const onSearchHitClick = useCallback(
    async (relPath: string, lineNumber: number) => {
      void flushAutosave()
      setGraphViewOpen(false)
      const opened = await openNoteByRelPath(relPath)
      if (!opened) return
      queueMicrotask(() => editorRef.current?.revealLine(lineNumber))
    },
    [flushAutosave, openNoteByRelPath],
  )

  const commitTitleRename = useCallback(async () => {
    if (!activeRelPath) return
    if (!noteTitle) return
    const ok = await renameActiveNote(titleDraft)
    if (!ok) {
      setTitleDraft(noteTitle)
    }
    setTitleEditing(false)
  }, [activeRelPath, noteTitle, renameActiveNote, titleDraft])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isModShiftF(e)) {
        e.preventDefault()
        e.stopPropagation()
        setLeftPaneView('search')
        updateSettings({ leftPaneOpen: true })
        return
      }

      if (isModShiftP(e)) {
        e.preventDefault()
        e.stopPropagation()
        setCommandPaletteOpen(true)
        return
      }

      if (isModAltB(e)) {
        e.preventDefault()
        e.stopPropagation()
        toggleBothPanes()
        return
      }

      if (isModShiftB(e)) {
        e.preventDefault()
        e.stopPropagation()
        toggleRightPane()
        return
      }

      if (isModB(e)) {
        e.preventDefault()
        e.stopPropagation()
        toggleLeftPane()
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
  }, [toggleBothPanes, toggleLeftPane, toggleRightPane])

  const onResizerPointerMove = useCallback(
    (event: PointerEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) return
      const delta = event.clientX - dragState.startX

      if (dragState.side === 'left') {
        const minTotal = Math.max(dragState.minLeftTotalWidth ?? leftPaneMinTotalWidth, TOOLBOX_WIDTH)
        const rightWidth = rightPaneOpen ? dragState.startRightWidth : 0
        const maxTotal = Math.max(minTotal, dragState.contentWidth - rightWidth)
        const nextTotal = clamp(dragState.startLeftTotalWidth + delta, minTotal, maxTotal)
        setLeftPaneWidth(Math.max(0, nextTotal - TOOLBOX_WIDTH))
      } else {
        const minRight = RIGHT_PANE_MIN_WIDTH
        const leftTotal = leftPaneOpen ? dragState.startLeftTotalWidth : 0
        const maxRight = Math.max(minRight, dragState.contentWidth - leftTotal)
        const nextRight = clamp(dragState.startRightWidth - delta, minRight, maxRight)
        setRightPaneWidth(nextRight)
      }
    },
    [leftPaneMinTotalWidth, leftPaneOpen, rightPaneOpen],
  )

  const onResizerPointerUp = useCallback(() => {
    if (!dragStateRef.current) return
    dragStateRef.current = null
    isDraggingRef.current = false
    window.removeEventListener('pointermove', onResizerPointerMove)
    window.removeEventListener('pointerup', onResizerPointerUp)
    updateSettings({
      leftPaneWidth: Math.round(leftPaneWidthRef.current),
      rightPaneWidth: Math.round(rightPaneWidthRef.current),
    })
  }, [onResizerPointerMove, updateSettings])

  const onLeftResizerPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (event.button !== 0 || !contentRef.current) return
      event.preventDefault()
      const contentRect = contentRef.current.getBoundingClientRect()
      const minLeftTotalWidth = computeLeftPaneMinTotalWidth()
      setLeftPaneMinTotalWidth(minLeftTotalWidth)
      const startLeftTotalWidth = TOOLBOX_WIDTH + leftPaneWidthRef.current
      dragStateRef.current = {
        side: 'left',
        startX: event.clientX,
        startLeftTotalWidth,
        startRightWidth: rightPaneWidthRef.current,
        contentWidth: contentRect.width,
        minLeftTotalWidth,
      }
      isDraggingRef.current = true
      window.addEventListener('pointermove', onResizerPointerMove)
      window.addEventListener('pointerup', onResizerPointerUp)
    },
    [onResizerPointerMove, onResizerPointerUp],
  )

  const onRightResizerPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (event.button !== 0 || !contentRef.current) return
      event.preventDefault()
      const contentRect = contentRef.current.getBoundingClientRect()
      const startLeftTotalWidth = leftPaneOpen ? TOOLBOX_WIDTH + leftPaneWidthRef.current : 0
      dragStateRef.current = {
        side: 'right',
        startX: event.clientX,
        startLeftTotalWidth,
        startRightWidth: rightPaneWidthRef.current,
        contentWidth: contentRect.width,
      }
      isDraggingRef.current = true
      window.addEventListener('pointermove', onResizerPointerMove)
      window.addEventListener('pointerup', onResizerPointerUp)
    },
    [leftPaneOpen, onResizerPointerMove, onResizerPointerUp],
  )

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

  const appShellStyle = useMemo(() => {
    const leftTotalWidth = leftPaneOpen ? TOOLBOX_WIDTH + leftPaneWidth : 0
    const leftHeaderWidth = leftPaneOpen
      ? leftTotalWidth
      : Math.max(leftPaneMinTotalWidth, TOOLBOX_WIDTH)
    return {
      '--toolbox-width': leftPaneOpen ? `${TOOLBOX_WIDTH}px` : '0px',
      '--sidebar-width': leftPaneOpen ? `${leftPaneWidth}px` : '0px',
      '--right-pane-width': rightPaneOpen ? `${rightPaneWidth}px` : '0px',
      '--left-pane-header-width': `calc(${leftHeaderWidth}px - var(--topbar-padding-left))`,
    } as CSSProperties
  }, [leftPaneMinTotalWidth, leftPaneOpen, leftPaneWidth, rightPaneOpen, rightPaneWidth])

  const contentClassName = useMemo(() => {
    if (leftPaneOpen && rightPaneOpen) return 'content'
    if (!leftPaneOpen && rightPaneOpen) return 'content content--left-collapsed'
    if (leftPaneOpen && !rightPaneOpen) return 'content content--right-collapsed'
    return 'content content--both-collapsed'
  }, [leftPaneOpen, rightPaneOpen])

  return (
    <ErrorBoundary fallbackTitle="Draglass hit an error">
      <div className="appShell" style={appShellStyle} ref={appShellRef}>
        <header className="topbar" data-tauri-drag-region>
          <div className="topbarLeftPane">
            <div
              className="topbarViewToggle"
              role="tablist"
              aria-label="Sidebar view"
              ref={leftPaneViewToggleRef}
            >
              <button
                type="button"
                role="tab"
                className={
                  leftPaneView === 'files'
                    ? 'leftPaneToggleButton leftPaneToggleButton--active'
                    : 'leftPaneToggleButton'
                }
                aria-selected={leftPaneView === 'files'}
                aria-label="Files view"
                title="Files"
                data-tauri-drag-region="false"
                onClick={() => setLeftPaneView('files')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="leftPaneToggleIcon" focusable="false">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 7h6l2 2h8v8a2 2 0 0 1-2 2H4z"
                  />
                </svg>
              </button>
              <button
                type="button"
                role="tab"
                className={
                  leftPaneView === 'search'
                    ? 'leftPaneToggleButton leftPaneToggleButton--active'
                    : 'leftPaneToggleButton'
                }
                aria-selected={leftPaneView === 'search'}
                aria-label="Search view"
                title="Search"
                data-tauri-drag-region="false"
                onClick={() => setLeftPaneView('search')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="leftPaneToggleIcon" focusable="false">
                  <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <rect
                    x="16"
                    y="16"
                    width="6"
                    height="2.4"
                    rx="1.2"
                    transform="rotate(45 16 16)"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
            <button
              type="button"
              className="iconButton leftPaneCollapseButton"
              data-tauri-drag-region="false"
              onClick={toggleLeftPane}
              title="Toggle left pane (Mod+B)"
              aria-label="Toggle left pane (Mod+B)"
              ref={leftPaneCollapseRef}
            >
              <PaneIcon side="left" state={leftPaneOpen ? 'open' : 'closed'} />
            </button>
          </div>
          <div className="topbarLeft">
            <div className="brand">Draglass</div>
            <button
              type="button"
              className="iconButton vaultButton"
              onClick={pickVault}
              data-tauri-drag-region="false"
              title="Select vault"
              aria-label="Select vault"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="vaultButtonIcon" focusable="false">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7h6l2 2h8v8a2 2 0 0 1-2 2H4z"
                />
              </svg>
            </button>
          </div>
          <div className="spacer" />
          <div className="topbarActions">
            <button
              type="button"
              className="iconButton"
              data-tauri-drag-region="false"
              onClick={toggleRightPane}
              title="Toggle right pane (Mod+Shift+B)"
              aria-label="Toggle right pane (Mod+Shift+B)"
            >
              <PaneIcon side="right" state={rightPaneOpen ? 'open' : 'closed'} />
            </button>
          </div>
        </header>

        <div className={contentClassName} ref={contentRef}>
          <div className={leftPaneOpen ? 'paneWrapper' : 'paneWrapper paneHidden'}>
            <Toolbox
              quickSwitcherActive={quickSwitcherOpen}
              graphViewActive={graphViewOpen}
              commandPaletteActive={commandPaletteOpen}
              onOpenQuickSwitcher={openQuickSwitcher}
              onToggleGraphView={toggleGraphView}
              onOpenCommandPalette={openCommandPalette}
            />
          </div>
          <aside className={leftPaneOpen ? 'sidebar' : 'sidebar paneHidden'}>
            <div className="sidebarBody">
              <LeftPaneToolbar
                onNewNote={createNewNote}
                onNewFolder={createNewFolder}
                actionsDisabled={!vaultPath}
              />
              <div className="sidebarScroll">
                {!vaultPath ? (
                  <div className="panelEmpty">Pick a vault folder to begin.</div>
                ) : leftPaneView === 'search' ? (
                  <GlobalSearch
                    vaultPath={vaultPath}
                    showHidden={settings.filesShowHidden}
                    isVaultUnlocked={isVaultUnlocked}
                    onOpenResult={onSearchHitClick}
                  />
                ) : navFiles.length === 0 ? (
                  <div className="panelEmpty">No Markdown files found.</div>
                ) : (
                  <FileTree
                    files={navFiles}
                    extraFolders={extraFolders}
                    activeRelPath={activeRelPath}
                    rememberExpanded={settings.filesRememberExpandedFolders}
                    onSelectFolder={setSelectedFolderPath}
                    selectedFolderPath={selectedFolderPath}
                    revealFolderPath={revealFolderPath}
                    onOpenFile={(p) => {
                      void openNoteAndCloseGraph(p)
                    }}
                  />
                )}
              </div>
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

          {leftPaneOpen ? (
            <div
              className="paneResizer paneResizer--left"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize left pane"
              onPointerDown={onLeftResizerPointerDown}
            />
          ) : null}

          <main className="editorPane">
            <div className="editorHeader">
              {graphViewOpen ? (
                <div className="panelTitle">Graph View</div>
              ) : activeRelPath ? (
                <input
                  ref={titleInputRef}
                  className="editorTitleInput"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onFocus={() => setTitleEditing(true)}
                  onBlur={() => {
                    void commitTitleRename()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur()
                    }
                    if (event.key === 'Escape') {
                      setTitleDraft(noteTitle ?? '')
                      setTitleEditing(false)
                      event.currentTarget.blur()
                    }
                  }}
                  aria-label="Rename file"
                />
              ) : (
                <div className="panelTitle">Editor</div>
              )}
              <div className="spacer" />
              {activeRelPath && !graphViewOpen && !isExcalidrawFile(activeRelPath) ? (
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
              {activeRelPath && !graphViewOpen && !isExcalidrawFile(activeRelPath) ? (
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
              <GraphView
                vaultPath={vaultPath}
                activeRelPath={activeRelPath}
                showHidden={settings.filesShowHidden}
                theme={settings.editorTheme}
                onOpenNote={openNoteAndCloseGraph}
                isVaultUnlocked={isVaultUnlocked}
              />
            ) : !vaultPath ? (
              <div className="panelEmpty">Select a vault to edit notes.</div>
            ) : !activeRelPath ? (
              <div className="panelEmpty">Select a file from the list.</div>
            ) : isExcalidrawFile(activeRelPath) ? (
              <ExcalidrawEditor
                key={activeRelPath}
                content={noteText}
                theme={settings.editorTheme}
                onChange={setNoteText}
              />
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
                  renderCallouts={settings.editorRenderCallouts}
                  renderLockedSections={true}
                  vaultPath={vaultPath}
                  noteRelPath={activeRelPath}
                  onOpenWikilink={openOrCreateWikilink}
                  theme={settings.editorTheme}
                  isVaultUnlocked={isVaultUnlocked}
                  onRequestUnlock={onRequestUnlock}
                  onLockedSectionsDetected={onLockedSectionsDetected}
                  files={files}
                />
              </Suspense>
            )}
          </main>

          {rightPaneOpen ? (
            <div
              className="paneResizer paneResizer--right"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize right pane"
              onPointerDown={onRightResizerPointerDown}
            />
          ) : null}

          <aside className={rightPaneOpen ? 'rightPane' : 'rightPane paneHidden'}>
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
              <div className="panelTitle">Tasks</div>
              {!vaultPath ? (
                <div className="panelEmpty">Select a vault to view tasks.</div>
              ) : tasks.length === 0 ? (
                <div className="panelEmpty">No open tasks found.</div>
              ) : (
                <>
                  {tasksBusy ? <div className="panelHint">Scanning tasks…</div> : null}
                  <div className="taskList" role="list">
                  {tasks.map((task) => (
                    <button
                      key={`${task.relPath}:${task.lineNumber}:${task.text}`}
                      type="button"
                      className="taskItem"
                      onClick={() => {
                        void onTaskClick(task.relPath, task.lineNumber)
                      }}
                    >
                      <div className="taskItemText">
                        {task.text.length > 0 ? task.text : '(untitled task)'}
                      </div>
                      <div className="taskItemMeta">
                        {task.noteTitle} • {task.relPath}
                      </div>
                    </button>
                  ))}
                  </div>
                </>
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

      <CommandPalette
        open={commandPaletteOpen}
        commands={commands}
        onRequestClose={closeCommandPalette}
      />

      {vaultAuthModalOpen && (
        <VaultAuthModal
          key={`vault-auth-${vaultAuthModalMode}`}
          open={vaultAuthModalOpen}
          mode={vaultAuthModalMode}
          busy={vaultAuthBusy}
          error={vaultAuthModalError ?? vaultAuthError}
          onSubmit={onVaultAuthModalSubmit}
          onClose={onVaultAuthModalClose}
        />
      )}
    </ErrorBoundary>
  )
}

export default App
