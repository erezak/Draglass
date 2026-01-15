- 2026-01-14 — Decision: Wikilink targets are normalized for matching (trim outer spaces, case-insensitive, filename-stem mapping).
  - Rationale: Keeps outgoing links and backlinks consistent while staying local-first and file-based.
  - Impact: Compare links by normalized target; strip outer spaces inside `[[ ... ]]`, lowercase by default, and treat `[[Note]]` and `[[note.md]]` as the same target.

- 2026-01-13 — Decision: Keep all vault file I/O behind Tauri commands.
  - Rationale: Enforces a vault-root boundary and avoids broad filesystem permissions in the frontend.
  - Impact: Frontend must only pass `vault_path` + `rel_path`; Rust rejects absolute paths and `..` traversal.

- 2026-01-13 — Decision: MVP backlinks computed by scanning note text.
  - Rationale: Provides an end-to-end vertical slice without introducing a database/index yet.
  - Impact: Backlinks are computed on-demand by reading all Markdown files; later work can replace this with an index/cache.
