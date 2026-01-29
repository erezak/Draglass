import { RangeSetBuilder, StateEffect, StateField, Transaction, type Extension } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'

import { extractWikilinkAt, shouldHideMarkup } from './livePreviewHelpers'

const WIKILINK_RE = /\[\[([^\]]+?)\]\]/g
const INLINE_CODE_RE = /`([^`]+)`/g
const BOLD_RE = /\*\*([^*]+)\*\*/g
const BOLD_UNDER_RE = /__([^_]+)__/g
const ITALIC_RE = /(^|[^*])\*([^*]+)\*(?!\*)/g
const ITALIC_UNDER_RE = /(^|[^_])_([^_]+)_(?!_)/g
const TASK_RE = /^\s*(?:[-+*])\s+\[( |x|X)\]/
const CODE_FENCE_RE = /^\s{0,3}```\s*([\w-]+)?\s*$/
const MERMAID_LANG = 'mermaid'

type MermaidTheme = 'dark' | 'light'

const setMermaidDecorations = StateEffect.define<DecorationSet>()

const mermaidDecorationsField = StateField.define<DecorationSet>({
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

type MermaidBlock = {
  from: number
  to: number
  content: string
  editPos: number
  startLine: number
}

function getFenceLang(lineText: string): string | null {
  const match = CODE_FENCE_RE.exec(lineText)
  if (!match) return null
  return (match[1] ?? '').toLowerCase()
}

function findMermaidStartForLine(doc: EditorView['state']['doc'], lineNumber: number): number | null {
  for (let current = lineNumber; current >= 1; current -= 1) {
    const line = doc.line(current)
    const lang = getFenceLang(line.text)
    if (lang == null) continue
    if (lang === MERMAID_LANG) return current
    return null
  }
  return null
}

function collectMermaidBlock(doc: EditorView['state']['doc'], startLine: number): MermaidBlock | null {
  const start = doc.line(startLine)
  const startLang = getFenceLang(start.text)
  if (startLang !== MERMAID_LANG) return null

  const contentLines: string[] = []
  for (let current = startLine + 1; current <= doc.lines; current += 1) {
    const line = doc.line(current)
    const lang = getFenceLang(line.text)
    if (lang != null) {
      const from = start.from
      const to = current < doc.lines ? line.to + 1 : line.to
      const editPos = startLine < doc.lines ? start.to + 1 : start.to
      return {
        from,
        to,
        content: contentLines.join('\n'),
        editPos,
        startLine,
      }
    }
    contentLines.push(line.text)
  }

  return null
}

function blockIntersectsVisibleRanges(block: MermaidBlock, ranges: readonly { from: number; to: number }[]) {
  return ranges.some((range) => block.from <= range.to && block.to >= range.from)
}

function findMermaidBlockAtLine(doc: EditorView['state']['doc'], lineNumber: number): MermaidBlock | null {
  if (lineNumber < 1 || lineNumber > doc.lines) return null
  const line = doc.line(lineNumber)
  const lang = getFenceLang(line.text)
  if (lang !== MERMAID_LANG) return null
  return collectMermaidBlock(doc, lineNumber)
}

function getMermaidEnterPosition(block: MermaidBlock, doc: EditorView['state']['doc']): number | null {
  const firstContentLine = block.startLine + 1
  if (firstContentLine > doc.lines) return block.from
  const line = doc.line(firstContentLine)
  return line.from
}

function collectVisibleMermaidBlocks(view: EditorView): MermaidBlock[] {
  const doc = view.state.doc
  const ranges = view.visibleRanges
  const blocks: MermaidBlock[] = []
  const seenStarts = new Set<number>()

  for (const range of ranges) {
    const startLineNumber = doc.lineAt(range.from).number
    const endLineNumber = doc.lineAt(range.to).number

    const openStart = findMermaidStartForLine(doc, startLineNumber)
    if (openStart != null && !seenStarts.has(openStart)) {
      const block = collectMermaidBlock(doc, openStart)
      if (block && blockIntersectsVisibleRanges(block, ranges)) {
        blocks.push(block)
        seenStarts.add(openStart)
      }
    }

    for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber += 1) {
      if (seenStarts.has(lineNumber)) continue
      const line = doc.line(lineNumber)
      const lang = getFenceLang(line.text)
      if (lang !== MERMAID_LANG) continue

      const block = collectMermaidBlock(doc, lineNumber)
      if (block && blockIntersectsVisibleRanges(block, ranges)) {
        blocks.push(block)
        seenStarts.add(lineNumber)
      }
    }
  }

  return blocks
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

class HiddenMarkerWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-livePreview-hidden'
    span.setAttribute('aria-hidden', 'true')
    return span
  }

  ignoreEvent() {
    return true
  }
}

class TaskCheckboxWidget extends WidgetType {
  private readonly checked: boolean
  private readonly togglePos: number

  constructor(checked: boolean, togglePos: number) {
    super()
    this.checked = checked
    this.togglePos = togglePos
  }

  eq(other: TaskCheckboxWidget) {
    return this.checked === other.checked && this.togglePos === other.togglePos
  }

  toDOM(view: EditorView) {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = this.checked
    input.className = 'cm-livePreview-taskToggle'
    input.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      const next = this.checked ? ' ' : 'x'
      view.dispatch({
        changes: { from: this.togglePos, to: this.togglePos + 1, insert: next },
      })
      view.focus()
    })
    return input
  }

  ignoreEvent() {
    return false
  }
}

function addInlineMark(
  decorations: Array<{ from: number; to: number; decoration: Decoration }>,
  from: number,
  to: number,
  className: string,
) {
  if (to <= from) return
  decorations.push({ from, to, decoration: Decoration.mark({ class: className }) })
}

function buildInlineLivePreviewDecorations(view: EditorView): DecorationSet {
  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = []
  const selections = view.state.selection.ranges

  const selectionIntersects = (from: number, to: number) =>
    selections.some((range) => shouldHideMarkup(from, to, range.from, range.to) === false)

  for (const range of view.visibleRanges) {
    let pos = range.from
    const startLineNumber = view.state.doc.lineAt(range.from).number
    let inMermaidBlock = findMermaidStartForLine(view.state.doc, startLineNumber) != null
    while (pos <= range.to) {
      const line = view.state.doc.lineAt(pos)
      if (line.from > range.to) break

      const text = line.text

      const fenceLang = getFenceLang(text)
      if (fenceLang != null) {
        if (fenceLang === MERMAID_LANG) {
          inMermaidBlock = true
        } else if (inMermaidBlock) {
          inMermaidBlock = false
        }
        pos = line.to + 1
        continue
      }

      if (inMermaidBlock) {
        pos = line.to + 1
        continue
      }

      const headingMatch = /^\s{0,3}(#{1,6})\s+/.exec(text)
      if (headingMatch) {
        const level = headingMatch[1]?.length ?? 1
        const markerLen = headingMatch[0]?.length ?? level
        const markerFrom = line.from
        const markerTo = line.from + markerLen
        decorations.push({
          from: line.from,
          to: line.to,
          decoration: Decoration.mark({ class: `cm-livePreview-heading cm-livePreview-h${level}` }),
        })
        if (!selectionIntersects(markerFrom, markerTo)) {
          decorations.push({
            from: markerFrom,
            to: markerTo,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
        }
      }

      const taskMatch = TASK_RE.exec(text)
      if (taskMatch) {
        const bracketIndex = taskMatch[0].indexOf('[')
        if (bracketIndex >= 0) {
          const bracketFrom = line.from + bracketIndex
          const togglePos = bracketFrom + 1
          const checked = (taskMatch[1] ?? '').toLowerCase() === 'x'
          const bracketTo = bracketFrom + 3
          if (!selectionIntersects(bracketFrom, bracketTo)) {
            decorations.push({
              from: bracketFrom,
              to: bracketTo,
              decoration: Decoration.replace({ widget: new TaskCheckboxWidget(checked, togglePos) }),
            })
          }
        }
      }

      const codeRanges: Array<{ from: number; to: number }> = []
      for (const match of text.matchAll(new RegExp(INLINE_CODE_RE.source, INLINE_CODE_RE.flags))) {
        if (match.index == null) continue
        const start = line.from + match.index + 1
        const end = start + (match[1]?.length ?? 0)
        const markerFrom = line.from + match.index
        const markerTo = end + 1
        codeRanges.push({ from: markerFrom, to: markerTo })
        addInlineMark(decorations, start, end, 'cm-livePreview-code')
        if (!selectionIntersects(markerFrom, markerTo)) {
          decorations.push({
            from: markerFrom,
            to: markerFrom + 1,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
          decorations.push({
            from: end,
            to: end + 1,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
        }
      }

      for (const match of text.matchAll(new RegExp(BOLD_RE.source, BOLD_RE.flags))) {
        if (match.index == null) continue
        const start = line.from + match.index + 2
        const end = start + (match[1]?.length ?? 0)
        const markerFrom = line.from + match.index
        const markerTo = end + 2
        addInlineMark(decorations, start, end, 'cm-livePreview-bold')
        if (!selectionIntersects(markerFrom, markerTo)) {
          decorations.push({
            from: markerFrom,
            to: markerFrom + 2,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
          decorations.push({
            from: end,
            to: end + 2,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
        }
      }

      for (const match of text.matchAll(new RegExp(BOLD_UNDER_RE.source, BOLD_UNDER_RE.flags))) {
        if (match.index == null) continue
        const start = line.from + match.index + 2
        const end = start + (match[1]?.length ?? 0)
        const markerFrom = line.from + match.index
        const markerTo = end + 2
        addInlineMark(decorations, start, end, 'cm-livePreview-bold')
        if (!selectionIntersects(markerFrom, markerTo)) {
          decorations.push({
            from: markerFrom,
            to: markerFrom + 2,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
          decorations.push({
            from: end,
            to: end + 2,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
        }
      }

      for (const match of text.matchAll(new RegExp(ITALIC_RE.source, ITALIC_RE.flags))) {
        if (match.index == null) continue
        const prefixLen = match[1]?.length ?? 0
        const start = line.from + match.index + prefixLen + 1
        const end = start + (match[2]?.length ?? 0)
        const markerFrom = line.from + match.index + prefixLen
        const markerTo = end + 1
        addInlineMark(decorations, start, end, 'cm-livePreview-italic')
        if (!selectionIntersects(markerFrom, markerTo)) {
          decorations.push({
            from: markerFrom,
            to: markerFrom + 1,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
          decorations.push({
            from: end,
            to: end + 1,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
        }
      }

      for (const match of text.matchAll(new RegExp(ITALIC_UNDER_RE.source, ITALIC_UNDER_RE.flags))) {
        if (match.index == null) continue
        const prefixLen = match[1]?.length ?? 0
        const start = line.from + match.index + prefixLen + 1
        const end = start + (match[2]?.length ?? 0)
        const markerFrom = line.from + match.index + prefixLen
        const markerTo = end + 1
        addInlineMark(decorations, start, end, 'cm-livePreview-italic')
        if (!selectionIntersects(markerFrom, markerTo)) {
          decorations.push({
            from: markerFrom,
            to: markerFrom + 1,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
          decorations.push({
            from: end,
            to: end + 1,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
        }
      }

      for (const match of text.matchAll(new RegExp(WIKILINK_RE.source, WIKILINK_RE.flags))) {
        if (match.index == null) continue
        const full = match[0] ?? ''
        const inner = match[1] ?? ''
        const linkFrom = line.from + match.index
        const linkTo = linkFrom + full.length
        const innerFrom = linkFrom + 2
        const innerTo = innerFrom + inner.length

        if (codeRanges.some((range) => linkFrom < range.to && linkTo > range.from)) {
          continue
        }

        addInlineMark(decorations, innerFrom, innerTo, 'cm-livePreview-wikilink')

        if (!selectionIntersects(linkFrom, linkTo)) {
          decorations.push({
            from: linkFrom,
            to: linkFrom + 2,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
          decorations.push({
            from: linkTo - 2,
            to: linkTo,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
        }
      }

      pos = line.to + 1
    }
  }

  const builder = new RangeSetBuilder<Decoration>()
  decorations
    .sort((a, b) => (a.from === b.from ? a.to - b.to : a.from - b.from))
    .forEach((entry) => builder.add(entry.from, entry.to, entry.decoration))
  return builder.finish()
}

function buildMermaidDecorations(view: EditorView, options: LivePreviewOptions): DecorationSet {
  const renderDiagrams = options.renderDiagrams !== false
  if (!renderDiagrams) return Decoration.none

  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = []
  const selections = view.state.selection.ranges

  const selectionIntersects = (from: number, to: number) =>
    selections.some((range) => shouldHideMarkup(from, to, range.from, range.to) === false)

  const theme: MermaidTheme = options.theme ?? 'dark'
  const blocks = collectVisibleMermaidBlocks(view)

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

export type LivePreviewOptions = {
  onOpenWikilink?: (rawTarget: string) => void
  renderDiagrams?: boolean
  theme?: MermaidTheme
}

function createLivePreviewPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildInlineLivePreviewDecorations(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = buildInlineLivePreviewDecorations(update.view)
        }
      }
    },
    {
      decorations: (value) => value.decorations,
    },
  )
}

function createMermaidDecorationsPlugin(options: LivePreviewOptions) {
  return ViewPlugin.fromClass(
    class {
      private readonly options: LivePreviewOptions
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

        const decorations = buildMermaidDecorations(view, this.options)
        view.dispatch({
          effects: setMermaidDecorations.of(decorations),
          annotations: Transaction.addToHistory.of(false),
        })
        this.hasRendered = true
      }
    },
  )
}

export function createLivePreviewExtension(options: LivePreviewOptions = {}): Extension[] {
  let mouseDownCoords: { x: number; y: number } | null = null
  let mouseDownLink: string | null = null

  const handlers = EditorView.domEventHandlers({
    mousedown: (event, view) => {
      if (event.button !== 0) return false
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      mouseDownCoords = { x: event.clientX, y: event.clientY }
      mouseDownLink = null
      if (pos != null) {
        const line = view.state.doc.lineAt(pos)
        const match = extractWikilinkAt(line.text, pos - line.from)
        if (match) {
          mouseDownLink = match.rawTarget
        }
      }
      return false
    },
    mouseup: (event) => {
      if (!options.onOpenWikilink) return false
      if (event.button !== 0) return false
      if (event.shiftKey || event.altKey) return false
      if (!mouseDownCoords || !mouseDownLink) return false

      const dx = Math.abs(event.clientX - mouseDownCoords.x)
      const dy = Math.abs(event.clientY - mouseDownCoords.y)
      const dragThreshold = 3
      if (dx > dragThreshold || dy > dragThreshold) return false

      event.preventDefault()
      options.onOpenWikilink(mouseDownLink)
      return false
    },
  })

  const mermaidKeymap = keymap.of([
    {
      key: 'ArrowDown',
      run: (view) => {
        const selection = view.state.selection.main
        if (!selection.empty) return false

        const line = view.state.doc.lineAt(selection.head)
        const nextLineNumber = line.number + 1
        if (nextLineNumber > view.state.doc.lines) return false

        const block = findMermaidBlockAtLine(view.state.doc, nextLineNumber)
        if (!block) return false

        const target = getMermaidEnterPosition(block, view.state.doc)
        if (target == null) return false

        view.dispatch({
          selection: { anchor: target },
          scrollIntoView: true,
        })
        return true
      },
    },
  ])

  return [
    mermaidDecorationsField,
    createMermaidDecorationsPlugin(options),
    createLivePreviewPlugin(),
    handlers,
    mermaidKeymap,
  ]
}
