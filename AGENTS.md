# AGENTS.md

## Project: Draglass

Draglass is a local-first, cross-platform knowledge base app.
Core goals:
- Markdown notes stored as plain files in a vault folder
- Wikilinks and backlinks
- Privacy-first, offline-first, no telemetry by default
- Open source, clean-room implementation

This file contains practical instructions for AI coding agents working in this repo.

## Golden rules

1) Clean-room constraints
- Do not copy any proprietary code, UI assets, icons, text, or distinctive UI layout.
- Implement behavior from first principles or from our own written specs and tests.

2) Local-first, minimal network
- Do not add network calls, analytics, crash reporting, or remote services unless explicitly requested.
- Assume user data is sensitive. Default to on-device storage and processing.

3) Small, reviewable changes
- Prefer small PR-sized diffs.
- Keep dependencies minimal. Do not add a new dependency without explaining why it is needed and what alternatives were considered.

4) Always validate
- If you change code, run the relevant build, lint, and test commands before finalizing.
- If tests do not exist yet, add at least one basic test or a minimal verification harness when feasible.

## Repo layout

- `src/` React + TypeScript frontend
- `src-tauri/` Tauri Rust backend

If this repo later gains additional crates:
- Keep core logic in Rust crates that are UI-agnostic.
- Keep Tauri commands thin, calling into those crates.

## Setup and dev commands

### Install
- Install dependencies: `pnpm install`

### Frontend dev (browser)
- Run Vite dev server: `pnpm dev`

### Desktop dev (Tauri)
- In terminal A: `pnpm dev`
- In terminal B: `pnpm tauri dev`

### Production builds
- Build frontend: `pnpm build`
- Build desktop app: `pnpm tauri build`

## Quality gates

### TypeScript
- Prefer TypeScript strictness.
- Avoid `any` unless there is a clear, documented reason.

If/when tooling exists in the repo, use these (update once added):
- Format: `pnpm format`
- Lint: `pnpm lint`
- Test: `pnpm test`

### Rust
From `src-tauri/`:
- Format: `cargo fmt`
- Lint: `cargo clippy --all-targets --all-features`
- Test: `cargo test`

Constraints:
- Avoid `unsafe` unless unavoidable and reviewed.
- Prefer explicit error types. Use `anyhow` only at boundaries if adopted.

## Coding conventions

### Frontend (React)
- Use function components and hooks.
- Keep UI components small and composable.
- Keep state predictable. Prefer derived state over duplicated state.
- Do not introduce a global state library until it is clearly justified.

### Editor (CodeMirror 6)
- Treat CodeMirror as the source of truth for the note text.
- Avoid heavy per-keystroke work on the UI thread.
- Expensive parsing or indexing should be debounced, incremental, moved to a Worker, or done on the Rust side.

### Storage model (MVP)
MVP targets:
- Vault is a folder of Markdown files.
- A note’s identity is its path relative to the vault root.
- Links are stored as text in Markdown using a generic wikilink format: `[[Note Name]]`.

Avoid premature complexity:
- No sync, no accounts, no cloud.

## SQLite and indexing

We will likely use SQLite for:
- Full-text search (FTS5)
- Link graph edges (optional early)
- Metadata cache (later)

Agent guidance:
- Keep the canonical data in files.
- Treat SQLite as an index/cache that can be rebuilt.
- Any schema changes must include a migration strategy or a rebuild strategy.

If you add database code:
- Document schema in `docs/db.md` (create if missing).
- Include a “rebuild index” command or developer note.

## Implementation workflow for agents

When assigned a task:
1) Restate the task briefly and list the files you expect to touch.
2) Search the repo for existing patterns before introducing new ones.
3) Implement with minimal changes.
4) Run the relevant commands (build, lint, tests).
5) Summarize what changed and how it was verified.

If anything is ambiguous:
- Ask for a decision only when required.
- Otherwise, choose the simplest option consistent with the MVP goals and document the assumption in code comments.

## Security and privacy checklist

Before introducing a change that touches data:
- Confirm data stays local.
- Confirm no telemetry is added.
- Confirm logs do not leak note contents by default.
- Prefer explicit user actions for export, sharing, or remote features.

## Licensing notes

- Any added dependency must have a permissive, compatible license for an open source distribution.
- Do not copy code from unknown sources.
- Keep attribution files (LICENSE, NOTICE) up to date if required by dependencies.