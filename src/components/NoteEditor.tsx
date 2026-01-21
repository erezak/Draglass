import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'

import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, type ViewUpdate } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { createLivePreviewExtension } from '../editor/livePreview'

type NoteEditorProps = {
  value: string
  onChange: (next: string) => void
  onSaveRequest?: () => void
  wrap?: boolean
  livePreview?: boolean
  onOpenWikilink?: (rawTarget: string) => void
  theme?: 'dark' | 'light'
}

export type NoteEditorHandle = {
  focus: () => void
}

export const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(function NoteEditor(
  { value, onChange, onSaveRequest, wrap = true, livePreview = true, onOpenWikilink, theme = 'dark' },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const initialDocRef = useRef<string>(value)
  const initialWrapRef = useRef<boolean>(wrap)
  const initialLivePreviewRef = useRef<boolean>(livePreview)
  const initialOpenWikilinkRef = useRef<NoteEditorProps['onOpenWikilink']>(onOpenWikilink)
  const [initError, setInitError] = useState<Error | null>(null)

  const wrapCompartmentRef = useRef<Compartment | null>(null)
  if (wrapCompartmentRef.current == null) {
    wrapCompartmentRef.current = new Compartment()
  }

  const livePreviewCompartmentRef = useRef<Compartment | null>(null)
  if (livePreviewCompartmentRef.current == null) {
    livePreviewCompartmentRef.current = new Compartment()
  }

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        viewRef.current?.focus()
      },
    }),
    [],
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
      initialOpenWikilinkRef.current = onOpenWikilink
    }
  }, [onOpenWikilink])

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
      wrapCompartment.of(initialWrapRef.current ? EditorView.lineWrapping : []),
      livePreviewCompartment.of(
        initialLivePreviewRef.current
          ? createLivePreviewExtension({ onOpenWikilink: initialOpenWikilinkRef.current })
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
  }, [theme])

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
        livePreview ? createLivePreviewExtension({ onOpenWikilink }) : [],
      ),
    })
  }, [livePreview, onOpenWikilink])

  if (initError) {
    return (
      <div className="error" style={{ whiteSpace: 'pre-wrap' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Editor failed to initialize</div>
        <div>{String(initError.message || initError)}</div>
      </div>
    )
  }

  return <div className="noteEditor" ref={hostRef} />
})

export default NoteEditor
