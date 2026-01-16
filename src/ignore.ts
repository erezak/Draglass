function normalizeRelPath(relPath: string): string {
  // Normalize Windows separators and trim leading/trailing slashes.
  return relPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function splitSegments(relPath: string): string[] {
  const normalized = normalizeRelPath(relPath)
  return normalized.split('/').filter(Boolean)
}

export function isMarkdownNotePath(relPath: string): boolean {
  const normalized = normalizeRelPath(relPath)
  const lower = normalized.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown')
}

export function isIgnoredPath(relPath: string): boolean {
  const segments = splitSegments(relPath)
  if (segments.length === 0) return true

  for (const seg of segments) {
    const lower = seg.toLowerCase()

    // Dotfiles/dotfolders anywhere (covers .obsidian, .git, etc)
    if (lower.startsWith('.')) return true

    // Common junk folders
    if (lower === 'node_modules') return true

    // Common junk files
    if (lower === '.ds_store') return true
  }

  return false
}

export function isVisibleNoteForNavigation(relPath: string, showHidden: boolean): boolean {
  if (!isMarkdownNotePath(relPath)) return false
  if (showHidden) return true
  return !isIgnoredPath(relPath)
}
