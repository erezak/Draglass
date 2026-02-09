import { useEffect, useMemo, useRef, useState } from 'react'
import { decompressFromBase64 } from 'lz-string'

type ExcalidrawViewerProps = {
  /** Raw file content (JSON or Obsidian markdown wrapper) */
  content: string
  /** App color theme */
  theme?: 'dark' | 'light'
}

type ParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Obsidian excalidraw-plugin format parser
// ---------------------------------------------------------------------------

/**
 * Detect whether the content is in Obsidian's excalidraw-plugin markdown
 * wrapper format (as opposed to plain Excalidraw JSON).
 *
 * Signals: YAML frontmatter with `excalidraw-plugin:` key, or a
 * `## Drawing` heading that precedes a fenced code block.
 */
function isObsidianExcalidrawFormat(content: string): boolean {
  // Quick heuristic: Obsidian format starts with YAML frontmatter
  if (content.trimStart().startsWith('---')) {
    return /excalidraw-plugin\s*:/m.test(content)
  }
  return false
}

/**
 * Extract and decompress the Excalidraw JSON from an Obsidian
 * excalidraw-plugin markdown file.
 *
 * The file has a `## Drawing` section containing a fenced code block
 * (language `compressed-json` or `json`) wrapped in Obsidian comment
 * markers (`%%`).
 */
function parseObsidianExcalidraw(content: string): Record<string, unknown> {
  // Find the code block after "## Drawing"
  const drawingIdx = content.indexOf('## Drawing')
  if (drawingIdx === -1) {
    throw new Error('Missing "## Drawing" section in Obsidian excalidraw file')
  }

  const afterDrawing = content.slice(drawingIdx)

  // Match fenced code block: ```compressed-json or ```json
  const codeBlockMatch = afterDrawing.match(
    /```(?:compressed-json|json)\s*\n([\s\S]*?)```/
  )
  if (!codeBlockMatch) {
    throw new Error('No code block found in "## Drawing" section')
  }

  const rawBlock = codeBlockMatch[1].replace(/[\n\r]/g, '')

  // Try parsing as plain JSON first (for `json` language blocks)
  try {
    const parsed = JSON.parse(rawBlock)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
  } catch {
    // Not plain JSON — try LZ-string decompression
  }

  // Decompress from base64 (LZ-string format used by excalidraw-plugin)
  const decompressed = decompressFromBase64(rawBlock)
  if (!decompressed) {
    throw new Error('Failed to decompress drawing data (invalid LZ-string)')
  }

  const parsed = JSON.parse(decompressed)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Decompressed data is not valid JSON')
  }

  return parsed as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Read-only viewer for Excalidraw files.
 *
 * Renders the drawing as SVG via `exportToSvg` instead of mounting the
 * interactive Excalidraw canvas component. This avoids browser canvas
 * pixel-limit errors (268 M px on WebKit) that the interactive component
 * triggers on high-DPI displays.
 *
 * Supports two formats:
 * 1. Standard `.excalidraw` JSON files
 * 2. Obsidian excalidraw-plugin markdown wrappers (`.excalidraw` or
 *    `.excalidraw.md`) with LZ-string compressed data.
 */
export function ExcalidrawViewer({ content, theme = 'dark' }: ExcalidrawViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgHtml, setSvgHtml] = useState<string | null>(null)
  const [svgError, setSvgError] = useState<string | null>(null)

  const result: ParseResult = useMemo(() => {
    try {
      let excalidrawData: Record<string, unknown>

      if (isObsidianExcalidrawFormat(content)) {
        excalidrawData = parseObsidianExcalidraw(content)
      } else {
        // Standard Excalidraw JSON
        const parsed = JSON.parse(content)
        if (parsed.type !== 'excalidraw') {
          return { ok: false, error: 'Not a valid Excalidraw file (missing "type": "excalidraw")' }
        }
        excalidrawData = parsed
      }

      return {
        ok: true,
        data: excalidrawData,
      }
    } catch (e) {
      return {
        ok: false,
        error: `Failed to parse Excalidraw file: ${e instanceof Error ? e.message : String(e)}`,
      }
    }
  }, [content])

  // Render to SVG whenever data or theme changes
  useEffect(() => {
    if (!result.ok) return

    // Capture data for use in async closure (TS narrowing doesn't carry into closures)
    const data = result.data

    let cancelled = false
    setSvgHtml(null)
    setSvgError(null)

    async function render() {
      try {
        const { exportToSvg } = await import('@excalidraw/excalidraw')

        const excalidrawTheme = theme === 'dark' ? 'dark' : 'light'

        // Filter out deleted elements
        const elements = ((data.elements as Array<Record<string, unknown>>) ?? [])
          .filter((el) => !el.isDeleted)

        const appState: Record<string, unknown> = {
          ...((data.appState as Record<string, unknown>) ?? {}),
          theme: excalidrawTheme,
          exportWithDarkMode: theme === 'dark',
          exportBackground: true,
          viewBackgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
        }

        const files = (data.files as Record<string, unknown>) ?? null

        const svg = await exportToSvg({
          elements: elements as never,
          appState: appState as never,
          files: files as never,
          exportPadding: 20,
        })

        if (!cancelled) {
          // Make SVG scale to fill container
          svg.removeAttribute('width')
          svg.removeAttribute('height')
          svg.setAttribute('style', 'width: 100%; height: 100%;')
          setSvgHtml(svg.outerHTML)
        }
      } catch (e) {
        if (!cancelled) {
          setSvgError(
            `Failed to render drawing: ${e instanceof Error ? e.message : String(e)}`
          )
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [result, theme])

  if (!result.ok) {
    return <div className="panelEmpty">{result.error}</div>
  }

  if (svgError) {
    return <div className="panelEmpty">{svgError}</div>
  }

  if (!svgHtml) {
    return <div className="panelEmpty">Rendering drawing…</div>
  }

  return (
    <div
      className="excalidrawViewer"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  )
}

export default ExcalidrawViewer
