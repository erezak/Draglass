import { useCallback, useEffect, useRef, useState } from 'react'

import type { NoteEntry } from '../../types'
import { readNote } from '../../tauri'
import { fileStem } from '../../path'
import { isVisibleNoteForNavigation } from '../../ignore'
import {
  extractTasksFromText,
  filterTaskEntries,
  type TaskState,
} from './taskScanner'

export type TaskItem = {
  relPath: string
  noteTitle: string
  lineNumber: number
  text: string
  state: TaskState
}

type UseTasksArgs = {
  vaultPath: string | null
  files: NoteEntry[]
  showHidden: boolean
  debounceMs: number
  onError: (message: string) => void
  activeRelPath: string | null
  activeNoteText: string
}

export function useTasks({
  vaultPath,
  files,
  showHidden,
  debounceMs,
  onError,
  activeRelPath,
  activeNoteText,
}: UseTasksArgs): {
  tasks: TaskItem[]
  tasksBusy: boolean
  scheduleTasksScan: () => void
  resetTasks: () => void
} {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [tasksBusy, setTasksBusy] = useState(false)

  const scanRequestIdRef = useRef(0)
  const scanTimerRef = useRef<number | null>(null)
  const tasksRef = useRef<TaskItem[]>([])
  const activeNoteTimerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (scanTimerRef.current != null) {
      window.clearTimeout(scanTimerRef.current)
      scanTimerRef.current = null
    }
  }, [])

  const buildTasksForNote = useCallback(
    async (vault: string, entry: NoteEntry): Promise<TaskItem[]> => {
      try {
        const contents = await readNote(vault, entry.rel_path)
        const matches = extractTasksFromText(contents)
        return matches
          .filter((task) => task.state !== 'x')
          .map((task) => ({
            relPath: entry.rel_path,
            noteTitle: fileStem(entry.rel_path),
            lineNumber: task.lineNumber,
            text: task.text,
            state: task.state,
          }))
      } catch {
        return []
      }
    },
    [],
  )

  const buildTasksForText = useCallback((relPath: string, text: string): TaskItem[] => {
    const matches = extractTasksFromText(text)
    return matches
      .filter((task) => task.state !== 'x')
      .map((task) => ({
        relPath,
        noteTitle: fileStem(relPath),
        lineNumber: task.lineNumber,
        text: task.text,
        state: task.state,
      }))
  }, [])

  const replaceTasksForRelPath = useCallback(
    (relPath: string, nextTasks: TaskItem[]) => {
      setTasks((prev) => {
        const result: TaskItem[] = []
        let inserted = false
        for (const task of prev) {
          if (task.relPath !== relPath) {
            result.push(task)
            continue
          }
          if (!inserted) {
            result.push(...nextTasks)
            inserted = true
          }
        }
        if (!inserted) {
          result.push(...nextTasks)
        }
        return result
      })
    },
    [],
  )

  const refreshTasks = useCallback(async () => {
    if (!vaultPath) {
      setTasks([])
      setTasksBusy(false)
      return
    }

    const requestId = ++scanRequestIdRef.current
    if (tasksRef.current.length === 0) {
      setTasksBusy(true)
    }

    const candidates = filterTaskEntries(files, showHidden, (relPath) =>
      isVisibleNoteForNavigation(relPath, false),
    )
    const results: TaskItem[] = []
    const batchSize = 8

    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map((entry) => buildTasksForNote(vaultPath, entry)),
      )

      if (scanRequestIdRef.current !== requestId) return

      for (const tasksForNote of batchResults) {
        results.push(...tasksForNote)
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 0)
      })
    }

    if (scanRequestIdRef.current !== requestId) return
    setTasks(results)
    setTasksBusy(false)
  }, [buildTasksForNote, files, showHidden, vaultPath])

  const scheduleTasksScan = useCallback(() => {
    clearTimer()
    if (!vaultPath) return

    scanTimerRef.current = window.setTimeout(() => {
      scanTimerRef.current = null
      void refreshTasks().catch((err) => {
        setTasks([])
        setTasksBusy(false)
        onError(String(err))
      })
    }, debounceMs)
  }, [clearTimer, debounceMs, onError, refreshTasks, vaultPath])

  const resetTasks = useCallback(() => {
    clearTimer()
    setTasks([])
    setTasksBusy(false)
  }, [clearTimer])

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    if (!activeRelPath) return
    if (activeNoteTimerRef.current != null) {
      window.clearTimeout(activeNoteTimerRef.current)
      activeNoteTimerRef.current = null
    }

    activeNoteTimerRef.current = window.setTimeout(() => {
      activeNoteTimerRef.current = null
      const nextTasks = buildTasksForText(activeRelPath, activeNoteText)
      replaceTasksForRelPath(activeRelPath, nextTasks)
    }, 150)
  }, [activeNoteText, activeRelPath, buildTasksForText, replaceTasksForRelPath])

  useEffect(() => {
    if (!vaultPath) {
      resetTasks()
      return
    }
    scheduleTasksScan()
  }, [files, resetTasks, scheduleTasksScan, showHidden, vaultPath])

  useEffect(() => {
    return () => {
      if (activeNoteTimerRef.current != null) {
        window.clearTimeout(activeNoteTimerRef.current)
        activeNoteTimerRef.current = null
      }
    }
  }, [])

  return { tasks, tasksBusy, scheduleTasksScan, resetTasks }
}
