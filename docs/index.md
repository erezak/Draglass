---
layout: default
title: Home
---

<section class="hero">
  <div>
    <p class="hero-eyebrow">Local-first knowledge base</p>
    <h1>Draglass</h1>
    <p class="hero-lead">
      Draglass is a privacy-first, offline-first knowledge management app that stores your notes
      as plain Markdown files. Built with Tauri, React, and TypeScript, it combines wikilinks,
      backlinks, graph visualization, and a Live Preview editor.
    </p>
    <div class="hero-actions">
      <a class="button primary" href="getting-started">Get Started</a>
      <a class="button ghost" href="{{ site.github.repository_url }}">View on GitHub</a>
    </div>
  </div>
  <div class="hero-card">
    <img src="screenshots/main-interface.png" alt="Draglass Main Interface" />
  </div>
</section>

---

## Why Draglass?

### 🔒 Privacy-First
Your data stays on your device. No cloud sync, no telemetry, no network calls. Everything is stored
as plain `.md` files that you control.

### 🚀 Fast and Powerful
Built with modern technologies (Tauri, React, CodeMirror 6) for a responsive, native-like
experience on desktop and web.

### 🔗 Connected Thinking
Create connections between notes using wikilinks. Discover relationships through automatic
backlinks and visualize your knowledge graph.

### 📝 Rich Markdown Support
Full Markdown syntax with Live Preview mode, Properties (frontmatter), Mermaid diagrams, Excalidraw
drawings, callouts, tags, task checkboxes, and image lightbox.

### 🎨 Customizable
Dark and light themes, resizable panes, configurable autosave, and dozens of settings to make
Draglass work your way.

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
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build
pnpm tauri build
```

---

## Key Features at a Glance

<div class="feature-grid">
  <div class="feature-card">
    <h3>📑 Wikilinks & Backlinks</h3>
    <p>
      Connect notes with <code>[[double brackets]]</code>. Automatic backlink detection shows which
      notes link to the current one.
    </p>
  </div>

  <div class="feature-card">
    <h3>🕸️ Graph View</h3>
    <p>Visualize your entire vault as an interactive network with search and filters.</p>
  </div>

  <div class="feature-card">
    <h3>⚡ Quick Switcher</h3>
    <p>Fuzzy search to jump to any note instantly with <kbd>Cmd/Ctrl + P</kbd>.</p>
  </div>

  <div class="feature-card">
    <h3>🔍 Global Search</h3>
    <p>Full-text search across your entire vault with <kbd>Cmd/Ctrl + Shift + F</kbd>.</p>
  </div>

  <div class="feature-card">
    <h3>#️⃣ Tags Explorer</h3>
    <p>Use <code>#tags</code> and <code>#nested/tags</code>, then browse them in the right-pane Tags tab.</p>
  </div>

  <div class="feature-card">
    <h3>✅ Task Management</h3>
    <p>Automatic scanning of checkboxes across all notes with click-to-jump tasks.</p>
  </div>

  <div class="feature-card">
    <h3>✏️ Excalidraw Diagrams</h3>
    <p>Render Excalidraw drawings inline and open .excalidraw files from your vault.</p>
  </div>

  <div class="feature-card">
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

See [LICENSE]({{ site.github.repository_url }}/blob/main/LICENSE) and
[THIRD_PARTY_LICENSES.md]({{ site.github.repository_url }}/blob/main/THIRD_PARTY_LICENSES.md)

---

<div class="cta-row">
  <a class="button primary" href="getting-started">Get Started →</a>
  <a class="button ghost" href="{{ site.github.repository_url }}">View on GitHub</a>
</div>
