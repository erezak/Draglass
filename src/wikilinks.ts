const WIKILINK = /\[\[([^\]]+?)\]\]/g

export type ParsedWikilink = {
  target: string
  normalized: string
}

export function normalizeWikiTarget(input: string): string {
  const raw = input.split('|')[0] ?? ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  let noExt = trimmed
  if (trimmed.toLowerCase().endsWith('.md')) {
    noExt = trimmed.slice(0, -3)
  }

  return noExt.toLowerCase()
}

export function parseWikilinks(text: string): ParsedWikilink[] {
  const results: ParsedWikilink[] = []
  const seen = new Set<string>()

  for (const match of text.matchAll(WIKILINK)) {
    const raw = match[1] ?? ''
    const target = (raw.split('|')[0] ?? '').trim()
    const normalized = normalizeWikiTarget(target)
    if (!normalized) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    results.push({ target, normalized })
  }

  return results
}
