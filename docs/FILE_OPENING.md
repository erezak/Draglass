# Desktop file opening · 0.17.0

Install a newly built package to register Draglass as an editor for .md and .excalidraw. .excalidraw.md is handled through the Markdown association. Use your file manager’s **Open With → Draglass Editor**, and select it as the default application if desired. Installing advertises support; it does not override an existing default editor on macOS. Finder’s Get Info → Open with → Change All can set the default for that file type.

The File menu and command palette also include **Open file…**, Cmd/Ctrl+Shift+O. Open vault retains Cmd/Ctrl+O. Multiple selected files and opens received during startup are queued until the previous workspace finishes restoring. Windows/Linux launches use the command-line paths; macOS uses its early open-file event. A single app instance handles later opens.

## Routing

- A file inside the current vault opens or activates its usual tab.
- A file outside the vault opens in a separate detached window. Reopening the same file focuses that window.
- With no available vault, files can still be edited detached.
- Opening detached files does not switch the vault, add external paths to its tabs, or change its persisted root.
- Canonical paths distinguish actual vault membership from a similarly named adjacent folder or a symlink leading outside it.

## Detached mode

An amber window edge, DETACHED FILE badge, persistent explanation, full path and window title identify the mode. Light/dark theme follows the last workspace’s appearance initially and can be changed in the detached window.

Markdown supports Live Preview, source editing, reading view and Mermaid editing. Excalidraw files open with the existing canvas editor; drawing embeds inside this file’s directory can also be edited inline. Use Reveal file to locate the original, or Open vault to show the main workspace.

Autosave writes to the original file, with serialized, atomic replacement and up to twenty pre-save recovery copies per file under the app data directory’s draglass/detached-recovery folder. The surrounding directory is not turned into a vault. External changes refresh the document, with the existing last-completed-action-wins behavior. Failed saves retain edits and prevent closing unless the user explicitly chooses to discard them. Files are limited to 8 MiB, matching the vault note limit.

Both document views show vertical and horizontal scrollbars when needed. Code blocks and Live Preview tables have their own horizontal overflow areas. Excalidraw retains its normal canvas panning and zoom.

## Links and embeds

Links are preserved exactly in the file. In detached mode their local scope is the document’s directory:

- [[Team notes]] opens Team notes.md beside the document, or a uniquely matching Excalidraw file. It never searches an unrelated vault.
- [Team](subfolder/Team.md) and [[subfolder/Team]] resolve relative to the file containing the link.
- Explicit parent paths such as ../Notes/Plan.md can be followed. If the destination belongs to the current vault, it opens there; otherwise it opens detached.
- Heading links accept literal headings and ordinary hyphenated heading anchors. Same-file headings and block references navigate within the editor.
- Missing or extension-ambiguous local links explain the problem. Detached mode does not silently create notes in the vault.
- HTTP(S) and mail links open through the operating system on explicit clicks. Unsupported link schemes are rejected.
- In Live Preview, Cmd/Ctrl-click follows a link; ordinary clicks reveal syntax for editing. Reading view follows links directly.
- Automatic embeds are restricted to ordinary files beneath the detached document’s folder. Parent-folder and symlink embeds must be opened explicitly. This keeps rendering a note from automatically reading arbitrary files outside its local scope.
- Resources are discovered from references, without recursively indexing the folder or reading unrelated note bodies. No vault search, backlink indexing or AI context is attached to a detached window.

## Packaging and native checks

Build macOS with pnpm run dist:mac:dmg, Windows with pnpm run dist:win, or Linux with pnpm run dist:linux. Windows NSIS uses its documented per-machine association support and therefore requires an administrator install. Linux packages publish Markdown and Excalidraw MIME associations; AppImage desktop integration depends on the host’s integration setup.

On each platform verify Open With/default selection after installation, cold launch, warm launch, multiple selected files, paths with spaces/Unicode, and closing with unsaved edits. Native installer registration cannot be verified from Linux unit tests alone.

Implementation references:
- Electron app events, including early macOS open-file and Windows arguments: https://www.electronjs.org/docs/latest/api/app
- electron-builder file associations: https://www.electron.build/docs/api/electron-builder.interface.fileassociation/
- Linux desktop/MIME configuration: https://www.electron.build/v26/docs/linux/
