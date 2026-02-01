import { RangeSetBuilder, StateEffect, StateField, Transaction, type Extension } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'

import { shouldHideMarkup } from './livePreviewHelpers'
import {
  collectVisibleCalloutBlocks,
  generateCollapseKey,
  getCalloutDefaultCollapsed,
  getCalloutTypeInfo,
  getQuoteDepth,
  getQuoteMarkerRange,
} from './calloutBlocks'

type CalloutPreviewOptions = {
  renderCallouts?: boolean
  noteRelPath?: string
}

type CollapseStore = Record<string, Record<string, boolean>>

type CalloutTogglePayload = {
  noteRelPath: string
  key: string
  collapsed: boolean
}

const calloutToggleEffect = StateEffect.define<CalloutTogglePayload>()
const setCalloutDecorations = StateEffect.define<DecorationSet>()

export const calloutDecorationsField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setCalloutDecorations)) {
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

const CALLOUT_COLLAPSE_STORAGE_KEY = 'draglass.calloutCollapse.v1'
const MAX_COLLAPSE_ENTRIES_PER_NOTE = 80

function loadCollapseStore(): CollapseStore {
  try {
    const raw = localStorage.getItem(CALLOUT_COLLAPSE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as CollapseStore
  } catch {
    return {}
  }
}

function saveCollapseStore(store: CollapseStore) {
  try {
    localStorage.setItem(CALLOUT_COLLAPSE_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore
  }
}

function getCalloutCollapseState(noteRelPath: string, key: string): boolean | null {
  const store = loadCollapseStore()
  const noteState = store[noteRelPath]
  if (!noteState || typeof noteState !== 'object') return null
  return typeof noteState[key] === 'boolean' ? noteState[key] : null
}

function setCalloutCollapseState(noteRelPath: string, key: string, collapsed: boolean) {
  const store = loadCollapseStore()
  const noteState = store[noteRelPath] ?? {}
  noteState[key] = collapsed

  const keys = Object.keys(noteState)
  if (keys.length > MAX_COLLAPSE_ENTRIES_PER_NOTE) {
    const excess = keys.length - MAX_COLLAPSE_ENTRIES_PER_NOTE
    for (let i = 0; i < excess; i += 1) {
      delete noteState[keys[i] ?? '']
    }
  }

  store[noteRelPath] = noteState
  saveCollapseStore(store)
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

class CalloutHeaderWidget extends WidgetType {
  private readonly canonicalType: string
  private readonly title: string
  private readonly iconPath: string
  private readonly collapsed: boolean
  private readonly noteRelPath: string
  private readonly collapseKey: string
  private readonly isSolo: boolean

  constructor(options: {
    canonicalType: string
    title: string
    iconPath: string
    collapsed: boolean
    noteRelPath: string
    collapseKey: string
    isSolo: boolean
  }) {
    super()
    this.canonicalType = options.canonicalType
    this.title = options.title
    this.iconPath = options.iconPath
    this.collapsed = options.collapsed
    this.noteRelPath = options.noteRelPath
    this.collapseKey = options.collapseKey
    this.isSolo = options.isSolo
  }

  eq(other: CalloutHeaderWidget) {
    return (
      this.canonicalType === other.canonicalType &&
      this.title === other.title &&
      this.iconPath === other.iconPath &&
      this.collapsed === other.collapsed &&
      this.collapseKey === other.collapseKey
    )
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement('div')
    wrapper.className = [
      'cm-livePreview-callout',
      `cm-livePreview-callout--${this.canonicalType}`,
      'cm-livePreview-calloutHeader',
      'cm-livePreview-calloutStart',
      this.isSolo ? 'cm-livePreview-calloutEnd' : '',
      this.collapsed ? 'cm-livePreview-callout--collapsed' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const content = document.createElement('div')
    content.className = 'cm-livePreview-calloutHeaderContent'

    const icon = createIconElement(this.iconPath)
    icon.classList.add('cm-livePreview-calloutIcon')

    const title = document.createElement('span')
    title.className = 'cm-livePreview-calloutTitle'
    title.textContent = this.title
    content.appendChild(icon)
    content.appendChild(title)

    if (!this.isSolo) {
      const chevron = document.createElement('button')
      chevron.type = 'button'
      chevron.className = 'cm-livePreview-calloutToggle'
      chevron.setAttribute('aria-label', this.collapsed ? 'Expand callout' : 'Collapse callout')
      chevron.setAttribute('aria-expanded', String(!this.collapsed))

      const chevronIcon = document.createElement('span')
      chevronIcon.className = 'cm-livePreview-calloutChevron'
      chevron.appendChild(chevronIcon)

      const stopSelection = (event: Event) => {
        event.preventDefault()
        event.stopPropagation()
      }

      chevron.addEventListener('pointerdown', stopSelection)
      chevron.addEventListener('mousedown', stopSelection)
      chevron.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const next = !this.collapsed
        setCalloutCollapseState(this.noteRelPath, this.collapseKey, next)
        view.dispatch({
          effects: calloutToggleEffect.of({
            noteRelPath: this.noteRelPath,
            key: this.collapseKey,
            collapsed: next,
          }),
        })
        view.focus()
      })

      content.appendChild(chevron)
    }

    wrapper.appendChild(content)
    return wrapper
  }

  ignoreEvent() {
    return false
  }
}

function createIconElement(path: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  p.setAttribute('d', path)
  p.setAttribute('fill', 'currentColor')
  svg.appendChild(p)
  return svg
}

function buildCalloutDecorations(view: EditorView, options: CalloutPreviewOptions): DecorationSet {
  if (options.renderCallouts === false) return Decoration.none

  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = []
  const selections = view.state.selection.ranges

  const selectionIntersects = (from: number, to: number) =>
    selections.some((range) => shouldHideMarkup(from, to, range.from, range.to) === false)

  const blocks = collectVisibleCalloutBlocks(view)
  const noteRelPath = options.noteRelPath ?? 'unknown'

  for (const block of blocks) {
    if (selectionIntersects(block.from, block.to)) continue

    const headerLine = view.state.doc.line(block.startLine)
    const typeInfo = getCalloutTypeInfo(block.header.canonicalType)
    const iconPath = typeInfo?.iconPath ?? ''
    const title = block.header.title
    const collapseKey = generateCollapseKey(noteRelPath, block.startLine, block.header)
    const storedCollapsed = getCalloutCollapseState(noteRelPath, collapseKey)
    const collapsed = storedCollapsed ?? getCalloutDefaultCollapsed(block.header.modifier)
    const isSolo = block.endLine === block.startLine

    const headerWidget = new CalloutHeaderWidget({
      canonicalType: block.header.canonicalType,
      title,
      iconPath,
      collapsed,
      noteRelPath,
      collapseKey,
      isSolo,
    })

    decorations.push({
      from: headerLine.from,
      to: headerLine.to,
      decoration: Decoration.replace({ widget: headerWidget, block: true }),
    })

    for (let lineNumber = block.startLine + 1; lineNumber <= block.endLine; lineNumber += 1) {
      const line = view.state.doc.line(lineNumber)
      const lineDepth = getQuoteDepth(line.text)
      if (lineDepth === 0) continue

      const classes = [
        'cm-livePreview-callout',
        `cm-livePreview-callout--${block.header.canonicalType}`,
        'cm-livePreview-calloutBody',
        collapsed ? 'cm-livePreview-callout--collapsed' : '',
      ]

      if (lineNumber === block.endLine) {
        classes.push('cm-livePreview-calloutEnd')
      }

      decorations.push({
        from: line.from,
        to: line.from,
        decoration: Decoration.line({ class: classes.filter(Boolean).join(' ') }),
      })

      if (lineDepth === block.depth) {
        const marker = getQuoteMarkerRange(line.text, block.depth)
        if (marker && !selectionIntersects(line.from, line.to)) {
          decorations.push({
            from: line.from + marker.start,
            to: line.from + marker.end,
            decoration: Decoration.replace({ widget: new HiddenMarkerWidget() }),
          })
        }
      }
    }
  }

  const builder = new RangeSetBuilder<Decoration>()
  decorations
    .sort((a, b) => (a.from === b.from ? a.to - b.to : a.from - b.from))
    .forEach((entry) => builder.add(entry.from, entry.to, entry.decoration))
  return builder.finish()
}

export function createCalloutDecorationsPlugin(options: CalloutPreviewOptions = {}): Extension {
  return ViewPlugin.fromClass(
    class {
      private pendingUpdate: number | null = null
      private pendingUsesTimeout = false

      constructor(view: EditorView) {
        this.scheduleUpdate(view)
      }

      update(update: ViewUpdate) {
        const hasToggle = update.transactions.some((tr) =>
          tr.effects.some((effect) => effect.is(calloutToggleEffect)),
        )
        if (update.docChanged || update.selectionSet || update.viewportChanged || hasToggle) {
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

      private scheduleUpdate(view: EditorView) {
        if (this.pendingUpdate != null) return

        if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
          this.pendingUsesTimeout = false
          this.pendingUpdate = window.requestAnimationFrame(() => {
            this.pendingUpdate = null
            this.updateCalloutDecorations(view)
          })
          return
        }

        this.pendingUsesTimeout = true
        this.pendingUpdate = setTimeout(() => {
          this.pendingUpdate = null
          this.updateCalloutDecorations(view)
        }, 16) as unknown as number
      }

      private updateCalloutDecorations(view: EditorView) {
        const decorations = buildCalloutDecorations(view, options)
        view.dispatch({
          effects: setCalloutDecorations.of(decorations),
          annotations: Transaction.addToHistory.of(false),
        })
      }
    },
  )
}
