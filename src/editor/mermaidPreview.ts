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
  collectVisibleMermaidBlocks,
  type MermaidBlock,
} from './mermaidBlocks'

export type MermaidTheme = 'dark' | 'light'

type MermaidPreviewOptions = {
  renderDiagrams?: boolean
  theme?: MermaidTheme
}

const setMermaidDecorations = StateEffect.define<DecorationSet>()

export const mermaidDecorationsField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setMermaidDecorations)) {
        return effect.value
      }
    }
    if (tr.docChanged) {
      return Decoration.none
    }
    return value
  },
  provide: (field) => EditorView.decorations.from(field),
})

let mermaidPromise: Promise<unknown> | null = null
let mermaidInitializedTheme: MermaidTheme | null = null

const mermaidCache = new Map<string, string>()
const MERMAID_CACHE_LIMIT = 200

function hashMermaidSource(source: string): string {
  let hash = 5381
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) + hash) ^ source.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function getMermaidCacheKey(source: string, theme: MermaidTheme): string {
  return `${theme}:${hashMermaidSource(source)}`
}

function setMermaidCache(key: string, svg: string) {
  if (mermaidCache.has(key)) {
    mermaidCache.delete(key)
  }
  mermaidCache.set(key, svg)
  if (mermaidCache.size > MERMAID_CACHE_LIMIT) {
    const oldest = mermaidCache.keys().next().value
    if (oldest) {
      mermaidCache.delete(oldest)
    }
  }
}

async function getMermaidModule() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid')
  }
  const mod = await mermaidPromise
  const mermaid = (mod as { default?: unknown }).default ?? mod
  return mermaid as {
    initialize: (config: Record<string, unknown>) => void
    render: (id: string, text: string) => Promise<{ svg: string }>
  }
}

async function ensureMermaidInitialized(theme: MermaidTheme) {
  const mermaid = await getMermaidModule()
  if (mermaidInitializedTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: theme === 'dark' ? 'dark' : 'default',
      htmlLabels: false,
      flowchart: {
        htmlLabels: false,
      },
      sequence: {
        useMaxWidth: true,
        showSequenceNumbers: false,
        actorMargin: 32,
        messageMargin: 32,
        htmlLabels: false,
      },
      class: {
        htmlLabels: false,
      },
    })
    mermaidInitializedTheme = theme
  }
  return mermaid
}

function sanitizeSvg(svg: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svg, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid SVG output')
  }

  doc.querySelectorAll('script, foreignObject').forEach((node) => node.remove())

  const elements = doc.querySelectorAll('*')
  elements.forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name)
        continue
      }
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('javascript:')) {
        el.removeAttribute(attr.name)
      }
    }
  })

  return doc.documentElement.outerHTML
}

async function renderMermaidSvg(source: string, theme: MermaidTheme, signal?: AbortSignal) {
  const key = getMermaidCacheKey(source, theme)
  const cached = mermaidCache.get(key)
  if (cached) return cached

  const mermaid = await ensureMermaidInitialized(theme)
  if (signal?.aborted) throw new Error('Render cancelled')

  const id = `mermaid-${hashMermaidSource(source)}-${theme}`
  const { svg } = await mermaid.render(id, source)
  if (signal?.aborted) throw new Error('Render cancelled')

  const sanitized = sanitizeSvg(svg)
  setMermaidCache(key, sanitized)
  return sanitized
}

type MermaidRenderHost = HTMLElement & { __mermaidAbort?: AbortController }

class MermaidDiagramWidget extends WidgetType {
  private readonly content: string
  private readonly theme: MermaidTheme
  private readonly editPos: number

  constructor(content: string, theme: MermaidTheme, editPos: number) {
    super()
    this.content = content
    this.theme = theme
    this.editPos = editPos
  }

  eq(other: MermaidDiagramWidget) {
    return this.content === other.content && this.theme === other.theme
  }

  toDOM(view: EditorView) {
    const container = document.createElement('div') as MermaidRenderHost
    container.className = `cm-livePreview-mermaid cm-livePreview-mermaid--${this.theme}`

    const status = document.createElement('div')
    status.className = 'cm-livePreview-mermaidStatus'
    status.textContent = 'Rendering diagram…'
    container.appendChild(status)

    const editButton = document.createElement('button')
    editButton.type = 'button'
    editButton.className = 'cm-livePreview-mermaidEdit'
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
    container.__mermaidAbort = controller

    const render = async () => {
      try {
        const svg = await renderMermaidSvg(this.content, this.theme, controller.signal)
        if (controller.signal.aborted) return

        const svgWrapper = document.createElement('div')
        svgWrapper.className = 'cm-livePreview-mermaidSvg'
        svgWrapper.innerHTML = svg
        const svgEl = svgWrapper.querySelector('svg')
        if (svgEl) {
          svgEl.setAttribute('role', 'img')
          svgEl.setAttribute('aria-label', 'Mermaid diagram')
        }

        container.replaceChildren(svgWrapper, editButton)
      } catch (err) {
        if (controller.signal.aborted) return
        const errorWrap = document.createElement('div')
        errorWrap.className = 'cm-livePreview-mermaidError'

        const title = document.createElement('div')
        title.className = 'cm-livePreview-mermaidErrorTitle'
        title.textContent = 'Diagram error'

        const message = document.createElement('div')
        message.className = 'cm-livePreview-mermaidErrorMessage'
        message.textContent = err instanceof Error ? err.message : 'Unable to render diagram.'

        const details = document.createElement('details')
        details.className = 'cm-livePreview-mermaidSource'
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
    const host = dom as MermaidRenderHost
    host.__mermaidAbort?.abort()
  }

  ignoreEvent() {
    return false
  }
}

function buildMermaidDecorations(
  view: EditorView,
  options: MermaidPreviewOptions,
  blocks: MermaidBlock[],
): DecorationSet {
  const renderDiagrams = options.renderDiagrams !== false
  if (!renderDiagrams) return Decoration.none

  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = []
  const selections = view.state.selection.ranges

  const selectionIntersects = (from: number, to: number) =>
    selections.some((range) => range.from <= to && range.to >= from)

  const theme: MermaidTheme = options.theme ?? 'dark'

  for (const block of blocks) {
    if (block.content.trim().length === 0) continue
    if (selectionIntersects(block.from, block.to)) continue
    decorations.push({
      from: block.from,
      to: block.to,
      decoration: Decoration.replace({
        widget: new MermaidDiagramWidget(block.content, theme, block.editPos),
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

export function createMermaidDecorationsPlugin(options: MermaidPreviewOptions): Extension {
  return ViewPlugin.fromClass(
    class {
      private readonly options: MermaidPreviewOptions
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
            this.updateMermaidDecorations(view, force)
          })
          return
        }

        this.pendingUsesTimeout = true
        this.pendingUpdate = setTimeout(() => {
          this.pendingUpdate = null
          this.updateMermaidDecorations(view, force)
        }, 16) as unknown as number
      }

      private updateMermaidDecorations(view: EditorView, force = false) {
        if (this.options.renderDiagrams === false) {
          if (force || this.hasRendered) {
            view.dispatch({
              effects: setMermaidDecorations.of(Decoration.none),
              annotations: Transaction.addToHistory.of(false),
            })
          }
          this.hasRendered = false
          return
        }

        const blocks = collectVisibleMermaidBlocks(view)
        const decorations = buildMermaidDecorations(view, this.options, blocks)
        view.dispatch({
          effects: setMermaidDecorations.of(decorations),
          annotations: Transaction.addToHistory.of(false),
        })
        this.hasRendered = true
      }
    },
  )
}
