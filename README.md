# Draglass Editor · 0.22.1

Local Markdown editing, connected knowledge and AI conversations. Desktop first, with macOS, Windows and Linux builds from the same Electron application.

Copyright © 2026 Erez Korn.

## Run

Use Node.js 24 LTS and your installed pnpm. The project does not select or download a specific pnpm version.

```sh
pnpm install --frozen-lockfile
pnpm start
```

On first launch, Draglass opens an editable demo vault. Use **Open demo vault** in the command palette to return to it, or **Open vault** to choose your own Markdown folder. The last active vault reopens on launch. Files remain ordinary Markdown. Editing autosaves continuously; external changes and internal saves use the last completed action.

## Build

```sh
pnpm run dist:mac:app
```

Copy `release/mac-arm64/Draglass Editor.app` to `/Applications`. For a DMG, use `pnpm run dist:mac:dmg`. Windows and Linux use `pnpm run dist:win` and `pnpm run dist:linux` on their target systems.

## Explore the demo

The fictional Lumen field station connects people, goals, capabilities, systems, decisions and evidence. Ten tours introduce editing, AI, graphs, properties, drawings, attachments and organization. The demo is editable; updated examples open as a fresh edition while earlier editions and edits are retained.

## AI conversations

The right sidebar works with or without an open note, and general chat also works before opening a vault. Use **New conversation** to start fresh while preserving earlier conversations; the Conversation selector reopens them. Workspace and individual-note conversations are stored separately and restored after restart.

An open note is included automatically. Type `@` to mention existing notes from the current vault. Full Markdown, including YAML metadata, is provided for the selected notes; open editor drafts take precedence over disk text. Context chips show the notes supplied to the model. New conversations begin with empty history.

Settings supports Copilot, Codex, OpenCode, OpenAI-compatible/LiteLLM gateways and Anthropic connections, custom HTTP headers, Chat Completions or Responses, and shared proxy settings. **Propose changes** creates reviewable note edits and additions. Files change when you accept a proposal; Undo remains available from the review.

## Editing and knowledge

- Live Preview, source mode, reading mode, tabs, autosave and recovery.
- Explorer and AI sidebars collapse independently. Cmd/Ctrl+Shift+P opens the command palette.
- File organization, link-aware renames and moves, trash/restore, tags and local search.
- Global and local graphs with ontology types, relationships and edge provenance.
- YAML property editing, type/subtype selectors and visual relationship editing.
- Ontology entity templates, configurable in Settings → Core plugins → Entity templates.
- Attachments, note embeds, editable Mermaid diagrams and Excalidraw canvases.
- Element-local horizontal scrolling and hover scrollbars; Mermaid Fit and zoom controls.
- OS Markdown/Excalidraw file associations and clearly labelled detached editing.

## Architecture and roadmap

Knowledge indexing, search, tags, backlinks and graph construction run in a local Node worker. Safe file writes retain a separate ordered path. Searches include unsaved drafts without fetching the entire vault into the search UI. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for boundaries and limitations, and [docs/ROADMAP.md](docs/ROADMAP.md) for scoped feature acceptance criteria.

## Verification

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for checks and platform limits.

Third-party notices remain in `docs/licenses` and are bundled with the application.

## Tab groups and saved workspaces

Each pane owns its tab bar, note toolbar and selected view. Open a note in the focused pane, or right-click it for **Open**, **Open in new tab**, **Open to the right** or **Open below**. Cmd/Ctrl-click opens another tab; adding Alt opens a group to the right. In Live Preview, ordinary inline links reveal their editable source; Cmd/Ctrl-click follows them. Table and reading-view links navigate normally.

Use **Split editor right** or **Split editor below** to divide the focused group. Splits can nest, so a column can contain two rows beside another column. Drag dividers, or focus a divider and use arrow keys; Home resets its ratio. Drag tabs between groups, onto another tab to reorder, or to the right/bottom edge of a pane to split. **Move current tab to next group**, **Focus next tab group**, and **Close tab group** are also available in the command palette.

Back and Forward navigate within the selected tab. **Pin / unpin current tab** keeps a reference available while links open another tab. Reading mode and scroll positions belong to each view. Views of the same file share its buffer, undo history and autosave. Closing one view keeps the other views and the file intact. A graph can occupy one group while notes remain visible elsewhere.

**Save workspace…** records the tree of groups, their tabs, active views, pinning, navigation history, sidebar layout and graph settings. **Open saved workspaces…** restores, updates or deletes layouts for the current vault. Restoring saves pending edits first and rereads current file contents. Up to 16 tab groups, 64 distinct open files and 32 saved layouts per vault are supported. Detached file windows keep their separate workflow.

## Independent tool tabs

Use **Open global graph**, **Open local graph**, **Open search tab**, **Open linked backlinks tab**, or **Open linked outline tab** in the command palette. Each invocation creates a separate view. Tool tabs move, split and close just like note tabs, and take part in named workspaces.

Every graph owns its filters, forces, display settings, camera, pause state and controls. Open two graphs to compare different queries. Hidden graphs stop their animation; closing a graph releases its runtime.

Local graphs, backlinks and outlines have a source selector. **Follow pane** tracks the most recently selected note in that particular pane, even while another pane has focus. **Fixed note** keeps a specific file selected. Closing a source pane fixes the linked view to its last note; a deleted note is shown as unavailable without deleting the tool tab. Global graphs cover the whole vault.

Outlines update from unsaved Markdown and jump to headings. Backlinks include ordinary links, named relationships and their sources. Each search tab owns its query and sort order and includes unsaved edits. Selecting a result opens the note at its matching line. Tool-only workspaces also work without an open note.

Layouts restore view types, queries, links to source panes, graph settings and active tabs. Search results, outlines and backlinks are rebuilt from current files; they are not stored copies of note contents.

## App theme

Run **Toggle light / dark theme** from the command palette (Cmd/Ctrl+Shift+P) to switch immediately. The choice is remembered for the current vault. Settings → Appearance also offers **Follow system**. The palette toggle chooses the opposite of the currently displayed theme and makes that an explicit Light or Dark choice.

All graph tabs follow the app theme, including their canvases, labels, controls, inspector and minimap. Theme changes repaint paused and visible graphs and apply when hidden graphs reopen. Filters, camera positions, pause state and workspace layout are kept. Graph views have no separate theme setting.
