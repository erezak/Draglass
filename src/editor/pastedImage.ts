import { normalizePastedImagesFolder } from '../pastedImagesSettings'

function extensionForImageMimeType(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    case 'image/avif':
      return 'avif'
    case 'image/bmp':
      return 'bmp'
    case 'image/svg+xml':
      return 'svg'
    case 'image/tiff':
      return 'tiff'
    default:
      return 'png'
  }
}

function sanitizeSegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'image'
}

export function buildPastedImageRelPath(
  folder: string,
  noteRelPath: string,
  mimeType: string,
  timestampMs: number,
  randomSuffix: string,
): string {
  const normalizedFolder = normalizePastedImagesFolder(folder)
  const noteName = noteRelPath.split('/').pop() ?? noteRelPath
  const stem = noteName.replace(/\.[^/.]+$/, '')
  const ext = extensionForImageMimeType(mimeType)
  const safeStem = sanitizeSegment(stem)
  const safeRandom = sanitizeSegment(randomSuffix).slice(0, 8) || 'img'
  return `${normalizedFolder}/${safeStem}-${timestampMs}-${safeRandom}.${ext}`
}

export function imageEmbedWikilinkForPath(relPath: string): string {
  return `![[${relPath}]]`
}
