# Reviewed AI actions · 0.9

## Product behavior

The note chat has Discuss note and Propose changes modes. Both use the current note, explicit @mentions, open editor drafts and conversation history. Past conversation text can contain information from previously discussed notes; context chips and review paths identify notes supplied for this turn.

Propose mode asks the existing provider adapter for a JSON object with `summary` and `changes`. Each change contains `action` (`edit` or `create`), `path`, complete `content` and `reason`. One enclosing JSON fence is accepted; surrounding explanation, malformed/partial JSON, unsupported actions, unsafe paths, duplicate paths, unchanged edits and edits outside the selected context are rejected. No executable model tools are added. CLI invocations retain their existing disposable working directories and tool restrictions.

A server-generated proposal ID and immutable before/after snapshots live in the desktop process and app data. The renderer can submit that ID, an index and its expected current text; it cannot change the stored proposed content when accepting. Only acceptance writes a note. Rejection updates a receipt without writing any note. Each note is accepted independently, so a batch can be partly applied or rejected.

Review shows provider, creation time, supplied note paths, reasons, change counts and line-level diffs. Long unchanged sections expand on demand. Large diffs use a 1,500-row presentation cap, with complete Before/Proposed text available. Diffs and paths render as literal text, including HTML-like Markdown. The bounded diff algorithm uses LCS for small changed blocks and a remove/add fallback for larger blocks.

## Applying and undoing

Before acceptance, an open target must still match its proposal snapshot. Pending saves are flushed through the normal ordered queue, and editor mutations are temporarily blocked. The backend rechecks the latest disk text. Action-only conditional Vault writes check the expected text again before replacement; ordinary autosaves retain last-action-wins semantics. A changed/deleted target or creation collision blocks the operation. Arbitrary external filesystem writers are not part of an atomic OS transaction; a small final check-to-rename window remains. There is no force-apply path or silent merge.

Existing-note writes retain ordinary recovery snapshots. Editor updates use isolated transactions, preserve selections through their changes and retain undo history. Receipt undo is available across restarts when the current editor/disk text matches the applied snapshot. It restores the before text for edits and sends created files to recoverable Draglass trash. Undo refuses to overwrite later changes. Editor undo can also reverse text changes, but it does not delete a created file or update historical receipt status. A historical applied receipt may therefore refuse another reversal after editor undo.

Nested creation paths use the existing portable folder checks, then exclusive note creation with complete content. Empty folders created during a failed import/apply or creation undo may remain. Existing files are never deliberately replaced by a creation. Renaming/moving targets invalidates pending changes and blocks receipt undo; original context snapshots remain a record of what was supplied.

Proposal status is saved as `applying`/`undoing` before filesystem mutation. On reload, exact snapshot comparisons recover pending, applied, undone or stale status after an interrupted receipt write. If the note write succeeded but final receipt persistence failed, the UI reports it and reloads the action state. This is not an automatic general crash-recovery service for all vault operations.

## Storage and limits

The app data directory contains unencrypted proposal snapshots and receipts, isolated by vault root. A vault retains up to 20 batches; adding a batch may prune the oldest fully resolved batch. Pending/interrupted batches are not silently discarded; users must resolve them if the limit is reached. Receipts beyond this retained history cannot be undone from review, although note recovery snapshots or trash may remain. New chat clears conversation messages and retains proposal history.

Each request retains existing limits (12 context notes, 200,000 context characters, 20,000 prompt characters, 100 conversation messages and a three-minute timeout). Proposals allow at most 12 changes, 100,000 total proposed content characters, 4,000 summary characters, 2,000 characters per reason and 120,000 response characters. No context is silently truncated. Anthropic action requests allow up to 16,384 output tokens; model-specific limits may reject this and must be verified with the selected connection.

## Validation

Twelve new core tests cover strict parsing/scope/path validation; separate persistence and per-note resolution; stale editor/disk checks; creation/collision/trash undo; edit undo and later-edit protection; write failures; interrupted receipt recovery; rename invalidation/vault isolation; conditional writes versus ordinary autosaves; Unicode/blank/large diff reconstruction; API and CLI shared protocol/progress; malformed and cancelled responses.

Eight new renderer integration tests cover literal diff/no writes before acceptance/editor undo; unsaved multi-note context and independent acceptance/rejection; stale-editor refusal and revise request; creation/undo with tab changes; persisted review and restart undo; originating-note routing; empty proposals; and edits to unopened mentioned notes.

A Chromium renderer check uses the real Vault, AIService and ActionStore through a browser binding, with a fixture provider adapter. It covers no writes during generation, expand/full-text diff views, accepted edit and receipt undo, independent rejection, nested creation and trash undo, externally stale target refusal and proposal restoration after reload. Screenshots are reviewed and no page errors were recorded.

No authenticated provider account was available. Real model JSON compliance, API/model output limits, CLI version compatibility, native Electron IPC/menu/OS notifications, clipboard/spellcheck, platform-specific interactions and installer behavior still need native testing. The fixture transport verifies application behavior, not live-provider reliability.
