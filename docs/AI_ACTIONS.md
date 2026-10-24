# Reviewed AI actions · 0.9

## Product behavior

Chat has **Discuss** and **Propose changes** modes. The current note and @mentions are reference paths, not automatically transmitted bodies. Discussion tools search the vault, inspect metadata, read line ranges and follow links/relationships with provenance. Propose changes adds `create_note` and `update_note`; these stage changes without writing files. Built-in CLI tools remain disabled.

Line updates require the revision returned by a read and coverage of every replaced character. The backend expands the replacement locally, preserving unrelated text. Coordinates refer to the original read snapshot; another update to the same path replaces the earlier proposal rather than stacking offsets. Disk changes invalidate stale reads. Explicit open drafts can be used even while autosave is pending; acceptance still requires the current editor and disk to match. Unsafe paths, drawings, existing creation targets, duplicate paths, unchanged edits and oversized proposals are rejected.

The separate entity-template draft command retains its selected-context JSON proposal contract and classification checks. Both flows use the same context budget and review/undo store.

A server-generated proposal ID and immutable before/after snapshots live in the desktop process and app data. The renderer can submit that ID, an index and its expected current text; it cannot change the stored proposed content when accepting. Only acceptance writes a note. Rejection updates a receipt without writing any note. Each note is accepted independently, so a batch can be partly applied or rejected.

Review shows provider, creation time, supplied note paths, reasons, change counts and line-level diffs. Long unchanged sections expand on demand. Large diffs use a 1,500-row presentation cap, with complete Before/Proposed text available. Diffs and paths render as literal text, including HTML-like Markdown. The bounded diff algorithm uses LCS for small changed blocks and a remove/add fallback for larger blocks.

## Applying and undoing

Before acceptance, an open target must still match its proposal snapshot. Pending saves are flushed through the normal ordered queue, and editor mutations are temporarily blocked. The backend rechecks the latest disk text. Action-only conditional Vault writes check the expected text again before replacement; ordinary autosaves retain last-action-wins semantics. A changed/deleted target or creation collision blocks the operation. Arbitrary external filesystem writers are not part of an atomic OS transaction; a small final check-to-rename window remains. There is no force-apply path or silent merge.

Existing-note writes retain ordinary recovery snapshots. Editor updates use isolated transactions, preserve selections through their changes and retain undo history. Receipt undo is available across restarts when the current editor/disk text matches the applied snapshot. It restores the before text for edits and sends created files to recoverable Draglass trash. Undo refuses to overwrite later changes. Editor undo can also reverse text changes, but it does not delete a created file or update historical receipt status. A historical applied receipt may therefore refuse another reversal after editor undo.

Nested creation paths use the existing portable folder checks, then exclusive note creation with complete content. Empty folders created during a failed import/apply or creation undo may remain. Existing files are never deliberately replaced by a creation. Renaming/moving targets invalidates pending changes and blocks receipt undo; original context snapshots remain a record of what was supplied.

Proposal status is saved as `applying`/`undoing` before filesystem mutation. On reload, exact snapshot comparisons recover pending, applied, undone or stale status after an interrupted receipt write. If the note write succeeded but final receipt persistence failed, the UI reports it and reloads the action state. This is not an automatic general crash-recovery service for all vault operations.

## Storage and limits

The app data directory contains unencrypted proposal snapshots and receipts, isolated by vault root. A vault retains up to 20 batches; adding a batch may prune the oldest fully resolved batch. Pending/interrupted batches are not silently discarded; users must resolve them if the limit is reached. Receipts beyond this retained history cannot be undone from review, although note recovery snapshots or trash may remain. New conversation preserves earlier conversations and proposal history.

Normal tool requests allow 12 reference notes, 20,000 prompt characters, 100 stored conversation messages and a ten-minute timeout. A run permits 32 turns, 100 calls, 12 calls in one turn and 12 proposed notes. Individual tool results cap 6,000 UTF-8 bytes; line reads are at most 60 lines / 4,000 bytes and adapt down for small context windows. Local snapshots cap 32 MiB total and 8 MiB per note. Proposal receipts retain before snapshots only for edited targets; unrelated fetched bodies are not copied into review storage.

Proposals allow 100,000 total proposed content characters, 4,000 summary characters, 2,000 characters per reason and 120,000 answer characters. Every model request passes the per-connection input budget, counting tools, instructions, history and results with output space reserved. Old context can be compacted or retired with a progress notice; essential overflow fails before sending. See ARCHITECTURE.md for the conservative byte accounting. Set the context window to the actual model capacity or lower.

## Validation

Core tests cover path/schema validation, read-only tool restrictions, revision and line-coverage checks, unsaved drafts, lazy unopened references, externally stale files, bounded Unicode pagination, initial overflow, repeated-turn compaction, separate persistence, per-note acceptance/rejection, creation collisions, undo, interrupted receipts, rename invalidation and vault isolation. Renderer tests exercise review, unchanged editor text until acceptance, citation navigation, provider settings and conversations.

A Chromium check uses the built renderer, real Vault/AIService/ActionStore and knowledge worker through browser bindings, with a local HTTP tool-protocol fixture. It verifies lazy exploration, progress, verified citations, reviewed line changes, acceptance and undo. These checks validate application behavior, not model judgment. No authenticated provider account was available. Real model behavior, gateway limits, native CLI compatibility, OS integration and packaging remain target-environment checks.

## Managed timestamps · 0.23.3

Accepted edits, new notes and Undo use the desktop timestamp policy. created_at stays fixed for an existing note; updated_at reflects the content write. The receipt records prepared after/undo bytes before applying them, so crash recovery and undo guards remain exact. Metadata differences caused solely by an intervening autosave can align with the proposal; later body or unrelated YAML changes still block it. Undo restores the prior content while recording its own update time.
