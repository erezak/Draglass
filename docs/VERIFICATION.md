# Verification · 0.26.1

Additional regression checks passed for Finder metadata, visible demo failure without losing the active vault, explicit About version/icon options, and Mac development bundle icon/version installation before signing and launching. The development launcher check uses simulated macOS process/filesystem calls; native macOS execution remains unverified.

Table regression checks cover wiki-link rendering, escaped aliases, literal code, mouse/keyboard navigation, editing and blur restoration, local Markdown links, indexing, and rename preservation. A real Chromium mouse check confirms clicking the cell padding edits while clicking the link navigates without changing the source. The additional focused rename check passed.

Split/workspace verification covers shared buffers and autosave, active-pane routing, independent reading views and scrolling, immediate reading-preview refresh, horizontal/vertical arrangement, keyboard divider resizing, metadata limits, vault-scoped persistence, update/delete, duplicate names, concurrent writes, corrupt storage preservation, missing targets, failed-save cancellation, and vault switches. Desktop IPC checks verify trusted sender scoping for saved-workspace operations. A real Chromium check with the filesystem and knowledge worker passes secondary-pane editing, autosave, graph beside note, named-layout restore and restart.

Verification environment: Linux and Node.js 24. Native macOS, Windows and Linux packaging is not produced in this environment.

Demo checks cover first-launch selection, last-demo restoration, normal/unavailable prior vault preservation, editable edition persistence, content upgrades, concurrent installation and directory safety. Structural coverage checks verify the 61-note fictional scenario, all ontology types, sourced relationships, intentional missing targets, scene parsing and media assets. UI tests cover the palette command, saving before switching and keeping a failed-save draft. A Chromium check uses the real demo installer and knowledge worker to exercise first launch, welcome, graph/person inspection, the palette command and restoration after reload.

Backend checks use real temporary vaults and worker threads. They cover unchanged-file cache reuse, external edits, rename/delete invalidation, request-scoped drafts, shared tag/backlink/graph semantics, cancellation, worker failure/restart and shutdown. The desktop IPC test deliberately stalls a search and verifies an atomic save completes before that search is released. A renderer test verifies an older asynchronous search cannot replace newer results.

Conversation checks cover legacy single-thread migration without message loss, separate conversation creation and selection, persistence after restart, history isolation, concurrent writes, note rename, invalid conversation IDs, empty-context chat before a vault is opened, and reference-only opening prompts followed by on-demand Markdown/YAML reads for explicitly mentioned notes. UI checks cover creating and switching conversations while preserving old messages, starting a workspace chat after closing the last note, and mentioning an unopened existing note.

Results: **441 tests passed**, with no failures or skipped tests. A Chromium check also passed for chat before opening a vault, chat after closing the last note, existing-note mentions, new conversations and restoring an earlier conversation. A second Chromium check uses the real knowledge worker and temporary filesystem for tags, unsaved-draft search and graph construction. The renderer build completed successfully.

Local profiling smoke check: 1,000 synthetic notes of approximately 2 KiB each. Cold indexing/search took 257 ms; a warm query took 65 ms and reread zero unchanged note bodies. Editing one note caused one body reread. A fresh worker search took 331 ms while the main-thread timer continued firing. These are single-run Linux development observations, not cross-platform benchmarks or large-vault latency guarantees.

Commands:

```sh
node scripts-build.mjs
node --test --test-concurrency=2
```

Provider transports are simulated in automated tests. Live authentication, keychain integration, native Mac chat controls, application copyright display, file associations and installers need checks on their target platforms. Packaged Electron worker startup and shutdown, including ASAR paths, must also be verified there. Graph filtering/physics and AI orchestration have not moved to the worker; see ARCHITECTURE.md for remaining boundaries.

Dependency declaration checks verify Excalidraw is pinned to 0.18.1 independently of the application version and agrees with the lockfile and built engine. A frozen offline installation check could not complete because the local pnpm package metadata cache was missing entries; it did not modify the lockfile. Build and regression checks use the installed dependency tree.

Workspace-tree verification covers nested split creation and collapse, metadata normalization, independent tab membership, navigation, pinning, view movement, shared-buffer close semantics, external deletion of every view, and note context-menu placement. A real Chromium run with the filesystem and knowledge worker passed right/below placement, pointer-driven tab movement, autosave, saved-layout restoration, independent reading/scroll, pinning and restart. The demo and static-site checks pass. Native packaged desktop drag/drop and menus still require target-platform checks.

Typed-view regression coverage includes isolated graph filters and movement, linked outlines with live drafts and heading navigation, backlink provenance, independent search scopes and stale results, tool-only layouts, mixed layout restoration, source-pane closure and missing notes, and closing a pending search. Core checks bound persisted tool state and parse real Markdown headings without YAML or fenced-code false positives. The desktop IPC fixture verifies simultaneous searches and graphs do not cancel unrelated view requests. Native packaged-app checks remain required on the target platforms.

Theme checks cover the palette command, preference persistence, unchanged note text/selection, and independent paused graph state. Chromium checks verify actual canvas pixels in Light and Dark, matching graph chrome, repaint of multiple paused graphs, system-theme emulation and explicit override. Native OS appearance events in a packaged app remain a target-platform check.

## Bounded vault AI

The full suite passed 358 tests, including 15 focused vault-agent checks. Coverage includes metadata/property search, backlinks and named provenance, draft-aware reads, line pagination for long Unicode content, unavailable write tools in discussion, portable paths, read coverage and revision validation, lazy unopened references, external conflicts, staging without writes, append-at-EOF, apply/undo, context-window persistence/validation, initial overflow rejected before transport, repeated-turn compaction, local retention of large staged content and retained call/result pairs. Settings and verified/invented citation navigation pass renderer integration checks. Worker queries return bounded metadata rather than whole vault bodies.

A real Chromium run uses the built renderer, AIService, Vault, ActionStore and knowledge worker with a local HTTP fixture implementing native Chat Completions tool calls. It passed workspace chat without an open note, initial prompt without unrelated titles or bodies, search/metadata/relationship/section retrieval, one-sentence progress, verified citation navigation, inactive invented citations, one-line proposal, acceptance and receipt undo. No page errors were recorded. Existing protocol tests cover native Chat Completions, Responses and Anthropic call IDs/results; CLI envelopes run the same host-owned tool loop. No authenticated external provider or native desktop account was used.

The context guard uses conservative serialized UTF-8 accounting rather than a model tokenizer. Unknown provider windows must be configured by the user. Native CLI compatibility, enterprise gateways, account authentication and packaged desktop behavior remain target-environment checks.

## Ontology and date tools

Ten ontology checks cover complete paginated classification coverage, canonical/template alignment, conditional properties, relationship inverses and subtype endpoints, symmetric edges, YAML examples, custom predicates, invalid-query recovery, live canonical changes and native/CLI tool envelopes without a vault. Six date checks cover whole-day boundaries, created versus modified timestamps, timezone-aware properties, invalid/missing dates, unambiguous dated basenames, paging before content reads and a real knowledge worker with unsaved property overlays. All results remain within their individual tool bounds and the existing per-request context guard. The expanded full suite passes 358 tests with no failures or skips.

The demo coverage check verifies both tool exercises and the actual observed_at fixture used by date lookup. Build and static-site checks pass. External authenticated model behavior and native desktop packaging remain target-platform checks; no provider responses were fabricated as evidence of live access.

## Current-time tool

Seven clock checks cover a single consistent instant across UTC/local midnight, weekday, timezone overrides, daylight-saving changes, negative and fractional-hour offsets, fresh calls across a date boundary, malformed arguments and zones, invalid clock values, native/CLI envelopes without a vault, correction of a bad timezone followed by today’s date lookup, and a usable clock response with all editing tools enabled in a 16,384-token window. Clock queries read no notes and write no files. The full suite passes 358 tests with no failures or skips. The demo explicitly exercises get_current_time and distinguishes local dates from UTC search days.

Time and timezone values come from the device clock and Intl, not a network time service. Tests use injected instants/zones for deterministic boundary checks and the real clock for tool-loop integration. Native device timezone settings in packaged desktop builds remain a target-platform check.

## Automatic note timestamps

The full suite passes 358 tests without failures or skips. Ten timestamp-domain checks cover creation overrides, immutable saved creation values, legacy filesystem fallback, non-destructive YAML patches, comments/anchors/CRLF/BOM/body preservation, invalid YAML, unchanged drawing formats, no-op writes, detached updates, concurrent content reconciliation, AI acceptance after a stamped autosave, guarded Undo and interrupted receipt recovery, Markdown imports and link rewrites. Renderer regressions cover concurrent typing/caret preservation without a feedback loop, detached metadata synchronization and full UTC read-only property values. The real desktop IPC fixture verifies timestamps on creation and detached content saves.

A Chromium run uses the built renderer, real managed Vault and knowledge worker. It types while the first save is held, releases it, and verifies two saves retain the latest body, persist timestamps, keep the caret at the typed position, show read-only UTC values and stop saving once clean. No page errors were recorded. Demo and static-site coverage checks pass; native packaged desktop behavior remains a target-platform check.

## AI tool component

Seven component checks verify global/vault/staging capability selection, immutable schema-copy authorization, validation before IO, provider-free proposal staging without write capabilities, independent request evidence/revisions, cancellation/close behavior during blocked reads, bounded injected clock/query ports and dependency boundaries. Direct checks prevent tools from importing agents, provider adapters, the action store or desktop/UI code, and prevent the knowledge worker from importing an agent for shared helpers. The full regression suite passes 358 tests without failures or skips.

A one-off comparison against the delivered 0.23.3 source confirms provider-facing read/proposal schemas, serialization order and prompt policy are byte-identical. Existing native/CLI protocol, date/ontology/time, managed timestamp, AI acceptance/Undo, worker and renderer checks continue to pass. Build, demo and static-site checks pass. This slice changes internal boundaries without changing the demo’s user-facing exercises or creating a new editable demo edition. Native packaged application checks remain a target-platform task.

## Tasks foundation · 0.24.0

Fourteen task tests cover real Markdown parsing and exclusions, canonical references and aliases, declarative filters/date resolution/sort/group/pagination/explanations, invalid queries and JavaScript rejection, standalone/contextual creation, identity-preserving promotion and CRLF/nested-item preservation, completion/reopening across references, stale/ambiguous rejection, failed-promotion rollback, draft-aware worker queries and gated/bounded AI tools, autosave line shifts, self references and bounded workspace state. Existing ontology/property tests include Task.

A Chromium check uses a real managed Vault and knowledge worker. It passes inline query rendering, Tasks-pane queries, promotion, deduplication after promotion, completion and source-reference synchronization, standalone creation, contextual creation with inserted reference, theme rendering and plugin disablement. Light/dark screenshots were visually inspected. The demo has a real task note/reference and a guided promotion/query exercise. The regular build and site checks pass. Native packaging and installed desktop integration were not tested in this environment.

## Semantic task operations and Undo · 0.24.1

Eighteen operation tests cover durable contextual creation and promotion Undo, whole-operation conflict checks, time limits and sequential Undo with managed timestamps, interrupted apply and Undo reconciliation, unknown-edit conflict preservation, history path safety, duplicate IDs, plugin/action-mode gating, request-local handles, grouped AI staging/acceptance/Undo, external edits before staging and acceptance, field-only updates and response bounds, identity lookup after rename, real AI service orchestration with reference-only prompts, larger manual reference sets versus AI limits, stale cached reads and mixed note/task overlap rejection. The original task, action, provider and UI suites remain covered.

A real Chromium check uses managed Vault, knowledge worker, TasksService and AIService with a deterministic provider fixture. It passes contextual creation Undo, promotion Undo, grouped AI file previews and acceptance, grouped review Undo, and reopening task history after reload. It also verifies removed task files disappear from open views and a restored source can reopen. The history dialog was visually inspected in light mode. No live provider or native packaged app was used. Build, demo and site validation pass.

## Task interaction corrections

Regression checks cover right-sidebar placement, unsaved-draft refresh, persisted query docking from earlier workspace tabs, restored actionable Undo, promotion dialog/notice lifecycle, body context wikilinks, and explicitly preparing a Discuss request in proposal mode with its note references retained. A Chromium component check confirms light-theme primary-button contrast, top-layer Undo visibility and click targeting after dialog close, and right-sidebar position. Provider responses in renderer tests are fixtures; live gateway and native desktop behavior were not verified here.

## Session access and right icon rail

Renderer regressions cover explicit session labels, enabling changes without a new request or lost conversation/draft, request reuse without replacing a newer draft, reopening collapsed panels through the icon rail, vertical keyboard navigation, and skipping disabled Tasks. The existing vault-agent tests continue to enforce read-only tool gating. A Chromium component check passes both themes, icon placement, mode switching without sending, panel reopening and keyboard switching. It uses a provider fixture rather than a live gateway.

The complete 401-test regression run passed. Seven focused renderer checks passed after the final sidebar-selection adjustment, including preserving a collapsed sidebar when Tasks is disabled. The build and bundled-demo validation passed.

## Internal link display and navigation

Shared-link tests cover unique suffixes, duplicate filenames, absolute root disambiguation, explicit missing-path protection, aliases/fragments, autocomplete insertion and table-safe escaping, task/context generation, unchanged source and canonical task references. Renderer checks cover plain-click wikilinks and local Markdown links, Alt-click editing, modifier placement, keyboard following, drag suppression, ambiguous-choice selection/cancellation, clean reading labels and detached-file navigation. The desktop mode and permission boundaries are unchanged.

The complete 417-test regression suite passed. Eleven focused shared-link checks also passed after adding table-safe completion aliases. A Chromium component check confirms plain-click wiki/local-Markdown/table following, clean ordinary-note labels, Alt-click editing, Ctrl placement, Enter navigation, drag suppression and unchanged Markdown. No native packaged app or live provider was required for these link checks.

The final 48-test focused run passed after preserving native drawing extensions and distinguishing Markdown drawing twins during short-link generation.

The focused link and organization checks also pass for preserving explicitly root-qualified links during renames.

## Shared note references · 0.25.0

The complete 441-test suite passes with no failures or skipped tests. New coverage includes YAML alias validation and canonical autocomplete insertion; heading, nested-heading and block suggestions; paragraph/list/quote/table ranges; code/YAML exclusions; duplicate block diagnostics; CRLF offsets; draft and external metadata changes in the real knowledge worker; detached scope; and ordinary editor/reading-view navigation. The autosave test fixture now updates its simulated disk state after successful writes, so background polling does not mistake its own writes for an external rollback.

A Chromium check uses the actual knowledge worker and temporary files. It passes alias/heading/block completion, table-safe alias insertion through the editor adapter, editor offsets, reading anchors, section/list embeds, image dimensions and PDF page/height URLs. The reading and embed layouts were visually inspected. PDF viewer internals, native desktop packaging and OS-specific PDF page handling were not exercised by that renderer check.

The build and extended demo check pass: 61 Markdown notes, 42 typed entities, 87 graph nodes, 110 named edges, 161 wiki edges and 70 sourced relationships. The Note links tour includes real aliases, named ranges and existing image/PDF assets.

## Autocomplete theme contrast · 0.25.1

Real Chromium checks with the actual CodeMirror autocomplete popup passed in Light and Dark, including switching the theme while the popup remains open and moving selection with the keyboard. Selected and unselected labels and path/alias details meet a 4.5:1 contrast threshold against their rendered backgrounds. Shared CSS covers vault and detached editors. The 26 focused reference/link regression tests and the build with demo validation passed. Native packaged-app testing was not performed for this styling change.

## Task dependencies · 0.26.0

451 tests passed in the full suite. After the final local-date default and chooser guidance adjustment, all 41 focused task/model/operation tests passed again. New coverage includes inline parsing and serialization, YAML dependency lists, actionability/date/status semantics, missing and duplicate targets, self/circular dependencies, promotion identity, rejected semantic edits, accepted AI proposals, acceptance-time dependency validation, completion/Undo, visual add/remove controls and clickable blockers.

A real Chromium check used the Tasks plugin with a temporary filesystem vault and TasksService. It added a prerequisite through the visual chooser, verified persistence, filtered blocked/actionable tasks, completed the prerequisite and undid completion. The build and demo checks passed with a real dependency chain and no accidental missing graph targets. Native packaging and live AI provider execution were not tested in this slice.

## Task dependency graph and visibility · 0.26.1

457 tests passed. Added coverage verifies named task edges in global and depth-one local graphs, inverse backlinks, same-note loops with multiple declarations, hollow missing/ambiguous task references, stable identity after renaming, and dependency relationships from the visual properties collection. Task editor tests verify retained relationship sources and removal of prerequisites. UI coverage verifies explicit dependencies in the Tasks pane and a single Tasks entry on the right ribbon. Build and demo validation passed. Native packaging and a separate Chromium canvas rendering check were not performed for this change.
