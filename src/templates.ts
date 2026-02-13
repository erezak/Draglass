import { isIgnoredPath, isMarkdownNotePath } from './ignore'

export const DEFAULT_TEMPLATES_FOLDER = '_templates'

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

export function normalizeTemplatesFolder(value: string | null | undefined): string {
  const normalized = normalizePath(value ?? '').trim()
  return normalized.length > 0 ? normalized : DEFAULT_TEMPLATES_FOLDER
}

export function isTemplatePath(relPath: string, templatesFolder: string): boolean {
  const folder = normalizeTemplatesFolder(templatesFolder).toLowerCase()
  const normalized = normalizePath(relPath).toLowerCase()
  return normalized === folder || normalized.startsWith(`${folder}/`)
}

export function listTemplateFiles(
  relPaths: string[],
  templatesFolder: string,
  showHidden: boolean,
): string[] {
  return relPaths
    .filter((relPath) => isMarkdownNotePath(relPath))
    .filter((relPath) => isTemplatePath(relPath, templatesFolder))
    .filter((relPath) => showHidden || !isIgnoredPath(relPath))
    .sort((a, b) => {
      const aName = a.split('/').pop() ?? a
      const bName = b.split('/').pop() ?? b
      const byName = aName.localeCompare(bName, undefined, { sensitivity: 'base' })
      if (byName !== 0) return byName
      return a.localeCompare(b, undefined, { sensitivity: 'base' })
    })
}
