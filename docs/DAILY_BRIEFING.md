# Daily Briefing

Daily Briefing is an optional core plugin. Enable it in Settings → Core plugins.
Its board opens from the left ribbon or **Open Daily Briefing** in the command palette.
The board and daily Markdown note are two views of the day; tasks remain normal Task notes.

## Clipboard workflow

1. Choose **Start today**. Draglass creates `Briefings/YYYY-MM-DD.md`, opens it,
   and copies a compact collection prompt. Narrative sections remain empty.
2. Paste the prompt into Copilot 365. The name describes the external knowledge
   assistant in this first integration; Draglass does not connect to its account.
3. Copy the complete JSON answer and choose **Import response** on the board or
   **Import briefing response from clipboard** in the palette. No paste dialog.
4. Draglass validates the whole batch, automatically applies sourced changes,
   and offers **Undo last import** for ten minutes. The Tasks Undo notification
   and history also route briefing operations through the briefing journal.
5. If more important information remains, choose **Copy next prompt**, paste it
   in the same external chat, and repeat. Continue until collection is complete.

The initial window starts at the previous configured working day's midnight and
ends at collection start, in the desktop's local timezone. Subsequent successful
collections can resume within that window. After a longer gap, collection never
extends earlier than the previous working day. Meetings needing preparation can
include today and the next working day. Configure working days in Settings →
Daily Briefing; Monday–Friday is the default.

Prompts are capped at 8,000 UTF-8 bytes; incoming responses at 16,000 bytes of compact JSON,
24 factual items, 24 sources and 16 people per batch. Batching has no fixed
six-item ceiling. Insignificant JSON formatting whitespace does not consume the semantic budget. Clipboard input has a separate 65,536-byte transport limit. Oversized responses are rejected intact, never clipped.
Continue the external chat to obtain a smaller complete batch. Session and batch
numbers reject wrong responses; importing identical clipboard text is harmless.

## Notes and provenance

The priority order is commitments/deadlines, decisions, important developments,
meeting preparation, and people you await. Only your commitments/follow-ups create
Task notes. Other people's commitments and developments stay in the daily note.
The board and the note's `tasks` queries include all open vault tasks, not just imports.
The `relationship is waiting_on` query provides a live waiting list.

Pending decisions create a `DecisionRecord` with status `PROPOSED`, empty outcome,
context, options and space for your decision. When the response explicitly identifies you as responsible for the decision (`mine:true`), a Task note links to it with `resolves`.
Reported decisions use status `ACCEPTED` and the supplied outcome. Person notes use
`Identity` / `PERSON`. Match ID first (including `employee_id`), then first name,
then full name. Ambiguous matches ask on the board while unrelated items import.
`waiting_on` and `discuss_with` relationships carry their own source records and
appear in the graph/backlinks. No separate evidence notes are created.

The prompt forbids guessing. Each fact/person requires supplied source records
with a title and supporting excerpt; an original URL is preferred. Source timestamps are preserved when supplied. Missing timestamps are reported as coverage gaps; they are never invented. An undated directory source can support identity matching, while each briefing item must also have dated evidence.
Schema validation can check that evidence was supplied, not independently verify
external claims. Inaccessible material belongs in coverage gaps, not invented facts.

Imported fields use a three-way comparison against the previous import. Local
edits are preserved; contradictory incoming values are flagged on the board with
source evidence. You can open the note or keep the local value and dismiss the flag.
Edits to managed briefing entries are also preserved. Personal prose is untouched.
Absence from a response never completes or deletes a task. Undo refuses to overwrite
later edits and survives a restart. Vault-private state lives under `.draglass/briefing/state.json`; plugin settings
(including enabled state, working days and AI selection) live in
`.draglass/briefing/settings.json`, and import Undo records in
`.draglass/briefing/operations/`. These files travel with the vault. Named workspace
layouts preserve the current vault’s plugin settings. Removing the backing
daily note clears stale collection metadata without deleting other notes. An empty
or recreated vault starts fresh; old application profiles cannot restore its plugin
settings. Notes remain ordinary Markdown.

## Optional AI

Settings allow a specific AI connection or **Use chat selection**. The AI checkbox
also appears at the top of the board. Without a selected connection, deterministic
structured import works. With one, each import uses fresh read-only reconciliation
sessions. Tools search task/decision titles, read small relevant note sections,
inspect the ontology and propose existing-note matches. The model never writes files.
The importer validates matches and applies notes through the shared operation journal.
No entire-vault contents or chat history are included. Provider context budgets,
turn/call limits, cancellation, configured HTTP headers, protocol and proxy are reused.
If AI fails, the import does not partially apply: retry, or turn AI off and import again.

## Compact outbound memory

Only changed task and decision fields are included in the next prompt, including inline checkbox status changes. Existing
notes are baselined on first start, not exported as new items. Updates have compact
IDs, at most eight per prompt within a 1,800-byte update budget. Further changes
queue for later batches. The prompt requests memory/context updates only and
explicitly forbids changing external records, including Planner.

Acknowledgments cover only updates the external assistant says it retained.
Unacknowledged updates remain pending; Draglass cannot guarantee that any external
assistant has persistent memory. Large local changes are split into numbered JSON fragments at Unicode boundaries.
Their baseline advances only after every fragment is acknowledged; decision text is never clipped.

## Friendly note names

The collection prompt asks for a separate `title` on task and decision items:
3–8 words, at most 80 characters. Use an action such as “Review testing deck with
Yael” or a decision topic such as “Testing platform ownership.” `text` retains
the full explanation and qualifications. New filenames, YAML names and headings
use the short title; details and provenance stay in the body. Linked decision
tasks use “Decide: …”. Stable source IDs remain separate; distinct commitments
with equal titles receive readable numeric filename suffixes. Responses without
a title receive a bounded fallback, preserving their full text in the body.
Existing filenames are not automatically renamed. Start today copies the updated
prompt for a new external chat.
