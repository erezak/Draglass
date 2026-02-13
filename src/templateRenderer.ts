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
    const type = inferEntryType(substitutedValue)
    return {
      key: entry.key,
      value: normalizeEntryValue(substitutedValue, type),
      type,
    }
  })

  const bodyWithVariables = substituteKnownVariables(parsed.body, context)
  const cursor = stripCursorMarkers(bodyWithVariables)

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
