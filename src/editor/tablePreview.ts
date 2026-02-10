import { Annotation, RangeSetBuilder, StateEffect, StateField, Transaction, type Extension } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'

import { shouldHideMarkup } from './livePreviewHelpers'
import {
  formatTableLines,
  isTableSeparatorLine,
  splitTableRowWithRanges,
  type TableAlignment,
  type TableCellRange,
} from './tableHelpers'

const setTableDecorations = StateEffect.define<DecorationSet>()
const tableFormatAnnotation = Annotation.define<boolean>()

export const tableDecorationsField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTableDecorations)) {
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

type TableBlock = {
  startLine: number
  endLine: number
  from: number
  to: number
  rows: string[][]
  alignments: TableAlignment[]
  cellRanges: Array<Array<TableCellRange>>
}

const INLINE_TOKEN_RE = /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g

function renderInlineMarkdown(text: string, container: HTMLElement) {
  const fragment = document.createDocumentFragment()
  let lastIndex = 0

  for (const match of text.matchAll(INLINE_TOKEN_RE)) {
    if (match.index == null) continue
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
    }

    const code = match[1]
    const bold = match[2] ?? match[3]
    const italic = match[4] ?? match[5]

    if (code != null) {
      const codeEl = document.createElement('code')
      codeEl.textContent = code
      fragment.appendChild(codeEl)
    } else if (bold != null) {
      const strong = document.createElement('strong')
      strong.textContent = bold
      fragment.appendChild(strong)
    } else if (italic != null) {
      const em = document.createElement('em')
      em.textContent = italic
      fragment.appendChild(em)
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
  }

  container.replaceChildren(fragment)
}

function isFenceLine(lineText: string): boolean {
  return /^\s{0,3}```/.test(lineText)
}

function isInsideFence(doc: EditorView['state']['doc'], lineNumber: number): boolean {
  let inFence = false
  for (let current = 1; current <= lineNumber; current += 1) {
    const line = doc.line(current)
    if (isFenceLine(line.text)) {
      inFence = !inFence
    }
  }
  return inFence
}

function isTableRowLine(lineText: string): boolean {
  return lineText.includes('|')
}

function findTableStartForLine(doc: EditorView['state']['doc'], lineNumber: number): number | null {
  if (lineNumber < 1 || lineNumber > doc.lines) return null
  if (isInsideFence(doc, lineNumber)) return null

  for (let current = lineNumber; current >= 1; current -= 1) {
    const line = doc.line(current)
    if (line.text.trim().length === 0) return null
    if (!isTableRowLine(line.text)) return null
    if (current + 1 <= doc.lines) {
      const next = doc.line(current + 1)
      if (isTableSeparatorLine(next.text) && isTableRowLine(line.text)) {
        return current
      }
    }
  }
  return null
}

function collectTableBlock(
  doc: EditorView['state']['doc'],
  startLine: number,
): TableBlock | null {
  if (startLine < 1 || startLine >= doc.lines) return null
  if (isInsideFence(doc, startLine)) return null

  const headerLine = doc.line(startLine)
  const dividerLine = doc.line(startLine + 1)

  if (!isTableRowLine(headerLine.text)) return null
  const dividerInfo = isTableSeparatorLine(dividerLine.text)
  if (!dividerInfo) return null

  const headerSplit = splitTableRowWithRanges(headerLine.text)
  if (!headerSplit) return null

  const rows: string[][] = [headerSplit.cells]
  const cellRanges: Array<Array<TableCellRange>> = [
    headerSplit.ranges.map((range) => ({
      from: headerLine.from + range.from,
      to: headerLine.from + range.to,
    })),
  ]
  const rowLineNumbers: number[] = [startLine]

  let endLine = startLine + 1

  for (let current = startLine + 2; current <= doc.lines; current += 1) {
    const line = doc.line(current)
    if (line.text.trim().length === 0) break
    if (!isTableRowLine(line.text)) break
    if (isTableSeparatorLine(line.text)) break

    const split = splitTableRowWithRanges(line.text)
    if (!split) break

    rows.push(split.cells)
    cellRanges.push(
      split.ranges.map((range) => ({
        from: line.from + range.from,
        to: line.from + range.to,
      })),
    )
    rowLineNumbers.push(current)
    endLine = current
  }

  const columns = Math.max(
    dividerInfo.alignments.length,
    ...rows.map((row) => row.length),
  )

  const alignments = Array.from({ length: columns }, (_, index) => {
    return dividerInfo.alignments[index] ?? 'default'
  })

  const normalizedRows = rows.map((row) => {
    const normalized = row.map((cell) => cell.trim())
    while (normalized.length < columns) normalized.push('')
    return normalized
  })

  const normalizedRanges = cellRanges.map((rowRanges, rowIndex) => {
    const normalized = [...rowRanges]
    while (normalized.length < columns) {
      const lineNumber = rowLineNumbers[rowIndex] ?? startLine
      const line = doc.line(lineNumber)
      normalized.push({ from: line.to, to: line.to })
    }
    return normalized
  })

  const from = headerLine.from
  const endLineInfo = doc.line(endLine)
  const to = endLine < doc.lines ? endLineInfo.to + 1 : endLineInfo.to

  return {
    startLine,
    endLine,
    from,
    to,
    rows: normalizedRows,
    alignments,
    cellRanges: normalizedRanges,
  }
}

function blockIntersectsVisibleRanges(
  block: TableBlock,
  ranges: readonly { from: number; to: number }[],
): boolean {
  return ranges.some((range) => block.from <= range.to && block.to >= range.from)
}

const VIEWPORT_LINE_BUFFER = 12

function getExpandedVisibleRanges(view: EditorView): Array<{ from: number; to: number; startLine: number; endLine: number }> {
  const doc = view.state.doc
  return view.visibleRanges.map((range) => {
    const startLine = Math.max(1, doc.lineAt(range.from).number - VIEWPORT_LINE_BUFFER)
    const endLine = Math.min(doc.lines, doc.lineAt(range.to).number + VIEWPORT_LINE_BUFFER)
    const from = doc.line(startLine).from
    const to = doc.line(endLine).to
    return { from, to, startLine, endLine }
  })
}

function collectVisibleTableBlocks(view: EditorView): TableBlock[] {
  const doc = view.state.doc
  const ranges = getExpandedVisibleRanges(view)
  const blocks: TableBlock[] = []
  const seenStarts = new Set<number>()

  for (const range of ranges) {
    const startLineNumber = range.startLine
    const endLineNumber = range.endLine

    const openStart = findTableStartForLine(doc, startLineNumber)
    if (openStart != null && !seenStarts.has(openStart)) {
      const block = collectTableBlock(doc, openStart)
      if (block && blockIntersectsVisibleRanges(block, ranges)) {
        blocks.push(block)
        seenStarts.add(openStart)
      }
    }

    for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber += 1) {
      if (seenStarts.has(lineNumber)) continue
      const block = collectTableBlock(doc, lineNumber)
      if (block && blockIntersectsVisibleRanges(block, ranges)) {
        blocks.push(block)
        seenStarts.add(lineNumber)
      }
    }
  }

  return blocks
}

function buildTableDecorations(view: EditorView): DecorationSet {
  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = []
  const selections = view.state.selection.ranges

  const selectionIntersects = (from: number, to: number) =>
    selections.some((range) => shouldHideMarkup(from, to, range.from, range.to) === false)

  const blocks = collectVisibleTableBlocks(view)

  for (const block of blocks) {
    if (selectionIntersects(block.from, block.to)) continue
    decorations.push({
      from: block.from,
      to: block.to,
      decoration: Decoration.replace({
        widget: new TableWidget(block),
        block: true,
      }),
    })
  }

  const builder = new RangeSetBuilder<Decoration>()
  decorations
    .sort((a, b) => (a.from === b.from ? a.to - b.to : a.from - b.from))
    .forEach((entry) => builder.add(entry.from, entry.to, entry.decoration))
  return builder.finish()
}

type TableMenuItem = {
  label: string
  action: () => void
  disabled?: boolean
}

class TableWidget extends WidgetType {
  private readonly block: TableBlock
  private menuEl: HTMLDivElement | null = null
  private menuCleanup: (() => void) | null = null

  constructor(block: TableBlock) {
    super()
    this.block = block
  }

  eq(other: TableWidget) {
    return (
      this.block.from === other.block.from &&
      this.block.to === other.block.to &&
      JSON.stringify(this.block.rows) === JSON.stringify(other.block.rows)
    )
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement('div')
    wrapper.className = 'cm-livePreview-tableWrap'

    const table = document.createElement('table')
    table.className = 'cm-livePreview-table'

    const thead = document.createElement('thead')
    const tbody = document.createElement('tbody')

    const headerRow = this.block.rows[0] ?? []
    const headTr = document.createElement('tr')
    headerRow.forEach((cell, colIndex) => {
      const th = document.createElement('th')
      renderInlineMarkdown(cell, th)
      th.dataset.row = '0'
      th.dataset.col = String(colIndex)
      headTr.appendChild(th)
    })
    thead.appendChild(headTr)

    const bodyRows = this.block.rows.slice(1)
    bodyRows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr')
      row.forEach((cell, colIndex) => {
        const td = document.createElement('td')
        renderInlineMarkdown(cell, td)
        td.dataset.row = String(rowIndex + 1)
        td.dataset.col = String(colIndex)
        tr.appendChild(td)
      })
      tbody.appendChild(tr)
    })

    table.appendChild(thead)
    table.appendChild(tbody)

    const ghostCol = document.createElement('div')
    ghostCol.className = 'cm-livePreview-tableGhostCol'
    const ghostRow = document.createElement('div')
    ghostRow.className = 'cm-livePreview-tableGhostRow'

    wrapper.appendChild(table)
    wrapper.appendChild(ghostCol)
    wrapper.appendChild(ghostRow)

    const updateGhosts = (event: MouseEvent) => {
      const rect = table.getBoundingClientRect()
      const distanceRight = rect.right - event.clientX
      const distanceBottom = rect.bottom - event.clientY
      const threshold = 12

      const showCol = distanceRight >= -threshold && distanceRight <= threshold
      const showRow = distanceBottom >= -threshold && distanceBottom <= threshold

      wrapper.classList.toggle('cm-livePreview-tableWrap--ghostCol', showCol)
      wrapper.classList.toggle('cm-livePreview-tableWrap--ghostRow', showRow)

      if (showCol) {
        const lastCell = table.querySelector('tr:last-child td:last-child, tr:last-child th:last-child')
        const cellWidth = lastCell?.getBoundingClientRect().width ?? 90
        wrapper.style.setProperty('--table-ghost-col-width', `${Math.max(64, cellWidth)}px`)
      }

      if (showRow) {
        const lastRow = table.querySelector('tr:last-child')
        const rowHeight = lastRow?.getBoundingClientRect().height ?? 28
        wrapper.style.setProperty('--table-ghost-row-height', `${Math.max(24, rowHeight)}px`)
      }
    }

    const hideGhosts = () => {
      wrapper.classList.remove('cm-livePreview-tableWrap--ghostCol')
      wrapper.classList.remove('cm-livePreview-tableWrap--ghostRow')
    }

    wrapper.addEventListener('mousemove', updateGhosts)
    wrapper.addEventListener('mouseleave', hideGhosts)

    const focusCell = (rowIndex: number, colIndex: number) => {
      const rowRanges = this.block.cellRanges[rowIndex]
      const range = rowRanges?.[colIndex]
      if (!range) return
      view.dispatch({
        selection: { anchor: range.from, head: range.to },
        scrollIntoView: true,
      })
      view.focus()
    }

    table.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const cell = target.closest('td, th') as HTMLElement | null
      if (!cell) return
      const rowIndex = Number(cell.dataset.row ?? -1)
      const colIndex = Number(cell.dataset.col ?? -1)
      if (rowIndex < 0 || colIndex < 0) return
      event.preventDefault()
      event.stopPropagation()
      focusCell(rowIndex, colIndex)
    })

    table.addEventListener('contextmenu', (event) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const cell = target.closest('td, th') as HTMLElement | null
      if (!cell) return

      const rowIndex = Number(cell.dataset.row ?? -1)
      const colIndex = Number(cell.dataset.col ?? -1)
      if (rowIndex < 0 || colIndex < 0) return

      event.preventDefault()
      event.stopPropagation()

      this.openMenu(view, event.clientX, event.clientY, rowIndex, colIndex)
    })

    return wrapper
  }

  destroy() {
    this.closeMenu()
  }

  ignoreEvent() {
    return false
  }

  private openMenu(
    view: EditorView,
    x: number,
    y: number,
    rowIndex: number,
    colIndex: number,
  ) {
    this.closeMenu()

    const menu = document.createElement('div')
    menu.className = 'cm-livePreview-tableMenu'
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`

    const columns = Math.max(this.block.alignments.length, ...this.block.rows.map((row) => row.length))
    const canDeleteRow = rowIndex > 0 && this.block.rows.length > 1
    const canDeleteColumn = columns > 1

    const items: TableMenuItem[] = [
      {
        label: 'Insert row above',
        action: () => this.insertRow(view, rowIndex <= 0 ? 1 : rowIndex),
      },
      {
        label: 'Insert row below',
        action: () => this.insertRow(view, rowIndex + 1),
      },
      {
        label: 'Delete row',
        action: () => this.deleteRow(view, rowIndex),
        disabled: !canDeleteRow,
      },
      {
        label: 'Insert column left',
        action: () => this.insertColumn(view, colIndex),
      },
      {
        label: 'Insert column right',
        action: () => this.insertColumn(view, colIndex + 1),
      },
      {
        label: 'Delete column',
        action: () => this.deleteColumn(view, colIndex),
        disabled: !canDeleteColumn,
      },
    ]

    for (const item of items) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'cm-livePreview-tableMenuItem'
      button.textContent = item.label
      if (item.disabled) {
        button.disabled = true
        button.classList.add('cm-livePreview-tableMenuItem--disabled')
      } else {
        button.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          item.action()
          this.closeMenu()
        })
      }
      menu.appendChild(button)
    }

    document.body.appendChild(menu)

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menu.contains(event.target as Node)) {
        this.closeMenu()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.closeMenu()
      }
    }

    window.addEventListener('mousedown', handleOutsideClick, true)
    window.addEventListener('keydown', handleKeyDown, true)

    this.menuEl = menu
    this.menuCleanup = () => {
      window.removeEventListener('mousedown', handleOutsideClick, true)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }

  private closeMenu() {
    if (this.menuCleanup) this.menuCleanup()
    if (this.menuEl) this.menuEl.remove()
    this.menuEl = null
    this.menuCleanup = null
  }

  private insertRow(view: EditorView, insertIndex: number) {
    const rows = this.block.rows.map((row) => [...row])
    const columns = Math.max(this.block.alignments.length, ...rows.map((row) => row.length))
    const newRow = Array.from({ length: columns }, () => '')
    rows.splice(insertIndex, 0, newRow)
    this.applyTableMutation(view, rows, this.block.alignments)
  }

  private deleteRow(view: EditorView, rowIndex: number) {
    if (rowIndex <= 0) return
    const rows = this.block.rows.map((row) => [...row])
    if (rows.length <= 1) return
    rows.splice(rowIndex, 1)
    this.applyTableMutation(view, rows, this.block.alignments)
  }

  private insertColumn(view: EditorView, colIndex: number) {
    const rows = this.block.rows.map((row) => [...row])
    for (const row of rows) {
      row.splice(colIndex, 0, '')
    }
    const alignments = [...this.block.alignments]
    alignments.splice(colIndex, 0, 'default')
    this.applyTableMutation(view, rows, alignments)
  }

  private deleteColumn(view: EditorView, colIndex: number) {
    const rows = this.block.rows.map((row) => [...row])
    const columns = Math.max(this.block.alignments.length, ...rows.map((row) => row.length))
    if (columns <= 1) return
    for (const row of rows) {
      if (colIndex < row.length) row.splice(colIndex, 1)
    }
    const alignments = [...this.block.alignments]
    if (colIndex < alignments.length) alignments.splice(colIndex, 1)
    this.applyTableMutation(view, rows, alignments)
  }

  private applyTableMutation(view: EditorView, rows: string[][], alignments: TableAlignment[]) {
    const formatted = formatTableLines(rows, alignments)
    const doc = view.state.doc
    const startLine = doc.line(this.block.startLine)
    const endLine = doc.line(this.block.endLine)
    const from = startLine.from
    const to = this.block.endLine < doc.lines ? endLine.to + 1 : endLine.to

    let insert = formatted.join('\n')
    if (this.block.endLine < doc.lines) insert += '\n'

    view.dispatch({
      changes: { from, to, insert },
      annotations: tableFormatAnnotation.of(true),
    })
  }
}

function formatTableBlock(view: EditorView, block: TableBlock) {
  const formatted = formatTableLines(block.rows, block.alignments)
  const currentText = view.state.doc.sliceString(block.from, block.to)

  let nextText = formatted.join('\n')
  if (block.endLine < view.state.doc.lines) nextText += '\n'

  if (currentText === nextText) return

  view.dispatch({
    changes: { from: block.from, to: block.to, insert: nextText },
    annotations: tableFormatAnnotation.of(true),
  })
}

export function createTablePreviewPlugin(): Extension {
  return ViewPlugin.fromClass(
    class {
      private pendingUpdate: number | null = null
      private pendingUsesTimeout = false
      private pendingFormat: number | null = null

      constructor(view: EditorView) {
        this.scheduleUpdate(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.scheduleUpdate(update.view)
        }

        if (update.docChanged && !update.transactions.some((tr) => tr.annotation(tableFormatAnnotation))) {
          this.scheduleFormat(update)
        }
      }

      destroy() {
        if (this.pendingUpdate != null) {
          if (this.pendingUsesTimeout) {
            clearTimeout(this.pendingUpdate)
          } else {
            cancelAnimationFrame(this.pendingUpdate)
          }
          this.pendingUpdate = null
        }

        if (this.pendingFormat != null) {
          clearTimeout(this.pendingFormat)
          this.pendingFormat = null
        }
      }

      private scheduleUpdate(view: EditorView) {
        if (this.pendingUpdate != null) return

        if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
          this.pendingUsesTimeout = false
          this.pendingUpdate = window.requestAnimationFrame(() => {
            this.pendingUpdate = null
            this.updateTableDecorations(view)
          })
          return
        }

        this.pendingUsesTimeout = true
        this.pendingUpdate = setTimeout(() => {
          this.pendingUpdate = null
          this.updateTableDecorations(view)
        }, 16) as unknown as number
      }

      private updateTableDecorations(view: EditorView) {
        const decorations = buildTableDecorations(view)
        view.dispatch({
          effects: setTableDecorations.of(decorations),
          annotations: Transaction.addToHistory.of(false),
        })
      }

      private scheduleFormat(update: ViewUpdate) {
        if (this.pendingFormat != null) return

        this.pendingFormat = window.setTimeout(() => {
          this.pendingFormat = null
          const starts = this.collectAffectedTableStarts(update)
          for (const start of starts) {
            const block = collectTableBlock(update.view.state.doc, start)
            if (block) {
              formatTableBlock(update.view, block)
            }
          }
        }, 160)
      }

      private collectAffectedTableStarts(update: ViewUpdate): number[] {
        const doc = update.view.state.doc
        const starts = new Set<number>()

        update.changes.iterChanges((_, __, fromB, toB) => {
          const startLine = doc.lineAt(fromB).number
          const endLine = doc.lineAt(toB).number
          const scanStart = Math.max(1, startLine - 1)
          const scanEnd = Math.min(doc.lines, endLine + 1)

          for (let line = scanStart; line <= scanEnd; line += 1) {
            const start = findTableStartForLine(doc, line)
            if (start != null) starts.add(start)
          }
        })

        return Array.from(starts.values())
      }
    },
  )
}
