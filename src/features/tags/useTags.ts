import { useCallback, useEffect, useRef, useState } from 'react'

import type { NoteEntry } from '../../types'
import { listTags, notesForTag, type TagNoteItem, type TagSummary } from '../../tauri'
import { fileStem } from '../../path'
import { isIgnoredPath, isMarkdownNotePath } from '../../ignore'
import {
  extractTagsFromTextWithLockFilter,
  findFirstInlineTagLine,
  normalizeTag,
} from '../../tags'

export type TagNote = TagNoteItem
export type TagItem = TagSummary

type UseTagsArgs = {
  enabled: boolean
  vaultPath: string | null
  files: NoteEntry[]
  showHidden: boolean
  debounceMs: number
  onError: (message: string) => void
  isVaultUnlocked: boolean
  activeRelPath: string | null
  activeNoteText: string
  activeSavedText: string
}

export function useTags({
  enabled,
  vaultPath,
  files,
  showHidden,
  debounceMs,
  onError,
  isVaultUnlocked,
  activeRelPath,
  activeNoteText,
  activeSavedText,
}: UseTagsArgs): {
  tags: TagItem[]
  tagsBusy: boolean
  scheduleTagsScan: () => void
  resetTags: () => void
  fetchNotesForTag: (tag: string) => Promise<TagNote[]>
} {
  const [tags, setTags] = useState<TagItem[]>([])
  const [tagsBusy, setTagsBusy] = useState(false)

  const scanTimerRef = useRef<number | null>(null)
  const scanRequestIdRef = useRef(0)
  const indexedTagsRef = useRef<TagItem[]>([])

  const noteVisibleInTags = useCallback(
    (relPath: string | null) => {
      if (!relPath) return false
      if (!isMarkdownNotePath(relPath)) return false
      if (!showHidden && isIgnoredPath(relPath)) return false
      return true
    },
    [showHidden],
  )

  const applyActiveNoteOverlay = useCallback(
    (indexed: TagItem[]): TagItem[] => {
      if (!noteVisibleInTags(activeRelPath)) {
        return indexed
      }

      const savedTags = extractTagsFromTextWithLockFilter(activeSavedText, !isVaultUnlocked)
      const liveTags = extractTagsFromTextWithLockFilter(activeNoteText, !isVaultUnlocked)

      const counts = new Map<string, number>()
      for (const item of indexed) {
        counts.set(item.tag, item.count)
      }

      for (const tag of savedTags) {
        const next = (counts.get(tag) || 0) - 1
        if (next > 0) {
          counts.set(tag, next)
        } else {
          counts.delete(tag)
        }
      }

      for (const tag of liveTags) {
        counts.set(tag, (counts.get(tag) || 0) + 1)
      }

      return Array.from(counts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' }))
    },
    [activeNoteText, activeRelPath, activeSavedText, isVaultUnlocked, noteVisibleInTags],
  )

  const clearTimer = useCallback(() => {
    if (scanTimerRef.current != null) {
      window.clearTimeout(scanTimerRef.current)
      scanTimerRef.current = null
    }
  }, [])

  const refreshTags = useCallback(async () => {
    if (!enabled || !vaultPath) {
      setTags([])
      setTagsBusy(false)
      return
    }

    const requestId = ++scanRequestIdRef.current
    if (tags.length === 0) {
      setTagsBusy(true)
    }

    const results = await listTags(vaultPath, showHidden, isVaultUnlocked)
    if (scanRequestIdRef.current !== requestId) return

    indexedTagsRef.current = results
    setTags(applyActiveNoteOverlay(results))
    setTagsBusy(false)
  }, [applyActiveNoteOverlay, enabled, isVaultUnlocked, showHidden, tags.length, vaultPath])

  const scheduleTagsScan = useCallback(() => {
    clearTimer()
    if (!enabled || !vaultPath) return

    scanTimerRef.current = window.setTimeout(() => {
      scanTimerRef.current = null
      void refreshTags().catch((err) => {
        setTags([])
        setTagsBusy(false)
        onError(String(err))
      })
    }, debounceMs)
  }, [clearTimer, debounceMs, enabled, onError, refreshTags, vaultPath])

  const resetTags = useCallback(() => {
    clearTimer()
    setTags([])
    setTagsBusy(false)
  }, [clearTimer])

  const fetchNotesForTag = useCallback(
    async (rawTag: string): Promise<TagNote[]> => {
      if (!enabled || !vaultPath) return []
      const normalized = normalizeTag(rawTag)
      if (!normalized) return []

      const requestId = ++scanRequestIdRef.current
      const notes = await notesForTag(vaultPath, normalized, showHidden, isVaultUnlocked)
      if (scanRequestIdRef.current !== requestId) return []

      const fileSet = new Set(files.map((file) => file.rel_path))
      const filtered = notes.filter((note) => fileSet.has(note.relPath))

      if (!noteVisibleInTags(activeRelPath)) {
        return filtered
      }

      const liveTags = extractTagsFromTextWithLockFilter(activeNoteText, !isVaultUnlocked)
      const hasLive = liveTags.includes(normalized)

      const withoutActive = filtered.filter((note) => note.relPath !== activeRelPath)

      if (!hasLive) {
        return withoutActive
      }

      const inlineLine = findFirstInlineTagLine(activeNoteText, normalized, !isVaultUnlocked)
      const activeTitle = activeRelPath ? fileStem(activeRelPath) : ''

      const activeNote: TagNote = {
        relPath: activeRelPath!,
        title: activeTitle,
        mtime: Date.now(),
        lineNumber: inlineLine,
      }

      const merged = [activeNote, ...withoutActive]
      return merged
    },
    [
      activeNoteText,
      activeRelPath,
      activeSavedText,
      enabled,
      files,
      isVaultUnlocked,
      noteVisibleInTags,
      showHidden,
      vaultPath,
    ],
  )

  useEffect(() => {
    if (!enabled) return
    setTags(applyActiveNoteOverlay(indexedTagsRef.current))
  }, [activeNoteText, activeRelPath, activeSavedText, applyActiveNoteOverlay, enabled])

  useEffect(() => {
    if (!vaultPath) {
      clearTimer()
      return
    }
    scheduleTagsScan()
  }, [clearTimer, files, scheduleTagsScan, showHidden, vaultPath])

  return {
    tags: enabled ? tags : [],
    tagsBusy: enabled ? tagsBusy : false,
    scheduleTagsScan,
    resetTags,
    fetchNotesForTag,
  }
}
