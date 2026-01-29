import type { EditorView } from '@codemirror/view'

const CODE_FENCE_RE = /^\s{0,3}```\s*([\w-]+)?\s*$/

export const MERMAID_LANG = 'mermaid'

export type MermaidBlock = {
  from: number
  to: number
  content: string
  editPos: number
  startLine: number
}

export function getFenceLang(lineText: string): string | null {
  const match = CODE_FENCE_RE.exec(lineText)
  if (!match) return null
  return (match[1] ?? '').toLowerCase()
}

export function findMermaidStartForLine(
  doc: EditorView['state']['doc'],
  lineNumber: number,
): number | null {
  for (let current = lineNumber; current >= 1; current -= 1) {
    const line = doc.line(current)
    const lang = getFenceLang(line.text)
    if (lang == null) continue
    if (lang === MERMAID_LANG) return current
    return null
  }
  return null
}

function collectMermaidBlock(doc: EditorView['state']['doc'], startLine: number): MermaidBlock | null {
  const start = doc.line(startLine)
  const startLang = getFenceLang(start.text)
  if (startLang !== MERMAID_LANG) return null

  const contentLines: string[] = []
  for (let current = startLine + 1; current <= doc.lines; current += 1) {
    const line = doc.line(current)
    const lang = getFenceLang(line.text)
    if (lang != null) {
      const from = start.from
      const to = current < doc.lines ? line.to + 1 : line.to
      const editPos = startLine < doc.lines ? start.to + 1 : start.to
      return {
        from,
        to,
        content: contentLines.join('\n'),
        editPos,
        startLine,
      }
    }
    contentLines.push(line.text)
  }

  return null
}

function blockIntersectsVisibleRanges(
  block: MermaidBlock,
  ranges: readonly { from: number; to: number }[],
) {
  return ranges.some((range) => block.from <= range.to && block.to >= range.from)
}

export function collectVisibleMermaidBlocks(view: EditorView): MermaidBlock[] {
  const doc = view.state.doc
  const ranges = view.visibleRanges
  const blocks: MermaidBlock[] = []
  const seenStarts = new Set<number>()

  for (const range of ranges) {
    const startLineNumber = doc.lineAt(range.from).number
    const endLineNumber = doc.lineAt(range.to).number

    const openStart = findMermaidStartForLine(doc, startLineNumber)
    if (openStart != null && !seenStarts.has(openStart)) {
      const block = collectMermaidBlock(doc, openStart)
      if (block && blockIntersectsVisibleRanges(block, ranges)) {
        blocks.push(block)
        seenStarts.add(openStart)
      }
    }

    for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber += 1) {
      if (seenStarts.has(lineNumber)) continue
      const line = doc.line(lineNumber)
      const lang = getFenceLang(line.text)
      if (lang !== MERMAID_LANG) continue

      const block = collectMermaidBlock(doc, lineNumber)
      if (block && blockIntersectsVisibleRanges(block, ranges)) {
        blocks.push(block)
        seenStarts.add(lineNumber)
      }
    }
  }

  return blocks
}

export function findMermaidBlockAtLine(
  doc: EditorView['state']['doc'],
  lineNumber: number,
): MermaidBlock | null {
  if (lineNumber < 1 || lineNumber > doc.lines) return null
  const line = doc.line(lineNumber)
  const lang = getFenceLang(line.text)
  if (lang !== MERMAID_LANG) return null
  return collectMermaidBlock(doc, lineNumber)
}

export function getMermaidEnterPosition(
  block: MermaidBlock,
  doc: EditorView['state']['doc'],
): number | null {
  const firstContentLine = block.startLine + 1
  if (firstContentLine > doc.lines) return block.from
  const line = doc.line(firstContentLine)
  return line.from
}
