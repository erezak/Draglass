import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'

import { Compartment, EditorState, RangeSetBuilder, StateEffect, StateField, Transaction } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  lineNumbers,
  type ViewUpdate,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { createLivePreviewExtension } from '../editor/livePreview'
import { createWikilinkCompletionExtension } from '../editor/wikilinkCompletion'
import type { HeadingSection, LockedBodyRange } from '../lockedSections'
import type { NoteEntry } from '../types'

const setTaskHighlightEffect = StateEffect.define<number>()
const clearTaskHighlightEffect = StateEffect.define<void>()

function buildTaskHighlightDecoration(state: EditorState, lineNumber: number): DecorationSet {
  if (lineNumber < 1 || lineNumber > state.doc.lines) return Decoration.none
  const line = state.doc.line(lineNumber)
  const builder = new RangeSetBuilder<Decoration>()
  builder.add(line.from, line.from, Decoration.line({ class: 'cm-taskJumpHighlight' }))
  return builder.finish()
}

const taskHighlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTaskHighlightEffect)) {
        return buildTaskHighlightDecoration(tr.state, effect.value)
      }
      if (effect.is(clearTaskHighlightEffect)) {
        return Decoration.none
      }
    }
    if (tr.docChanged) {
      return value.map(tr.changes)
    }
    return value
  },
  provide: (field) => EditorView.decorations.from(field),
})

type NoteEditorProps = {
  ref?: Ref<NoteEditorHandle>
  value: string
  onChange: (next: string) => void
  onSaveRequest?: () => void
  wrap?: boolean
  livePreview?: boolean
  renderDiagrams?: boolean
  renderImages?: boolean
  renderCallouts?: boolean
  renderLockedSections?: boolean
  vaultPath?: string | null
  noteRelPath?: string | null
  onOpenWikilink?: (rawTarget: string) => void
  theme?: 'dark' | 'light'
  isVaultUnlocked?: boolean
  onRequestUnlock?: () => void
  onLockedSectionsDetected?: (sections: HeadingSection[], ranges: LockedBodyRange[]) => void
  files?: NoteEntry[]
}

export type NoteEditorHandle = {
  focus: () => void
  revealLine: (lineNumber: number) => void
  lockCurrentHeading: () => boolean
}

export const NoteEditor = function NoteEditor({
    value,
    onChange,
    onSaveRequest,
    wrap = true,
    livePreview = true,
    renderDiagrams = true,
    renderImages = true,
    renderCallouts = true,
    renderLockedSections = true,
    vaultPath = null,
    noteRelPath = null,
    onOpenWikilink,
    theme = 'dark',
    isVaultUnlocked = false,
    onRequestUnlock,
    onLockedSectionsDetected,
    files = [],
    ref,
  }: NoteEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const initialDocRef = useRef<string>(value)
  const initialWrapRef = useRef<boolean>(wrap)
  const initialLivePreviewRef = useRef<boolean>(livePreview)
  const initialRenderDiagramsRef = useRef<boolean>(renderDiagrams)
  const initialRenderImagesRef = useRef<boolean>(renderImages)
  const initialRenderCalloutsRef = useRef<boolean>(renderCallouts)
  const initialOpenWikilinkRef = useRef<NoteEditorProps['onOpenWikilink']>(onOpenWikilink)
  const initialVaultPathRef = useRef<string | null>(vaultPath)
  const initialNoteRelPathRef = useRef<string | null>(noteRelPath)
  const initialFilesRef = useRef<NoteEntry[]>(files)
  const [initError, setInitError] = useState<Error | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; alt?: string } | null>(null)
  const highlightTimerRef = useRef<number | null>(null)
  const pendingRevealRef = useRef<number | null>(null)

  const onOpenImage = useCallback((src: string, alt?: string) => {
    setLightbox({ src, alt })
  }, [])

  const initialOpenImageRef = useRef<((url: string, alt?: string) => void) | null>(onOpenImage)

  const wrapCompartmentRef = useRef<Compartment | null>(null)
  if (wrapCompartmentRef.current == null) {
    wrapCompartmentRef.current = new Compartment()
  }

  const livePreviewCompartmentRef = useRef<Compartment | null>(null)
  if (livePreviewCompartmentRef.current == null) {
    livePreviewCompartmentRef.current = new Compartment()
  }

  const revealLine = useCallback((lineNumber: number) => {
    const view = viewRef.current
    if (!view) {
      pendingRevealRef.current = lineNumber
      return
    }

    const clamped = Math.max(1, Math.min(lineNumber, view.state.doc.lines))
    const line = view.state.doc.line(clamped)

    if (highlightTimerRef.current != null) {
      window.clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = null
    }

    view.dispatch({
      selection: { anchor: line.from },
      scrollIntoView: true,
      effects: setTaskHighlightEffect.of(clamped),
      annotations: Transaction.addToHistory.of(false),
    })

    highlightTimerRef.current = window.setTimeout(() => {
      const currentView = viewRef.current
      if (!currentView) return
      currentView.dispatch({
        effects: clearTaskHighlightEffect.of(undefined),
        annotations: Transaction.addToHistory.of(false),
      })
    }, 1200)
  }, [])

  /**
   * Find the heading containing the cursor and add {locked} marker if not present.
   * Returns true if a heading was found and modified, false otherwise.
   */
  const lockCurrentHeading = useCallback(() => {
    const view = viewRef.current
    if (!view) return false

    const { state } = view
    const cursorPos = state.selection.main.head
    const cursorLine = state.doc.lineAt(cursorPos)

    // ATX heading pattern: 1-6 #, followed by space and content
    const ATX_HEADING_RE = /^\s*(#{1,6})\s+(.*)$/
    const LOCKED_MARKER_RE = /\{locked\}/i

    // Search backwards from cursor line to find containing heading
    for (let lineNum = cursorLine.number; lineNum >= 1; lineNum--) {
      const line = state.doc.line(lineNum)
      const lineText = line.text
      const match = ATX_HEADING_RE.exec(lineText)

      if (match) {
        // Found a heading - check if it already has {locked}
        if (LOCKED_MARKER_RE.test(lineText)) {
          // Already locked, nothing to do
          return false
        }

        // Add {locked} at end of heading line
        const newText = lineText.trimEnd() + ' {locked}'
        view.dispatch({
          changes: {
            from: line.from,
            to: line.to,
            insert: newText,
          },
        })
        return true
      }
    }

    // No heading found above cursor
    return false
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        viewRef.current?.focus()
      },
      revealLine,
      lockCurrentHeading,
    }),
    [revealLine, lockCurrentHeading],
  )

  const onChangeRef = useRef<NoteEditorProps['onChange']>(onChange)
  const onSaveRequestRef = useRef<NoteEditorProps['onSaveRequest']>(onSaveRequest)
  const applyingExternalValueRef = useRef(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onSaveRequestRef.current = onSaveRequest
  }, [onSaveRequest])

  useEffect(() => {
    // Keep the initial doc in sync while the editor view doesn't exist yet.
    // This lets us recreate the view (e.g. when extensions change) without
    // depending on `value` in the creation effect.
    if (viewRef.current == null) {
      initialDocRef.current = value
    }
  }, [value])

  useEffect(() => {
    // Same idea as initialDocRef: if the view doesn't exist yet, allow the
    // initial wrap setting to follow props.
    if (viewRef.current == null) {
      initialWrapRef.current = wrap
    }
  }, [wrap])

  useEffect(() => {
    if (viewRef.current == null) {
      initialLivePreviewRef.current = livePreview
    }
  }, [livePreview])

  useEffect(() => {
    if (viewRef.current == null) {
      initialRenderDiagramsRef.current = renderDiagrams
    }
  }, [renderDiagrams])

  useEffect(() => {
    if (viewRef.current == null) {
      initialRenderImagesRef.current = renderImages
    }
  }, [renderImages])

  useEffect(() => {
    if (viewRef.current == null) {
      initialRenderCalloutsRef.current = renderCallouts
    }
  }, [renderCallouts])

  useEffect(() => {
    if (viewRef.current == null) {
      initialVaultPathRef.current = vaultPath
    }
  }, [vaultPath])

  useEffect(() => {
    if (viewRef.current == null) {
      initialNoteRelPathRef.current = noteRelPath
    }
  }, [noteRelPath])

  useEffect(() => {
    if (viewRef.current == null) {
      initialOpenWikilinkRef.current = onOpenWikilink
    }
  }, [onOpenWikilink])

  useEffect(() => {
    if (viewRef.current == null) {
      initialOpenImageRef.current = onOpenImage
    }
  }, [onOpenImage])

  useEffect(() => {
    if (viewRef.current == null) {
      initialFilesRef.current = files
    }
  }, [files])

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current != null) {
        window.clearTimeout(highlightTimerRef.current)
        highlightTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!lightbox) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setLightbox(null)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [lightbox])

  const extensions = useMemo(() => {
    const isDark = theme === 'dark'
    const editorTheme = EditorView.theme(
      {
        '&': {
          height: '100%',
          fontSize: '14px',
          backgroundColor: isDark ? '#14161a' : '#f8f9fb',
          color: isDark ? 'rgba(255, 255, 255, 0.92)' : '#1f2328',
        },
        '.cm-scroller': {
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        },
        '.cm-content': {
          caretColor: isDark ? '#9da8ff' : '#3b4a9f',
        },
        '.cm-gutters': {
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.03)',
          color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.55)',
          border: 'none',
        },
      },
      { dark: isDark },
    )

    const wrapCompartment = wrapCompartmentRef.current
    if (!wrapCompartment) {
      throw new Error('Missing wrap compartment')
    }

    const livePreviewCompartment = livePreviewCompartmentRef.current
    if (!livePreviewCompartment) {
      throw new Error('Missing live preview compartment')
    }

    return [
      lineNumbers(),
      history(),
      markdown(),
      editorTheme,
      taskHighlightField,
      createWikilinkCompletionExtension(initialFilesRef.current),
      wrapCompartment.of(initialWrapRef.current ? EditorView.lineWrapping : []),
      livePreviewCompartment.of(
        initialLivePreviewRef.current
          ? createLivePreviewExtension({
              onOpenWikilink: initialOpenWikilinkRef.current,
              renderDiagrams: initialRenderDiagramsRef.current,
              renderImages: initialRenderImagesRef.current,
              renderCallouts: initialRenderCalloutsRef.current,
              renderLockedSections: renderLockedSections,
              vaultPath: initialVaultPathRef.current ?? undefined,
              noteRelPath: initialNoteRelPathRef.current ?? undefined,
              onOpenImage: initialOpenImageRef.current ?? undefined,
              theme,
              isVaultUnlocked,
              onRequestUnlock,
              onLockedSectionsDetected,
            })
          : [],
      ),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (!update.docChanged) return
        if (applyingExternalValueRef.current) return
        onChangeRef.current(update.state.doc.toString())
      }),
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            onSaveRequestRef.current?.()
            return true
          },
        },
        indentWithTab,
        ...defaultKeymap,
        ...historyKeymap,
      ]),
    ]
  }, [theme, renderLockedSections, isVaultUnlocked, onRequestUnlock, onLockedSectionsDetected])

  useEffect(() => {
    if (!hostRef.current) return

    let cancelled = false
    const setInitErrorAsync = (err: Error | null) => {
      queueMicrotask(() => {
        if (cancelled) return
        setInitError(err)
      })
    }

    setInitErrorAsync(null)

    try {
      const state = EditorState.create({
        doc: initialDocRef.current,
        extensions,
      })

      const view = new EditorView({
        state,
        parent: hostRef.current,
      })

      viewRef.current = view
      return () => {
        cancelled = true
        // Preserve document content before destroying view so it can be
        // restored if extensions change triggers view recreation
        if (viewRef.current) {
          initialDocRef.current = viewRef.current.state.doc.toString()
        }
        viewRef.current = null
        view.destroy()
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      setInitErrorAsync(error)
      cancelled = true
      return
    }
  }, [extensions])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const current = view.state.doc.toString()
    if (current === value) return

    applyingExternalValueRef.current = true
    try {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    } finally {
      applyingExternalValueRef.current = false
    }
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    const pending = pendingRevealRef.current
    if (!view || pending == null) return
    pendingRevealRef.current = null
    requestAnimationFrame(() => revealLine(pending))
  }, [revealLine, value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const wrapCompartment = wrapCompartmentRef.current
    if (!wrapCompartment) return

    view.dispatch({
      effects: wrapCompartment.reconfigure(wrap ? EditorView.lineWrapping : []),
    })
  }, [wrap])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const livePreviewCompartment = livePreviewCompartmentRef.current
    if (!livePreviewCompartment) return

    view.dispatch({
      effects: livePreviewCompartment.reconfigure(
        livePreview
          ? createLivePreviewExtension({
              onOpenWikilink,
              renderDiagrams,
              renderImages,
              renderCallouts,
              renderLockedSections,
              vaultPath: vaultPath ?? undefined,
              noteRelPath: noteRelPath ?? undefined,
              onOpenImage,
              theme,
              isVaultUnlocked,
              onRequestUnlock,
              onLockedSectionsDetected,
            })
          : [],
      ),
    })
  }, [
    livePreview,
    onOpenWikilink,
    renderDiagrams,
    renderImages,
    renderCallouts,
    renderLockedSections,
    vaultPath,
    noteRelPath,
    onOpenImage,
    theme,
    isVaultUnlocked,
    onRequestUnlock,
    onLockedSectionsDetected,
  ])

  if (initError) {
    return (
      <div className="error" style={{ whiteSpace: 'pre-wrap' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Editor failed to initialize</div>
        <div>{String(initError.message || initError)}</div>
      </div>
    )
  }

  return (
    <div className="noteEditor">
      <div className="noteEditorHost" ref={hostRef} />
      {lightbox ? (
        <div className="imageLightbox" role="presentation" onMouseDown={() => setLightbox(null)}>
          <div
            className="imageLightboxCard"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <img src={lightbox.src} alt={lightbox.alt ?? ''} />
            {lightbox.alt ? (
              <div className="imageLightboxCaption">{lightbox.alt}</div>
            ) : null}
            <button type="button" className="imageLightboxClose" onClick={() => setLightbox(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default NoteEditor
