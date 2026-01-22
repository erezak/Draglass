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
