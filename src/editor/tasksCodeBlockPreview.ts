import { RangeSetBuilder, StateEffect, StateField, Transaction, type Extension } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view'

import type { TaskItem } from '../features/tasks/useTasks'
import {
  applyTasksCodeBlockFilter,
  parseTasksCodeBlockFilter,
  type TaskQueryTask,
} from '../features/tasks/tasksQuery'
import { shouldHideMarkup } from './livePreviewHelpers'
import { getFenceLang } from './mermaidBlocks'

type TasksCodeBlockPreviewOptions = {
  tasks?: TaskItem[]
  noteRelPath?: string
}
type ScheduledUpdate = number | ReturnType<typeof setTimeout>

type TasksBlock = {
  from: number
  to: number
  filters: string[]
}

const TASKS_LANG = 'tasks'
const setTasksDecorations = StateEffect.define<DecorationSet>()
const FALLBACK_UPDATE_DELAY_MS = 16

export const tasksDecorationsField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTasksDecorations)) {
        return effect.value
      }
    }
    if (tr.docChanged) {
      return value.map(tr.changes)
    }
    return value
  },
  provide: (field) => EditorView.decorations.from(field),
})

function collectTasksBlocks(view: EditorView): TasksBlock[] {
  const blocks: TasksBlock[] = []
  const { doc } = view.state

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
    const line = doc.line(lineNumber)
    if (getFenceLang(line.text) !== TASKS_LANG) continue

    const filters: string[] = []
    let endLine = lineNumber

    for (let current = lineNumber + 1; current <= doc.lines; current += 1) {
      const next = doc.line(current)
      const fenceLang = getFenceLang(next.text)
      if (fenceLang != null) {
        endLine = current
        break
      }
      filters.push(next.text)
    }

    if (endLine === lineNumber) continue

    const endInfo = doc.line(endLine)
    blocks.push({
      from: line.from,
      to: endLine < doc.lines ? endInfo.to + 1 : endInfo.to,
      filters,
    })

    lineNumber = endLine
  }

  return blocks
}

class TasksBlockWidget extends WidgetType {
  private readonly tasks: TaskQueryTask[]

  constructor(tasks: TaskQueryTask[]) {
    super()
    this.tasks = tasks
  }

  eq(other: TasksBlockWidget) {
    if (this.tasks.length !== other.tasks.length) return false
    for (let i = 0; i < this.tasks.length; i += 1) {
      const left = this.tasks[i]
      const right = other.tasks[i]
      if (!left || !right) return false
      if (
        left.relPath !== right.relPath ||
        left.lineNumber !== right.lineNumber ||
        left.text !== right.text ||
        left.state !== right.state
      ) {
        return false
      }
    }
    return true
  }

  toDOM() {
    const wrapper = document.createElement('div')
    wrapper.className = 'cm-livePreview-tableWrap'

    const table = document.createElement('table')
    table.className = 'cm-livePreview-table'

    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    for (const label of ['Task', 'Path', 'Line']) {
      const th = document.createElement('th')
      th.textContent = label
      headRow.appendChild(th)
    }
    thead.appendChild(headRow)
    table.appendChild(thead)

    const tbody = document.createElement('tbody')
    if (this.tasks.length === 0) {
      const row = document.createElement('tr')
      const cell = document.createElement('td')
      cell.colSpan = 3
      cell.textContent = 'No matching tasks'
      row.appendChild(cell)
      tbody.appendChild(row)
    } else {
      for (const task of this.tasks) {
        const row = document.createElement('tr')
        const taskCell = document.createElement('td')
        taskCell.textContent = task.text
        row.appendChild(taskCell)

        const pathCell = document.createElement('td')
        pathCell.textContent = task.relPath
        row.appendChild(pathCell)

        const lineCell = document.createElement('td')
        lineCell.textContent = String(task.lineNumber)
        row.appendChild(lineCell)

        tbody.appendChild(row)
      }
    }
    table.appendChild(tbody)
    wrapper.appendChild(table)
    return wrapper
  }

  ignoreEvent() {
    return true
  }
}

function buildTasksCodeBlockDecorations(
  view: EditorView,
  options: TasksCodeBlockPreviewOptions,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const blocks = collectTasksBlocks(view)
  const selections = view.state.selection.ranges
  const noteRelPath = options.noteRelPath ?? ''
  const allTasks = options.tasks ?? []

  for (const block of blocks) {
    const hasSelection = selections.some(
      (range) => shouldHideMarkup(block.from, block.to, range.from, range.to) === false,
    )
    if (hasSelection) continue

    const parsed = parseTasksCodeBlockFilter(block.filters, noteRelPath)
    const filtered = applyTasksCodeBlockFilter(allTasks, parsed)
    builder.add(
      block.from,
      block.to,
      Decoration.replace({
        widget: new TasksBlockWidget(filtered),
        block: true,
      }),
    )
  }

  return builder.finish()
}

export function createTasksCodeBlockPreviewPlugin(
  options: TasksCodeBlockPreviewOptions = {},
): Extension {
  return ViewPlugin.fromClass(
    class {
      private pendingUpdate: ScheduledUpdate | null = null
      private pendingUsesTimeout = false

      constructor(view: EditorView) {
        this.scheduleUpdate(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.scheduleUpdate(update.view)
        }
      }

      destroy() {
        if (this.pendingUpdate == null) return
        if (this.pendingUsesTimeout) {
          clearTimeout(this.pendingUpdate)
        } else {
          cancelAnimationFrame(this.pendingUpdate)
        }
        this.pendingUpdate = null
      }

      private scheduleUpdate(view: EditorView) {
        if (this.pendingUpdate != null) return
        if (typeof requestAnimationFrame !== 'undefined') {
          this.pendingUsesTimeout = false
          this.pendingUpdate = window.requestAnimationFrame(() => {
            this.pendingUpdate = null
            this.updateTasksDecorations(view)
          })
          return
        }
        this.pendingUsesTimeout = true
        this.pendingUpdate = setTimeout(() => {
          this.pendingUpdate = null
          this.updateTasksDecorations(view)
        }, FALLBACK_UPDATE_DELAY_MS)
      }

      private updateTasksDecorations(view: EditorView) {
        const decorations = buildTasksCodeBlockDecorations(view, options)
        view.dispatch({
          effects: setTasksDecorations.of(decorations),
          annotations: Transaction.addToHistory.of(false),
        })
      }
    },
  )
}
