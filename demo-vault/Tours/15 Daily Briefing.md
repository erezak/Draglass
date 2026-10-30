---
demonstrates: [briefing]
---
# Daily Briefing

The station has commitments, decisions and incoming conversations. The briefing
connects them while the original evidence stays attached to the knowledge.

1. Open **Daily Briefing** from the left ribbon or **Open Daily Briefing** in the
   command palette. The board displays all open tasks, including the station's
   existing [[Tasks/Review field readiness|field-readiness task]].
2. Choose **Start today**. A dated note is created with live task queries; narrative
   stays empty. A compact prompt is copied. A toast confirms it, without a prompt dialog.
3. Paste that prompt into your external knowledge assistant. This demo contains no
   fabricated assistant response or claim of live access. Ask it to collect only
   evidence-backed facts, retaining the session/batch fields from the prompt.
4. Copy its complete JSON response, then choose **Import response**. Your commitments
   become Task notes. A waiting relationship uses `waiting_on`; a conversation uses
   `discuss_with`. Both point to person notes and carry source evidence.
5. A pending decision creates an incomplete DecisionRecord and a Task with a
   `resolves` relationship. A reported decision includes its outcome. Compare the
   station's [[Decisions/Keep provenance with observations]] example.
6. If more important items remain, copy the next prompt and continue the same
   external chat. No fixed small item count should omit important information.
7. Edit a task deadline locally, then import an evidenced conflicting deadline.
   The local date stays and the board flags the conflict. Repeating an import
   does not duplicate its notes. Try **Undo last import** within ten minutes;
   later edits protect the operation from unsafe Undo.
8. Settings → Daily Briefing: select working days (Monday–Friday initially),
   optional AI reconciliation, a specific connection or **Use chat selection**.
   Toggle the plugin under Core plugins; notes are preserved. The board also
   exposes the AI checkbox, outside the import action.

Your local task/decision edits travel as compact changed fields in later prompts.
The external assistant is asked to remember them, never to update Planner. Its
acknowledgment is required; permanent memory is not assumed. Read coverage gaps.

The live waiting view below works on ordinary Task note relationships:

```tasks
not done
relationship is waiting_on
sort by due
```

Return to [[Welcome]].

Inspect [[Tasks/Choose briefing format]] and [[Decisions/Choose briefing format]]
for an authored waiting relationship, a pending decision and their sourced graph edges.

Clipboard operations finish before the toast confirms a copy or import. Formatted
JSON is accepted within a compact-content budget; whitespace is not content. An
undated directory reference can support a person match, with a coverage gap rather
than an invented date. Briefing facts still need dated supporting evidence.

Friendly names are separate from narrative: a task can have `title: Review testing
deck with Yael` and a longer `text` explaining the request. New note filenames,
headings and YAML names use that title; details and provenance remain in the body.
Task/decision IDs are separate. Equal titles for distinct commitments get readable
numeric suffixes.

Daily Briefing stores its settings and data in `.draglass/briefing/` inside this
vault. Try different working days and an AI selection in another temporary vault:
they should not cross over. Recreating an empty vault clears collection counters,
coverage gaps and Undo status. Existing notes are preserved when stale metadata
is cleared because its backing briefing note is missing.

## Vault storage

After editing a practice note, inspect the vault folder with hidden files visible. Recovery snapshots and Daily Briefing data share the `.draglass/` folder. Trash and task Undo history also stay there.

## Generated content stays readable

The framed example below is authored demo content, not an external AI response. In Live Preview, click the text or the Automatically generated label to enter Markdown source and edit it. Move the caret outside to restore the rendered frame; links remain usable when previewed. In Reading view, look for the subtle border and **Automatically generated** label. Switch to Source to inspect the `briefing id=...` fence. Generated entries keep stable IDs so later imports can find them; your changes are preserved and conflicting incoming edits are flagged.

```briefing id=demo-format-example
- [[Tasks/Choose briefing format|Choose briefing format]] — Use a concise daily summary with sourced atomic notes.
  - Evidence: authored Lumen demo fixture.
```

Personal prose belongs outside the generated frame. Task controls, backlinks, tags, search and graph connections still work inside it.


## Follow-through

After **Start today** establishes the baseline, change a practice task deadline,
complete it with optional details, and record a decision outcome. Open the board’s
**Since last briefing** section. Expand a pending entry to inspect the changed
fields, including the recorded outcome, and use Open note to inspect the source.

Choose **Copy local updates** (also available as **Copy local briefing updates**
in the command palette). The compact prompt contains changed fields only, without
starting a new evidence collection. Paste it into your external chat and import
the acknowledgment with **Import response**. Copying alone leaves entries pending;
only explicitly retained updates appear under **Externally acknowledged**. This
means the assistant reported retention, not a guarantee of durable memory.

Try editing the deadline again after copying: acknowledging that prompt must leave
the newer change pending. Long outcomes are split across bounded batches; keep
using Copy local updates and importing acknowledgments until nothing remains.
Planner and other external records must not be updated automatically. This is a
guided exercise: no external acknowledgment or provider result is preloaded.

Person imports accept a missing, null or blank `firstName` when the response supplies
a readable `name`. Do not guess the first name. In a practice response omit it,
verify the employee ID selects the existing person, and verify a full-name match
when no ID is known. No blank `first_name` property should be created.

Inspect the copied prompt: it explicitly asks for each relevant person’s verified
company-assigned employee/user ID, in `people.id`. It requests
directory/profile evidence, omits unavailable IDs and reports restricted access.
Copilot must not derive an ID from a name/email or supply a company registration
number. Imported IDs use the existing `employee_id` property and ID-first matcher.

For duplicate item IDs, try repeating the same item with a second source. The
import should create one note with both sources. Different actions must have
different stable action IDs even when they come from one message. Conflicting
entries using the same ID are rejected with the offending ID, item titles and
fields; no notes are changed, so a corrected response can be retried.
