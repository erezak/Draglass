# Draglass Editor roadmap

This is the working backlog. Entries describe current gaps and acceptance criteria, not promises of existing functionality. Implement one reviewable slice at a time; preserve plain Markdown, continuous autosave, last-completed-action-wins external refresh, AI context visibility, and the type/subtype ontology.

## Architecture slice · 0.19.0

Move read indexing and knowledge queries behind an Electron-independent Node service in a worker thread. Keep ordered safe writes separate from read queries. Search and tags must include unsaved drafts without fetching every note into the renderer. Reuse unchanged file contents and parsed search metadata; cancel superseded query requests and discard stale responses. Construct knowledge graphs outside the renderer. See [ARCHITECTURE.md](ARCHITECTURE.md) for implemented boundaries, protocol, lifecycle and remaining work.

## Compatible feature backlog

| ID | Feature and scope | Acceptance criteria and integration notes |
| --- | --- | --- |
| F01 | Vault-wide task browser (foundation delivered in 0.24.0) | Aggregate Markdown tasks with note path and exact source range; filter by state, tag and path; navigate to the task; include drafts and external edits through the knowledge service. Toggle through safe editor/file operations with undo and stale-version checks. A task panel must coexist with chat and backlinks. No separate task database as the source of truth. |
| F02 | Task states and completion dates (partially delivered in 0.24.0) | Support `[ ]`, `[x]` and `[-]` with explicit accessible state selection. Completion-date insertion is optional and idempotent; define reopening/cancellation date policy before implementing. Preserve unrelated source and metadata. Test repeated toggles, dates already present, undo and external edits. |
| F03 | Outgoing connections panel | Show outgoing wiki/Markdown links and named ontology relationships with provenance. Distinguish missing and ambiguous targets; creating a missing target uses existing entity creation. Include drafts, navigate without losing chat, and preserve the separate incoming/backlink view. |
| F04 | Callouts | Render `> [!note]`, tip, warning, info, abstract, question, success and failure with accessible labels and light/dark contrast. Keep ordinary Markdown authoritative, reveal source for editing, support multiline content and nesting without executing HTML. Cover Live Preview, reading view, embeds and detached Markdown. |
| F05 | Image viewer | Click a local image preview to open fit/zoom/pan controls, caption, Escape and keyboard navigation. Respect asset validation, detached-file scope and vault changes. No remote-image fetching by default. Clicking must not unintentionally edit Markdown. |
| F06 | Generic Markdown templates | Configurable template folder; create-note and insert-template commands. Templates are ordinary Markdown. Preserve the ontology entity-template plugin; optionally classified templates must validate type/subtype, and generated notes must receive fresh IDs instead of copying template identity. Preview substitutions, reject collisions and support undo. No executable template scripts. |
| F07 | Fuzzy quick switcher and recents | Match noncontiguous characters, rank exact/prefix matches first and retain deterministic ordering. Show a bounded per-vault recent-note list. Handle moves, deletions and duplicate titles; keyboard navigation and selection must remain stable. Keep Cmd/Ctrl+P. |
| F08 | Precise search navigation and highlighting | Return actual match ranges from the backend, group matches by file and highlight matches safely. Open at the selected range in source or Live Preview. Handle unsaved drafts and stale revisions; avoid using the current approximate snippet line as an exact location. Add a visible case-sensitivity control backed by existing query semantics. |
| F09 | Graph theme integration | Adapt graph background, nodes, edges, labels and inspectors to Light/Dark/System while retaining custom color groups and person photos. Maintain contrast, export appearance and graph controls. Theme switching must not reset positions, camera or selection. |
| F10 · delivered in 0.20.0 | Editable demo vault | Open the demo on first launch and restore it when last active; expose Open demo vault in the palette. Bundle feature tours, all ontology types and sourced relationships. Preserve edits in content-versioned editions. See DEMO_VAULT.md for lifecycle and coverage checks. |
| F11 | Privacy-aware sections | Requires a separate design before implementation. Define `{locked}` section boundaries, descendants, password/session behavior and the distinction between display hiding and encryption at rest. A locked section must be consistently excluded from search snippets, tasks, backlinks, graph-derived text, previews and AI context/tools. Test unlock/relock, external edits, recovery copies and detached files. Never claim file encryption without implementing and verifying it. Existing markers currently have no special meaning. |
| F12 | Focus and rendering preferences | Add a combined sidebar focus command, configurable soft wrap and optional rich-content rendering controls where useful. Preserve sidebar state and drafts. Rendering preferences must affect presentation only, without rewriting notes. No option to disable mandatory autosave. |
| F13 | Safe performance preferences | Only expose scan/query limits or debounce settings with measured value and bounded defaults. Do not make hidden-file/symlink access unrestricted or allow settings that undermine safe path handling. Keep current platform protections. |
| F14 | Browser edition | Separate future product scope: define storage adapter and credential/privacy model, then reuse the service contract where practical. Do not assume Node filesystem APIs or Electron IPC exist in a browser. A browser demo must clearly distinguish sample/in-memory data from a disk vault. |

## Sequencing and boundaries

After the architecture slice, F07/F08 benefit directly from the query service, and F01/F03 can share its derived knowledge. F04/F05 are independent presentation slices. F11 must be designed across every content-consuming path, including AI, before promising private content support. F14 is optional and follows a storage design.

Keep the new AI and ontology workflows. Retain the existing command-palette shortcut, light default, provider/proxy settings, link-aware file operations and detached editing. Do not restore obsolete branding or introduce a Rust rewrite, a theme marketplace or an arbitrary third-party plugin API as prerequisites for these features.

## Architecture follow-up

Move graph filtering and force simulation off the renderer; return compact models instead of raw-note snapshots where callers permit. Add filesystem-event-driven dirty-path refresh with periodic reconciliation, cancellation inside long-running work, persistent derived indexes if measurements justify them, and separate AI orchestration/mutation planning from the desktop main process. Profile realistic vaults before choosing new storage engines or languages.

## Delivered in 0.21.0

Two editable panes, right/below arrangement, pointer and keyboard resizing, focus routing, independent reading views, a graph beside a note, and named workspace save/update/restore/delete. Workspaces are vault scoped and restore current files rather than content snapshots. 

## Delivered in 0.21.1

The workspace is a tree of nested splits, tab groups and note/drawing views. Each group owns its tabs, toolbar and selection. Note context menus support current-tab, new-tab, right and below placement. Tabs support drag reorder/move, edge splitting, pinning and navigation history. Closing a view preserves other views of the same shared file buffer. Named layouts restore the tree, selected views, modes, pins and navigation metadata.

Remaining workspace extensions: stacked-tab presentation, configurable opening preferences, recently closed tabs, moving groups between native windows and multi-window layout restoration. These should extend container/view models rather than reintroducing a global tab bar.

## Delivered in 0.22.0

Graphs, search results, backlinks and outlines are first-class workspace leaves. Each graph owns its simulation, filters, camera, pause state and controls. Searches own independent queries and sort orders. Backlinks preserve relationship provenance; outlines parse current Markdown and navigate to headings. Local views can follow a chosen pane or remain fixed to a file. Closing source panes fixes their bindings; missing notes leave a usable tool view. Typed views move/split/close and restore through saved layouts. Runtime cleanup and stale-response guards keep hidden/closed views from taking focus or applying old results.

## Delivered in 0.22.1

The command palette exposes **Toggle light / dark theme**. Graphs use the app's resolved appearance for canvas, controls, inspector, labels and minimap. Light, Dark and system changes share one update path; graph camera, filter and pause state are preserved.

## Delivered in 0.23.0

Vault AI exploration uses on-demand search, metadata, line reads and sourced graph connections. Discussion remains read-only. Proposed creations and revision-checked line changes use the existing acceptance and undo workflow. Every request receives a configurable total context budget with output reservation, bounded pagination, history compaction and a transport guard. Verified citations navigate to local note lines. Future work: measured tokenizer-specific budgets, semantic compaction with provenance validation, persistent retrieval indexes and isolated AI orchestration.

## Delivered in 0.23.1

AI can discover ontology classifications, template properties, relationship directions/inverses, endpoint suggestions and sourced YAML examples on demand. Date-based retrieval returns bounded references by filesystem dates, YAML date properties or dated filenames. Both tools use existing context budgets and read-only execution; date queries run in the knowledge worker. Future options include explicit user-timezone calendar boundaries and schema-aware validation of proposed relationships.

## Delivered in 0.23.2

Models can ask Draglass for current UTC/local time and timezone information before resolving relative dates. Fresh clock reads work without a vault and share existing bounded native/CLI tool execution. Timezone-aware date search boundaries remain separate future work; current note-date queries retain explicit UTC days.

## Delivered in 0.23.3

Automatic created_at/updated_at properties cover Markdown creation and content saves in vaults and detached windows, including entity/AI creation, Markdown imports and link rewrites. Creation time is preserved, returned metadata is reconciled without moving the caret or resaving, and AI receipt/Undo checks retain their conflict protection. Reads and existing vaults are not bulk rewritten.

## Delivered in 0.23.4

AI application tools now have a dedicated component with a capability registry, schema validation, bounded execution and per-request session lifetime. Provider transports and conversation orchestration remain separate; proposal writes still require the action service. Knowledge workers reuse domain helpers without importing model orchestration. Future tools should register their definition, scope/access requirement and handler here, using explicit host capabilities and tests for permission, result size and cancellation.

## Tasks · agreed direction

0.24.0 delivers the Tasks core plugin: checkbox collection, Task notes, identity-preserving promotion, optional contextual links and inserted references, a draft-aware typed Tasks pane, declarative fenced results, dates/priorities/status editing, query explanations and a gated AI query tool. See [TASKS.md](TASKS.md) for exact syntax and limits.

Continue in reviewable slices:

1. Add durable task operation Undo and semantic staged AI create/update/complete/promote tools. Preserve identity across promotion, rename and external edits; handle ambiguous or duplicated IDs explicitly.
2. Add dependency-aware blocked/blocking queries, missing targets, cycle diagnostics and provenance-aware links. Dependencies must be actionable relationships, not merely stored IDs.
3. Add per-task fixed versus completion-relative recurrence, preserve relative planning-date offsets and assign distinct occurrence IDs with defined dependency behavior. Test month ends, late completion, reopening and time zones.
4. Add separately editable importance, explainable calculated urgency and an Eisenhower matrix. Keep blocked tasks distinguishable from tasks that can be acted on now.
5. Add board, calendar, tree and timeline views over the same query service; distinguish what is selected from how it is displayed.
6. Extend declarative queries with visual construction, context-aware expressions, reusable presets, Boolean combinations and saved date-relative perspectives. Do not execute JavaScript. Unsupported instructions must never be silently ignored.
7. Build an independent optional Daily Loop core plugin over task/note services and bounded AI tools. Plan, import updates, reconcile commitments with provenance, review and generate readable daily summaries without duplicating task state or preloading vault contents into prompts.

Disabling a plugin removes its capabilities and UI while preserving plain files. Keep each new slice represented by real demo examples or honest guided exercises.
