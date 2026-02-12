import { useCallback, useEffect, useRef, useState } from 'react'

import type { NoteEntry } from '../../types'
import { listTasksV2 } from '../../tauri'
import { fileStem } from '../../path'
import {
  extractTasksFromTextWithLockFilter,
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
  isVaultUnlocked: boolean
}

export function useTasks({
  vaultPath,
  files,
  showHidden,
  debounceMs,
  onError,
  activeRelPath,
  activeNoteText,
  isVaultUnlocked,
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

  const buildTasksForText = useCallback((relPath: string, text: string): TaskItem[] => {
    // When vault is locked, exclude tasks from locked sections
    const matches = extractTasksFromTextWithLockFilter(text, !isVaultUnlocked)
    return matches
      .filter((task) => task.state !== 'x')
      .map((task) => ({
        relPath,
        noteTitle: fileStem(relPath),
        lineNumber: task.lineNumber,
        text: task.text,
        state: task.state,
      }))
  }, [isVaultUnlocked])

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

    const indexedTasks = await listTasksV2(vaultPath, showHidden, isVaultUnlocked)
    if (scanRequestIdRef.current !== requestId) return

    const fileSet = new Set(files.map((f) => f.rel_path))
    const results: TaskItem[] = indexedTasks
      .filter((task) => fileSet.has(task.relPath))
      .map((task) => ({
        relPath: task.relPath,
        noteTitle: task.noteTitle || fileStem(task.relPath),
        lineNumber: task.lineNumber,
        text: task.text,
        state: (task.state as TaskState) || ' ',
      }))

    if (scanRequestIdRef.current !== requestId) return
    setTasks(results)
    setTasksBusy(false)
  }, [files, isVaultUnlocked, showHidden, vaultPath])

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

  // Clear task state immediately when vault is removed (render-time adjustment)
  const [prevVaultPath, setPrevVaultPath] = useState(vaultPath)
  if (vaultPath !== prevVaultPath) {
    setPrevVaultPath(vaultPath)
    if (!vaultPath) {
      setTasks([])
      setTasksBusy(false)
    }
  }

  useEffect(() => {
    if (!vaultPath) {
      clearTimer()
      return
    }
    scheduleTasksScan()
  }, [clearTimer, files, scheduleTasksScan, showHidden, vaultPath])

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
