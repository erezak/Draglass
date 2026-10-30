# Draglass Editor · 0.32.1

Local Markdown editing, connected knowledge and AI conversations. Desktop first, with macOS, Windows and Linux builds from the same Electron application.

Copyright © 2026 Erez Korn.

## Run

Use Node.js 24 LTS and your installed pnpm. The project does not select or download a specific pnpm version.

```sh
pnpm install --frozen-lockfile
pnpm start
```

On first launch, Draglass opens an editable demo vault. Use **Open demo vault** in the command palette to return to it, or **Open vault** to choose your own Markdown folder. The last active vault reopens on launch. Files remain ordinary Markdown. Editing autosaves continuously; external changes and internal saves use the last completed action. New Markdown notes receive `created_at` and `updated_at` in UTC ISO format. Content saves refresh `updated_at` while preserving the saved creation time, including detached editing and AI changes. The properties pane displays these managed values as read-only.

## Build

```sh
pnpm run dist:mac:app
```

Copy `release/mac-arm64/Draglass Editor.app` to `/Applications`. For a DMG, use `pnpm run dist:mac:dmg`. Windows and Linux use `pnpm run dist:win` and `pnpm run dist:linux` on their target systems.

## Explore the demo

The fictional Lumen field station connects people, goals, capabilities, systems, decisions and evidence. Eleven tours introduce editing, AI, graphs, properties, drawings, attachments and organization. The demo is editable; updated examples open as a fresh edition while earlier editions and edits are retained.

## AI conversations

The right icon rail opens Chat, Backlinks and Tasks, and remains available when the sidebar is collapsed. Chat shows **Read-only session** in Discuss mode. **Enable changes** switches the same conversation to read-write proposal mode; files change only after you accept a review. After a reply, **Enable changes for this request** can reuse the request without overwriting a newer draft.

The right sidebar works with or without an open note, and general chat also works before opening a vault. Use **New conversation** to start fresh while preserving earlier conversations; the Conversation selector reopens them. Workspace and individual-note conversations are stored separately and restored after restart.

Ask about the vault or type `@` to mention notes. The opening request includes reference paths, not note bodies or a vault-wide title list. The model can search text and properties, inspect headings, read selected lines, and follow links and named relationships with their provenance. Referenced open drafts take precedence over disk text when read. The model can request the current device time in UTC and local time, including date, weekday, timezone and UTC offset, before resolving “today” or other relative dates. It can inspect the canonical ontology on demand, including subtypes, template properties, relationship directions and provenance examples. Date lookup finds notes by created/modified time, a YAML date property, or a date in the filename; date ranges use inclusive UTC days and return references before content. Progress appears as short status messages; verified note citations open their source lines. New conversations begin with empty history.

Settings supports Copilot, Codex, OpenCode, OpenAI-compatible/LiteLLM gateways and Anthropic connections, custom HTTP headers, Chat Completions or Responses, and shared proxy settings. **Propose changes** creates reviewable note edits and additions. Line edits require a read revision and preserve unrelated content. Files change when you accept a proposal; Undo remains available from the review. Discussion mode has no write tools.

Each connection has a **Context window (tokens)** setting. Draglass reserves response space and caps the whole request, including instructions, tool definitions, conversation history and results. Its conservative UTF-8 byte allowance avoids assuming a model tokenizer. Older context is compacted or retired with an explicit notice, tool results are paginated, and essential oversized requests stop before sending. Set the window to the model’s supported limit or lower.

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

Each pane owns its tab bar, note toolbar and selected view. Open a note in the focused pane, or right-click it for **Open**, **Open in new tab**, **Open to the right** or **Open below**. Cmd/Ctrl-click opens another tab; adding Alt opens a group to the right. In Live Preview, plain-click rendered internal links to open them; Alt-click reveals their editable source. Cmd/Ctrl-click opens another tab. Table and reading-view links navigate normally.

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

## Tasks

Use ordinary Markdown checkboxes, promote an action into a Task note, or run **New Task** from the command palette. Open **Tasks** from the left ribbon to edit dates and priorities across the vault. Fenced `tasks` blocks show live query results. Enable or disable the bundled feature in Settings → Core plugins. See [Tasks](docs/TASKS.md) for the supported query instructions and current scope.

Task operations can be undone for 10 minutes through **Task history / Undo**, including after restarting the app. AI can read tasks and propose semantic task operations for review; grouped changes are accepted together.

Internal note links display the filename without folder prefixes unless an explicit alias supplies the text. Their full target remains in the tooltip and source. Autocomplete and generated task/context references use the shortest unique target, with a clean alias when folders are needed. Ambiguous hand-written links offer a folder chooser; qualified missing paths never fall back to a different note with the same name.

YAML aliases appear in wikilink autocomplete and insert canonical targets with display aliases. Type `[[Note#` for headings or `[[Note#^` for block IDs. Heading/block links work in Live Preview and reading view; `![[Note#Heading]]` and `![[Note#^id]]` embed the same indexed ranges. Note bodies, structured lists/quotes/tables, image dimensions and PDF page fragments are supported. See [Note links](docs/NOTE_LINKS.md) and the bundled Note links tour for syntax and scope.

Task prerequisites use stable IDs across checkbox tasks and Task notes. Use the Tasks sidebar’s Actionable and Blocked filters, edit prerequisites visually, and follow blockers to their source. See [Tasks](docs/TASKS.md) for syntax and behavior.

Tasks support fixed and completion-relative recurrence for checkboxes and Task notes. Edit Repeat to configure a schedule and choose prerequisite carryover. Completing an occurrence creates its successor with preserved planning-date offsets; grouped Undo restores both together.

Choose Folio, Basalt, Tide or Prism under Settings → Appearance. Folio is the first-launch default. Themes declare light/dark compatibility and may be duplicated, extended and imported/exported as JSON. See [Appearance themes](docs/THEMES.md).

Tasks distinguish user-set importance from calculated urgency. Open the task matrix from the command palette or Tasks pane, and inspect score explanations while keeping blockers visible.

Tasks can open in a main workspace as well as the right sidebar. Save named vault views, combine visual filters with advanced queries, and switch between list and matrix layouts without losing the selection.

Calendar is an independent core plugin in the right sidebar for navigating dated notes and viewing word-count dots. Its button and Open Calendar command reveal the grid immediately, sized to the pane. Days with matching tasks due display a red dot when Tasks integration is enabled. Configure writing statistics and the first weekday in Settings → Calendar. Tasks can optionally appear on Calendar through Settings → Tasks.

Daily Briefing is an optional core plugin for a compact clipboard exchange with an external knowledge assistant. Its board combines all open tasks with a daily note, sourced decisions, person relationships, conflict flags and Undo. See [Daily Briefing](docs/DAILY_BRIEFING.md) for setup.

Daily Briefing uses short note titles with full context in the body. Its state, settings and Undo records are stored inside each vault under `.draglass/briefing/`.

Vault-private recovery snapshots, trash, operation history and plugin data live in `.draglass/`.

Task completion offers optional outcome details for inline tasks and Task notes. Details remain in Markdown, share the completion operation’s Undo, and stay off recurring successors.

Graph filters, exclusions and color groups support `type:Task`, `subtype:PERSON` and any YAML field with `[field:value]` or `{field:value}`. Nested fields such as `[relationships.sources.ref:review]` use the same syntax in vault search. See [Graph queries](docs/GRAPH_QUERIES.md).

Generated briefing entries render as lightly framed Markdown with an Automatically generated label. Their contents remain editable in Live Preview, and their links and task controls stay usable.

The Daily Briefing board also shows local follow-through: completed tasks, deadline changes and recorded outcomes. **Copy local updates** sends compact changes back to your external assistant; entries stay pending until you import its explicit acknowledgment.

Use **Save as PDF…** from the File menu, command palette or a Markdown note’s context menu to export a formatted document. Choose the filename title, paper size, orientation, margins, scale and page numbers. Current drafts, embedded notes and diagrams are included without modifying the source.
