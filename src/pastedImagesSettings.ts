export const DEFAULT_PASTED_IMAGES_FOLDER = 'assets'

function normalizeFolderPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

export function normalizePastedImagesFolder(value: string | null | undefined): string {
  const normalized = normalizeFolderPath(value ?? '')
    .split('/')
    .filter((part) => part !== '' && part !== '.' && part !== '..')
    .join('/')
    .trim()
  return normalized.length > 0 ? normalized : DEFAULT_PASTED_IMAGES_FOLDER
}
