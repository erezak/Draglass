# Quick Start Guide

This note covers the essential keyboard shortcuts and navigation patterns so you can move around Draglass quickly.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| **Cmd/Ctrl + P** | Open the Quick Switcher (fuzzy note search) |
| **Cmd/Ctrl + Shift + P** | Open the Command Palette |
| **Cmd/Ctrl + Shift + F** | Open Global Search in the left sidebar |
| **Cmd/Ctrl + S** | Save the current note immediately |
| **Cmd/Ctrl + B** | Toggle the left sidebar |
| **Cmd/Ctrl + Shift + B** | Toggle the right sidebar |
| **Cmd/Ctrl + Alt + B** | Toggle both sidebars at once |

> [!tip] Try it
> Press **Cmd/Ctrl + P** right now to open the Quick Switcher, then type a few letters of any note title to jump there instantly.

## Opening a vault

A vault is just a folder of Markdown files. Click the folder icon in the top bar to pick one. If **Remember last vault on startup** is enabled in [[Customizing Draglass|Settings]], Draglass reopens your vault automatically next time.

Draglass also ships with this **demo vault** — an interactive guide that opens on first launch. You can always return to it via the Command Palette command **Open Demo Vault**.

## Creating notes and folders

There are several ways to [[Creating Notes|create a note]]:

1. Click the **+** button in the left sidebar toolbar.
2. Open the Command Palette (**Cmd/Ctrl + Shift + P**) and choose **New Note**.
3. Type a [[Wikilinks|wikilink]] like `[[Some New Idea]]` and click it — Draglass creates the note for you.

You can also create **folders** from the toolbar to keep notes organized.

## Command Palette

The Command Palette (**Cmd/Ctrl + Shift + P**) is a searchable list of every action in the app:

- **New Note** — create a new note in the selected folder
- **Rename Current Note** — edit the filename
- **Delete Current Note** — remove the active note (with a confirmation dialog)
- **Lock Current Heading** — add a `{locked}` marker to the heading at the cursor
- **Reveal / Hide Private Sections** — unlock or re-lock [[Privacy and Security|locked content]]
- **Change Vault Password** — update the vault password
- **Open Demo Vault** — return to this demo vault

## Navigating between notes

- **Wikilinks** — click any `[[link]]` in the editor to open the target note. See [[Wikilinks]].
- **Quick Switcher** — press **Cmd/Ctrl + P** for fuzzy search. See [[Searching Your Vault]].
- **File tree** — browse and click files in the left sidebar.
- **Backlinks panel** — the right sidebar lists notes that link to the one you are reading. See [[Backlinks]].
- **Task panel** — the right sidebar also lists open tasks; click one to jump to its line. See [[Tasks and Checklists]].
- **Graph View** — click any node to open that note. See [[Graph View]].

## The editor

The editor supports full [[Markdown Syntax]] with [[Live Preview]] — formatting is rendered inline as you type. Toggle between Live Preview and Source mode with the button in the editor header.

Autosave is on by default. A small dot in the header shows the save state: green for saved, pulsing for saving, red for error. You can tune the debounce delay in [[Customizing Draglass|Settings]].

## Renaming and deleting

Click the note title at the top of the editor to rename it inline. Press **Enter** to confirm or **Escape** to cancel. To delete a note, use the Command Palette — a confirmation dialog prevents accidents.

## What to explore next

- [ ] Follow a wikilink to [[Wikilinks]] and read how links work
- [ ] Open the [[Graph View]] to see this vault as a network
- [ ] Try [[Searching Your Vault|Global Search]] with Cmd/Ctrl + Shift + F
- [ ] Check the [[Tasks and Checklists|Tasks]] panel on the right for to-do items (including these!)
- [ ] Visit [[Customizing Draglass]] to adjust the theme and layout

Return to [[Welcome to Draglass]] anytime.
