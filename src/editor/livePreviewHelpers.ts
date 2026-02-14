export function selectionIntersectsRange(
  selectionFrom: number,
  selectionTo: number,
  rangeFrom: number,
  rangeTo: number,
): boolean {
  return selectionFrom <= rangeTo && selectionTo >= rangeFrom
}

export function shouldHideWikilinkBrackets(
  linkFrom: number,
  linkTo: number,
  selectionFrom: number,
  selectionTo: number,
): boolean {
  return !selectionIntersectsRange(selectionFrom, selectionTo, linkFrom, linkTo)
}

export function shouldHideMarkup(
  markupFrom: number,
  markupTo: number,
  selectionFrom: number,
  selectionTo: number,
): boolean {
  return !selectionIntersectsRange(selectionFrom, selectionTo, markupFrom, markupTo)
}

const WIKILINK_RE = /\[\[([^\]]+?)\]\]/g

export type WikilinkMatch = {
  from: number
  to: number
  rawTarget: string
}

export type TagMatch = {
  from: number
  to: number
  tag: string
}

const TAG_RE = /(^|[^A-Za-z0-9_/])#([A-Za-z0-9][A-Za-z0-9_-]*(?:\/[A-Za-z0-9][A-Za-z0-9_-]*)*)/g

export function extractWikilinkAt(text: string, offset: number): WikilinkMatch | null {
  if (offset < 0 || offset > text.length) return null
  for (const match of text.matchAll(WIKILINK_RE)) {
    if (match.index == null) continue
    const full = match[0] ?? ''
    const from = match.index
    const to = from + full.length
    if (offset < from || offset > to) continue
    return { from, to, rawTarget: match[1] ?? '' }
  }
  return null
}

export function extractTagAt(text: string, offset: number): TagMatch | null {
  if (offset < 0 || offset > text.length) return null

  for (const match of text.matchAll(TAG_RE)) {
    if (match.index == null) continue
    const prefix = match[1] ?? ''
    const rawTag = match[2] ?? ''
    if (!rawTag) continue

    const from = match.index + prefix.length
    const to = from + 1 + rawTag.length
    if (offset < from || offset > to) continue

    return { from, to, tag: rawTag.toLowerCase() }
  }

  return null
}
