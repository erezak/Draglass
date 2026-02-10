import { RangeSetBuilder, StateEffect, StateField, Transaction, type Extension } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import {
  decompress,
  decompressFromBase64,
  decompressFromEncodedURIComponent,
  decompressFromUTF16,
} from 'lz-string'

import {
  collectVisibleExcalidrawBlocks,
  type ExcalidrawBlock,
} from './excalidrawBlocks'

export type ExcalidrawTheme = 'dark' | 'light'

type ExcalidrawPreviewOptions = {
  renderDiagrams?: boolean
  theme?: ExcalidrawTheme
}

const setExcalidrawDecorations = StateEffect.define<DecorationSet>()

export const excalidrawDecorationsField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setExcalidrawDecorations)) {
        return effect.value
      }
    }
    if (tr.docChanged) {
      return value.map(tr.changes)
    }
    return value
  },
  provide: (field) => EditorView.decorations.from(field),
})

let excalidrawPromise: Promise<unknown> | null = null

const excalidrawCache = new Map<string, string>()
const EXCALIDRAW_CACHE_LIMIT = 200

function hashExcalidrawSource(source: string): string {
  let hash = 5381
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) + hash) ^ source.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function getExcalidrawCacheKey(source: string, theme: ExcalidrawTheme): string {
  return `${theme}:${hashExcalidrawSource(source)}`
}

function setExcalidrawCache(key: string, svg: string) {
  if (excalidrawCache.has(key)) {
    excalidrawCache.delete(key)
  }
  excalidrawCache.set(key, svg)
  if (excalidrawCache.size > EXCALIDRAW_CACHE_LIMIT) {
    const oldest = excalidrawCache.keys().next().value
    if (oldest) {
      excalidrawCache.delete(oldest)
    }
  }
}

async function getExcalidrawModule() {
  if (!excalidrawPromise) {
    excalidrawPromise = import('@excalidraw/excalidraw')
  }
  const mod = await excalidrawPromise
  const excalidraw = (mod as { default?: unknown }).default ?? mod
  return excalidraw as {
    exportToSvg: (options: {
      elements: never
      appState: never
      files: never
      exportPadding: number
    }) => Promise<SVGSVGElement>
  }
}

function normalizeParsedData(parsed: Record<string, unknown>) {
  const elements = Array.isArray(parsed.elements) ? parsed.elements : []
  const appState = parsed.appState && typeof parsed.appState === 'object' ? parsed.appState : {}
  const files = parsed.files && typeof parsed.files === 'object' ? parsed.files : null
  return { elements, appState, files }
}

function parseExcalidrawContent(content: string): Record<string, unknown> {
  const trimmed = content.trim()
  if (!trimmed) {
    throw new Error('Empty Excalidraw block')
  }

  const tryJson = (raw: string) => {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>
      if (record.type === 'excalidraw' || Array.isArray(record.elements)) {
        return record
      }
    }
    return null
  }

  try {
    const parsed = tryJson(trimmed)
    if (parsed) return parsed
  } catch {
    // fall through to decompression
  }

  const tryCandidates: Array<{ name: string; fn: (s: string) => string | null }> = [
    { name: 'decompressFromBase64', fn: (s) => decompressFromBase64(s) },
    { name: 'decompressFromEncodedURIComponent', fn: (s) => decompressFromEncodedURIComponent(s) },
    { name: 'decompressFromUTF16', fn: (s) => decompressFromUTF16(s) },
    { name: 'decompress (auto)', fn: (s) => decompress(s) },
  ]

  const normalizedVariants = [trimmed, trimmed.replace(/\s+/g, '')]
  let lastErr: string | null = null

  for (const candidate of normalizedVariants) {
    for (const method of tryCandidates) {
      try {
        const out = method.fn(candidate)
        if (!out) continue
        const parsed = tryJson(out)
        if (parsed) return parsed
      } catch (e) {
        lastErr = `${method.name}: ${e instanceof Error ? e.message : String(e)}`
      }
    }

    try {
      if (/%[0-9A-Fa-f]{2}/.test(candidate)) {
        const decoded = decodeURIComponent(candidate)
        const parsed = tryJson(decoded)
        if (parsed) return parsed
        const out = decompressFromEncodedURIComponent(candidate)
        if (out) {
          const parsedFromCompressed = tryJson(out)
          if (parsedFromCompressed) return parsedFromCompressed
        }
      }
    } catch (e) {
      lastErr = `decompressFromEncodedURIComponent: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  throw new Error(
    `Invalid Excalidraw data. ${lastErr ? `Last error: ${lastErr}` : 'Unable to parse or decompress.'}`,
  )
}

async function renderExcalidrawSvg(
  source: string,
  theme: ExcalidrawTheme,
  signal?: AbortSignal,
) {
  const key = getExcalidrawCacheKey(source, theme)
  const cached = excalidrawCache.get(key)
  if (cached) return cached

  const data = parseExcalidrawContent(source)
  const { elements, appState, files } = normalizeParsedData(data)
  if (signal?.aborted) throw new Error('Render cancelled')

  const { exportToSvg } = await getExcalidrawModule()
  if (signal?.aborted) throw new Error('Render cancelled')

  const excalidrawTheme = theme === 'dark' ? 'dark' : 'light'
  const safeElements = (elements as Array<Record<string, unknown>>).filter((el) => !el.isDeleted)

  const svg = await exportToSvg({
    elements: safeElements as never,
    appState: {
      ...(appState as Record<string, unknown>),
      theme: excalidrawTheme,
      exportWithDarkMode: theme === 'dark',
      exportBackground: true,
      viewBackgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
    } as never,
    files: files as never,
    exportPadding: 20,
  })

  if (signal?.aborted) throw new Error('Render cancelled')

  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.setAttribute('style', 'width: 100%; height: 100%;')

  const html = svg.outerHTML
  setExcalidrawCache(key, html)
  return html
}

type ExcalidrawRenderHost = HTMLElement & { __excalidrawAbort?: AbortController }

class ExcalidrawDiagramWidget extends WidgetType {
  private readonly content: string
  private readonly theme: ExcalidrawTheme
  private readonly editPos: number

  constructor(content: string, theme: ExcalidrawTheme, editPos: number) {
    super()
    this.content = content
    this.theme = theme
    this.editPos = editPos
  }

  eq(other: ExcalidrawDiagramWidget) {
    return this.content === other.content && this.theme === other.theme
  }

  toDOM(view: EditorView) {
    const container = document.createElement('div') as ExcalidrawRenderHost
    container.className = `cm-livePreview-excalidraw cm-livePreview-excalidraw--${this.theme}`

    const status = document.createElement('div')
    status.className = 'cm-livePreview-excalidrawStatus'
    status.textContent = 'Rendering drawing…'
    container.appendChild(status)

    const editButton = document.createElement('button')
    editButton.type = 'button'
    editButton.className = 'cm-livePreview-excalidrawEdit'
    editButton.textContent = 'Edit'
    editButton.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      view.dispatch({
        selection: { anchor: this.editPos },
        scrollIntoView: true,
      })
      view.focus()
    })

    const controller = new AbortController()
    container.__excalidrawAbort = controller

    const render = async () => {
      try {
        const svg = await renderExcalidrawSvg(this.content, this.theme, controller.signal)
        if (controller.signal.aborted) return

        const svgWrapper = document.createElement('div')
        svgWrapper.className = 'cm-livePreview-excalidrawSvg'
        svgWrapper.innerHTML = svg
        const svgEl = svgWrapper.querySelector('svg')
        if (svgEl) {
          svgEl.setAttribute('role', 'img')
          svgEl.setAttribute('aria-label', 'Excalidraw diagram')
        }

        container.replaceChildren(svgWrapper, editButton)
      } catch (err) {
        if (controller.signal.aborted) return
        const errorWrap = document.createElement('div')
        errorWrap.className = 'cm-livePreview-excalidrawError'

        const title = document.createElement('div')
        title.className = 'cm-livePreview-excalidrawErrorTitle'
        title.textContent = 'Drawing error'

        const message = document.createElement('div')
        message.className = 'cm-livePreview-excalidrawErrorMessage'
        message.textContent = err instanceof Error ? err.message : 'Unable to render drawing.'

        const details = document.createElement('details')
        details.className = 'cm-livePreview-excalidrawSource'
        const summary = document.createElement('summary')
        summary.textContent = 'Show source'
        const pre = document.createElement('pre')
        pre.textContent = this.content
        details.append(summary, pre)

        errorWrap.append(title, message, details)
        container.replaceChildren(errorWrap, editButton)
      }
    }

    if ('requestIdleCallback' in window) {
      ;(window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback?.(
        () => render(),
      )
    } else {
      setTimeout(() => render(), 16)
    }

    return container
  }

  destroy(dom: HTMLElement) {
    const host = dom as ExcalidrawRenderHost
    host.__excalidrawAbort?.abort()
  }

  ignoreEvent() {
    return false
  }
}

function buildExcalidrawDecorations(
  view: EditorView,
  options: ExcalidrawPreviewOptions,
  blocks: ExcalidrawBlock[],
): DecorationSet {
  const renderDiagrams = options.renderDiagrams !== false
  if (!renderDiagrams) return Decoration.none

  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = []
  const selections = view.state.selection.ranges

  const selectionIntersects = (from: number, to: number) =>
    selections.some((range) => range.from <= to && range.to >= from)

  const theme: ExcalidrawTheme = options.theme ?? 'dark'

  for (const block of blocks) {
    if (block.content.trim().length === 0) continue
    if (selectionIntersects(block.from, block.to)) continue
    decorations.push({
      from: block.from,
      to: block.to,
      decoration: Decoration.replace({
        widget: new ExcalidrawDiagramWidget(block.content, theme, block.editPos),
        block: true,
      }),
    })
  }

  const builder = new RangeSetBuilder<Decoration>()
  decorations
    .sort((a, b) => (a.from === b.from ? a.to - b.to : a.from - b.from))
    .forEach((entry) => builder.add(entry.from, entry.to, entry.decoration))
  return builder.finish()
}

export function createExcalidrawDecorationsPlugin(options: ExcalidrawPreviewOptions): Extension {
  return ViewPlugin.fromClass(
    class {
      private readonly options: ExcalidrawPreviewOptions
      private hasRendered = false
      private pendingUpdate: number | null = null
      private pendingUsesTimeout = false

      constructor(view: EditorView) {
        this.options = options
        this.scheduleUpdate(view, true)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.scheduleUpdate(update.view)
        }
      }

      destroy() {
        if (this.pendingUpdate == null) return
        if (this.pendingUsesTimeout) {
          clearTimeout(this.pendingUpdate)
        } else {
          cancelAnimationFrame(this.pendingUpdate)
        }
        this.pendingUpdate = null
      }

      private scheduleUpdate(view: EditorView, force = false) {
        if (this.pendingUpdate != null) return

        if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
          this.pendingUsesTimeout = false
          this.pendingUpdate = window.requestAnimationFrame(() => {
            this.pendingUpdate = null
            this.updateExcalidrawDecorations(view, force)
          })
          return
        }

        this.pendingUsesTimeout = true
        this.pendingUpdate = setTimeout(() => {
          this.pendingUpdate = null
          this.updateExcalidrawDecorations(view, force)
        }, 16) as unknown as number
      }

      private updateExcalidrawDecorations(view: EditorView, force = false) {
        if (this.options.renderDiagrams === false) {
          if (force || this.hasRendered) {
            view.dispatch({
              effects: setExcalidrawDecorations.of(Decoration.none),
              annotations: Transaction.addToHistory.of(false),
            })
          }
          this.hasRendered = false
          return
        }

        const blocks = collectVisibleExcalidrawBlocks(view)
        const decorations = buildExcalidrawDecorations(view, this.options, blocks)
        view.dispatch({
          effects: setExcalidrawDecorations.of(decorations),
          annotations: Transaction.addToHistory.of(false),
        })
        this.hasRendered = true
      }
    },
  )
}