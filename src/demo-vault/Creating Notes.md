# Creating Notes

There are several ways to bring a new note (or folder) into existence. All of them result in a plain `.md` file inside your vault folder.

## Methods

### 1. The toolbar button
Click the **+** (new note) or folder icon in the toolbar above the file tree. The note is created inside whichever folder is currently selected in the tree — or at the vault root if nothing is selected.

### 2. The Command Palette
Press **Cmd/Ctrl + Shift + P** and choose **New Note**. Same rules about the selected folder apply.

### 3. Clicking a wikilink to a note that does not exist
Type `[[Some New Idea]]` and click the link. Because no file matches, Draglass creates it and opens it in the editor. This is the most natural way to grow a vault — the act of linking *is* the act of creating. See [[Wikilinks]] for more.

## Naming

The file name (minus `.md`) is the note's identity and the target for wikilinks. A few tips:

- Use descriptive phrases: "Ancient Greece" rather than "AG".
- Be consistent with capitalization — Draglass matches case-insensitively, but clear titles are easier to link to.
- Avoid characters that are invalid in file paths on some operating systems (`/`, `\`, `:`).

If you create a note with a name that already exists, Draglass appends a number to keep names unique.

## Renaming

Click the title text at the top of the editor to enter rename mode. Press **Enter** to confirm or **Escape** to cancel. You can also use the Command Palette command **Rename Current Note**.

## Deleting

Use the Command Palette command **Delete Current Note**. A confirmation dialog appears first to prevent accidents.

## Folders

You can create folders from the toolbar to organize notes hierarchically. The file tree in the left sidebar shows the folder structure, with folders sorted before files. Folders can be expanded and collapsed; if **Remember expanded folders** is on in [[Customizing Draglass|Settings]], the tree state persists.

## File format

Every note is a standard Markdown file. You can open them in any text editor, back them up with Git, or move them across machines. Draglass never wraps your data in a proprietary format. See [[Markdown Syntax]] for what you can write.

> [!note] Hidden files
> Dotfiles, `node_modules`, and `.DS_Store` are hidden from the tree by default. Toggle **Show hidden/ignored paths** in [[Customizing Draglass|Settings]] to reveal them. See [[Privacy and Security]] for details.

## Related

- [[Wikilinks]] — the fastest way to create a note mid-thought
- [[Markdown Syntax]] — what goes inside a note
- [[Organization Strategies]] — folder and linking strategies
- [[Quick Start Guide]] — the keyboard shortcuts for everything above
