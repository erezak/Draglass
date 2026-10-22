# Live Preview research and implementation decisions

Live Preview formats Markdown inline while preserving editable source. Reading view displays a non-editable rendering; Source mode exposes Markdown syntax. Selection-aware decorations reveal syntax near the caret.

CodeMirror mark, replace, widget and line decorations change presentation without changing the underlying document. State fields provide decorations that affect block structure, while view plugins can specialize work to the viewport.

## Draglass 0.3 decisions

| Requirement | Implementation |
| --- | --- |
| Preserve Markdown and ordinary text editing | CodeMirror remains the document; presentation uses decorations |
| Reveal syntax near the caret | Selection-aware replacement decorations |
| Render common syntax | Lezer Markdown/GFM syntax tree, mark/line decorations |
| Wiki links | Additional syntax handling outside literal code |
| Tasks | Checkbox widget writes a one-character Markdown transaction |
| Tables | Editable cell widgets write only the original cell source range |
| Precise source access | Reversible Source mode and a table-source button |
| Keep autosave and undo | All edits enter the existing CodeMirror transaction pipeline |
| Performance | Direct state-field decorations for this slice; incremental/viewport optimization remains work |

The original editor slice focused on common Markdown syntax, editable table cells and tasks. Later diagram and embed capabilities are described in their own implementation notes.

## Primary sources

- [CodeMirror: System guide](https://codemirror.net/docs/guide/)
