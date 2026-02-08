---
layout: default
title: Home
---

# Draglass

**A local-first, cross-platform knowledge base application**

Draglass is a privacy-first, offline-first knowledge management app that stores your notes as plain Markdown files in a local vault folder. Built with Tauri, React, and TypeScript, it features wikilinks, backlinks, graph visualization, and a powerful editor with Live Preview.

![Draglass Main Interface](https://github.com/user-attachments/assets/d76ca78e-848f-466b-b89d-4736ab3c9f78)

---

## Why Draglass?

### 🔒 Privacy-First
Your data stays on your device. No cloud sync, no telemetry, no network calls. Everything is stored as plain `.md` files that you control.

### 🚀 Fast and Powerful
Built with modern technologies (Tauri, React, CodeMirror 6) for a responsive, native-like experience on desktop and web.

### 🔗 Connected Thinking
Create connections between notes using wikilinks. Discover relationships through automatic backlinks and visualize your knowledge graph.

### 📝 Rich Markdown Support
Full Markdown syntax with Live Preview mode, Mermaid diagrams, callouts, task checkboxes, and image lightbox.

### 🎨 Customizable
Dark and light themes, resizable panes, configurable autosave, and dozens of settings to make Draglass work your way.

---

## Quick Start

### Try it in Your Browser

Experience Draglass instantly with the built-in Demo Vault:

1. [Try the Web Version]({{ site.github.repository_url }}) (Coming soon: Live demo)
2. No installation required
3. Full-featured interactive demonstration

### Desktop Application

For native file system access and the complete experience:

```bash
# Clone the repository
git clone https://github.com/erezak/Draglass.git
cd Draglass

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
npm run tauri build
```

---

## Key Features at a Glance

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0;">

<div style="padding: 20px; border: 1px solid #e1e4e8; border-radius: 6px;">
<h3>📑 Wikilinks & Backlinks</h3>
<p>Connect notes with <code>[[double brackets]]</code>. Automatic backlink detection shows which notes link to the current one.</p>
</div>

<div style="padding: 20px; border: 1px solid #e1e4e8; border-radius: 6px;">
<h3>🕸️ Graph View</h3>
<p>Visualize your entire vault as an interactive network. Global and local modes, customizable forces, and search.</p>
</div>

<div style="padding: 20px; border: 1px solid #e1e4e8; border-radius: 6px;">
<h3>⚡ Quick Switcher</h3>
<p>Fuzzy search to jump to any note instantly with <kbd>Cmd/Ctrl + P</kbd>.</p>
</div>

<div style="padding: 20px; border: 1px solid #e1e4e8; border-radius: 6px;">
<h3>🔍 Global Search</h3>
<p>Full-text search across your entire vault with <kbd>Cmd/Ctrl + Shift + F</kbd>.</p>
</div>

<div style="padding: 20px; border: 1px solid #e1e4e8; border-radius: 6px;">
<h3>✅ Task Management</h3>
<p>Automatic scanning of checkboxes across all notes. Click-to-jump task panel.</p>
</div>

<div style="padding: 20px; border: 1px solid #e1e4e8; border-radius: 6px;">
<h3>🔐 Privacy Features</h3>
<p>Lock sensitive sections with passwords. Everything stays local and encrypted.</p>
</div>

</div>

---

## Learn More

- **[Full Features List](features)** - Comprehensive feature descriptions
- **[Getting Started Guide](getting-started)** - Installation and first steps
- **[Screenshots](screenshots)** - Visual tour of Draglass
- **[GitHub Repository]({{ site.github.repository_url }})** - Source code and issues

---

## Built With

- **Frontend**: React 19, TypeScript, CodeMirror 6, Vite
- **Backend**: Tauri 2.x, Rust
- **Tooling**: ESLint, pnpm workspaces

---

## Philosophy

Draglass is built with these principles:

- **Clean-room**: No copying from proprietary software
- **Minimal dependencies**: Only add what's necessary
- **Small changes**: Prefer reviewable, incremental improvements
- **Local-first**: User data stays local and private by default

---

## License

See [LICENSE]({{ site.github.repository_url }}/blob/main/LICENSE) and [THIRD_PARTY_LICENSES.md]({{ site.github.repository_url }}/blob/main/THIRD_PARTY_LICENSES.md)

---

<div style="text-align: center; margin: 40px 0;">
<a href="getting-started" style="display: inline-block; padding: 12px 30px; background: #0366d6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Get Started →</a>
<a href="{{ site.github.repository_url }}" style="display: inline-block; padding: 12px 30px; margin-left: 10px; border: 1px solid #0366d6; color: #0366d6; text-decoration: none; border-radius: 6px; font-weight: bold;">View on GitHub</a>
</div>
