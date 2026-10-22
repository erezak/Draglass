# Attachments and embeds · 0.7

Reviewed 2026-10-06 against the official documentation:

- https://www.electronjs.org/docs/latest/api/protocol

The slice adopts vault copies for paste/drop, configurable destinations, wiki note/file embeds, image dimensions, heading/block sections, media controls and PDF fragments. It keeps Markdown authoritative and routes imports through editor transactions, undo and autosave. File cards and explorer/graph previews expose attachments without treating them as editable notes. The default destination is `Attachments`, rather than the vault root.

Local resources use a dedicated standard/secure streaming Electron scheme registered before ready, with a current-vault token, validated paths, typed responses, no-store caching, no-script response CSP and byte-range support. Arbitrary HTML/binary resources are not served as active documents. Renderer Markdown is sanitized before embed placeholders become image/media/PDF/note elements. No provider connection is involved. Preview links reveal ordinary files; there is no automatic execution.

Scope boundaries: no Canvas/search-result embeds, remote image loading, attachment rename/delete, or attachment-specific AI content extraction. Heading matching covers ATX headings; block selection uses text/paragraph boundaries rather than a complete Markdown AST. New imports sanitize wiki-delimiter filename characters. Existing delimiter-heavy paths may need a Markdown link with URL encoding. Note embeds are read-only and their header opens the note without heading scrolling. Clipboard imports occur in the editor, not the chat composer. Undo leaves copied files in place. Codec playback and the native PDF plugin depend on the Electron/platform environment. A PDF frame may fall back to filename-based reveal; native validation is outstanding.

Native checklist: paste a macOS screenshot; drop image/PDF/audio/video files from Finder; choose files in the native picker; test each attachment-location option; test duplicate names and undo; play/seek media; open a PDF/page fragment; change embedded files externally; switch vaults and verify stale asset URLs stop serving; test Windows/Linux path and codec behavior. Renderer screenshots and tests cannot substitute for these platform checks.
