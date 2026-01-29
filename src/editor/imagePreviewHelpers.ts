export type ImageMarkup = {
  from: number
  to: number
  raw: string
  target: string
  alt: string
  title?: string
  kind: 'markdown' | 'wikilink'
}

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g
const WIKILINK_EMBED_RE = /!\[\[([^\]]+?)\]\]/g

export function normalizeImageTarget(raw: string): string {
  return raw.trim().replace(/\\/g, '/')
}

export function isRemoteImageTarget(raw: string): boolean {
  const normalized = normalizeImageTarget(raw)
  if (!normalized) return false
  if (normalized.startsWith('//')) return true
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized)
}

export function resolveImageTarget(noteRelPath: string, rawTarget: string): string | null {
  const normalized = normalizeImageTarget(rawTarget)
  if (!normalized) return null

  const isVaultRoot = normalized.startsWith('/')
  const target = isVaultRoot ? normalized.slice(1) : normalized
  if (!target) return null

  const baseParts = isVaultRoot ? [] : noteRelPath.split('/').slice(0, -1)
  const targetParts = target.split('/')
  const combined = [...baseParts, ...targetParts]

  const resolvedParts: string[] = []
  for (const part of combined) {
    if (!part || part === '.') continue
    if (part === '..') return null
    resolvedParts.push(part)
  }

  if (resolvedParts.length === 0) return null
  return resolvedParts.join('/')
}

export function extractImageMarkups(text: string): ImageMarkup[] {
  const results: ImageMarkup[] = []

  for (const match of text.matchAll(new RegExp(MARKDOWN_IMAGE_RE.source, MARKDOWN_IMAGE_RE.flags))) {
    if (match.index == null) continue
    const raw = match[0] ?? ''
    const alt = match[1] ?? ''
    const target = match[2] ?? ''
    const title = match[3] ?? undefined
    results.push({
      from: match.index,
      to: match.index + raw.length,
      raw,
      target,
      alt,
      title,
      kind: 'markdown',
    })
  }

  for (const match of text.matchAll(new RegExp(WIKILINK_EMBED_RE.source, WIKILINK_EMBED_RE.flags))) {
    if (match.index == null) continue
    const raw = match[0] ?? ''
    const inner = match[1] ?? ''
    const [rawTarget, rawAlt] = inner.split('|')
    const target = (rawTarget ?? '').trim()
    const alt = (rawAlt ?? '').trim()
    results.push({
      from: match.index,
      to: match.index + raw.length,
      raw,
      target,
      alt,
      kind: 'wikilink',
    })
  }

  results.sort((a, b) => a.from - b.from)
  return results
}
