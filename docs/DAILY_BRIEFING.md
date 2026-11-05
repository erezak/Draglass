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

**Copy next prompt** is enabled only while today’s collection has remaining results or actionable searches. It never silently starts another collection. Continuation uses the existing external chat and a short instruction with the same window, current response GUID and targeted remaining work; it does not repeat the full initial schema. Local updates remain available separately.

The initial window starts at the previous configured working day's midnight and
ends at collection start, in the desktop's local timezone. Subsequent successful
collections can resume within that window. After a longer gap, collection never
extends earlier than the previous working day. Meetings needing preparation can
include today and the next working day. Configure working days in Settings →
Daily Briefing; Monday–Friday is the default.

Outgoing prompts are capped at 8,000 UTF-8 bytes. Response instructions target
concise JSON around 12,000 bytes, rather than requiring a byte ceiling. Clipboard
imports have no separate raw-text or compact-JSON byte cap; formatting whitespace
and UTF-8 characters do not cause a size rejection. Schema validation still
checks the response GUID, session, batch, evidence, field rules and collection
types. There are no fixed import counts for gaps, items, sources, people,
provenance references or acknowledgment entries. The response guide's suggested
batch sizes keep exchanges concise; they are not import rejection thresholds.
Identity/date field rules and malformed evidence still fail
before changes are applied. Nothing is clipped to meet a prompt budget.

Optional AI reconciliation handles one task or decision at a time, with a fresh
conversation and the configured connection's context budget. It does not receive
the complete clipboard response. Duplicate detection, one import summary and
recoverable Undo continue to cover the complete validated batch.
Session and batch
numbers reject wrong responses. Each prompt issues a response GUID (`RESPONSE_ID`); the assistant must echo it exactly as `responseId`. The last 100 receipts persist across collections in this vault. Re-importing a response with formatting or JSON-key-order changes returns its original summary without applying it again. Reusing an imported GUID with different content reports an error; a genuinely updated response needs the next issued GUID. Stable item IDs remain separate and allow updates across batches and days.

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
`waiting_on`, `discuss_with` and `mentions` relationships carry their own source records and
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
Mara” or a decision topic such as “Testing platform ownership.” `text` retains
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

Any `not-searched`, `partial` or `unknown` channel forces targeted continuation, even if the
response says `more:false`. The completed-window cutoff advances only when the
collection finishes and all five channels report `searched`. Exhausted unavailable
sources can end collection without repeated retries, but leave the watermark unchanged.
Access limits remain visible alongside coverage gaps. Employee/user IDs must be explicitly
stated in supplied identity/profile/directory evidence; email local-parts are not
ID verification. No external task records are changed by these prompts.

Fragmented updates carry an explicit `updateGroup`; reassembly and partial
acknowledgments are scoped to the exact serialized change payload. If another
exchange changes the baseline, the changed delta receives a new group instead
of mixing pieces of two payloads.

## Task-person relationship types

Every supplied task `person` must have an explicit `relation`: `waiting_on` for an evidenced dependency, `discuss_with` for an evidenced discussion action, or `mentions` when the person is relevant but neither specific meaning is supported. The prompt requires these exact values and never asks the assistant to infer responsibility from a mention. If no relevant person is evidenced, omit both fields.

Imported `mentions` edges preserve source evidence and appear in the graph, Connections and task relationship queries. The inverse is `mentioned_by`. They do not imply waiting, ownership or a discussion action and are excluded from `relationship is waiting_on` results. Missing or unsupported relationship types are rejected before changes are applied; errors identify the task and supplied value.

## Meetings without a known date

A meeting item may omit `date` when the evidence does not establish the meeting day. Null or blank values also mean no date. The briefing displays **Date not provided** beside that entry; it never substitutes today, collection time or a source timestamp. Supplied dates must be valid YYYY-MM-DD values for today or the next configured working day, as before. Each item still needs dated source evidence: the source timestamp and the meeting date describe different facts.


### Reviewing conflicts

Conflict rows keep their disclosure state and mounted action buttons while the board refreshes. Open a row to read the local and reported values with their source evidence. **Open note** opens its current target; **Keep local and dismiss** removes only that conflict. Other expanded rows remain open.


### Accepting reported content

**Use reported content** applies the selected conflict through the briefing operation journal. Property conflicts change their YAML field; generated-text conflicts replace their identified block or restore it when removed. Person relationships add or merge the reported edge with its sources while retaining unrelated relationships. The board shows the current local value; a review token rejects an action if that comparison has changed. Ambiguous or missing targets cannot be applied automatically.

**Undo last change** is available for ten minutes and restores the prior content, conflict and briefing baseline. Later edits block unsafe Undo. Choosing a terminal Task status uses normal archival and link rewriting. Accepted reported fields update their remote baseline without acknowledging unrelated local changes.

## Import report

After import, the notification counts tasks created, updated, unchanged, deferred and conflicted, with archival shown separately so it does not double-count tasks. Expand **Last import** for each received item, its outcome, matching reason (stable ID, exact name or optional AI), and a button to open its local note. Deferred identity questions and local conflicts remain actionable on the board. A pending decision owned by you also reports its generated Task. **Items received** includes deferred facts and does not claim they were applied.

## Coverage and targeted follow-up

Coverage is reported by the external assistant, not verified by Draglass. `partial`, `not-searched` and `unknown` keep collection open with targeted follow-up. Use `unavailable` only for attempted, exhausted access or capability limits and describe those limits in gaps; it can end collection without endless retry. Only all-five `searched` coverage advances the fully searched watermark. This conservatively keeps incomplete windows eligible for future searches.

The first prompt asks for calendar discovery followed by title/date searches for relevant meetings and individual retrieval of relevant linked documents. Recap-only evidence must be identified honestly; snippets do not establish full-file coverage. Missing work, no results and access denial must be distinguished. Neither the prompt nor clipboard import can guarantee exhaustive remote retrieval.

## Restart day

Choose **Restart day** on the board or **Restart today’s briefing** in the palette. A confirmation explains the operation. It is available only for the current day after Draglass has created a checkpoint; it cannot target an older day. It reverses today’s tracked briefing writes across collections, including created notes, updates, archival and rewritten links, restores the pre-day collection checkpoint, clears today’s response receipts, and leaves collection stopped until **Start today**. An existing daily note is restored rather than deleted.

The day checkpoint survives app restarts and the ten-minute Undo expiry. Files edited after or between briefing operations are preserved and listed on the board; both sides of an archive move are protected together. Unrelated earlier knowledge is untouched. Restart cannot undo anything remembered by the external assistant. New checkpoints are recorded going forward; earlier untracked imports cannot be safely reversed.


## Full coverage explanations

Coverage-gap explanations and continuation instructions have no character-count quota. They must be proper text rather than blank explanations or NUL-containing strings. Long Unicode and multiline descriptions are preserved in the vault. A long continuation cursor is retained in full; **Copy next prompt** refers to the complete next-search instructions in the external assistant’s previous response, keeping the copied prompt compact. Continue in that same external chat. No gaps or search targets are discarded to satisfy a prompt budget.
