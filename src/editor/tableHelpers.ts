export type TableAlignment = 'left' | 'right' | 'center' | 'default'

export type TableCellRange = {
  from: number
  to: number
}

export type SplitRowResult = {
  cells: string[]
  ranges: TableCellRange[]
}

const ALIGN_CELL_RE = /^:?-{3,}:?$/

function isEscapedPipe(text: string, index: number): boolean {
  if (index <= 0) return false
  return text[index - 1] === '\\'
}

export function splitTableRowWithRanges(lineText: string): SplitRowResult | null {
  if (!lineText.includes('|')) return null

  const firstNonSpace = lineText.search(/\S/)
  const lastNonSpace = lineText.search(/\s*$/)
  const hasLeadingPipe =
    firstNonSpace >= 0 && lineText[firstNonSpace] === '|' && !isEscapedPipe(lineText, firstNonSpace)
  const hasTrailingPipe =
    lastNonSpace > 0 && lineText[lastNonSpace - 1] === '|' && !isEscapedPipe(lineText, lastNonSpace - 1)

  const segments: Array<{ text: string; start: number; end: number }> = []
  let segmentStart = 0

  for (let i = 0; i < lineText.length; i += 1) {
    if (lineText[i] !== '|') continue
    if (isEscapedPipe(lineText, i)) continue
    segments.push({ text: lineText.slice(segmentStart, i), start: segmentStart, end: i })
    segmentStart = i + 1
  }

  segments.push({
    text: lineText.slice(segmentStart),
    start: segmentStart,
    end: lineText.length,
  })

  if (hasLeadingPipe && segments.length > 0 && segments[0]?.text.trim() === '') {
    segments.shift()
  }
  if (hasTrailingPipe && segments.length > 0 && segments[segments.length - 1]?.text.trim() === '') {
    segments.pop()
  }

  const cells: string[] = []
  const ranges: TableCellRange[] = []

  for (const segment of segments) {
    const leading = segment.text.match(/^\s*/)?.[0].length ?? 0
    const trailing = segment.text.match(/\s*$/)?.[0].length ?? 0
    const contentStart = segment.start + leading
    const contentEnd = segment.end - trailing
    const rawContent = segment.text.slice(leading, segment.text.length - trailing)

    cells.push(rawContent)
    ranges.push({
      from: Math.min(contentStart, contentEnd),
      to: Math.max(contentStart, contentEnd),
    })
  }

  return { cells, ranges }
}

export function isTableSeparatorLine(lineText: string): { alignments: TableAlignment[] } | null {
  const split = splitTableRowWithRanges(lineText)
  if (!split) return null

  const alignments: TableAlignment[] = []

  for (const rawCell of split.cells) {
    const trimmed = rawCell.trim()
    if (!ALIGN_CELL_RE.test(trimmed)) return null

    const startsWithColon = trimmed.startsWith(':')
    const endsWithColon = trimmed.endsWith(':')

    if (startsWithColon && endsWithColon) {
      alignments.push('center')
    } else if (endsWithColon) {
      alignments.push('right')
    } else if (startsWithColon) {
      alignments.push('left')
    } else {
      alignments.push('default')
    }
  }

  if (alignments.length === 0) return null
  return { alignments }
}

function padCell(text: string, width: number, alignment: TableAlignment): string {
  const content = text.trim()
  if (alignment === 'right') {
    return content.padStart(width, ' ')
  }
  if (alignment === 'center') {
    const total = Math.max(width - content.length, 0)
    const left = Math.floor(total / 2)
    const right = total - left
    return `${' '.repeat(left)}${content}${' '.repeat(right)}`
  }
  return content.padEnd(width, ' ')
}

export function formatTableLines(rows: string[][], alignments: TableAlignment[]): string[] {
  const columnCount = Math.max(
    alignments.length,
    ...rows.map((row) => row.length),
  )

  const normalizedAlignments: TableAlignment[] = Array.from({ length: columnCount }, (_, index) => {
    return alignments[index] ?? 'default'
  })

  const normalizedRows = rows.map((row) => {
    const normalized = row.map((cell) => cell.trim())
    while (normalized.length < columnCount) normalized.push('')
    return normalized
  })

  const widths = Array.from({ length: columnCount }, () => 3)
  for (const row of normalizedRows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 3, cell.length)
    })
  }

  const header = normalizedRows[0] ?? Array.from({ length: columnCount }, () => '')
  const body = normalizedRows.slice(1)

  const headerLine = `| ${header
    .map((cell, index) => {
      const alignment = normalizedAlignments[index] ?? 'default'
      const paddingAlign: TableAlignment = alignment === 'default' ? 'left' : alignment
      return padCell(cell, widths[index] ?? 3, paddingAlign)
    })
    .join(' | ')} |`

  const delimiterLine = `| ${widths
    .map((width, index) => {
      const alignment = normalizedAlignments[index] ?? 'left'
      const dashes = '-'.repeat(Math.max(3, width))
      if (alignment === 'center') return `:${dashes}:`
      if (alignment === 'right') return `${dashes}:`
      if (alignment === 'left') return `:${dashes}`
      return dashes
    })
    .join(' | ')} |`

  const bodyLines = body.map(
    (row) =>
      `| ${row
        .map((cell, index) => {
          const alignment = normalizedAlignments[index] ?? 'default'
          const paddingAlign: TableAlignment = alignment === 'default' ? 'left' : alignment
          return padCell(cell, widths[index] ?? 3, paddingAlign)
        })
        .join(' | ')} |`,
  )

  return [headerLine, delimiterLine, ...bodyLines]
}
