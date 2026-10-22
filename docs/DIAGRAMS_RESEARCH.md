# Mermaid and Excalidraw · 0.10

## Draglass implementation

The engines are pinned to Mermaid 11.17.2 and Excalidraw 0.18.1. React/React DOM 18.3.1 satisfy the complete Excalidraw peer dependency tree; LZ String 1.5.0 handles compatible compressed scene payloads. The parser and integration use Markdown scene containers and the official Excalidraw component.

Mermaid works in Live Preview, reading view and embedded Markdown notes. Selection within a fence reveals its source while retaining a rendered preview. **Edit diagram** opens a source editor beside a debounced preview and immediately changes the originating note through CodeMirror transactions. Invalid syntax remains saved, editable text with a local error message. Ordinary code blocks are preserved. `internal-link` nodes navigate by their label. Expand and SVG export are available. Mermaid syntax is interpreted by the bundled engine, not translated into a homegrown subset.

Native `.excalidraw` files open in ordinary persisted tabs with the full Excalidraw canvas, shapes, arrows, text, freehand, image tools and engine undo/redo. Drawings are searchable/indexed workspace files. Creation is available from the note menu, File menu and command palette. **Create and embed Excalidraw drawing** creates a file and inserts `![[/path.excalidraw]]` into the current note. Existing files embed with wiki syntax or Markdown images; whole-file width/height options work. **Edit inline** mounts the actual canvas inside the note in either Live Preview or reading view; **Done** returns to the SVG preview. Drawing edits update the drawing file, leaving the parent note's embed unchanged.

Canvas changes share the existing ordered 600 ms autosave, recovery snapshots, dirty indicators, quit guard and last-completed-action-wins refresh. Pan, zoom and selection alone do not rewrite the drawing. Inline canvases share a backing tab and survive routine polling while the parent note source stays unchanged. Opening another editor for the same file finishes the previous inline editor, avoiding two independent scene histories. External loads replace the scene in the mounted canvas without generating a save of the replacement. Organization flushes drawing drafts and updates incoming ordinary Markdown embeds during moves/renames. Native drawing filenames retain their extension.

`.excalidraw.md` files and Markdown with `excalidraw-plugin: parsed` or `raw` frontmatter open as drawings. A single plain or LZ Base64-compressed Drawing section is supported. Saving replaces its scene fence, preserves frontmatter/prose/other sections, keeps compression and refreshes an existing Text Elements index. Scene JSON is authoritative in Draglass. It does not independently reconcile edits made directly to the Text Elements index.

SVG and PNG export use Excalidraw's official export utilities. Both engines and all Excalidraw font files are bundled locally and loaded only on first diagram display. The build converts font URLs to embedded data and adapts the pinned font exporter to embed full font data, avoiding optional worker/WASM glyph subsetting and its `unsafe-eval` requirement. SVG exports may therefore be larger. This build adaptation must be reviewed when changing the pinned Excalidraw version.

## Compatibility boundaries

- Full-scene `.excalidraw` JSON and supported Markdown scene containers are editable. Plugin-only external image registries, scripts, OCR, PDF import, custom pens/fonts, libraries persistence, note transclusions on the canvas and auto-export synchronization are outside this slice. Missing external image references are reported before editing rather than silently dropping the images. Portable scenes must contain their image data.
- Excalidraw element/group/area/frame fragments and custom embed alignments are not implemented. A fragment produces an explicit message; use a whole-file embed.
- Native Excalidraw element links can navigate to vault notes/drawings. External website links and web/iframe embeddables are not opened in the canvas. Text-only wiki links on the canvas do not provide backlinks, transclusions or link-aware renames.
- Mermaid uses strict rendering, text labels, bounded source/edge limits and sanitized SVG. Executable click callbacks and HTML/iframe content are not enabled. Node links use `internal-link` navigation; they do not create graph edges. Supported diagram syntax and layout behavior follow the bundled Mermaid 11.17.2 engine.
- Drawing files retain the existing 8 MiB limit, with up to 10,000 elements. These are input limits, not native performance guarantees. Huge scenes and CJK/Hebrew handwriting/font behavior require native validation.
- AI actions remain Markdown-note operations and reject drawing contexts. Discussion can receive drawing JSON, but providers are not supplied a raster image of the canvas.
- Native Mac/Windows/Linux file handling, OS clipboard/import/export dialogs and signed installers still require native validation. The verification browser uses a real temporary Vault through a binding, not Electron IPC.

## Primary sources

- [Mermaid usage and security configuration](https://mermaid.js.org/config/usage.html).
- [Excalidraw installation and self-hosted fonts](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation).
- [Excalidraw props: initialData, onChange, links and keyboard scope](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/).
- [Excalidraw export utilities](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export).
