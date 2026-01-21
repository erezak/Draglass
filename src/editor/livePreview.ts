import { RangeSetBuilder, type Extension } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
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

function buildLivePreviewDecorations(view: EditorView): DecorationSet {
  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = []
  const selections = view.state.selection.ranges

  const selectionIntersects = (from: number, to: number) =>
    selections.some((range) => shouldHideMarkup(from, to, range.from, range.to) === false)

  for (const range of view.visibleRanges) {
    let pos = range.from
    while (pos <= range.to) {
      const line = view.state.doc.lineAt(pos)
      if (line.from > range.to) break

      const text = line.text

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

export const livePreviewExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildLivePreviewDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildLivePreviewDecorations(update.view)
      }
    }
  },
  {
    decorations: (value) => value.decorations,
  },
)

export type LivePreviewOptions = {
  onOpenWikilink?: (rawTarget: string) => void
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
    mouseup: (event, view) => {
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

  return [livePreviewExtension, handlers]
}
