# Verification · 0.20.2

Additional regression checks passed for Finder metadata, visible demo failure without losing the active vault, explicit About version/icon options, and Mac development bundle icon/version installation before signing and launching. The development launcher check uses simulated macOS process/filesystem calls; native macOS execution remains unverified.

Table regression checks cover wiki-link rendering, escaped aliases, literal code, mouse/keyboard navigation, editing and blur restoration, local Markdown links, indexing, and rename preservation. A real Chromium mouse check confirms clicking the cell padding edits while clicking the link navigates without changing the source. The additional focused rename check passed.

Verification environment: Linux and Node.js 24. Native macOS, Windows and Linux packaging is not produced in this environment.

Demo checks cover first-launch selection, last-demo restoration, normal/unavailable prior vault preservation, editable edition persistence, content upgrades, concurrent installation and directory safety. Structural coverage checks verify the 56-note fictional scenario, all ontology types, sourced relationships, intentional missing targets, scene parsing and media assets. UI tests cover the palette command, saving before switching and keeping a failed-save draft. A Chromium check uses the real demo installer and knowledge worker to exercise first launch, welcome, graph/person inspection, the palette command and restoration after reload.

Backend checks use real temporary vaults and worker threads. They cover unchanged-file cache reuse, external edits, rename/delete invalidation, request-scoped drafts, shared tag/backlink/graph semantics, cancellation, worker failure/restart and shutdown. The desktop IPC test deliberately stalls a search and verifies an atomic save completes before that search is released. A renderer test verifies an older asynchronous search cannot replace newer results.

Conversation checks cover legacy single-thread migration without message loss, separate conversation creation and selection, persistence after restart, history isolation, concurrent writes, note rename, invalid conversation IDs, empty-context chat before a vault is opened, and full Markdown/YAML inclusion for explicitly mentioned notes. UI checks cover creating and switching conversations while preserving old messages, starting a workspace chat after closing the last note, and mentioning an unopened existing note.

Results: **264 tests passed**, with no failures or skipped tests. A Chromium check also passed for chat before opening a vault, chat after closing the last note, existing-note mentions, new conversations and restoring an earlier conversation. A second Chromium check uses the real knowledge worker and temporary filesystem for tags, unsaved-draft search and graph construction. The renderer build completed successfully.

Local profiling smoke check: 1,000 synthetic notes of approximately 2 KiB each. Cold indexing/search took 257 ms; a warm query took 65 ms and reread zero unchanged note bodies. Editing one note caused one body reread. A fresh worker search took 331 ms while the main-thread timer continued firing. These are single-run Linux development observations, not cross-platform benchmarks or large-vault latency guarantees.

Commands:

```sh
node scripts-build.mjs
node --test --test-concurrency=2
```

Provider transports are simulated in automated tests. Live authentication, keychain integration, native Mac chat controls, application copyright display, file associations and installers need checks on their target platforms. Packaged Electron worker startup and shutdown, including ASAR paths, must also be verified there. Graph filtering/physics and AI orchestration have not moved to the worker; see ARCHITECTURE.md for remaining boundaries.

Dependency declaration checks verify Excalidraw is pinned to 0.18.1 independently of the application version and agrees with the lockfile and built engine. A frozen offline installation check could not complete because the local pnpm package metadata cache was missing entries; it did not modify the lockfile. Build and regression checks use the installed dependency tree.
