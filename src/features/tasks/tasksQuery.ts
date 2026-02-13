export type TaskQueryTask = {
  relPath: string
  lineNumber: number
  text: string
  state: ' ' | 'x' | '-'
}

export type TaskQueryFilter = {
  requireNotDone: boolean
  excludedPathSnippets: string[]
}

const PATH_NOT_INCLUDE_RE = /^path\s+does\s+not\s+include\s+(.+)$/i
const CURRENT_FILE_TOKEN_RE = /\{\{\s*query\.file\.path\s*\}\}/gi
const TASK_DUE_DATE_RE = /(?:^|\s)📅\s*(\d{4}-\d{2}-\d{2})(?=\s|$)/u

export function parseTasksCodeBlockFilter(
  lines: string[],
  currentFilePath: string,
): TaskQueryFilter {
  let requireNotDone = false
  const excludedPathSnippets: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.toLowerCase() === 'not done') {
      requireNotDone = true
      continue
    }

    const pathMatch = PATH_NOT_INCLUDE_RE.exec(line)
    if (pathMatch) {
      const rawValue = (pathMatch[1] ?? '').trim()
      if (!rawValue) continue
      const resolved = rawValue.replace(CURRENT_FILE_TOKEN_RE, currentFilePath)
      if (resolved) excludedPathSnippets.push(resolved.toLowerCase())
    }
  }

  return {
    requireNotDone,
    excludedPathSnippets,
  }
}

export function applyTasksCodeBlockFilter(
  tasks: TaskQueryTask[],
  filter: TaskQueryFilter,
): TaskQueryTask[] {
  return tasks.filter((task) => {
    if (filter.requireNotDone && task.state === 'x') return false
    const relPathLower = task.relPath.toLowerCase()
    if (filter.excludedPathSnippets.some((snippet) => relPathLower.includes(snippet))) {
      return false
    }
    return true
  })
}

export function extractTaskDueDate(taskText: string): string | null {
  const match = TASK_DUE_DATE_RE.exec(taskText)
  const dueDate = match?.[1]?.trim()
  return dueDate && dueDate.length > 0 ? dueDate : null
}
