# Customizing Draglass

Open **Settings** by clicking the gear icon at the bottom of the left sidebar (or pressing **Escape** to close it again). Every preference is stored locally on your device and takes effect immediately.

## Editor settings

| Setting | What it does | Default |
|---|---|---|
| Soft wrap | Wrap long lines to fit the editor width | On |
| Render diagrams | Show Mermaid diagrams inline in [[Live Preview]] | On |
| Render images | Show image thumbnails inline in [[Live Preview]] | On |
| Render callouts | Style `> [!type]` blocks as callout cards | On |
| Theme | Switch between **Dark** and **Light** appearance | Dark |

The theme applies to the editor, the [[Graph View]], and Mermaid diagrams simultaneously.

> [!tip] Quick toggle
> You can also switch between Live Preview and Source mode with the button in the editor header — no need to visit Settings for that.

## File settings

| Setting | What it does | Default |
|---|---|---|
| Remember last vault on startup | Reopen the vault you had open when you last quit | On |
| Show hidden/ignored paths | Reveal dotfiles, `node_modules`, etc. in the file tree and search | Off |
| Remember expanded folders | Preserve which folders are open when you switch notes | On |

## Autosave

Draglass saves your work automatically after you stop typing.

| Setting | What it does | Default |
|---|---|---|
| Enable autosave | Turn debounced auto-saving on or off | On |
| Autosave debounce (ms) | How long to wait after the last keystroke before writing to disk | 750 ms |

A small indicator dot in the editor header shows the current save state:

- **Green** — saved
- **Pulsing** — saving in progress
- **Red** — error (check the file system)

You can always force an immediate save with **Cmd/Ctrl + S**.

## Backlinks

| Setting | What it does | Default |
|---|---|---|
| Enable backlinks | Scan the vault for notes that link to the active note | On |
| Backlinks debounce (ms) | Delay before rescanning after a change | 250 ms |

See [[Backlinks]] for how the panel works.

## Quick Switcher

| Setting | What it does | Default |
|---|---|---|
| Debounce (ms) | Delay before filtering the note list | 60 ms |
| Max results | Maximum number of matches to show | 50 |
| Max recents | Number of recently opened notes to remember | 20 |

See [[Searching Your Vault]] for the full guide on searching.

## Pane layout

The left and right sidebars can be resized by dragging the divider, or collapsed entirely with keyboard shortcuts:

| Shortcut | Action |
|---|---|
| **Cmd/Ctrl + B** | Toggle left sidebar |
| **Cmd/Ctrl + Shift + B** | Toggle right sidebar |
| **Cmd/Ctrl + Alt + B** | Toggle both sidebars at once |

Pane widths and open/closed state are remembered across sessions.

## Reset to defaults

At the bottom of the Settings screen there is a **Reset** button that restores every setting to its factory default.

## The demo vault

This vault you are reading right now is the built-in demo vault. It opens automatically on first launch and is always available through the Command Palette (**Cmd/Ctrl + Shift + P → Open Demo Vault**). Use it as a sandbox — every note is editable, and you can explore features like the [[Graph View]], [[Tasks and Checklists|task scanner]], and [[Privacy and Security|locked sections]] without worrying about your own files.

## Related

- [[Live Preview]] — the rendering features you can toggle here
- [[Privacy and Security]] — vault password and locked sections
- [[Quick Start Guide]] — all keyboard shortcuts in one place
- [[Welcome to Draglass]] — demo vault overview
