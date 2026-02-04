import { type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'

import { extractWikilinkAt } from './livePreviewHelpers'
import { calloutDecorationsField, createCalloutDecorationsPlugin } from './calloutPreview'
import { createInlineLivePreviewPlugin } from './inlinePreview'
import { findMermaidBlockAtLine, getMermaidEnterPosition } from './mermaidBlocks'
import { createMermaidDecorationsPlugin, mermaidDecorationsField, type MermaidTheme } from './mermaidPreview'
import {
  lockedSectionDecorationsField,
  createLockedSectionDecorationsPlugin,
} from './lockedSectionPreview'
import type { HeadingSection, LockedBodyRange } from '../lockedSections'

export type LivePreviewOptions = {
  onOpenWikilink?: (rawTarget: string) => void
  onOpenImage?: (url: string, alt?: string) => void
  renderDiagrams?: boolean
  renderImages?: boolean
  renderCallouts?: boolean
  renderLockedSections?: boolean
  vaultPath?: string
  noteRelPath?: string
  theme?: MermaidTheme
  isVaultUnlocked?: boolean
  onRequestUnlock?: () => void
  onLockedSectionsDetected?: (sections: HeadingSection[], ranges: LockedBodyRange[]) => void
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

      // Ignore drags
      if (mouseDownCoords) {
        const dx = Math.abs(event.clientX - mouseDownCoords.x)
        const dy = Math.abs(event.clientY - mouseDownCoords.y)
        const dragThreshold = 3
        if (dx > dragThreshold || dy > dragThreshold) return false
      }

      // Prefer resolving a wikilink at the mouseup coordinates. This handles
      // cases where decorations weren't applied (so the markdown is visible)
      // but the user intent is navigation.
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos != null) {
        const line = view.state.doc.lineAt(pos)
        const match = extractWikilinkAt(line.text, pos - line.from)
        if (match) {
          event.preventDefault()
          options.onOpenWikilink(match.rawTarget)
          return false
        }
      }

      // Fallback to previously captured mouseDownLink
      if (mouseDownLink) {
        event.preventDefault()
        options.onOpenWikilink(mouseDownLink)
        return false
      }

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
    createMermaidDecorationsPlugin({
      renderDiagrams: options.renderDiagrams,
      theme: options.theme,
    }),
    calloutDecorationsField,
    createCalloutDecorationsPlugin({
      renderCallouts: options.renderCallouts,
      noteRelPath: options.noteRelPath,
    }),
    lockedSectionDecorationsField,
    createLockedSectionDecorationsPlugin({
      renderLockedSections: options.renderLockedSections,
      noteRelPath: options.noteRelPath,
      isVaultUnlocked: options.isVaultUnlocked,
      onRequestUnlock: options.onRequestUnlock,
      onLockedSectionsDetected: options.onLockedSectionsDetected,
    }),
    createInlineLivePreviewPlugin({
      renderImages: options.renderImages,
      vaultPath: options.vaultPath,
      noteRelPath: options.noteRelPath,
      onOpenImage: options.onOpenImage,
    }),
    handlers,
    mermaidKeymap,
  ]
}
