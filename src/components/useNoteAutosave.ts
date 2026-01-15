import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type NoteSaveStatus = 'saved' | 'saving' | 'error'

type UseNoteAutosaveArgs = {
  enabled: boolean
  vaultPath: string | null
  relPath: string | null
  text: string
  isDirty: boolean
  debounceMs?: number
  save: (vaultPath: string, relPath: string, contents: string) => Promise<void>
  onSaved: (contents: string) => void
}

type UseNoteAutosaveResult = {
  status: NoteSaveStatus
  title: string
  ariaLabel: string
  flush: () => Promise<boolean>
}

const DEFAULT_DEBOUNCE_MS = 750

export function useNoteAutosave({
  enabled,
  vaultPath,
  relPath,
  text,
  isDirty,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  save,
  onSaved,
}: UseNoteAutosaveArgs): UseNoteAutosaveResult {
  const key = enabled && vaultPath && relPath ? `${vaultPath}::${relPath}` : null

  const [status, setStatus] = useState<NoteSaveStatus>('saved')

  const keyRef = useRef<string | null>(key)
  const textRef = useRef(text)
  const isDirtyRef = useRef(isDirty)

  useEffect(() => {
    textRef.current = text
  }, [text])

  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  useEffect(() => {
    keyRef.current = key
    setStatus('saved')
  }, [key])

  const timerRef = useRef<number | null>(null)
  const saveSeqRef = useRef(0)
  const inFlightSeqRef = useRef<number | null>(null)
  const inFlightPromiseRef = useRef<Promise<boolean> | null>(null)

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const saveNow = useCallback(
    async (seq: number): Promise<boolean> => {
      if (inFlightPromiseRef.current) {
        return inFlightPromiseRef.current
      }

      if (!enabled || !vaultPath || !relPath) return true

      const keyAtStart = `${vaultPath}::${relPath}`
      if (keyRef.current !== keyAtStart) return true

      if (!isDirtyRef.current) {
        setStatus('saved')
        return true
      }

      const contents = textRef.current

      const promise = (async (): Promise<boolean> => {
        inFlightSeqRef.current = seq
        setStatus('saving')

        try {
          await save(vaultPath, relPath, contents)
        } catch {
          if (keyRef.current === keyAtStart) {
            setStatus('error')
          }
          return false
        } finally {
          if (inFlightSeqRef.current === seq) {
            inFlightSeqRef.current = null
          }
        }

        if (keyRef.current === keyAtStart) {
          onSaved(contents)
          setStatus(isDirtyRef.current ? 'saving' : 'saved')
        }

        // If the user typed while the save was in-flight, schedule another save.
        if (keyRef.current === keyAtStart && isDirtyRef.current) {
          clearTimer()
          timerRef.current = window.setTimeout(() => {
            const nextSeq = ++saveSeqRef.current
            void saveNow(nextSeq)
          }, debounceMs)
        }

        return true
      })()

      inFlightPromiseRef.current = promise
      const ok = await promise
      if (inFlightPromiseRef.current === promise) {
        inFlightPromiseRef.current = null
      }
      return ok
    },
    [debounceMs, enabled, onSaved, relPath, save, vaultPath],
  )

  useEffect(() => {
    if (!enabled) {
      clearTimer()
      setStatus('saved')
      return
    }

    if (!isDirty) {
      clearTimer()
      if (inFlightSeqRef.current == null) {
        setStatus('saved')
      }
      return
    }

    // Debounce saves to avoid excessive disk writes while typing.
    clearTimer()
    setStatus('saving')

    const seq = ++saveSeqRef.current
    timerRef.current = window.setTimeout(() => {
      void saveNow(seq)
    }, debounceMs)

    return () => {
      clearTimer()
    }
  }, [debounceMs, enabled, isDirty, saveNow])

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimer()

    if (!enabled || !vaultPath || !relPath) return true
    if (!isDirtyRef.current) {
      setStatus('saved')
      return true
    }

    // Flush tries to save the most recent buffer and waits until it's clean.
    // This is used when switching notes to avoid writing the wrong file.
    for (let i = 0; i < 5; i++) {
      if (!isDirtyRef.current) return true
      const seq = ++saveSeqRef.current
      const ok = await saveNow(seq)
      if (!ok) return false
    }

    return !isDirtyRef.current
  }, [enabled, relPath, saveNow, vaultPath])

  const { title, ariaLabel } = useMemo(() => {
    switch (status) {
      case 'saving':
        return { title: 'Saving…', ariaLabel: 'Saving…' }
      case 'error':
        return { title: 'Error saving', ariaLabel: 'Error saving' }
      case 'saved':
      default:
        return { title: 'Saved', ariaLabel: 'Saved' }
    }
  }, [status])

  return { status, title, ariaLabel, flush }
}
