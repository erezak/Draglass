const WIKILINK = /\[\[([^\]]+?)\]\]/g

export function parseWikilinks(text: string): string[] {
  const results: string[] = []
  const seen = new Set<string>()

  for (const match of text.matchAll(WIKILINK)) {
    const raw = match[1] ?? ''
    const target = raw.split('|')[0]?.trim() ?? ''
    if (!target) continue
    if (seen.has(target)) continue
    seen.add(target)
    results.push(target)
  }

  return results
}
