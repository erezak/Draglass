import { normalizePastedImagesFolder } from '../pastedImagesSettings'

const IMAGE_FILE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'bmp',
  'svg',
  'tif',
  'tiff',
])

const IMAGE_CLIPBOARD_TYPE_HINTS = new Set([
  'files',
  'public.tiff',
  'public.png',
  'public.jpeg',
  'public.jpg',
])

export function isImageMimeType(mimeType: string | null | undefined): boolean {
  return (mimeType ?? '').toLowerCase().startsWith('image/')
}

export function hasImageFileExtension(fileName: string | null | undefined): boolean {
  const trimmed = (fileName ?? '').trim()
  if (!trimmed) return false
  const extension = trimmed.split('.').pop()?.toLowerCase()
  if (!extension) return false
  return IMAGE_FILE_EXTENSIONS.has(extension)
}

export function isLikelyClipboardImageFileMeta(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
  sizeBytes: number,
): boolean {
  if (isImageMimeType(mimeType)) return true
  if (hasImageFileExtension(fileName)) return true
  return (mimeType ?? '').trim() === '' && sizeBytes > 0
}

export function isLikelyImageClipboardType(type: string | null | undefined): boolean {
  const normalized = (type ?? '').trim().toLowerCase()
  if (!normalized) return false
  return isImageMimeType(normalized) || IMAGE_CLIPBOARD_TYPE_HINTS.has(normalized)
}

export function decodeImageDataUrl(dataUrl: string): { mimeType: string; bytes: Uint8Array } | null {
  const trimmed = dataUrl.trim()
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(trimmed)
  if (!match) return null
  const mimeType = match[1].toLowerCase()
  const payload = (match[2] ?? '').replace(/\s+/g, '')
  if (!payload) return null

  try {
    const binary = atob(payload)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return { mimeType, bytes }
  } catch {
    return null
  }
}

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
  const safeRandom = sanitizeSegment(randomSuffix).slice(0, 12) || String(timestampMs)
  return `${normalizedFolder}/${safeStem}-${timestampMs}-${safeRandom}.${ext}`
}

export function imageEmbedWikilinkForPath(relPath: string): string {
  return `![[${relPath}]]`
}
