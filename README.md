# Draglass Editor · 0.19.0

Local Markdown editing, connected knowledge and AI conversations. Desktop first, with macOS, Windows and Linux builds from the same Electron application.

Copyright © 2026 Erez Korn.

## Run

Use Node.js 24 LTS and your installed pnpm. The project does not select or download a specific pnpm version.

```sh
pnpm install --frozen-lockfile
pnpm start
```

Open `sample-vault` or an existing Markdown folder. Files remain ordinary Markdown. Editing autosaves continuously; external changes and internal saves use the last completed action.

## Build

```sh
pnpm run dist:mac:app
```

Copy `release/mac-arm64/Draglass Editor.app` to `/Applications`. For a DMG, use `pnpm run dist:mac:dmg`. Windows and Linux use `pnpm run dist:win` and `pnpm run dist:linux` on their target systems.

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

