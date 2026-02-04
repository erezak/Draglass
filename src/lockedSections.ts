/**
 * Locked Sections Parser
 *
 * Parses Markdown documents to identify locked sections.
 *
 * Rules:
 * - A section is locked if its ATX heading line contains `{locked}` (case-insensitive).
 * - `{locked}` must appear on the heading line, typically at the end.
 * - Locking a heading locks that heading and all content until the next heading
 *   of the same or higher level (i.e., heading level number <= current).
 * - Nested headings under a locked parent are implicitly locked by inheritance.
 * - The `{locked}` marker is stripped from the display title but preserved in source.
 */

export type HeadingSection = {
  /** Heading level (1-6) */
  level: number
  /** 1-based line number where heading starts */
  fromLine: number
  /** 1-based line number where section ends (exclusive - next heading or EOF) */
  toLineExclusive: number
  /** Character offset of heading start (0-based) */
  headerFrom: number
  /** Character offset of heading end (0-based, exclusive) */
  headerTo: number
  /** Title text with {locked} marker stripped */
  titleText: string
  /** Raw title text as it appears in source */
  rawTitleText: string
  /** True if this heading itself has {locked} marker */
  isExplicitlyLocked: boolean
  /** True if locked due to being under a locked parent */
  isLockedByParent: boolean
}

export type LockedBodyRange = {
  /** 1-based line number where body starts (line after heading) */
  fromLine: number
  /** 1-based line number where body ends (exclusive) */
  toLineExclusive: number
  /** Character offset of body start (0-based) */
  from: number
  /** Character offset of body end (0-based, exclusive) */
  to: number
}

export type ParsedSections = {
  sections: HeadingSection[]
  lockedBodyRanges: LockedBodyRange[]
}

// ATX heading pattern: optional leading whitespace, 1-6 #, followed by space and content
const ATX_HEADING_RE = /^\s*(#{1,6})\s+(.*)$/

// Locked marker pattern (case-insensitive)
const LOCKED_MARKER_RE = /\{locked\}/gi

/**
 * Strip the {locked} marker from a heading title.
 * Returns the cleaned title and whether a marker was found.
 */
export function stripLockedMarker(rawTitle: string): { title: string; hasLocked: boolean } {
  const hasLocked = LOCKED_MARKER_RE.test(rawTitle)
  // Reset regex lastIndex since we used the global flag
  LOCKED_MARKER_RE.lastIndex = 0
  const title = rawTitle.replace(LOCKED_MARKER_RE, '').trim()
  return { title, hasLocked }
}

/**
 * Parse a single line to check if it's an ATX heading.
 * Returns null if not a heading.
 */
function parseHeadingLine(line: string): { level: number; rawTitle: string } | null {
  const match = ATX_HEADING_RE.exec(line)
  if (!match) return null

  const hashes = match[1] ?? ''
  const rawTitle = (match[2] ?? '').trim()
  return { level: hashes.length, rawTitle }
}

/**
 * Parse a Markdown document into heading sections with locked status.
 *
 * @param text - Full document text
 * @returns Parsed sections and locked body ranges
 */
export function parseLockedSections(text: string): ParsedSections {
  const lines = text.split('\n')
  const sections: HeadingSection[] = []
  const lockedBodyRanges: LockedBodyRange[] = []

  // First pass: collect all headings
  type HeadingInfo = {
    lineNumber: number
    offset: number
    level: number
    rawTitle: string
    lineText: string
  }

  const headings: HeadingInfo[] = []
  let offset = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const parsed = parseHeadingLine(line)

    if (parsed) {
      headings.push({
        lineNumber: i + 1, // 1-based
        offset,
        level: parsed.level,
        rawTitle: parsed.rawTitle,
        lineText: line,
      })
    }

    offset += line.length + 1 // +1 for newline
  }

  // Stack to track locked parent headings
  // Each entry is { level, isLocked }
  type LockStackEntry = { level: number; isLocked: boolean }
  const lockStack: LockStackEntry[] = []

  // Second pass: compute sections with locked status
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i]!
    const nextHeading = headings[i + 1]

    const { title, hasLocked } = stripLockedMarker(heading.rawTitle)

    // Pop stack entries that are at same or lower level (higher heading number)
    // A heading at level N ends the scope of any heading at level >= N
    while (lockStack.length > 0 && lockStack[lockStack.length - 1]!.level >= heading.level) {
      lockStack.pop()
    }

    // Check if any parent in stack is locked
    const isLockedByParent = lockStack.some((entry) => entry.isLocked)

    // Push current heading onto stack
    lockStack.push({ level: heading.level, isLocked: hasLocked || isLockedByParent })

    // Compute section range
    const fromLine = heading.lineNumber
    const toLineExclusive = nextHeading ? nextHeading.lineNumber : lines.length + 1

    const headerFrom = heading.offset
    const headerTo = heading.offset + heading.lineText.length

    sections.push({
      level: heading.level,
      fromLine,
      toLineExclusive,
      headerFrom,
      headerTo,
      titleText: title,
      rawTitleText: heading.rawTitle,
      isExplicitlyLocked: hasLocked,
      isLockedByParent,
    })
  }

  // Third pass: compute locked body ranges (excluding header lines)
  for (const section of sections) {
    const isLocked = section.isExplicitlyLocked || section.isLockedByParent

    if (!isLocked) continue
    if (section.fromLine + 1 >= section.toLineExclusive) continue // No body content

    // Body starts on line after the heading
    const bodyFromLine = section.fromLine + 1
    const bodyToLineExclusive = section.toLineExclusive

    // Calculate character offsets
    let bodyFromOffset = 0
    let bodyToOffset = 0
    let currentOffset = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ''
      const lineNumber = i + 1

      if (lineNumber === bodyFromLine) {
        bodyFromOffset = currentOffset
      }

      currentOffset += line.length + 1

      if (lineNumber === bodyToLineExclusive - 1) {
        bodyToOffset = currentOffset
        break
      }

      if (lineNumber >= bodyToLineExclusive) {
        bodyToOffset = currentOffset
        break
      }
    }

    // Handle edge case where body extends to end of document
    if (bodyToLineExclusive > lines.length) {
      bodyToOffset = text.length
    }

    lockedBodyRanges.push({
      fromLine: bodyFromLine,
      toLineExclusive: bodyToLineExclusive,
      from: bodyFromOffset,
      to: bodyToOffset,
    })
  }

  return { sections, lockedBodyRanges }
}

/**
 * Check if a character position falls within a locked range.
 *
 * @param pos - 0-based character offset
 * @param lockedRanges - Array of locked body ranges
 * @returns True if position is inside a locked range
 */
export function isInLockedRange(pos: number, lockedRanges: LockedBodyRange[]): boolean {
  for (const range of lockedRanges) {
    if (pos >= range.from && pos < range.to) {
      return true
    }
  }
  return false
}

/**
 * Check if a line number falls within a locked range.
 *
 * @param lineNumber - 1-based line number
 * @param lockedRanges - Array of locked body ranges
 * @returns True if line is inside a locked range
 */
export function isLineInLockedRange(lineNumber: number, lockedRanges: LockedBodyRange[]): boolean {
  for (const range of lockedRanges) {
    if (lineNumber >= range.fromLine && lineNumber < range.toLineExclusive) {
      return true
    }
  }
  return false
}

/**
 * Filter text to exclude locked sections.
 * Returns text with locked body content replaced by empty lines (to preserve line numbers).
 *
 * @param text - Full document text
 * @param lockedRanges - Array of locked body ranges
 * @returns Filtered text with locked content blanked
 */
export function filterLockedContent(text: string, lockedRanges: LockedBodyRange[]): string {
  if (lockedRanges.length === 0) return text

  const lines = text.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1
    if (isLineInLockedRange(lineNumber, lockedRanges)) {
      result.push('') // Blank out locked lines but preserve line count
    } else {
      result.push(lines[i] ?? '')
    }
  }

  return result.join('\n')
}

/**
 * Get the heading section that contains a given line.
 *
 * @param lineNumber - 1-based line number
 * @param sections - Parsed heading sections
 * @returns The containing section, or undefined if before first heading
 */
export function getSectionAtLine(
  lineNumber: number,
  sections: HeadingSection[],
): HeadingSection | undefined {
  // Find the last section that starts at or before this line
  let result: HeadingSection | undefined
  for (const section of sections) {
    if (section.fromLine <= lineNumber) {
      result = section
    } else {
      break
    }
  }
  return result
}

/**
 * Generate a stable key for fold state persistence.
 * Uses note path + line number + normalized title hash.
 *
 * @param noteRelPath - Relative path of the note
 * @param section - The heading section
 * @returns A string key for localStorage
 */
export function generateLockFoldKey(noteRelPath: string, section: HeadingSection): string {
  // Simple hash of title for stability across minor edits
  let hash = 0
  const str = section.titleText.toLowerCase()
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  const hashStr = Math.abs(hash).toString(36)

  return `${noteRelPath}:${section.fromLine}:${hashStr}`
}
