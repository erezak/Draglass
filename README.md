# Draglass

A local-first, cross-platform knowledge base application built with Tauri, React, and TypeScript.

## Overview

Draglass is a privacy-first, offline-first knowledge management app that stores your notes as plain Markdown files in a local vault folder. It features wikilinks, backlinks, and a clean, focused interface for organizing your thoughts.

### Core Features

#### Notes and Editor
- **Markdown Notes**: All notes stored as plain `.md` files in your vault folder
- **CodeMirror 6**: Powerful, extensible editor with markdown support
- **Live Preview**: Inline rendering of formatting, images, diagrams, and callouts as you type
- **Source Mode**: Toggle to see raw Markdown when needed
- **Autosave**: Automatic debounced saving with visual indicators (green/pulsing/red)

#### Linking and Navigation
- **Wikilinks**: Link between notes using `[[Note Name]]` syntax with optional display aliases
- **Backlinks**: Automatic detection of incoming links from other notes
- **Quick Switcher** (`Cmd/Ctrl + P`): Fuzzy search to instantly jump to any note
- **Command Palette** (`Cmd/Ctrl + Shift + P`): Searchable list of all app commands
- **Global Search** (`Cmd/Ctrl + Shift + F`): Full-text search across your entire vault
- **Graph View**: Visual network diagram of all notes and connections
  - Global mode: See your entire vault
  - Local mode: Focus on notes within N hops of the current note
  - Interactive: Click nodes to open notes, search to highlight, customize forces and colors

#### Organization and Productivity
- **Tasks and Checklists**: Automatic scanning of `- [ ]` checkboxes across all notes
- **Task Panel**: Centralized view of all open tasks with click-to-jump navigation
- **Daily Notes**: Time-stamped entry points for capturing ideas and tracking work
- **Folders**: Create hierarchical structure to organize your notes
- **File Management**: Rename and delete notes via Command Palette with confirmations

#### Privacy and Security
- **Local-First**: Your data stays on your device - no cloud sync, no telemetry, no network calls
- **Privacy-First**: Open source, clean-room implementation with no analytics or tracking
- **Locked Sections**: Mark headings as `{locked}` to hide sensitive content
- **Vault Passwords**: Password-protected access to locked sections with secure key derivation
- **Hidden Files**: Automatic filtering of dotfiles and system folders

#### Rich Content
- **Mermaid Diagrams**: Render flowcharts, sequence diagrams, and more inline
- **Callout Blocks**: Styled `> [!type]` blocks for notes, tips, warnings, etc.
- **Images**: Inline thumbnails with click-to-enlarge lightbox
- **Tables, Code Blocks, Lists**: Full Markdown syntax support

#### Customization
- **Themes**: Dark and Light modes for editor, graph, and diagrams
- **Layout**: Resizable sidebars with keyboard shortcuts to toggle visibility
- **Settings**: Configure autosave timing, backlinks scanning, rendering options, and more
- **Demo Vault**: Built-in interactive guide that showcases all features

#### Platform Support
- **Cross-Platform**: Desktop app built with Tauri (Rust + React)
- **Web Version**: Run in browser with localStorage persistence for demonstrations

## Architecture

- **Frontend**: React + TypeScript with Vite
- **Backend**: Tauri (Rust) for file system operations and vault management
- **Editor**: CodeMirror 6 with Live Preview (default) and Source modes

## Quick Start

### Try the Web Version

The fastest way to try Draglass is to run the web version with the built-in Demo Vault:

```bash
npm install
npm run dev
```

Then open your browser to the displayed URL. The Demo Vault will load automatically, showcasing all features interactively.

### Desktop Application

For the full desktop experience with native file system access:

#### Prerequisites

- [Node.js](https://nodejs.org/) (recommended: latest LTS)
- [pnpm](https://pnpm.io/) package manager
- [Rust](https://rustup.rs/) (for Tauri development)

#### Installation

```bash
# Install dependencies
pnpm install
```

#### Development

**Browser Development (Frontend only)**
```bash
pnpm dev
```

**Desktop Development (Full Tauri app)**

In two separate terminals:
```bash
# Terminal 1: Start Vite dev server
pnpm dev

# Terminal 2: Start Tauri dev mode
pnpm tauri dev
```

#### Building

```bash
# Build frontend for production
pnpm build

# Build desktop application
pnpm tauri build
```

## Development Guidelines

For AI coding agents and contributors, see:
- **[AGENTS.md](./AGENTS.md)** - Development guidelines and coding conventions
- **[MEMORY.md](./MEMORY.md)** - Key architectural decisions and rationale

### Quick Commands

```bash
pnpm lint              # Run ESLint
pnpm test              # Run tests
pnpm licenses:generate # Generate third-party licenses
```

## Key Features Explained

### Wikilinks and Backlinks

Create connections between notes by wrapping note titles in `[[double brackets]]`. Draglass automatically detects these links and shows you:
- **Outgoing links**: Notes you link to from the current note
- **Backlinks**: Notes that link to the current note

This bidirectional linking creates an emergent knowledge graph.

### Graph View

Visualize your entire vault as an interactive network:
- **Global mode**: See all notes and connections
- **Local mode**: Focus on the current note and its neighbors
- Customize forces, colors, and display options
- Click any node to open that note instantly

### Tasks Panel

Write tasks anywhere in your vault using standard Markdown checkboxes:
```markdown
- [ ] Open task
- [x] Completed task  
- [-] Cancelled task
```

The Tasks panel automatically collects all open tasks across your vault, with click-to-jump navigation.

### Privacy Features

- **Locked Sections**: Add `{locked}` to any heading to hide sensitive content
- **Vault Passwords**: Secure access with password protection
- **Local Storage**: Everything stays on your device—no cloud, no tracking

### Demo Vault

Draglass ships with an interactive Demo Vault that opens automatically on first launch. It's a complete working vault that demonstrates every feature through real examples. Access it anytime via the Command Palette (`Cmd/Ctrl + Shift + P → Open Demo Vault`).

## Documentation

For detailed guides and documentation, visit the [Draglass website](https://erezak.github.io/Draglass/).

## Storage Model

- Vault is a folder containing Markdown files
- Each note's identity is its relative path from the vault root
- Wikilink targets are normalized (case-insensitive, filename-stem matching)
- Hidden files (dotfiles) and `node_modules` are filtered from navigation by default

## Tech Stack

- **Frontend**: React 19, TypeScript, CodeMirror 6, Vite
- **Backend**: Tauri 2.x, Rust
- **Tooling**: ESLint, pnpm workspaces

## License

See [LICENSE](./LICENSE) and [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md)

## Philosophy

Draglass is built with these principles:
- **Clean-room**: No copying from proprietary software
- **Minimal dependencies**: Only add what's necessary
- **Small changes**: Prefer reviewable, incremental improvements
- **Local-first**: User data stays local and private by default