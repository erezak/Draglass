export function stripWikilinkTarget(rawTarget: string): string {
  const base = rawTarget.split('|')[0] ?? ''
  return base.trim()
}

export function targetToRelPath(rawTarget: string): string | null {
  const trimmed = stripWikilinkTarget(rawTarget)
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return trimmed
  return `${trimmed}.md`
}
