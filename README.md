# Draglass

A local-first, cross-platform knowledge base application built with Tauri, React, and TypeScript.

## Overview

Draglass is a privacy-first, offline-first knowledge management app that stores your notes as plain Markdown files in a local vault folder. It features wikilinks, backlinks, and a clean, focused interface for organizing your thoughts.

### Core Features

- **Markdown Notes**: All notes stored as plain `.md` files in your vault folder
- **Wikilinks & Backlinks**: Link between notes using `[[Note Name]]` syntax with automatic backlink detection
- **Local-First**: Your data stays on your device - no cloud sync, no telemetry, no network calls
- **Cross-Platform**: Desktop app built with Tauri (Rust + React)
- **Privacy-First**: Open source, clean-room implementation with no analytics or tracking
- **CodeMirror 6**: Powerful, extensible editor with markdown support

## Architecture

- **Frontend**: React + TypeScript with Vite
- **Backend**: Tauri (Rust) for file system operations and vault management
- **Editor**: CodeMirror 6 for the note editing experience

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (recommended: latest LTS)
- [pnpm](https://pnpm.io/) package manager
- [Rust](https://rustup.rs/) (for Tauri development)

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

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

### Building

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