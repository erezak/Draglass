# Verification · 0.18.2

Verification environment: Linux and Node.js 24. Native macOS, Windows and Linux packaging is not produced in this environment.

Conversation checks cover legacy single-thread migration without message loss, separate conversation creation and selection, persistence after restart, history isolation, concurrent writes, note rename, invalid conversation IDs, empty-context chat before a vault is opened, and full Markdown/YAML inclusion for explicitly mentioned notes. UI checks cover creating and switching conversations while preserving old messages, starting a workspace chat after closing the last note, and mentioning an unopened existing note.

Results: **247 tests passed**, with no failures or skipped tests. A Chromium check also passed for chat before opening a vault, chat after closing the last note, existing-note mentions, new conversations and restoring an earlier conversation. The renderer build completed successfully.

Commands:

```sh
node scripts-build.mjs
node --test --test-concurrency=2
```

Provider transports are simulated in automated tests. Live authentication, keychain integration, native Mac chat controls, application copyright display, file associations and installers need checks on their target platforms.
