import { parseLockedSections } from './lockedSections'

type TagRange = {
  tag: string
  from: number
  to: number
}

const TAG_RE = /(^|[^A-Za-z0-9_/])#([A-Za-z0-9][A-Za-z0-9_-]*(?:\/[A-Za-z0-9][A-Za-z0-9_-]*)*)/g
const INLINE_CODE_RE = /`[^`]+`/g
const FENCE_RE = /^\s{0,3}```/
const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/
const FRONTMATTER_TAGS_KEY_RE = /^\s*tags\s*:\s*(.*)$/i
const FRONTMATTER_LIST_ITEM_RE = /^\s*-\s*(.+)$/
const FRONTMATTER_KEY_RE = /^\s*[A-Za-z0-9_-]+\s*:/

export function normalizeTag(raw: string): string {
  const trimmed = raw.trim()
  const noHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  return noHash.trim().toLowerCase()
}

function collectInlineCodeRanges(lineText: string): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = []
  for (const match of lineText.matchAll(INLINE_CODE_RE)) {
    if (match.index == null) continue
    const from = match.index
    const to = from + (match[0]?.length ?? 0)
    if (to > from) {
      ranges.push({ from, to })
    }
  }
  return ranges
}

function stripQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function parseTagValue(rawValue: string): string[] {
  const value = stripQuotes(rawValue)
  if (!value) return []

  const sequence =
    value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value

  const parts = sequence.includes(',') ? sequence.split(',') : [sequence]

  return parts
    .map((part) => normalizeTag(stripQuotes(part)))
    .filter((tag) => tag.length > 0)
}

function extractFrontmatterTags(text: string): string[] {
  const match = text.match(FRONTMATTER_RE)
  if (!match) return []

  const raw = match[1] ?? ''
  const tags = new Set<string>()
  let inTagsList = false

  for (const line of raw.split(/\r?\n/)) {
    if (!inTagsList) {
      const tagsKeyMatch = line.match(FRONTMATTER_TAGS_KEY_RE)
      if (!tagsKeyMatch) continue

      const remainder = (tagsKeyMatch[1] ?? '').trim()
      if (remainder.length > 0) {
        for (const tag of parseTagValue(remainder)) {
          tags.add(tag)
        }
      } else {
        inTagsList = true
      }
      continue
    }

    if (!line.trim()) continue

    const listItemMatch = line.match(FRONTMATTER_LIST_ITEM_RE)
    if (listItemMatch) {
      const item = listItemMatch[1] ?? ''
      for (const tag of parseTagValue(item)) {
        tags.add(tag)
      }
      continue
    }

    if (FRONTMATTER_KEY_RE.test(line)) {
      inTagsList = false
      const tagsKeyMatch = line.match(FRONTMATTER_TAGS_KEY_RE)
      if (!tagsKeyMatch) continue
      const remainder = (tagsKeyMatch[1] ?? '').trim()
      if (remainder.length > 0) {
        for (const tag of parseTagValue(remainder)) {
          tags.add(tag)
        }
      } else {
        inTagsList = true
      }
    }
  }

  return Array.from(tags)
}

export function extractTagsFromLine(lineText: string): TagRange[] {
  const ranges: TagRange[] = []
  const codeRanges = collectInlineCodeRanges(lineText)

  for (const match of lineText.matchAll(TAG_RE)) {
    if (match.index == null) continue
    const prefix = match[1] ?? ''
    const tag = match[2] ?? ''
    if (!tag) continue

    const hashStart = match.index + prefix.length
    const tagStart = hashStart + 1
    const tagEnd = tagStart + tag.length

    const overlapsCode = codeRanges.some(
      (range) => tagStart < range.to && tagEnd > range.from,
    )
    if (overlapsCode) continue

    ranges.push({ tag: normalizeTag(tag), from: hashStart, to: tagEnd })
  }

  return ranges
}

export function extractTagsFromText(text: string): string[] {
  const tags = new Set<string>()
  for (const tag of extractFrontmatterTags(text)) {
    tags.add(tag)
  }
  const lines = text.split(/\r?\n/)
  let inFence = false

  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    for (const tag of extractTagsFromLine(line)) {
      if (!tag.tag) continue
      tags.add(tag.tag)
    }
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

export function findFirstInlineTagLine(
  text: string,
  rawTag: string,
  excludeLockedContent: boolean,
): number | null {
  const normalizedTag = normalizeTag(rawTag)
  if (!normalizedTag) return null

  const lockedRanges = excludeLockedContent ? parseLockedSections(text).lockedBodyRanges : []
  const lines = text.split(/\r?\n/)
  let inFence = false

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const lineNumber = i + 1

    if (FENCE_RE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    if (
      excludeLockedContent &&
      lockedRanges.some(
        (range) => lineNumber >= range.fromLine && lineNumber < range.toLineExclusive,
      )
    ) {
      continue
    }

    const hasInlineTag = extractTagsFromLine(line).some((tag) => tag.tag === normalizedTag)
    if (hasInlineTag) {
      return lineNumber
    }
  }

  return null
}

export function extractTagsFromTextWithLockFilter(
  text: string,
  excludeLockedContent: boolean,
): string[] {
  if (!excludeLockedContent) {
    return extractTagsFromText(text)
  }

  const { lockedBodyRanges } = parseLockedSections(text)
  if (lockedBodyRanges.length === 0) {
    return extractTagsFromText(text)
  }

  const tags = new Set<string>()
  const lines = text.split(/\r?\n/)
  let inFence = false

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const lineNumber = i + 1
    if (FENCE_RE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const inLocked = lockedBodyRanges.some(
      (range) => lineNumber >= range.fromLine && lineNumber < range.toLineExclusive,
    )
    if (inLocked) continue

    for (const tag of extractTagsFromLine(line)) {
      if (!tag.tag) continue
      tags.add(tag.tag)
    }
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}
