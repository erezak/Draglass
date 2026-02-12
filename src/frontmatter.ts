export type FrontmatterEntry = {
  key: string
  value: string
  type: 'text' | 'boolean' | 'number' | 'date' | 'datetime'
}

type FrontmatterParseResult = {
  entries: FrontmatterEntry[]
  body: string
  hasFrontmatter: boolean
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const NUMBER_RE = /^-?\d+(?:\.\d+)?$/

function coerceType(value: string): FrontmatterEntry['type'] {
  const trimmed = value.trim()
  if (trimmed.length === 0) return 'text'
  if (/^(true|false)$/i.test(trimmed)) return 'boolean'
  if (NUMBER_RE.test(trimmed)) return 'number'
  if (DATE_RE.test(trimmed)) return 'date'
  if (DATETIME_RE.test(trimmed)) return 'datetime'
  return 'text'
}

function stripQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function parseFrontmatter(noteText: string): FrontmatterParseResult {
  const match = noteText.match(FRONTMATTER_RE)
  if (!match) {
    return { entries: [], body: noteText, hasFrontmatter: false }
  }

  const raw = match[1] ?? ''
  const body = noteText.slice(match[0].length)
  const entries: FrontmatterEntry[] = []

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).trim()
    if (!key) continue
    const rawValue = stripQuotes(line.slice(colonIndex + 1))
    entries.push({
      key,
      value: rawValue,
      type: coerceType(rawValue),
    })
  }

  return { entries, body, hasFrontmatter: true }
}

function formatValue(entry: FrontmatterEntry): string {
  const trimmed = entry.value.trim()
  if (!trimmed) return ''
  if (entry.type === 'boolean') {
    return trimmed.toLowerCase() === 'true' ? 'true' : 'false'
  }
  if (entry.type === 'number') {
    return trimmed
  }
  if (entry.type === 'date') {
    return trimmed
  }
  if (entry.type === 'datetime') {
    return trimmed
  }

  if (/[:#\n]/.test(trimmed) || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return JSON.stringify(trimmed)
  }
  return trimmed
}

export function buildFrontmatter(noteText: string, entries: FrontmatterEntry[]): string {
  const { body, hasFrontmatter } = parseFrontmatter(noteText)
  if (entries.length === 0) {
    return hasFrontmatter ? body.replace(/^\n+/, '') : noteText
  }

  const lines = entries.map((entry) => {
    const formatted = formatValue(entry)
    return formatted.length > 0 ? `${entry.key}: ${formatted}` : `${entry.key}:`
  })

  const frontmatter = `---\n${lines.join('\n')}\n---\n`
  const trimmedBody = body.replace(/^\n+/, '')
  return `${frontmatter}${trimmedBody}`
}

export function normalizeEntryValue(value: string, type: FrontmatterEntry['type']): string {
  if (type === 'boolean') {
    return value.toLowerCase() === 'true' ? 'true' : 'false'
  }
  return value
}

export function inferEntryType(value: string): FrontmatterEntry['type'] {
  return coerceType(value)
}
