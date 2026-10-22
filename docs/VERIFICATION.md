# Verification · 0.19.0

Verification environment: Linux and Node.js 24. Native macOS, Windows and Linux packaging is not produced in this environment.

Backend checks use real temporary vaults and worker threads. They cover unchanged-file cache reuse, external edits, rename/delete invalidation, request-scoped drafts, shared tag/backlink/graph semantics, cancellation, worker failure/restart and shutdown. The desktop IPC test deliberately stalls a search and verifies an atomic save completes before that search is released. A renderer test verifies an older asynchronous search cannot replace newer results.

Conversation checks cover legacy single-thread migration without message loss, separate conversation creation and selection, persistence after restart, history isolation, concurrent writes, note rename, invalid conversation IDs, empty-context chat before a vault is opened, and full Markdown/YAML inclusion for explicitly mentioned notes. UI checks cover creating and switching conversations while preserving old messages, starting a workspace chat after closing the last note, and mentioning an unopened existing note.

Results: **251 tests passed**, with no failures or skipped tests. A Chromium check also passed for chat before opening a vault, chat after closing the last note, existing-note mentions, new conversations and restoring an earlier conversation. A second Chromium check uses the real knowledge worker and temporary filesystem for tags, unsaved-draft search and graph construction. The renderer build completed successfully.

Local profiling smoke check: 1,000 synthetic notes of approximately 2 KiB each. Cold indexing/search took 257 ms; a warm query took 65 ms and reread zero unchanged note bodies. Editing one note caused one body reread. A fresh worker search took 331 ms while the main-thread timer continued firing. These are single-run Linux development observations, not cross-platform benchmarks or large-vault latency guarantees.

Commands:

```sh
node scripts-build.mjs
node --test --test-concurrency=2
```

Provider transports are simulated in automated tests. Live authentication, keychain integration, native Mac chat controls, application copyright display, file associations and installers need checks on their target platforms. Packaged Electron worker startup and shutdown, including ASAR paths, must also be verified there. Graph filtering/physics and AI orchestration have not moved to the worker; see ARCHITECTURE.md for remaining boundaries.
