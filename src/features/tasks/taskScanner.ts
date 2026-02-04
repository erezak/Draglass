import type { NoteEntry } from '../../types'
import {
  parseLockedSections,
  type LockedBodyRange,
} from '../../lockedSections'

export type TaskState = ' ' | 'x' | '-'

export type TaskMatch = {
  lineNumber: number
  state: TaskState
  text: string
  indent: string
  marker: '-' | '+' | '*'
  raw: string
}

const TASK_LINE_RE = /^(\s*)([-+*])\s+\[( |x|X|-)\]\s*(.*)$/
const FENCE_RE = /^\s{0,3}```/
const BLOCKQUOTE_RE = /^\s*>/

export function parseTaskLine(lineText: string, lineNumber: number): TaskMatch | null {
  const match = TASK_LINE_RE.exec(lineText)
  if (!match) return null

  const indent = match[1] ?? ''
  const marker = (match[2] ?? '-') as TaskMatch['marker']
  const rawState = (match[3] ?? ' ').toLowerCase()
  const state: TaskState = rawState === 'x' || rawState === '-' ? rawState : ' '
  const text = (match[4] ?? '').trim()

  return {
    lineNumber,
    state,
    text,
    indent,
    marker,
    raw: lineText,
  }
}

export function replaceTaskState(lineText: string, next: TaskState): string | null {
  const match = TASK_LINE_RE.exec(lineText)
  if (!match) return null

  const indent = match[1] ?? ''
  const marker = match[2] ?? '-'
  const bracketIndex = lineText.indexOf('[', indent.length + marker.length)
  if (bracketIndex < 0 || bracketIndex + 1 >= lineText.length) return null

  const stateIndex = bracketIndex + 1
  return `${lineText.slice(0, stateIndex)}${next}${lineText.slice(stateIndex + 1)}`
}

export function extractTasksFromText(text: string): TaskMatch[] {
  const lines = text.split(/\r?\n/)
  const tasks: TaskMatch[] = []
  let inFence = false

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    if (FENCE_RE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (BLOCKQUOTE_RE.test(line)) continue

    const match = parseTaskLine(line, i + 1)
    if (match) tasks.push(match)
  }

  return tasks
}

/**
 * Filter out tasks that fall within locked body ranges.
 * Use this when the vault is NOT unlocked to prevent leaking locked content.
 */
export function filterTasksFromLockedSections(
  tasks: TaskMatch[],
  lockedRanges: LockedBodyRange[],
): TaskMatch[] {
  if (lockedRanges.length === 0) return tasks
  return tasks.filter((task) => {
    const lineNum = task.lineNumber
    return !lockedRanges.some(
      (range) => lineNum >= range.fromLine && lineNum < range.toLineExclusive,
    )
  })
}

/**
 * Extract tasks from text, optionally excluding those in locked sections.
 * @param text - The note content
 * @param excludeLockedContent - If true, locked section bodies are excluded
 */
export function extractTasksFromTextWithLockFilter(
  text: string,
  excludeLockedContent: boolean,
): TaskMatch[] {
  const tasks = extractTasksFromText(text)
  if (!excludeLockedContent) return tasks

  const { lockedBodyRanges } = parseLockedSections(text)
  return filterTasksFromLockedSections(tasks, lockedBodyRanges)
}

export function filterTaskEntries(
  files: NoteEntry[],
  showHidden: boolean,
  isVisibleNote: (relPath: string) => boolean,
): NoteEntry[] {
  if (showHidden) return files
  return files.filter((file) => isVisibleNote(file.rel_path))
}
