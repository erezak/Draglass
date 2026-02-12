import { RangeSetBuilder, StateField, type Extension, type Text } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

type FrontmatterPreviewOptions = {
  hideFrontmatter?: boolean
}

function findFrontmatterEndLine(doc: Text): number {
  if (doc.lines < 1) return 0
  const firstLine = doc.line(1).text.trim()
  if (firstLine !== '---') return 0

  for (let lineNumber = 2; lineNumber <= doc.lines; lineNumber += 1) {
    const line = doc.line(lineNumber).text.trim()
    if (line === '---') return lineNumber
  }

  return 0
}

export const frontmatterEndLineField = StateField.define<number>({
  create(state) {
    return findFrontmatterEndLine(state.doc)
  },
  update(value, tr) {
    if (tr.docChanged) {
      return findFrontmatterEndLine(tr.state.doc)
    }
    return value
  },
})

function buildFrontmatterDecorations(view: EditorView): DecorationSet {
  const { doc } = view.state
  const endLine = findFrontmatterEndLine(doc)
  if (endLine === 0) return Decoration.none

  const builder = new RangeSetBuilder<Decoration>()
  for (let lineNumber = 1; lineNumber <= endLine; lineNumber += 1) {
    const line = doc.line(lineNumber)
    builder.add(line.from, line.from, Decoration.line({ class: 'cm-frontmatterHidden' }))
  }
  return builder.finish()
}

export function createFrontmatterDecorationsPlugin(
  options: FrontmatterPreviewOptions = {},
): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      private readonly options: FrontmatterPreviewOptions

      constructor(view: EditorView) {
        this.options = options
        this.decorations = options.hideFrontmatter ? buildFrontmatterDecorations(view) : Decoration.none
      }

      update(update: ViewUpdate) {
        if (!this.options.hideFrontmatter) {
          if (this.decorations !== Decoration.none) {
            this.decorations = Decoration.none
          }
          return
        }
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildFrontmatterDecorations(update.view)
        }
      }
    },
    {
      decorations: (value) => value.decorations,
    },
  )
}
