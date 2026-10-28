# Note organization, command palette and Settings · 0.8

The explorer and command palette provide file and folder operations, link-aware renames, configurable trash, and editor, file and appearance preferences. Cmd/Ctrl+Shift+P opens the command palette; Cmd/Ctrl+P opens the quick note switcher.

## Implemented behavior

- Create nested folders and notes. Empty folders are visible. New note location can be vault root, the active note's folder or a specified folder.
- Rename or move notes, folders and attachments. Explorer context actions, F2, title double-click, the note menu and command palette provide access. Drag explorer items onto folders or the explorer heading to review a move.
- Moves use an explicit destination path, existing parent folders and a review showing files and link updates. They reject overwrite/case collisions, traversal, self-descendant moves, symlinks, hidden children and unsupported paths. Case-only renames use an intermediate name. New names avoid wiki delimiters `[ ] # %`; imported attachments already sanitize them.
- Rewrite resolved wiki links/embeds and Markdown URLs/reference definitions. Preserve aliases, labels, titles, heading/block fragments and image dimensions. Moved notes receive updated outgoing relative links. Unresolved/ambiguous targets, local fragments, external URLs, code, comments and HTML blocks are retained. Updated wiki destinations use full vault paths; Markdown destinations use encoded relative paths.
- The link-update preference defaults on and may be overridden for each operation. The review is recalculated when applying because files can change externally.
- Flush pending drafts before planning or applying operations. A failed save blocks organization. Temporarily make the editor read-only and serialize vault bridge calls during file operations. Update paths, text, selections, tabs, folder-collapse state, configured absolute folders and note chat history. Chat must be stopped before organization. Existing destination chat histories are preserved and surfaced as a warning.
- Ordinary link-write failures roll back text and paths. Before moving, a private journal stores original changed note contents. If rollback itself fails, its path is reported. This is not a transaction against arbitrary external filesystem writers or power loss. Automatic crash-journal restoration is future work. Successful rewrites also create normal per-note recovery snapshots.
- Deletion always confirms, including folder contents. Default Draglass trash retains the item inside `.draglass/trash` and supports restoration from the palette or Settings without overwriting existing files. System trash is optional and uses Electron's OS integration; restoration then uses the OS file manager. There is no permanent-delete action in this slice. Deleted-target links remain available as unresolved references. Chat history is retained for restored notes.
- Palette: fuzzy search, arrow/Home/End navigation, Enter, Escape, disabled-state checks, recent commands and star pins. Settings lists implemented shortcuts; custom hotkey editing is future work.
- Settings: live/source editing, readable line length, line numbers, spellcheck, LTR/RTL, dark/light/system theme, note font size, link updates, note/attachment locations, trash, explorer sorting/attachment visibility, keyboard reference, AI provider management and About. Preferences are saved with the current vault's workspace; providers remain app-level. Autosave and last-action-wins external refresh stay enabled.

## Scope and validation limits

Bulk selection, arbitrary filesystem case-only rename, frontmatter link/property rewrite, YAML note identifiers, generated URLs from plugins and out-of-vault links are not supported. There is no installed third-party plugin API, update service, sync service or theme marketplace. The graph keeps its own dark visualization palette.

Node tests use real temporary directories. The Chromium check drives the UI through a binding to a real temporary Vault and organization implementation, rather than an in-memory operation mock. It covers the requested palette shortcut, rename/link update, folder move, Settings persistence, deletion and restoration. Native Electron menus/IPC, system trash, OS watchers, clipboard, spellcheck dictionaries, installers and Mac/Windows/Linux behavior still require native validation.
