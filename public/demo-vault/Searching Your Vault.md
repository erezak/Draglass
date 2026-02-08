# Searching Your Vault

Draglass gives you two fast ways to find things: the **Quick Switcher** for jumping to a note by name, and **Global Search** for finding text anywhere in your vault.

## Quick Switcher

Open it with **Cmd/Ctrl + P**. Start typing and a fuzzy-matched list of notes appears instantly. The list also shows your most recently opened notes so you can bounce back to where you were.

> [!tip] Fuzzy matching
> You do not need to type an exact filename. Typing "phil" will match [[Philosophy]], "crit" will match [[Critical Thinking]], and so on. The algorithm scores results by how closely the query matches the start of the file name.

Press **Enter** to open the selected note, or **Esc** to dismiss.

Settings that affect the Quick Switcher (all in [[Customizing Draglass|Settings]]):

- **Debounce (ms)** — how long to wait after you stop typing before filtering (default 60 ms)
- **Max results** — cap on displayed matches (default 50)
- **Max recents** — how many recent notes to remember (default 20)

## Global Search

Open it with **Cmd/Ctrl + Shift + F** (or click the magnifying-glass tab at the top of the left sidebar). Type a query and Draglass searches the full text of every note in the vault.

Results are grouped by file with a snippet and line number for each hit. Click any result to open the note and jump directly to that line.

### Case sensitivity

Click the **Aa** button next to the search field to toggle case-sensitive matching.

### Locked content

When the vault is locked, search results exclude text inside [[Privacy and Security|locked sections]]. Unlock the vault first if you need to search private content.

## When to use which

| Situation | Tool | Shortcut |
|---|---|---|
| Jump to a note you know by name | Quick Switcher | Cmd/Ctrl + P |
| Find a phrase or keyword anywhere | Global Search | Cmd/Ctrl + Shift + F |
| Run a command (new note, toggle, etc.) | [[Quick Start Guide#Command Palette\|Command Palette]] | Cmd/Ctrl + Shift + P |

## The left sidebar toggle

The left pane has two tabs at the top: **Files** and **Search**. Clicking Search (or pressing **Cmd/Ctrl + Shift + F**) switches to the Global Search panel without closing the sidebar.

## Related

- [[Quick Start Guide]] — all keyboard shortcuts in one place
- [[Graph View]] — another way to explore your vault visually
- [[Wikilinks]] — navigate by following links instead of searching
