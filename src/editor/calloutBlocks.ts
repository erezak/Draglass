import type { EditorView } from '@codemirror/view'

type CalloutModifier = 'expanded' | 'collapsed' | null

type CalloutTypeInfo = {
  canonical: string
  aliases: string[]
  defaultTitle: string
  iconPath: string
}

export type CalloutHeader = {
  depth: number
  rawType: string
  canonicalType: string
  title: string
  modifier: CalloutModifier
}

export type CalloutBlock = {
  from: number
  to: number
  startLine: number
  endLine: number
  depth: number
  header: CalloutHeader
}

type QuotePrefixInfo = {
  depth: number
  markerStart: number
  markerEnd: number
}

const MAX_CALLOUT_DEPTH = 2
const MAX_QUOTE_DEPTH = 6

const CALLOUT_TYPES: Record<string, CalloutTypeInfo> = {
  note: {
    canonical: 'note',
    aliases: ['note'],
    defaultTitle: 'Note',
    iconPath: 'M7 3h7a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm0 2v8h7V5H7z',
  },
  abstract: {
    canonical: 'abstract',
    aliases: ['abstract', 'summary', 'tldr'],
    defaultTitle: 'Abstract',
    iconPath: 'M4 5h12v2H4V5zm0 4h12v2H4V9zm0 4h8v2H4v-2z',
  },
  info: {
    canonical: 'info',
    aliases: ['info', 'todo'],
    defaultTitle: 'Info',
    iconPath: 'M8 4h2v2H8V4zm0 4h2v8H8V8z',
  },
  tip: {
    canonical: 'tip',
    aliases: ['tip', 'hint', 'important'],
    defaultTitle: 'Tip',
    iconPath: 'M9 3a4 4 0 0 1 2.5 7.1L11 11.6V13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-1.4l-0.5-0.5A4 4 0 0 1 9 3zm-1 11h2v1H8v-1z',
  },
  success: {
    canonical: 'success',
    aliases: ['success', 'check', 'done'],
    defaultTitle: 'Success',
    iconPath: 'M7.5 12.6L4.8 9.9l1.4-1.4 1.3 1.3 4.3-4.3 1.4 1.4-5.7 5.7z',
  },
  question: {
    canonical: 'question',
    aliases: ['question', 'help', 'faq'],
    defaultTitle: 'Question',
    iconPath: 'M8 5a3 3 0 0 1 4 2.8c0 1.5-1.1 2.2-2 2.7-.7.4-1 .7-1 1.5v1H7v-1c0-1.9 1.2-2.7 2.1-3.1.6-.3.9-.5.9-1.1A1.3 1.3 0 0 0 8 6.3c-.7 0-1.4.4-1.6 1.1L4.5 6.8A3 3 0 0 1 8 5zm-1 10h2v2H7v-2z',
  },
  warning: {
    canonical: 'warning',
    aliases: ['warning', 'caution', 'attention'],
    defaultTitle: 'Warning',
    iconPath: 'M8 4l6 10H2L8 4zm0 3.5-1 4h2l-1-4zm-1 5.5h2v2H7v-2z',
  },
  failure: {
    canonical: 'failure',
    aliases: ['failure', 'fail', 'missing'],
    defaultTitle: 'Failure',
    iconPath: 'M6.1 5L5 6.1 6.9 8 5 9.9 6.1 11 8 9.1 9.9 11 11 9.9 9.1 8 11 6.1 9.9 5 8 6.9 6.1 5z',
  },
  danger: {
    canonical: 'danger',
    aliases: ['danger', 'error'],
    defaultTitle: 'Danger',
    iconPath: 'M8 3l6 12H2L8 3zm-1 4h2v5H7V7zm0 6h2v2H7v-2z',
  },
  bug: {
    canonical: 'bug',
    aliases: ['bug'],
    defaultTitle: 'Bug',
    iconPath: 'M9 4a2 2 0 0 1 2 2v1h2v2h-2v1a4 4 0 0 1-8 0V9H1V7h2V6a2 2 0 0 1 2-2h4zm-4 6a2 2 0 0 0 4 0V7H5v3z',
  },
  example: {
    canonical: 'example',
    aliases: ['example'],
    defaultTitle: 'Example',
    iconPath: 'M4 5h8v2H4V5zm0 4h8v2H4V9zm0 4h12v2H4v-2z',
  },
  quote: {
    canonical: 'quote',
    aliases: ['quote', 'cite'],
    defaultTitle: 'Quote',
    iconPath: 'M5 6h3v4H6v2H4V8a2 2 0 0 1 2-2zm7 0h3v4h-2v2h-2V8a2 2 0 0 1 2-2z',
  },
}

const CALLOUT_ALIAS_MAP = new Map<string, string>()

for (const info of Object.values(CALLOUT_TYPES)) {
  for (const alias of info.aliases) {
    CALLOUT_ALIAS_MAP.set(alias.toLowerCase(), info.canonical)
  }
}

export function getCalloutTypeInfo(canonicalType: string): CalloutTypeInfo | null {
  return CALLOUT_TYPES[canonicalType] ?? null
}

export function resolveCalloutType(rawType: string): {
  canonicalType: string
  isKnown: boolean
  defaultTitle: string
} {
  const normalized = rawType.trim().toLowerCase()
  const canonicalType = CALLOUT_ALIAS_MAP.get(normalized)
  if (canonicalType) {
    return {
      canonicalType,
      isKnown: true,
      defaultTitle: CALLOUT_TYPES[canonicalType]?.defaultTitle ?? 'Note',
    }
  }
  return {
    canonicalType: 'note',
    isKnown: false,
    defaultTitle: CALLOUT_TYPES.note.defaultTitle,
  }
}

function parseQuotePrefix(lineText: string, maxDepth: number): QuotePrefixInfo | null {
  let index = 0
  while (index < lineText.length && index < 3 && lineText[index] === ' ') {
    index += 1
  }
  const markerStart = index
  let depth = 0
  let markerEnd = index

  while (index < lineText.length && depth < maxDepth) {
    if (lineText[index] !== '>') break
    index += 1
    if (lineText[index] === ' ') {
      index += 1
    }
    depth += 1
    markerEnd = index
  }

  if (depth === 0) return null
  return { depth, markerStart, markerEnd }
}

export function getQuoteDepth(lineText: string): number {
  return parseQuotePrefix(lineText, MAX_QUOTE_DEPTH)?.depth ?? 0
}

export function getQuoteMarkerRange(lineText: string, depth: number): { start: number; end: number } | null {
  if (depth <= 0) return null
  const info = parseQuotePrefix(lineText, depth)
  if (!info || info.depth < depth) return null
  return { start: info.markerStart, end: info.markerEnd }
}

const CALLOUT_HEADER_RE = /^\[!([^\]]+)\]([+-])?\s*(.*)$/i

export function parseCalloutHeader(lineText: string): CalloutHeader | null {
  const actualDepth = getQuoteDepth(lineText)
  if (actualDepth === 0 || actualDepth > MAX_CALLOUT_DEPTH) return null
  const prefix = parseQuotePrefix(lineText, actualDepth)
  if (!prefix) return null

  const rest = lineText.slice(prefix.markerEnd)
  const match = CALLOUT_HEADER_RE.exec(rest)
  if (!match) return null

  const rawType = (match[1] ?? '').trim()
  if (!rawType) return null

  const modifierSymbol = match[2] ?? ''
  const modifier: CalloutModifier =
    modifierSymbol === '+' ? 'expanded' : modifierSymbol === '-' ? 'collapsed' : null

  const rawTitle = (match[3] ?? '').trim()
  const resolved = resolveCalloutType(rawType)
  const title = rawTitle || (resolved.isKnown ? resolved.defaultTitle : rawType)

  return {
    depth: prefix.depth,
    rawType,
    canonicalType: resolved.canonicalType,
    title,
    modifier,
  }
}

export function collectCalloutBlock(
  doc: EditorView['state']['doc'],
  startLine: number,
  header: CalloutHeader,
): CalloutBlock | null {
  if (startLine < 1 || startLine > doc.lines) return null
  const start = doc.line(startLine)
  let endLine = startLine

  for (let current = startLine + 1; current <= doc.lines; current += 1) {
    const line = doc.line(current)
    const depth = getQuoteDepth(line.text)
    if (depth === 0 || depth < header.depth) break
    endLine = current
  }

  const end = doc.line(endLine)
  const to = endLine < doc.lines ? end.to + 1 : end.to

  return {
    from: start.from,
    to,
    startLine,
    endLine,
    depth: header.depth,
    header,
  }
}

export function findCalloutStartForLine(
  doc: EditorView['state']['doc'],
  lineNumber: number,
): number | null {
  for (let current = lineNumber; current >= 1; current -= 1) {
    const line = doc.line(current)
    const header = parseCalloutHeader(line.text)
    if (header) {
      const block = collectCalloutBlock(doc, current, header)
      if (block && block.endLine >= lineNumber) return current
      return null
    }
    if (getQuoteDepth(line.text) === 0) return null
  }
  return null
}

function blockIntersectsVisibleRanges(
  block: CalloutBlock,
  ranges: readonly { from: number; to: number }[],
) {
  return ranges.some((range) => block.from <= range.to && block.to >= range.from)
}

export function collectVisibleCalloutBlocks(view: EditorView): CalloutBlock[] {
  const doc = view.state.doc
  const ranges = view.visibleRanges
  const blocks: CalloutBlock[] = []
  const seenStarts = new Set<number>()

  for (const range of ranges) {
    const startLineNumber = doc.lineAt(range.from).number
    const endLineNumber = doc.lineAt(range.to).number

    const openStart = findCalloutStartForLine(doc, startLineNumber)
    if (openStart != null && !seenStarts.has(openStart)) {
      const header = parseCalloutHeader(doc.line(openStart).text)
      if (header) {
        const block = collectCalloutBlock(doc, openStart, header)
        if (block && blockIntersectsVisibleRanges(block, ranges)) {
          blocks.push(block)
          seenStarts.add(openStart)
        }
      }
    }

    for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber += 1) {
      if (seenStarts.has(lineNumber)) continue
      const line = doc.line(lineNumber)
      const header = parseCalloutHeader(line.text)
      if (!header) continue

      const block = collectCalloutBlock(doc, lineNumber, header)
      if (block && blockIntersectsVisibleRanges(block, ranges)) {
        blocks.push(block)
        seenStarts.add(lineNumber)
      }
    }
  }

  return blocks
}

function hashString(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function generateCollapseKey(
  noteRelPath: string,
  lineNumber: number,
  header: CalloutHeader,
): string {
  const signature = `${header.rawType}|${header.title}|${header.modifier ?? ''}`
  return `${noteRelPath}:${lineNumber}:${hashString(signature)}`
}

export function getCalloutDefaultCollapsed(modifier: CalloutModifier): boolean {
  if (modifier === 'collapsed') return true
  if (modifier === 'expanded') return false
  return false
}
