---
layout: default
title: Getting Started
---

# Getting Started with Draglass

This guide will help you install, configure, and start using Draglass for your knowledge management needs.

---

## Installation Options

### Option 1: Try the Web Version (Fastest)

The quickest way to experience Draglass is through the web version with the built-in Demo Vault:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/erezak/Draglass.git
   cd Draglass
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Run the development server**:
   ```bash
   pnpm dev
   ```

4. **Open your browser** to the URL displayed (typically `http://localhost:5173`)

5. **Demo Vault loads automatically** with interactive examples of every feature

The web version uses an in-memory vault with localStorage persistence—perfect for trying Draglass without any commitment.

---

### Option 2: Desktop Application (Full Experience)

For native file system access and the complete Draglass experience, build the desktop application.

#### Prerequisites

Before building the desktop app, ensure you have:

- **[Node.js](https://nodejs.org/)** (recommended: latest LTS version)
- **[pnpm](https://pnpm.io/)** package manager
- **[Rust](https://rustup.rs/)** toolchain for Tauri

**Install pnpm** (if not already installed):
```bash
npm install -g pnpm
```

**Install Rust** (if not already installed):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### Build Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/erezak/Draglass.git
   cd Draglass
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Run in development mode**:
   
   Open two terminal windows:
   
   **Terminal 1** (Vite dev server):
   ```bash
   pnpm dev
   ```
   
   **Terminal 2** (Tauri):
   ```bash
   pnpm tauri dev
   ```

4. **Build for production**:
   ```bash
   pnpm build
   pnpm tauri build
   ```

   The built application will be in `src-tauri/target/release/bundle/`

---

## First Launch

### Using the Demo Vault

When you first launch Draglass (web or desktop), the **Demo Vault** opens automatically. This is an interactive guide that demonstrates every feature:

- Browse notes in the left sidebar
- Follow `[[Wikilinks]]` between notes
- Check the **Tasks** panel on the right
- Check the **Tags** tab on the right and filter by `project`
- Open the **Graph View** to see connections
- Try the **Quick Switcher** with `Cmd/Ctrl + P`

**The Demo Vault is a safe playground**—edit anything, experiment freely, and learn by doing.

### Opening Your Own Vault

When you're ready to work with your own notes:

1. **Click the folder icon** in the top bar
2. **Select any folder** on your computer
3. Draglass reads all `.md` files in that folder and subfolders

Your vault is just a folder of Markdown files—nothing special, no proprietary format.

**Desktop app**: Remembers your last vault and reopens it on next launch (configurable in Settings).

**Web version**: Uses an in-memory vault. Desktop app required for persistent file system access.

---

## Creating Your First Note

### Method 1: New Note Button

1. Click the **+** button in the left sidebar toolbar
2. Enter a note name
3. Press Enter

The note is created in the currently selected folder (or vault root if nothing is selected).

### Method 2: Command Palette

1. Press `Cmd/Ctrl + Shift + P` to open the Command Palette
2. Type "New Note"
3. Press Enter

### Method 3: Wikilink (Recommended)

The most natural way to create notes:

1. Type `[[My New Idea]]` in any note
2. Click the wikilink
3. Draglass creates the note and opens it

This workflow encourages connected thinking—the act of linking *is* the act of creating.

### Method 4: New Note from Template

1. Press `Cmd/Ctrl + Shift + P` to open the Command Palette
2. Run **New note from template…**
3. Pick a template from your templates folder (default `_templates`)

You can also run **Insert template…** to apply a template inside the current note. Template files are excluded from Global Search results by default.

---

## Essential Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + P` | Quick Switcher (fuzzy note search) |
| `Cmd/Ctrl + Shift + P` | Command Palette |
| `Cmd/Ctrl + Shift + F` | Global Search (full-text) |
| `Cmd/Ctrl + S` | Force save immediately |
| `Cmd/Ctrl + B` | Toggle left sidebar |
| `Cmd/Ctrl + Shift + B` | Toggle right sidebar |
| `Cmd/Ctrl + Alt + B` | Toggle both sidebars |

---

## Understanding the Interface

### Top Bar
- **Left**: Sidebar view tabs (Files / Search) and toggle button
- **Center**: App name and vault selector
- **Right**: Right sidebar toggle button

### Left Sidebar
- **Files tab**: Tree view of all notes and folders
  - Toolbar: New note, new folder buttons
  - Bottom: Vault name/path and Settings button
- **Search tab**: Global search interface
  - Full-text search across vault
  - Case-sensitive toggle
  - Results with snippets and line numbers

### Main Editor
- **Title bar**: Note name (click to rename), Live Preview/Source toggle, save indicator
- **Editor**: CodeMirror 6 editor with Live Preview or Source mode
- **Autosave**: Green dot = saved, pulsing = saving, red = error

### Right Sidebar
Tabs and panels:

1. **Links tab**:
   - **Outgoing Links**: Wikilinks in the current note
   - **Backlinks**: Notes that link to the current note
2. **Tasks tab**: All open checkboxes across the vault (click to jump)
3. **Tags tab**: Filter tags and open notes by selected tag

### Toolbox (Left Side)
Vertical toolbar with three buttons:
- **Quick Switcher** (magnifying glass)
- **Graph View** (network icon)
- **Command Palette** (command icon)

---

## Basic Workflows

### Daily Capture

1. Create a daily note: `[[2026-02-08]]`
2. Add tasks for today:
   ```markdown
   - [ ] Review notes on [[Project Alpha]]
   - [ ] Write summary of [[Meeting Notes]]
   ```
3. Link to relevant topic notes as you write
4. Check the Tasks panel to see your to-dos

### Building a Knowledge Base

1. Start with broad topic notes: `[[Philosophy]]`, `[[Science]]`, etc.
2. Write specific notes and link back: 
   - `[[Socratic Method]]` links to `[[Philosophy]]`
   - `[[Philosophy]]` links to `[[Critical Thinking]]`
3. Use the Graph View to see clusters form
4. Follow backlinks to discover unexpected connections

### Project Management

1. Create a project note: `[[Project Alpha]]`
2. Add tasks within it:
   ```markdown
   ## To Do
   - [ ] Design database schema
   - [ ] Write API documentation
   - [ ] Set up CI pipeline
   ```
3. Create linked notes for details: `[[Database Design]]`, `[[API Spec]]`
4. Use the Tasks panel to track open items across all project notes

---

## Recommended Settings

### For Privacy
- **Show hidden/ignored paths**: Off (default)
- **Remember last vault on startup**: Your choice
- Set a **vault password** if using locked sections

### For Performance
- **Autosave debounce**: 750ms (default) or higher for slower systems
- **Backlinks debounce**: 250ms (default)
- **Render diagrams/images**: On for rich experience, off for speed

### For Focus
- Use `Cmd/Ctrl + Alt + B` to hide both sidebars
- Enable **Soft wrap** for comfortable reading
- Choose your preferred theme (Dark or Light)

---

## Tips for New Users

1. **Start small**: Begin with 5-10 notes. Grow your vault organically.
2. **Link generously**: Create wikilinks as you write. You can always refine later.
3. **Use the Demo Vault**: It's the best tutorial. Edit it, break it, learn from it.
4. **Check backlinks often**: They reveal connections you didn't plan.
5. **Trust autosave**: The green dot means you're saved. No need to spam `Cmd/Ctrl + S`.
6. **Explore the Graph**: Especially after you have 20+ notes. Patterns emerge.
7. **Tasks anywhere**: Don't create a separate to-do app. Tasks in context are more useful.
8. **Folders are optional**: Links create structure too. Use folders only when they help.

---

## Organizing Your Vault

Draglass supports multiple organization strategies:

### Flat Vault
Keep all notes at the root. Rely entirely on wikilinks for structure. Works well for smaller vaults and promotes heavy interlinking.

### Topic Folders
Group notes by subject: `Science/`, `Philosophy/`, `Projects/`. Good for established knowledge domains.

### PARA Method
- **Projects**: Active work with deadlines
- **Areas**: Ongoing responsibilities
- **Resources**: Reference material
- **Archives**: Completed or inactive items

### Zettelkasten
One idea per note, with explicit wikilinks between them. Let structure emerge from connections rather than folders. Perfect for the Graph View.

**Experiment** and find what works for you. You can always reorganize later.

---

## Troubleshooting

### Notes Not Appearing
- Ensure the folder contains `.md` files
- Check **Show hidden/ignored paths** in Settings
- Verify the vault path is correct (shown at bottom of left sidebar)

### Graph View Not Loading
- Refresh the graph with the refresh button
- Check browser console for errors (web version)
- Try with a smaller vault to isolate performance issues

### Autosave Not Working
- Look for the red dot indicator (file system error)
- Check file permissions in your vault folder
- Verify disk space is available

### Backlinks Not Updating
- Backlinks scan is debounced. Wait 250ms after typing.
- Check that backlinks are enabled in Settings
- Restart the app to force a full rescan

### Locked Sections Not Hiding
- Ensure the heading has `{locked}` marker
- Verify vault is locked (lock with **Hide Private Sections** command)
- Check that vault password is set

---

## Next Steps

Now that you're set up:

1. **[Explore all features](features)** in detail
2. **[View screenshots](screenshots)** of Draglass in action
3. **[Return to home](index)** for more resources
4. **[Visit the GitHub repo]({{ site.github.repository_url }})** to report issues or contribute

---

[← Back to Home](index) | [Features →](features)
