import { RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'

import { readVaultImage } from '../tauri'
import { extractImageMarkups, isRemoteImageTarget, resolveImageTarget } from './imagePreviewHelpers'
import { shouldHideMarkup } from './livePreviewHelpers'
import { findMermaidStartForLine, getFenceLang, MERMAID_LANG } from './mermaidBlocks'

const WIKILINK_RE = /\[\[([^\]]+?)\]\]/g
const INLINE_CODE_RE = /`([^`]+)`/g
const BOLD_RE = /\*\*([^*]+)\*\*/g
const BOLD_UNDER_RE = /__([^_]+)__/g
const ITALIC_RE = /(^|[^*])\*([^*]+)\*(?!\*)/g
const ITALIC_UNDER_RE = /(^|[^_])_([^_]+)_(?!_)/g
const TASK_RE = /^\s*(?:[-+*])\s+\[( |x|X)\]/

type InlineLivePreviewOptions = {
  renderImages?: boolean
  vaultPath?: string
  noteRelPath?: string
  onOpenImage?: (url: string, alt?: string) => void
}

type ImageCacheEntry = {
  url: string
  mtimeMs: number
  mime: string
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

class ImagePlaceholderWidget extends WidgetType {
  private readonly label: string

  constructor(label: string) {
    super()
    this.label = label
  }

  eq(other: ImagePlaceholderWidget) {
    return this.label === other.label
  }

  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-livePreview-imagePlaceholder'
    span.textContent = this.label
    return span
  }

  ignoreEvent() {
    return true
  }
}

class ImageWidget extends WidgetType {
  private readonly cacheKey: string
  private readonly vaultPath: string
  private readonly relPath: string
  private readonly alt: string
  private readonly onOpenImage?: (url: string, alt?: string) => void
  private readonly cache: Map<string, ImageCacheEntry>
  private readonly pending: Map<string, Promise<ImageCacheEntry | null>>

  constructor(options: {
    cacheKey: string
    vaultPath: string
    relPath: string
    alt: string
    onOpenImage?: (url: string, alt?: string) => void
    cache: Map<string, ImageCacheEntry>
    pending: Map<string, Promise<ImageCacheEntry | null>>
  }) {
    super()
    this.cacheKey = options.cacheKey
    this.vaultPath = options.vaultPath
    this.relPath = options.relPath
    this.alt = options.alt
    this.onOpenImage = options.onOpenImage
    this.cache = options.cache
    this.pending = options.pending
  }

  eq(other: ImageWidget) {
    return this.cacheKey === other.cacheKey
  }

  toDOM() {
    const wrapper = document.createElement('span')
    wrapper.className = 'cm-livePreview-imageWidget'

    const img = document.createElement('img')
    img.alt = this.alt
    img.loading = 'lazy'
    img.decoding = 'async'
    wrapper.appendChild(img)

    const cached = this.cache.get(this.cacheKey)
    if (cached) {
      img.src = cached.url
    } else {
      const debounceMs = 60
      window.setTimeout(() => {
        void this.loadImage(img, wrapper)
      }, debounceMs)
    }

    if (this.onOpenImage) {
      img.addEventListener('click', () => {
        if (!img.src) return
        this.onOpenImage?.(img.src, this.alt)
      })
    }

    return wrapper
  }

  private async loadImage(img: HTMLImageElement, wrapper: HTMLElement) {
    try {
      const entry = await loadImageAsset(
        this.cacheKey,
        this.vaultPath,
        this.relPath,
        this.cache,
        this.pending,
      )
      if (!entry) {
        wrapper.replaceChildren(new ImagePlaceholderWidget('image not found').toDOM())
        return
      }
      img.src = entry.url
    } catch {
      wrapper.replaceChildren(new ImagePlaceholderWidget('image not found').toDOM())
    }
  }

  ignoreEvent() {
    return false
  }
}

async function loadImageAsset(
  cacheKey: string,
  vaultPath: string,
  relPath: string,
  cache: Map<string, ImageCacheEntry>,
  pending: Map<string, Promise<ImageCacheEntry | null>>,
): Promise<ImageCacheEntry | null> {
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const existing = pending.get(cacheKey)
  if (existing) return existing

  const promise = (async () => {
    try {
      const response = await readVaultImage(vaultPath, relPath)
      const bytes = new Uint8Array(response.bytes)
      const blob = new Blob([bytes], { type: response.mime })
      const url = URL.createObjectURL(blob)
      const entry: ImageCacheEntry = {
        url,
        mtimeMs: response.mtime_ms,
        mime: response.mime,
      }

      const prior = cache.get(cacheKey)
      if (prior && prior.mtimeMs === entry.mtimeMs) {
        URL.revokeObjectURL(entry.url)
        return prior
      }
      if (prior) {
        URL.revokeObjectURL(prior.url)
      }
      cache.set(cacheKey, entry)
      return entry
    } catch {
      return null
    } finally {
      pending.delete(cacheKey)
    }
  })()

  pending.set(cacheKey, promise)
  return promise
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

function buildInlineLivePreviewDecorations(
  view: EditorView,
  options: InlineLivePreviewOptions,
  cache: Map<string, ImageCacheEntry>,
  pending: Map<string, Promise<ImageCacheEntry | null>>,
): DecorationSet {
  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = []
  const selections = view.state.selection.ranges

  const selectionIntersects = (from: number, to: number) =>
    selections.some((range) => shouldHideMarkup(from, to, range.from, range.to) === false)

  const canRenderImages =
    options.renderImages === true &&
    typeof options.vaultPath === 'string' &&
    options.vaultPath.length > 0 &&
    typeof options.noteRelPath === 'string' &&
    options.noteRelPath.length > 0
  const noteRelPath = options.noteRelPath ?? ''

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

      if (canRenderImages) {
        for (const image of extractImageMarkups(text)) {
          const markupFrom = line.from + image.from
          const markupTo = line.from + image.to
          if (markupTo <= markupFrom) continue
          if (codeRanges.some((range) => markupFrom < range.to && markupTo > range.from)) {
            continue
          }
          if (selectionIntersects(markupFrom, markupTo)) {
            continue
          }

          const altText = image.alt || image.target
          if (isRemoteImageTarget(image.target)) {
            decorations.push({
              from: markupFrom,
              to: markupTo,
              decoration: Decoration.replace({
                widget: new ImagePlaceholderWidget('remote images disabled'),
              }),
            })
            continue
          }

          const resolved = resolveImageTarget(noteRelPath, image.target)
          if (!resolved) {
            decorations.push({
              from: markupFrom,
              to: markupTo,
              decoration: Decoration.replace({
                widget: new ImagePlaceholderWidget('image not found'),
              }),
            })
            continue
          }

          const cacheKey = `${noteRelPath}:${markupFrom}-${markupTo}:${resolved}`
          decorations.push({
            from: markupFrom,
            to: markupTo,
            decoration: Decoration.replace({
              widget: new ImageWidget({
                cacheKey,
                vaultPath: options.vaultPath ?? '',
                relPath: resolved,
                alt: altText,
                onOpenImage: options.onOpenImage,
                cache,
                pending,
              }),
            }),
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

export function createInlineLivePreviewPlugin(options: InlineLivePreviewOptions = {}) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      cache: Map<string, ImageCacheEntry>
      pending: Map<string, Promise<ImageCacheEntry | null>>

      constructor(view: EditorView) {
        this.cache = new Map()
        this.pending = new Map()
        this.decorations = buildInlineLivePreviewDecorations(view, options, this.cache, this.pending)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = buildInlineLivePreviewDecorations(
            update.view,
            options,
            this.cache,
            this.pending,
          )
        }
      }

      destroy() {
        for (const entry of this.cache.values()) {
          URL.revokeObjectURL(entry.url)
        }
        this.cache.clear()
        this.pending.clear()
      }
    },
    {
      decorations: (value) => value.decorations,
    },
  )
}
