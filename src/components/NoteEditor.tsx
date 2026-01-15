import { useEffect, useMemo, useRef, useState } from 'react'

import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, type ViewUpdate } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'

type NoteEditorProps = {
  value: string
  onChange: (next: string) => void
  onSaveRequest?: () => void
  wrap?: boolean
}

export function NoteEditor({ value, onChange, onSaveRequest, wrap = true }: NoteEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const initialDocRef = useRef<string>(value)
  const initialWrapRef = useRef<boolean>(wrap)
  const [initError, setInitError] = useState<Error | null>(null)

  const wrapCompartmentRef = useRef<Compartment | null>(null)
  if (wrapCompartmentRef.current == null) {
    wrapCompartmentRef.current = new Compartment()
  }

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

  const extensions = useMemo(() => {
    const theme = EditorView.theme(
      {
        '&': {
          height: '100%',
          fontSize: '14px',
        },
        '.cm-scroller': {
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        },
      },
      { dark: true },
    )

    const wrapCompartment = wrapCompartmentRef.current
    if (!wrapCompartment) {
      throw new Error('Missing wrap compartment')
    }

    return [
      lineNumbers(),
      history(),
      markdown(),
      theme,
      wrapCompartment.of(initialWrapRef.current ? EditorView.lineWrapping : []),
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
  }, [])

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

  if (initError) {
    return (
      <div className="error" style={{ whiteSpace: 'pre-wrap' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Editor failed to initialize</div>
        <div>{String(initError.message || initError)}</div>
      </div>
    )
  }

  return <div className="noteEditor" ref={hostRef} />
}

export default NoteEditor
