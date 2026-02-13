- 2026-02-13 — Decision: Templates are vault Markdown files constrained to a configurable folder (default `_templates`) and are excluded from search indexing/results.
  - Rationale: Templates are authoring inputs, not regular knowledge notes, so they should not pollute search relevance.
  - Impact: New search/index logic must always apply template-path exclusion via shared folder semantics, and folder changes must trigger reindex behavior.

- 2026-02-13 — Decision: Template rendering resolves variables/frontmatter/cursor at action time (insert/new-note), not render time.
  - Rationale: Date/time/title values must be deterministic at insertion/creation and remain stable afterward.
  - Impact: Use centralized template rendering/merge helpers for both insert and new-note flows; unknown variables remain unchanged and existing frontmatter keys are not overwritten.

- 2026-02-12 — Decision: External vault changes are handled with incremental path-level watcher updates plus frontend file-change events for near-immediate active-note refresh.
  - Rationale: Full-vault rescans on every watcher tick are too slow for Obsidian-like responsiveness.
  - Impact: Watcher pipelines should batch changed paths into upsert/remove index writes, emit `vault-file-changed`, and only use periodic full resync as a reconciliation fallback.

- 2026-02-12 — Decision: Per-vault index maintenance uses a Rust filesystem watcher with debounced resync plus periodic polling fallback.
  - Rationale: Native file events can be dropped or inconsistent across platforms; fallback polling preserves eventual consistency without network.
  - Impact: Vault load should start watcher lifecycle; external create/edit/rename/delete must be reflected by index resync even when watcher events are unreliable.

- 2026-02-12 — Decision: Introduce a Rust-owned per-vault SQLite index/cache (outside the vault) for search and derived data, with Markdown files remaining canonical.
  - Rationale: Full-vault rescans for search/backlinks/graph/tasks do not scale and duplicate parsing logic; a rebuildable cache preserves local-first transparency.
  - Impact: Derived features should read from a shared index API; DB loss/corruption must trigger safe rebuild; never treat DB contents as source of truth.

- 2026-02-12 — Decision: Establish a stable boundary where Rust owns vault I/O, canonical filtering (hidden + locked), parsing/indexing/caching, and React owns UI state/rendering/debounce/cancel orchestration.
  - Rationale: Current feature-by-feature derivation causes consistency drift and privacy risk; centralizing semantics in Rust enforces one policy surface.
  - Impact: New derived-data features must consume Rust engine APIs; frontend should not re-implement lock/ignore parsing rules for search/backlinks/graph/tasks.

- 2026-02-05 — Decision: All new Tauri commands must be explicitly authorized in both `src-tauri/permissions/` (TOML) and `src-tauri/capabilities/` (JSON).
  - Rationale: Tauri v2 requires a strict security manifest for command execution; commands not listed in capabilities will fail with "not allowed".
  - Impact: When adding an `#[tauri::command]`, create/update a permission in `permissions/` and add it to the relevant capability in `capabilities/`.

- 2026-02-05 — Decision: Global Search uses Rust-side scanning for performance with debounced (300ms) frontend updates.
  - Rationale: Scanning a few thousand notes in Rust is significantly faster and keeps the UI thread responsive; debouncing prevents excessive IO on every keystroke.
  - Impact: Search must happen via the `search-vault` Tauri command; use standard `SearchHit` type (relPath, line, offset, snippet); results group by note in UI.

- 2026-02-03 — Decision: Locked Sections use `{locked}` inline attribute on ATX headings, parsed via pure regex in both TS and Rust.
  - Rationale: Simple, file-based markup that integrates with existing Markdown without special frontmatter or YAML; child sections inherit lock status from parents.
  - Impact: Locked section parsing must use ATX heading detection with `{locked}` anywhere in the line; child headings automatically inherit; future block-level locking should extend this pattern.

- 2026-02-03 — Decision: Vault authentication uses Argon2id with a single password per vault, stored as hash+salt in localStorage keyed by vault path.
  - Rationale: Strong KDF for password protection, session-level unlock, no server dependency, fully local-first.
  - Impact: Password hashing must use Argon2id (memory: 16MB, iterations: 2, parallelism: 1); auth state is per-session; changing vault clears unlock state.

- 2026-02-03 — Decision: Locked section bodies are excluded from backlinks, graph edges, and tasks when vault is not unlocked.
  - Rationale: Prevents data leakage of locked content through derived features; links/tasks should only be visible when user has authenticated.
  - Impact: All link extraction and task scanning must accept an `exclude_locked` flag and filter line ranges accordingly; unlocking must trigger rescan.

- 2026-02-03 — Decision: Live Preview locked sections use fold state persisted to localStorage with noteRelPath+line+headerHash key.
  - Rationale: Consistent collapse behavior across sessions; mirrors callout collapse strategy.
  - Impact: Fold toggle must update localStorage immediately; section hide/show decorations must check both vault lock state and fold state.

- 2026-02-02 — Decision: Tasks use a 3-state checkbox cycle (blank → x → -), and the Tasks panel lives in the right pane and scans the vault by line regex while skipping fenced code and blockquotes.
  - Rationale: Match Live Preview expectations with minimal parsing while keeping the UI consistent and fast.
  - Impact: Future task parsing should remain regex-based with the same skip rules, and UI should keep the right-pane placement and 3-state semantics.

- 2026-02-01 — Decision: Live Preview callouts use a fixed canonical type+alias map, unknown types fall back to note styling with the original type as the default title, nesting is supported up to depth 2, and collapse state persists per note using noteRelPath+line+header hash.
  - Rationale: Keep rendering consistent while allowing custom types, bounded nesting, and stable, local-only collapse behavior.
  - Impact: Future callout work must use the same canonical list/aliases, preserve unknown type labels, keep nesting within two blockquote levels, and maintain the collapse key strategy for compatibility.

- 2026-01-29 — Decision: Add a fixed-width left Toolbox column for primary actions, with Mod+Shift+P reserved for the Command Palette placeholder.
  - Rationale: Keep primary navigation always visible without impacting pane scrolling, and align shortcuts with established conventions.
  - Impact: Future navigation actions should live in the left toolbox, and Mod+Shift+P should open the command palette.

- 2026-01-29 — Decision: Live Preview image paths resolve relative to the note folder with vault-root paths denoted by leading `/`, and remote images are allowed except `javascript:` URLs.
  - Rationale: Support external image embeds while keeping a minimal scheme block for safety.
  - Impact: Image previews must allow http/https/data URLs, treat leading `/` as vault-root, prevent traversal above the vault, and block `javascript:` targets.

- 2026-01-22 — Decision: Mermaid block widgets are provided via a StateField, updated by a ViewPlugin effect.
  - Rationale: CodeMirror disallows block decorations coming directly from ViewPlugins.
  - Impact: Mermaid Live Preview updates must dispatch effects to refresh the StateField when the viewport, selection, or document changes.

- 2026-01-22 — Decision: Mermaid diagrams render in the frontend Live Preview with strict security, SVG sanitization, and a content+theme cache limited to visible blocks.
  - Rationale: Keep rendering local and responsive while minimizing XSS risk and scroll jank.
  - Impact: Use Mermaid `securityLevel: strict`, sanitize SVG output, render only visible fences, and cache by content+theme; no Rust/Tauri rendering.

- 2026-01-21 — Decision: Editor wikilinks open on plain click with drag threshold guard.
  - Rationale: Matches Live Preview expectations for single-click navigation.
  - Impact: Link interactions should open on click unless the user is dragging to select.

- 2026-01-14 — Decision: Wikilink targets are normalized for matching (trim outer spaces, case-insensitive, filename-stem mapping).
  - Rationale: Keeps outgoing links and backlinks consistent while staying local-first and file-based.
  - Impact: Compare links by normalized target; strip outer spaces inside `[[ ... ]]`, lowercase by default, and treat `[[Note]]` and `[[note.md]]` as the same target.

- 2026-01-15 — Decision: Navigation hides dotpaths and node_modules by default, with a toggle.
  - Rationale: Keeps vault navigation focused on notes and avoids junk folders/files.
  - Impact: File tree and Quick Switcher filter out any path segment starting with `.` and `node_modules` unless “Show hidden” is enabled; current open note stays open regardless.

- 2026-01-13 — Decision: Keep all vault file I/O behind Tauri commands.
  - Rationale: Enforces a vault-root boundary and avoids broad filesystem permissions in the frontend.
  - Impact: Frontend must only pass `vault_path` + `rel_path`; Rust rejects absolute paths and `..` traversal.

- 2026-01-13 — Decision: MVP backlinks computed by scanning note text.
  - Rationale: Provides an end-to-end vertical slice without introducing a database/index yet.
  - Impact: Backlinks are computed on-demand by reading all Markdown files; later work can replace this with an index/cache.
