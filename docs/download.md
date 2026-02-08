---
layout: default
title: Download
---

# Download Draglass

Get Draglass for your platform and start building your local-first knowledge base.

---

## Current Status

Draglass is currently in **active development** and available as open source software. There are no pre-built binaries yet, but you can build from source for any platform.

---

## Build from Source

### Prerequisites

- **[Node.js](https://nodejs.org/)** (latest LTS recommended)
- **[pnpm](https://pnpm.io/)** package manager
- **[Rust](https://rustup.rs/)** toolchain (for desktop builds)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/erezak/Draglass.git
cd Draglass

# Install dependencies
npm install  # or pnpm install

# Run web version
npm run dev

# For desktop application (requires Rust)
pnpm install
pnpm tauri dev

# Build for production
pnpm build
pnpm tauri build
```

---

## Platform Support

### ✅ Supported Platforms

- **Windows** (via Tauri)
- **macOS** (via Tauri)
- **Linux** (via Tauri)
- **Web browsers** (Chrome, Firefox, Safari, Edge)

### Desktop Requirements

- **Windows**: Windows 7 or later
- **macOS**: macOS 10.13 or later
- **Linux**: Modern distribution with GTK 3.0+

### Web Requirements

- Modern browser with WebAssembly support
- JavaScript enabled
- localStorage access

---

## Try Before Installing

### Web Demo

The fastest way to try Draglass without installation:

1. Clone the repository
2. Run `npm install && npm run dev`
3. Open your browser to `http://localhost:5173`
4. The Demo Vault loads automatically

**Note**: The web version uses an in-memory vault with localStorage. For persistent file system access, use the desktop application.

---

## Installation Methods

### Method 1: npm/pnpm (Recommended for Development)

```bash
# Using npm
git clone https://github.com/erezak/Draglass.git
cd Draglass
npm install
npm run dev  # Web version
npm run tauri dev  # Desktop version

# Using pnpm
git clone https://github.com/erezak/Draglass.git
cd Draglass
pnpm install
pnpm dev  # Web version
pnpm tauri dev  # Desktop version
```

### Method 2: Build Desktop Application

```bash
# Ensure Rust is installed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build the desktop app
cd Draglass
pnpm install
pnpm tauri build

# Find the built application in:
# src-tauri/target/release/bundle/
```

The output location varies by platform:
- **Windows**: `bundle/msi/` or `bundle/nsis/`
- **macOS**: `bundle/macos/` or `bundle/dmg/`
- **Linux**: `bundle/deb/` or `bundle/appimage/`

---

## System Requirements

### Minimum Requirements

- **CPU**: Any modern dual-core processor
- **RAM**: 2 GB
- **Disk**: 200 MB for application, additional space for your vault
- **Display**: 1024x768 minimum resolution

### Recommended Requirements

- **CPU**: Quad-core processor or better
- **RAM**: 4 GB or more
- **Disk**: SSD for best performance
- **Display**: 1920x1080 or higher

---

## What's Included

When you build Draglass, you get:

### Core Features
- ✅ Markdown editor with Live Preview
- ✅ Wikilinks and backlinks
- ✅ Graph View visualization
- ✅ Quick Switcher and Global Search
- ✅ Task management across vault
- ✅ Privacy features with locked sections
- ✅ Mermaid diagram rendering
- ✅ Callout blocks
- ✅ Image lightbox
- ✅ Dark and Light themes
- ✅ Customizable settings
- ✅ Built-in Demo Vault

### Platform Features
- **Desktop**: Native file system access, remembers last vault
- **Web**: In-memory vault, localStorage persistence

---

## Getting Help

### Documentation
- **[Getting Started Guide](getting-started)** - Setup and first steps
- **[Features](features)** - Complete feature reference
- **[Screenshots](screenshots)** - Visual tour

### Community
- **[GitHub Repository]({{ site.github.repository_url }})** - Source code
- **[Issues]({{ site.github.repository_url }}/issues)** - Report bugs or request features
- **[Discussions]({{ site.github.repository_url }}/discussions)** - Ask questions, share ideas

---

## Roadmap

### Planned Features

- [ ] Pre-built binaries for all platforms
- [ ] Package manager distribution (Homebrew, Chocolatey, apt)
- [ ] Plugin system
- [ ] Mobile apps (iOS, Android)
- [ ] Git integration
- [ ] Export to PDF, HTML
- [ ] Multiple vaults management
- [ ] Enhanced search (regex, filters)

### Stay Updated

Watch the [GitHub repository]({{ site.github.repository_url }}) for:
- Release announcements
- Feature updates
- Bug fixes
- Security patches

---

## License

Draglass is open source software. See:
- [LICENSE]({{ site.github.repository_url }}/blob/main/LICENSE)
- [THIRD_PARTY_LICENSES.md]({{ site.github.repository_url }}/blob/main/THIRD_PARTY_LICENSES.md)

---

## Building from Source

For detailed build instructions, see the [README]({{ site.github.repository_url }}/blob/main/README.md) and [AGENTS.md]({{ site.github.repository_url }}/blob/main/AGENTS.md) in the repository.

### Development Commands

```bash
# Frontend development (browser)
npm run dev

# Desktop development (Tauri)
pnpm tauri dev

# Build frontend only
npm run build

# Build desktop application
pnpm tauri build

# Run linters
npm run lint

# Run tests (when available)
npm run test

# Format code
npm run format
```

---

## Contributing

Draglass is open to contributions! To get started:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [AGENTS.md]({{ site.github.repository_url }}/blob/main/AGENTS.md) for development guidelines and coding conventions.

---

[← Back to Home](index) | [Getting Started →](getting-started)
