import { type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'

import { extractWikilinkAt } from './livePreviewHelpers'
import { createInlineLivePreviewPlugin } from './inlinePreview'
import { findMermaidBlockAtLine, getMermaidEnterPosition } from './mermaidBlocks'
import { createMermaidDecorationsPlugin, mermaidDecorationsField, type MermaidTheme } from './mermaidPreview'

export type LivePreviewOptions = {
  onOpenWikilink?: (rawTarget: string) => void
  renderDiagrams?: boolean
  theme?: MermaidTheme
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
    createMermaidDecorationsPlugin({
      renderDiagrams: options.renderDiagrams,
      theme: options.theme,
    }),
    createInlineLivePreviewPlugin(),
    handlers,
    mermaidKeymap,
  ]
}
