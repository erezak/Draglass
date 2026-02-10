import {
  compress,
  compressToBase64,
  compressToEncodedURIComponent,
  compressToUTF16,
  decompress,
  decompressFromBase64,
  decompressFromEncodedURIComponent,
  decompressFromUTF16,
} from 'lz-string'

export type ExcalidrawEncoding = 'json' | 'base64' | 'uri' | 'utf16' | 'raw'

export type ExcalidrawSourceFormat =
  | { kind: 'json' }
  | {
      kind: 'obsidian'
      before: string
      after: string
      encoding: ExcalidrawEncoding
    }

export type ExcalidrawParseResult =
  | { ok: true; data: Record<string, unknown>; format: ExcalidrawSourceFormat }
  | { ok: false; error: string }

const EMPTY_SCENE: Record<string, unknown> = {
  type: 'excalidraw',
  version: 2,
  source: 'draglass',
  elements: [],
  appState: {},
  files: {},
}

function tryParseJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>
    }
  } catch {
    // ignore
  }
  return null
}

function decodePayload(raw: string): { data: Record<string, unknown>; encoding: ExcalidrawEncoding } {
  const trimmed = raw.trim()
  if (!trimmed) return { data: EMPTY_SCENE, encoding: 'json' }

  const direct = tryParseJson(trimmed)
  if (direct) return { data: direct, encoding: 'json' }

  const candidates: Array<{ encoding: ExcalidrawEncoding; fn: (s: string) => string | null }> = [
    { encoding: 'base64', fn: (s) => decompressFromBase64(s) },
    { encoding: 'uri', fn: (s) => decompressFromEncodedURIComponent(s) },
    { encoding: 'utf16', fn: (s) => decompressFromUTF16(s) },
    { encoding: 'raw', fn: (s) => decompress(s) },
  ]

  const normalizedVariants = [trimmed, trimmed.replace(/\s+/g, '')]
  let lastErr: string | null = null

  for (const candidate of normalizedVariants) {
    for (const method of candidates) {
      try {
        const out = method.fn(candidate)
        if (!out) continue
        const parsed = tryParseJson(out)
        if (parsed) return { data: parsed, encoding: method.encoding }
      } catch (err) {
        lastErr = `${method.encoding}: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    if (/%[0-9A-Fa-f]{2}/.test(candidate)) {
      try {
        const decoded = decodeURIComponent(candidate)
        const parsed = tryParseJson(decoded)
        if (parsed) return { data: parsed, encoding: 'uri' }
      } catch (err) {
        lastErr = `uri: ${err instanceof Error ? err.message : String(err)}`
      }
    }
  }

  throw new Error(
    `Invalid Excalidraw data. ${lastErr ? `Last error: ${lastErr}` : 'Unable to parse or decompress.'}`,
  )
}

function encodePayload(json: string, encoding: ExcalidrawEncoding): string {
  switch (encoding) {
    case 'json':
      return json
    case 'base64':
      return compressToBase64(json)
    case 'uri':
      return compressToEncodedURIComponent(json)
    case 'utf16':
      return compressToUTF16(json)
    case 'raw':
      return compress(json)
    default:
      return json
  }
}

function tryParseObsidianWrapper(content: string):
  | { data: Record<string, unknown>; format: ExcalidrawSourceFormat }
  | { error: string }
  | null {
  const drawingIndex = content.indexOf('## Drawing')
  const hasObsidianMarker = /excalidraw-plugin\s*:/m.test(content)
  if (drawingIndex === -1 && !hasObsidianMarker) return null

  if (drawingIndex === -1) {
    return { error: 'Missing "## Drawing" section in Obsidian excalidraw file' }
  }

  const afterDrawing = content.slice(drawingIndex)
  const match = afterDrawing.match(/```(compressed-json|json)\s*\n([\s\S]*?)```/)
  if (!match || match.index == null) {
    return { error: 'No code block found in "## Drawing" section' }
  }

  const blockStart = drawingIndex + match.index
  const blockEnd = blockStart + match[0].length
  const rawBlock = match[2]

  try {
    const decoded = decodePayload(rawBlock)
    return {
      data: decoded.data,
      format: {
        kind: 'obsidian',
        before: content.slice(0, blockStart),
        after: content.slice(blockEnd),
        encoding: decoded.encoding,
      },
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to decode Obsidian excalidraw data',
    }
  }
}

export function parseExcalidrawSource(content: string): ExcalidrawParseResult {
  const trimmed = content.trim()
  if (!trimmed) {
    return { ok: true, data: EMPTY_SCENE, format: { kind: 'json' } }
  }

  const obsidian = tryParseObsidianWrapper(content)
  if (obsidian) {
    if ('error' in obsidian) return { ok: false, error: obsidian.error }
    return { ok: true, data: obsidian.data, format: obsidian.format }
  }

  const parsed = tryParseJson(content)
  if (!parsed) {
    return { ok: false, error: 'Failed to parse Excalidraw file as JSON' }
  }

  return { ok: true, data: parsed, format: { kind: 'json' } }
}

export function buildExcalidrawSource(json: string, format: ExcalidrawSourceFormat): string {
  if (format.kind === 'json') return json

  const payload = encodePayload(json, format.encoding)
  const language = format.encoding === 'json' ? 'json' : 'compressed-json'
  const block = `\`\`\`${language}\n${payload}\n\`\`\``
  return `${format.before}${block}${format.after}`
}
