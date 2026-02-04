/**
 * Locked Section Preview
 *
 * Live Preview decorations for locked sections:
 * - Lock icon on explicitly locked headers
 * - Hide/fold locked body content when vault is not authenticated
 * - Placeholder for folded locked content
 */

import {
  RangeSetBuilder,
  StateEffect,
  StateField,
  Transaction,
  type Extension,
} from '@codemirror/state'
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
  parseLockedSections,
  type HeadingSection,
  type LockedBodyRange,
  generateLockFoldKey,
} from '../lockedSections'

export type LockedSectionPreviewOptions = {
  /** Whether to render locked section decorations */
  renderLockedSections?: boolean
  /** Relative path of the current note */
  noteRelPath?: string
  /** Whether the vault is currently authenticated */
  isVaultUnlocked?: boolean
  /** Callback when user clicks the lock icon to request unlock */
  onRequestUnlock?: () => void
  /** Callback to notify when locked sections are detected */
  onLockedSectionsDetected?: (sections: HeadingSection[], ranges: LockedBodyRange[]) => void
}

type FoldStore = Record<string, Record<string, boolean>>

type FoldTogglePayload = {
  noteRelPath: string
  key: string
  folded: boolean
}

const foldToggleEffect = StateEffect.define<FoldTogglePayload>()
const setLockedDecorations = StateEffect.define<DecorationSet>()

export const lockedSectionDecorationsField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setLockedDecorations)) {
        return effect.value
      }
    }
    // Map decorations through doc changes to preserve them
    // until the ViewPlugin dispatches new decorations
    if (tr.docChanged) {
      return value.map(tr.changes)
    }
    return value
  },
  provide: (field) => EditorView.decorations.from(field),
})

const FOLD_STORAGE_KEY = 'draglass.lockedSectionFolds.v1'
const MAX_FOLD_ENTRIES_PER_NOTE = 50

function loadFoldStore(): FoldStore {
  try {
    const raw = localStorage.getItem(FOLD_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as FoldStore
  } catch {
    return {}
  }
}

function saveFoldStore(store: FoldStore) {
  try {
    localStorage.setItem(FOLD_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore
  }
}

function getFoldState(noteRelPath: string, key: string): boolean | null {
  const store = loadFoldStore()
  const noteState = store[noteRelPath]
  if (!noteState || typeof noteState !== 'object') return null
  return typeof noteState[key] === 'boolean' ? noteState[key] : null
}

function setFoldState(noteRelPath: string, key: string, folded: boolean) {
  const store = loadFoldStore()
  const noteState = store[noteRelPath] ?? {}
  noteState[key] = folded

  const keys = Object.keys(noteState)
  if (keys.length > MAX_FOLD_ENTRIES_PER_NOTE) {
    const excess = keys.length - MAX_FOLD_ENTRIES_PER_NOTE
    for (let i = 0; i < excess; i += 1) {
      delete noteState[keys[i] ?? '']
    }
  }

  store[noteRelPath] = noteState
  saveFoldStore(store)
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

class LockedHeaderWidget extends WidgetType {
  private readonly title: string
  private readonly level: number
  private readonly isUnlocked: boolean
  private readonly isFolded: boolean
  private readonly noteRelPath: string
  private readonly foldKey: string
  private readonly hasBody: boolean
  private readonly onRequestUnlock?: () => void

  constructor(options: {
    title: string
    level: number
    isUnlocked: boolean
    isFolded: boolean
    noteRelPath: string
    foldKey: string
    hasBody: boolean
    onRequestUnlock?: () => void
  }) {
    super()
    this.title = options.title
    this.level = options.level
    this.isUnlocked = options.isUnlocked
    this.isFolded = options.isFolded
    this.noteRelPath = options.noteRelPath
    this.foldKey = options.foldKey
    this.hasBody = options.hasBody
    this.onRequestUnlock = options.onRequestUnlock
  }

  eq(other: LockedHeaderWidget) {
    return (
      this.title === other.title &&
      this.level === other.level &&
      this.isUnlocked === other.isUnlocked &&
      this.isFolded === other.isFolded &&
      this.foldKey === other.foldKey
    )
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement('div')
    wrapper.className = [
      'cm-livePreview-lockedHeader',
      `cm-livePreview-lockedHeader--h${this.level}`,
      this.isUnlocked ? 'cm-livePreview-lockedHeader--unlocked' : '',
      this.isFolded ? 'cm-livePreview-lockedHeader--folded' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const content = document.createElement('div')
    content.className = 'cm-livePreview-lockedHeaderContent'

    // Lock icon button
    const lockButton = document.createElement('button')
    lockButton.type = 'button'
    lockButton.className = `cm-livePreview-lockButton ${this.isUnlocked ? 'cm-livePreview-lockButton--unlocked' : ''}`
    lockButton.setAttribute('aria-label', this.isUnlocked ? 'Section revealed' : 'Click to reveal')
    lockButton.title = this.isUnlocked ? 'Section revealed' : 'Click to reveal'

    const lockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    lockSvg.setAttribute('viewBox', '0 0 16 16')
    lockSvg.setAttribute('aria-hidden', 'true')

    const lockPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    lockPath.setAttribute('fill', 'currentColor')
    lockPath.setAttribute('d', 'M11 5V4a3 3 0 0 0-6 0v1H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1ZM6 4a2 2 0 1 1 4 0v1H6V4Zm2 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z')
    lockSvg.appendChild(lockPath)
    lockButton.appendChild(lockSvg)

    const stopSelection = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
    }

    lockButton.addEventListener('pointerdown', stopSelection)
    lockButton.addEventListener('mousedown', stopSelection)
    lockButton.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (!this.isUnlocked) {
        this.onRequestUnlock?.()
      }
    })

    content.appendChild(lockButton)

    // Title
    const titleSpan = document.createElement('span')
    titleSpan.className = 'cm-livePreview-lockedTitle'
    titleSpan.textContent = this.title
    content.appendChild(titleSpan)

    // Fold toggle (only if there's body content and vault is unlocked)
    if (this.hasBody && this.isUnlocked) {
      const foldButton = document.createElement('button')
      foldButton.type = 'button'
      foldButton.className = 'cm-livePreview-foldToggle'
      foldButton.setAttribute('aria-label', this.isFolded ? 'Expand section' : 'Collapse section')
      foldButton.setAttribute('aria-expanded', String(!this.isFolded))

      const chevron = document.createElement('span')
      chevron.className = 'cm-livePreview-foldChevron'
      foldButton.appendChild(chevron)

      foldButton.addEventListener('pointerdown', stopSelection)
      foldButton.addEventListener('mousedown', stopSelection)
      foldButton.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const next = !this.isFolded
        setFoldState(this.noteRelPath, this.foldKey, next)
        view.dispatch({
          effects: foldToggleEffect.of({
            noteRelPath: this.noteRelPath,
            key: this.foldKey,
            folded: next,
          }),
        })
        view.focus()
      })

      content.appendChild(foldButton)
    }

    wrapper.appendChild(content)
    return wrapper
  }

  ignoreEvent() {
    return false
  }
}

class LockedPlaceholderWidget extends WidgetType {
  private readonly onRequestUnlock?: () => void

  constructor(options: { onRequestUnlock?: () => void }) {
    super()
    this.onRequestUnlock = options.onRequestUnlock
  }

  toDOM() {
    const wrapper = document.createElement('div')
    wrapper.className = 'cm-livePreview-lockedPlaceholder'

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    icon.setAttribute('viewBox', '0 0 16 16')
    icon.setAttribute('aria-hidden', 'true')
    icon.classList.add('cm-livePreview-lockedPlaceholderIcon')

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('fill', 'currentColor')
    path.setAttribute('d', 'M11 5V4a3 3 0 0 0-6 0v1H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1ZM6 4a2 2 0 1 1 4 0v1H6V4Zm2 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z')
    icon.appendChild(path)
    wrapper.appendChild(icon)

    const text = document.createElement('span')
    text.className = 'cm-livePreview-lockedPlaceholderText'
    text.textContent = 'Locked content'
    wrapper.appendChild(text)

    const hint = document.createElement('button')
    hint.type = 'button'
    hint.className = 'cm-livePreview-lockedPlaceholderHint'
    hint.textContent = 'Click lock to unlock'

    const stopSelection = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
    }

    hint.addEventListener('pointerdown', stopSelection)
    hint.addEventListener('mousedown', stopSelection)
    hint.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.onRequestUnlock?.()
    })

    wrapper.appendChild(hint)

    return wrapper
  }

  ignoreEvent() {
    return false
  }
}

function buildLockedSectionDecorations(
  view: EditorView,
  options: LockedSectionPreviewOptions,
): DecorationSet {
  if (options.renderLockedSections === false) return Decoration.none

  const text = view.state.doc.toString()
  const { sections, lockedBodyRanges } = parseLockedSections(text)

  // Notify caller of detected sections
  options.onLockedSectionsDetected?.(sections, lockedBodyRanges)

  // If no locked sections, return empty
  const lockedSections = sections.filter((s) => s.isExplicitlyLocked || s.isLockedByParent)
  if (lockedSections.length === 0) return Decoration.none

  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = []
  const selections = view.state.selection.ranges
  const noteRelPath = options.noteRelPath ?? 'unknown'
  const isUnlocked = options.isVaultUnlocked ?? false

  const selectionIntersects = (from: number, to: number) =>
    selections.some((range) => shouldHideMarkup(from, to, range.from, range.to) === false)

  // Process explicitly locked headers
  for (const section of sections) {
    if (!section.isExplicitlyLocked) continue

    const headerLine = view.state.doc.line(section.fromLine)
    const foldKey = generateLockFoldKey(noteRelPath, section)
    const storedFolded = getFoldState(noteRelPath, foldKey)
    const isFolded = storedFolded ?? true // Default to folded
    const hasBody = section.toLineExclusive > section.fromLine + 1

    // Don't replace if selection intersects
    if (selectionIntersects(headerLine.from, headerLine.to)) continue

    const headerWidget = new LockedHeaderWidget({
      title: section.titleText,
      level: section.level,
      isUnlocked,
      isFolded,
      noteRelPath,
      foldKey,
      hasBody,
      onRequestUnlock: options.onRequestUnlock,
    })

    decorations.push({
      from: headerLine.from,
      to: headerLine.to,
      decoration: Decoration.replace({ widget: headerWidget, block: true }),
    })
  }

  // Process locked body ranges
  for (const range of lockedBodyRanges) {
    // Find the section this range belongs to
    const section = sections.find(
      (s) =>
        (s.isExplicitlyLocked || s.isLockedByParent) &&
        range.fromLine === s.fromLine + 1 &&
        range.toLineExclusive === s.toLineExclusive,
    )

    if (!section) continue

    const foldKey = generateLockFoldKey(noteRelPath, section)
    const storedFolded = getFoldState(noteRelPath, foldKey)
    const isFolded = storedFolded ?? true

    // If vault is locked OR section is folded, hide the body
    const shouldHide = !isUnlocked || isFolded

    if (shouldHide) {
      // Check if selection is in this range
      const bodyFrom = range.from
      const bodyTo = range.to

      if (selectionIntersects(bodyFrom, bodyTo)) continue

      // Add placeholder for the first line of locked body
      if (range.fromLine <= view.state.doc.lines) {
        const firstBodyLine = view.state.doc.line(range.fromLine)

        // For locked (not just folded), show placeholder
        if (!isUnlocked) {
          decorations.push({
            from: firstBodyLine.from,
            to: firstBodyLine.to,
            decoration: Decoration.replace({
              widget: new LockedPlaceholderWidget({
                onRequestUnlock: options.onRequestUnlock,
              }),
              block: true,
            }),
          })
        } else {
          // Just hide when folded after unlock
          decorations.push({
            from: firstBodyLine.from,
            to: firstBodyLine.to,
            decoration: Decoration.replace({
              widget: new HiddenMarkerWidget(),
              block: true,
            }),
          })
        }
      }

      // Hide remaining body lines
      for (let lineNum = range.fromLine + 1; lineNum < range.toLineExclusive; lineNum++) {
        if (lineNum > view.state.doc.lines) break
        const line = view.state.doc.line(lineNum)
        decorations.push({
          from: line.from,
          to: line.to,
          decoration: Decoration.replace({
            widget: new HiddenMarkerWidget(),
            block: true,
          }),
        })
      }
    } else {
      // Body is visible - add subtle styling for locked body lines
      for (let lineNum = range.fromLine; lineNum < range.toLineExclusive; lineNum++) {
        if (lineNum > view.state.doc.lines) break
        const line = view.state.doc.line(lineNum)
        decorations.push({
          from: line.from,
          to: line.from,
          decoration: Decoration.line({ class: 'cm-livePreview-lockedBody' }),
        })
      }
    }
  }

  const builder = new RangeSetBuilder<Decoration>()
  decorations
    .sort((a, b) => (a.from === b.from ? a.to - b.to : a.from - b.from))
    .forEach((entry) => builder.add(entry.from, entry.to, entry.decoration))
  return builder.finish()
}

export function createLockedSectionDecorationsPlugin(
  options: LockedSectionPreviewOptions = {},
): Extension {
  return ViewPlugin.fromClass(
    class {
      private pendingUpdate: number | null = null
      private pendingUsesTimeout = false

      constructor(view: EditorView) {
        this.scheduleUpdate(view)
      }

      update(update: ViewUpdate) {
        const hasToggle = update.transactions.some((tr) =>
          tr.effects.some((effect) => effect.is(foldToggleEffect)),
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
            this.updateDecorations(view)
          })
          return
        }

        this.pendingUsesTimeout = true
        this.pendingUpdate = setTimeout(() => {
          this.pendingUpdate = null
          this.updateDecorations(view)
        }, 16) as unknown as number
      }

      private updateDecorations(view: EditorView) {
        const decorations = buildLockedSectionDecorations(view, options)
        view.dispatch({
          effects: setLockedDecorations.of(decorations),
          annotations: Transaction.addToHistory.of(false),
        })
      }
    },
  )
}
