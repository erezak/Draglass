# Demo vault

The command palette and File menu expose **Open demo vault**. It works without an existing vault and flushes pending editor saves before switching. Declining to discard an unsuccessful save keeps the current vault. A running AI response must be stopped before switching.

## Startup

On first launch, no launch marker and no prior workspace file exist, so the application installs and opens the current demo at Welcome.md in Live Preview. Existing installations with a prior workspace file are treated as previously launched, including a corrupt/unavailable workspace; those do not silently switch to a demo.

When the saved workspace is a managed demo edition, startup reopens it with its tabs and layout. When the bundled content changed, startup opens the new edition at Welcome.md. A saved normal vault reopens normally. If it is unavailable, the application reports that rather than replacing it with the demo. A previously launched application with no saved workspace does not repeatedly behave as first launch.

The explicit command always opens the current demo edition at its welcome note. Other demo files remain editable. Startup restoration and the explicit command have intentionally different entry behavior.

## Content and preservation

Bundled sources live in demo-vault/; assets/demo-manifest.json names the entry point, feature coverage, ontology classes, intentional missing targets and minimum graph thresholds. The installer hashes the manifest and every source asset. A complete edition is staged then renamed into the application's draglass/demo-vaults/<content fingerprint>/ folder. A hidden origin marker identifies a complete install. The installer rejects symlinked installation directories and does not modify a normal vault.

Installed editions are ordinary editable vaults. Reopening the same edition preserves changed or deleted files. A new fingerprint creates a separate fresh edition; earlier editions and edits are retained and are not automatically cleaned up. No source examples are copied into a user's selected vault. Application version and Excalidraw dependency version do not determine demo edition identity.

## Scenario and coverage

Lumen field station is fictional. The content has 57 Markdown notes, 41 ontology entities and eleven guided tours. Its graph includes 81 nodes, 110 named relationships and 150 ordinary wiki-link edges; seventy declarations carry quotes that appear in the retained fictional design-review note. Every ontology class appears. People demonstrate silhouette and local-image graph nodes. Two explicitly listed missing targets demonstrate hollow nodes and entity creation.

The tours cover writing/reading/source, tables and tasks, autosave/external refresh, properties and evidence, search/tags, graphs and controls, AI/conversations/actions/provider/proxy configuration, native and Markdown Excalidraw scenes, Mermaid, note/section/block embeds, images/PDF/audio/video/data attachments, file organization/trash, detached editing, Settings, core plugins/templates and workspace navigation.

AI is only exercised when a user configures a connection and sends a request. OS associations, external-editor refresh, file picking and detached files are honest guided exercises requiring the user's environment. Media/PDF playback depends on native platform support. The demo does not claim future roadmap features as implemented.

## Maintenance

Every feature change must update its tour, examples and coverage manifest. Adding a new category also extends REQUIRED in scripts-check-demo.cjs. Changing/deleting a feature removes stale claims and updates links. Use pnpm run check:demo; normal builds call the same check. It validates YAML, feature-note markers, all eleven classes, unique IDs/FQNs, relationship targets, original evidence quotes, missing-target allowlist, scene parsing, media assets, graph thresholds and application packaging rules.

These automated checks enforce structure and many content invariants, not the truth of arbitrary prose. Review and exercise the affected tours as part of feature acceptance. Startup, editable-edition preservation and the upgrade policy have dedicated tests.

Finder metadata and hidden paths are ignored when installing the bundled demo; symbolic links among visible bundled content remain rejected. An explicit open failure displays an error dialog and preserves the current vault.

The panes/workspaces tour exercises nested editable groups, independent scrolling and reading, movable typed views, linked and fixed outlines/backlinks/local graphs, independent graph settings and search queries, and named save/restore/update/delete. Restoring layouts reads current file contents.
