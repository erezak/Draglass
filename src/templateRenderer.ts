import {
  buildFrontmatter,
  inferEntryType,
  normalizeEntryValue,
  parseFrontmatter,
  type FrontmatterEntry,
} from './frontmatter'

const CURSOR_MARKER = '{{cursor}}'

export type TemplateRenderContext = {
  title: string
  now?: Date
  evaluateCreateExpressions?: boolean
}

export type RenderedTemplate = {
  frontmatterEntries: FrontmatterEntry[]
  bodyText: string
  cursorOffsetInBody: number | null
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDate(now: Date): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

function formatTime(now: Date): string {
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`
}

function substituteKnownVariables(text: string, context: TemplateRenderContext): string {
  const now = context.now ?? new Date()
  const vars: Record<string, string> = {
    date: formatDate(now),
    time: formatTime(now),
    datetime: `${formatDate(now)} ${formatTime(now)}`,
    title: context.title,
  }

  return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, variable: string) => {
    const replacement = vars[variable.toLowerCase()]
    return replacement == null ? match : replacement
  })
}

function formatWithPattern(date: Date, pattern: string): string {
  const weekdayLong = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)
  const monthLong = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date)
  const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)
  const replacements: Array<[string, string]> = [
    ['YYYY', String(date.getFullYear())],
    ['MMMM', monthLong],
    ['MMM', monthShort],
    ['MM', pad2(date.getMonth() + 1)],
    ['DD', pad2(date.getDate())],
    ['HH', pad2(date.getHours())],
    ['mm', pad2(date.getMinutes())],
    ['dddd', weekdayLong],
    ['D', String(date.getDate())],
  ]

  let output = pattern
  for (const [token, value] of replacements) {
    output = output.replace(new RegExp(token, 'g'), value)
  }
  return output
}

function parseDateWithPattern(value: string, pattern: string): Date | null {
  const tokens = ['YYYY', 'MM', 'DD', 'HH', 'mm']
  let regexSource = ''
  const seenTokens: string[] = []

  for (let i = 0; i < pattern.length;) {
    const token = tokens.find((candidate) => pattern.startsWith(candidate, i))
    if (token) {
      seenTokens.push(token)
      regexSource += token === 'YYYY' ? '(\\d{4})' : '(\\d{1,2})'
      i += token.length
      continue
    }
    const char = pattern[i]
    regexSource += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    i += 1
  }

  const match = value.match(new RegExp(`^${regexSource}$`))
  if (!match) return null

  let year = 1970
  let month = 1
  let day = 1
  let hours = 0
  let minutes = 0

  for (let i = 0; i < seenTokens.length; i += 1) {
    const token = seenTokens[i]
    const parsed = Number(match[i + 1])
    if (!Number.isFinite(parsed)) return null
    if (token === 'YYYY') year = parsed
    else if (token === 'MM') month = parsed
    else if (token === 'DD') day = parsed
    else if (token === 'HH') hours = parsed
    else if (token === 'mm') minutes = parsed
  }

  const date = new Date(year, month - 1, day, hours, minutes)
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hours
    || date.getMinutes() !== minutes
  ) {
    return null
  }
  return date
}

function evaluateCreateExpression(expression: string, context: TemplateRenderContext): string | null {
  const now = context.now ?? new Date()
  const trimmed = expression.trim()

  const nowMatch = trimmed.match(/^tp\.date\.now\((['"])(.*?)\1\)$/)
  if (nowMatch) {
    return formatWithPattern(now, nowMatch[2])
  }

  const momentMatch = trimmed.match(
    /^moment\(\s*tp\.file\.title\s*,\s*(['"])(.*?)\1\s*\)\.format\(\s*(['"])(.*?)\3\s*\)$/,
  )
  if (momentMatch) {
    const parsedTitleDate = parseDateWithPattern(context.title, momentMatch[2])
    if (!parsedTitleDate) return null
    return formatWithPattern(parsedTitleDate, momentMatch[4])
  }

  return null
}

function substituteCreateExpressions(text: string, context: TemplateRenderContext): string {
  return text.replace(/<%\s*([\s\S]*?)\s*%>/g, (match, expression: string) => {
    const evaluated = evaluateCreateExpression(expression, context)
    return evaluated ?? match
  })
}

function stripCursorMarkers(text: string): { text: string; cursorOffset: number | null } {
  let cursorOffset: number | null = null
  let output = ''
  let start = 0

  while (true) {
    const markerAt = text.indexOf(CURSOR_MARKER, start)
    if (markerAt === -1) break
    output += text.slice(start, markerAt)
    if (cursorOffset == null) {
      cursorOffset = output.length
    }
    start = markerAt + CURSOR_MARKER.length
  }

  output += text.slice(start)
  return { text: output, cursorOffset }
}

export function renderTemplate(templateText: string, context: TemplateRenderContext): RenderedTemplate {
  const parsed = parseFrontmatter(templateText)

  const frontmatterEntries = parsed.entries.map((entry) => {
    const substitutedValue = substituteKnownVariables(entry.value, context)
    const evaluatedValue = context.evaluateCreateExpressions
      ? substituteCreateExpressions(substitutedValue, context)
      : substitutedValue
    const type = inferEntryType(evaluatedValue)
    return {
      key: entry.key,
      value: normalizeEntryValue(evaluatedValue, type),
      type,
    }
  })

  const bodyWithVariables = substituteKnownVariables(parsed.body, context)
  const bodyWithExpressions = context.evaluateCreateExpressions
    ? substituteCreateExpressions(bodyWithVariables, context)
    : bodyWithVariables
  const cursor = stripCursorMarkers(bodyWithExpressions)

  return {
    frontmatterEntries,
    bodyText: cursor.text,
    cursorOffsetInBody: cursor.cursorOffset,
  }
}

export function mergeFrontmatterForTemplateInsert(
  existingText: string,
  templateFrontmatter: FrontmatterEntry[],
): {
  textWithMergedFrontmatter: string
  previousFrontmatterLength: number
  nextFrontmatterLength: number
} {
  const parsedExisting = parseFrontmatter(existingText)
  const previousFrontmatterLength = existingText.length - parsedExisting.body.length

  const mergedEntries = parsedExisting.hasFrontmatter
    ? [
        ...parsedExisting.entries,
        ...templateFrontmatter.filter(
          (templateEntry) =>
            !parsedExisting.entries.some((existingEntry) => existingEntry.key === templateEntry.key),
        ),
      ]
    : templateFrontmatter

  const textWithMergedFrontmatter = buildFrontmatter(existingText, mergedEntries)
  const nextParsed = parseFrontmatter(textWithMergedFrontmatter)
  const nextFrontmatterLength = textWithMergedFrontmatter.length - nextParsed.body.length

  return {
    textWithMergedFrontmatter,
    previousFrontmatterLength,
    nextFrontmatterLength,
  }
}
