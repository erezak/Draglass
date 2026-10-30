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

## Generated Markdown blocks

Imported entries and managed decision outcomes use a fenced `briefing id=...` block. Draglass renders its body as ordinary Markdown, with a subtle border and an Automatically generated label. In Live Preview, clicking inside the block reveals its editable Markdown source, including the fence and identifier. Clicking its label or activating that label with Enter/Space enters editing too. Moving the caret outside restores the rendered frame, where links and task controls remain interactive. Source mode exposes the complete file syntax. Ordinary code examples remain code.

The stable ID finds the corresponding entry on later imports. Edited or removed blocks are preserved and flagged when incoming content conflicts. Undo includes the block and related atomic-note changes. Closed blocks support nested code through a longer outer fence when necessary; malformed or duplicate boundaries are never silently overwritten. Graph/backlinks, renames, tags, Tasks, headings, embeds, autocomplete and calendar word statistics see the body as Markdown.


## Follow-through and local updates

The board’s **Since last briefing** section lists local changes awaiting external
acknowledgment: task completion, deadline changes, completion details and recorded
decision outcomes. Expand an entry to inspect before/after values; long values
are shortened for display only. Open note displays the complete record. The
acknowledged list shows up to 50 recent retained updates since the prior collection.
Older pending changes remain visible until acknowledged.

**Copy local updates**, or **Copy local briefing updates** in the command palette,
copies an update-only prompt without restarting evidence collection. Start today
once to establish the initial baseline. Existing unchanged notes are never
exported as new updates. Task notes export only the actual Completion details
sections; inline tasks export their immediately attached dated completion records.
Unrelated note prose, evidence and full note content are not included.

Paste the prompt into the external assistant and use **Import response** for its
JSON acknowledgment. No configured local AI is required for this step. Copying
does not advance the baseline; gaps and unacknowledged updates remain pending.
Only retained IDs from that prompt can be acknowledged. An acknowledgment means
the assistant claimed retention, not that persistent memory has been verified.
The prompt prohibits external record changes, including Planner.

The update-only exchange has its own session and leaves an outstanding collection
prompt valid. Copy local updates creates the current update prompt; import its
response before copying again. Each prompt carries at most eight fragments within
a 1,800-byte update budget and an 8,000-byte total prompt limit. Large outcomes
are split at Unicode boundaries without truncation; a complete update becomes
acknowledged only after all fragments are retained. Copy again for remaining
updates. Edits made after copying remain pending after the older snapshot is
acknowledged. A stale acknowledgment cannot overwrite a newer acknowledged
baseline. Unique stable IDs preserve a renamed task’s baseline; an inline task
without an ID is identified by path/title/occurrence, so renaming or moving it may
look like a new task. Deleting a task is not exported as completion.

Person `firstName` is optional. Missing, null and blank values are treated as
unknown, without deriving them from the full name or writing empty metadata.
Matching still prefers supplied employee ID, then an explicitly supplied first
name, then full name. A readable `name` and supporting sources remain required.
Invalid supplied types or overlong first names identify the offending person
in the error. A failed validation leaves the collection ready for retry.

The collection prompt explicitly requests relevant people’s unique company-assigned
employee/user IDs from accessible directory/profile records
or source metadata. Copilot returns verified values in `people.id` with supporting
sources. Unknown IDs are omitted; restricted directory access is reported as a gap.
IDs must not be inferred from names or email addresses, and company registration
IDs are not person IDs. New person notes store supplied IDs in `employee_id`;
the existing identity matcher gives them priority over names.

Repeated entries with the same kind/ID and matching facts are consolidated before
import; source references are combined without discarding evidence. Missing
optional fields can be supplied by another matching entry. Conflicting values
are not guessed or assigned invented IDs: the error identifies the ID, item
titles and differing fields, and no writes occur. Ask the external assistant to
consolidate the same action or give different actions distinct stable IDs. The
collection prompt explicitly requires an action identifier after a shared
source/message ID and one entry per kind/ID. The raw 24-item/byte limits still
apply before consolidation.


## Acknowledgment tokens and source coverage

Acknowledgments are needed only to track the local updates the external assistant
says it retained. They do not validate incoming facts or prove durable remote
memory. Each MEMORY or LOCAL_UPDATES row exposes an `id` for that exact update and
an `entityId` identifying the local note/task. Compact `label` and optional
`sourceId` context identify the task and its original external item without
sending the whole note. `ack` must contain the copied row
IDs, never entity, source, person or incoming-item IDs. Empty outgoing lists use
`ack: []`. The byte budget counts the complete wire row, and the packet builder
checks the final prompt budget before offering the batch.

Unknown/malformed acknowledgement metadata no longer rejects a valid briefing.
Only exact recognized update tokens are applied, duplicates are harmless, and
ignored values appear in a persistent board notice and import notification.
Their updates remain pending and can be acknowledged with the next prompt.
Session, batch, source-evidence and content bounds remain validated. The copied
batch remains frozen while deferred person matches are resolved.

The collection prompt asks for independent searches of accessible email, chats,
calendar, meeting transcripts and relevant linked files. Recaps alone do not
satisfy transcript/file searches. The cumulative `coverage` object uses keys
`email`, `chats`, `calendar`, `transcripts`, `linkedFiles`, with states `searched`,
`partial`, `unavailable` or `not-searched`; explain access restrictions in `gaps`.
Missing or invalid states are displayed as `unknown`, without inventing search
attempts. These are external-assistant reports, not independently verified searches.

Any `not-searched` channel forces continuation with a targeted cursor, even if the
response says `more:false`. The completed-window cutoff advances only when the
collection finishes and every channel has reported searched/partial/unavailable.
Unknown reports or skipped channels leave it unchanged. Partial/unavailable access
remains visible alongside coverage gaps. Employee/user IDs must be explicitly
stated in supplied identity/profile/directory evidence; email local-parts are not
ID verification. No external task records are changed by these prompts.

Fragmented updates carry an explicit `updateGroup`; reassembly and partial
acknowledgments are scoped to the exact serialized change payload. If another
exchange changes the baseline, the changed delta receives a new group instead
of mixing pieces of two payloads.
