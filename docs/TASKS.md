# Tasks

Tasks is a bundled core plugin, enabled by default for each vault. Turn it on or off under Settings → Core plugins. It works without an AI connection. Ordinary Markdown remains readable when it is disabled.

## Capture and promote

A Markdown checkbox is an inline task. Code fences, indented code, HTML blocks, YAML and drawings are excluded. Supported inline states in this slice are unchecked and completed. Structured metadata uses the following text on the same line:

```md
- [ ] Inspect the kit 📅 2026-11-01 ⏳ 2026-10-30 🛫 2026-10-29 ⏫ 🆔 field-kit
```

Due (`📅`) is the deadline, scheduled (`⏳`) is the intended work date and start (`🛫`) is the earliest intended start. Priority markers are highest `🔺`, high `⏫`, medium `🔼`, normal (no marker), low `🔽` and lowest `⏬`. Completion through Tasks records a `✅` calendar date. Reopening clears that date. Manually typed checkboxes are still indexed; typing a marker alone does not synthesize a completion date.

Open Tasks from the ribbon or the command palette (Cmd/Ctrl+Shift+P); it opens the Tasks tab in the right sidebar, keeping the current note in place. Edit planning metadata from the task row. Promote creates a Task note, retains the task ID (or assigns one if absent), transfers its planning fields and leaves a linked checkbox reference. Nested items remain in the source note. Promotion never copies the entire surrounding meeting or project note.

New Task creates a note directly. When a Markdown note is active, Link to current note adds a `Context: [[Note]]` wikilink to the Task note body, which produces a normal backlink. Also insert a task reference adds a linked checkbox to that source note. Neither option is required. Context links do not assert evidence or ownership.

Task note properties include `type: Task`, `subtype: ACTION`, stable `id`, `fqn`, `name`, `status`, `priority`, `due`, `scheduled`, `start` and optional `completed`. Supported note statuses are `todo`, `in-progress`, `on-hold`, `done` and `cancelled`. Existing graph/property/relationship editing supports the Task type with ACTION and MILESTONE suggestions. Named relationships retain optional evidence sources. Task dependencies use stable IDs and are evaluated across inline tasks and Task notes.

A pure checkbox wikilink to a Task note (including an alias or relative path) is a reference, not another task. Tasks results display the canonical note once and list its source references. Completion or reopening through Tasks updates the canonical status and linked checkbox markers. Arbitrary prose containing a link remains an independent inline task.

Task operations flush pending editor saves, check the selected task against disk and preserve unrelated content. Ambiguous stale tasks are rejected. Multi-file operations attempt rollback on failure; rollback conflicts report affected paths. Existing-file edits retain normal recovery snapshots. The operation notice appears above the workspace and is restored on launch while eligible. Use **Undo** in the operation notice, **History / Undo** in Tasks, or **Task history / Undo** in the command palette. Undo covers the entire operation, including all references and a newly created Task note. Up to 20 recent operations are retained; each is eligible for Undo for 10 minutes, including across app restarts. History lives inside the hidden `.draglass-editor/task-operations` directory of this vault. Empty created folders may remain after Undo.

Undo checks every affected file before changing any of them. Later content edits block the whole Undo, preserving those edits. Managed timestamp-only differences are allowed, so sequential task operations can be undone in reverse order. Restored notes retain their creation time and receive a new updated time. Renamed/moved files block old receipts; stable task IDs can still be read and used in new task operations at their new paths.

Interrupted operations are reconciled from saved before/after bytes. Partial known writes are rolled back; unknown later content is preserved and the history records a conflict. This is recoverable multi-file execution, not a filesystem-wide atomic transaction. Manual operations are limited to 256 affected files and 32 MiB of before/after text. AI proposals retain the stricter 12-file and 100,000-character limits.

## Embedded queries

Fenced `tasks` blocks render in Live Preview and reading view. Move the caret into a block to edit the query source. The Tasks pane uses the same engine, includes unsaved note drafts and can live alongside other panes. Quick filters select Open, Today, All or Completed.

````md
```tasks
not done
sort by priority
sort by due
group by kind
explain
```
````

Supported instructions:

| Instruction | Values |
| --- | --- |
| `done`, `not done` | Not done excludes completed and cancelled tasks |
| `status is VALUE` | todo, in-progress, on-hold, done, cancelled |
| `kind is VALUE` | inline, note |
| `priority is VALUE` | highest, high, medium, normal, low, lowest |
| `FIELD OP DATE` | FIELD: due, scheduled, start. OP: before, after, on, on or before, on or after |
| `has FIELD date`, `no FIELD date` | due, scheduled, start |
| `FIELD includes TEXT`, `FIELD does not include TEXT` | path, description, tag; case-insensitive substring matching |
| `sort by FIELD [reverse]` | priority, due, scheduled, start, description, path, status; multiple sorts supported |
| `group by FIELD` | status, priority, due, path, kind; one grouping per query |
| `limit N` | Up to 500 matches; results paginate |
| `explain` | Show resolved dates and active query instructions |

Blank lines and lines starting with `#` are comments. All filters are combined with AND. DATE accepts ISO YYYY-MM-DD, today, tomorrow, yesterday, N days ago or in N days. Relative dates resolve using the device-local calendar day when the query executes. A dated filter excludes missing or invalid dates. Unset dates sort after dated tasks in ascending order. Dates are not converted to timestamps.

Unsupported instructions fail visibly. JavaScript is never evaluated. This slice does not claim full query-language compatibility. Context placeholders, reusable query presets, complex Boolean expressions and a visual query builder remain planned.

## AI

When Tasks is enabled, the dedicated AI tool component registers `query_tasks`. It returns five task references per page within the existing result and total-prompt budgets. The model reads relevant notes separately for evidence; complete note bodies are not preloaded. `read_task` retrieves structured fields and a request-local handle. Select a unique `task_id`, or a path with the exact line for inline tasks; a path without a line selects its Task note. Use `read_note` for the surrounding evidence or body. Duplicate task IDs are diagnosed and must be fixed before semantic changes.

Discuss (read-only) intentionally cannot stage edits. After a Discuss response, **Enable changes for this request** fills the composer with the same request and selects Propose changes; send it to generate a review.

In Propose changes mode, `create_task`, `update_task`, `complete_task` and `promote_task` stage semantic operations using the same read-only planner as manual actions. Dates, priorities, completion/reopening and references follow the same rules. Existing task mutations require a handle from `read_task` in the current request. A handle cannot be reused in another conversation turn or after the task has changed externally.

The AI review lists each task operation with nested affected-file buttons. Inspect every file, then **Accept task operation** applies the group together. Reject leaves every file unchanged. Undo is available in review and Task history through the same receipt. No task write occurs during tool execution. One staged operation may affect a file in each response; overlapping operations are rejected rather than silently overwriting one another. Existing reviewed note tools remain available for ordinary Markdown changes.

Disabling Tasks removes its commands, ribbon action, AI query tool and enhanced embedded query rendering. Existing Tasks panes explain how to enable it again. It does not delete or rewrite files.

## Next slices

The agreed direction combines richer task views and workflows with task notes and inline capture. Dependency-aware actionability is available. Planned capabilities include robust per-task recurrence and date-offset preservation, calculated urgency, an Eisenhower matrix, boards/calendar/tree views, reusable/context-aware queries and an optional daily workflow plugin. JavaScript execution is excluded.

Generated Task/context references use the same shortest unique wikilinks as ordinary notes. The renderer hides folder prefixes on unaliased internal labels, while the source and tooltip retain the target. Duplicate names retain a qualifying path with a display alias. Plain click opens a rendered link; Alt-click reveals its source.

## Dependencies · 0.26.0

Task notes use `depends_on: [task-id, another-id]`. Inline tasks use `⛔ task-id,another-id`; `🆔 task-id` assigns an inline identity. The visual task editor searches existing IDs by task title, adds/removes prerequisites, and can assign an ID to an inline task. Existing IDs are immutable in semantic editing. Promotion and note renaming preserve dependency identity. Maximum 50 distinct dependencies per edited task. The visual chooser offers up to 500 tasks; entering an exact ID also works.

A dependency is satisfied only by `done`. Missing/duplicate targets, self-links and cycles are visible blockers in imported Markdown/YAML. Semantic edits reject newly introduced invalid dependencies and cycles. Read-only analysis uses iterative strongly connected components and does not rewrite files. Accepted AI task operations revalidate against the current vault inside the journal transaction.

Query instructions: `actionable`, `blocked`, `not blocked`, `has dependencies`, `no dependencies`. Combine with existing filters, for example `not done` plus `blocked`. Actionable means todo/in-progress, no unsatisfied dependencies or cycle, and no future start date, using the device-local day. On-hold, done and cancelled tasks are excluded. Due/scheduled dates do not gate actionability. These are computed states, not stored YAML statuses; blockers are shown as navigable task references.

AI read/query results expose bounded summaries, dependency counts and limited prerequisite details. Read note ranges for additional dependencies when summaries are truncated. `create_task` and `update_task` accept `depends_on`; an empty list clears dependencies. Tools remain in the AI tools component and use the shared Tasks planner and review/Undo boundary.

Global and local graphs project task dependencies onto their owning notes as named `depends_on` edges. Backlinks include the inverse relationship. Same-note inline dependencies appear as a labeled loop. Recorded declarations identify each task ID/title, source line, target and completion state; several task dependencies can share an edge. Missing/ambiguous IDs produce hollow task-reference nodes with diagnostics, without offering to create an unrelated note. Dependencies remain visible after completion. No evidence sources are invented; independent provenance, recurrence and cascading scheduling are future slices.

The task pane always shows a Dependencies section, including “none” when empty. Outgoing `depends_on` declarations in a Task note’s YAML `relationships` collection participate in the same task analysis as the ID list. The task editor can remove these prerequisites and retains their source records when kept. The right ribbon opens the compact Tasks sidebar. The command palette provides Open Tasks and Open task workspace.

## Recurrence · 0.27.0

Set Repeat in the task editor or YAML `recurrence`. Supported rules: `every N days`, `every N weeks`, `every N months`, `every N years`, and `every monday` (any weekday), optionally followed by `after completion`. Use lowercase. Empty recurrence disables repeating. Inline syntax is `🔁 every 1 week;` with a required terminating semicolon. Query `is recurring` or `is not recurring`.

Semantic completion preserves the old occurrence and creates one successor with a fresh ID, in the same journal/review/Undo operation. Fixed rules skip missed dates to the first date after both today and the current planning date. Completion-relative rules advance from device-local completion day. Due, scheduled and start offsets remain calendar-day offsets relative to due (or scheduled/start when due is absent). Dates without an initial planning date gain a due date. Monthly/yearly fixed rules retain an anchor so short-month clamping does not drift.

`recurrence_dependencies` is `clear` by default or `carry` for the same prerequisite IDs. Dependencies pointing to an old occurrence continue pointing there; they do not automatically follow the series. Completed prerequisites remain satisfied when carried. New note occurrences copy note content and other properties; inline occurrences copy the task line. Nested items stay with the completed inline occurrence. Copying content with duplicate task IDs is rejected by normal validation. Notes get new managed creation/update timestamps.

Generated `next_id` prevents duplicate successors. Inline bookkeeping uses `⏭ ID;`, `🗓 DATE;`, and `🔗 clear;`/`🔗 carry;`. Use semantic completion through Tasks/checkbox widgets or reviewed task AI tools; manually typing an x in source does not create occurrences. Reopening an occurrence with a successor requires grouped Undo within ten minutes, guarded against later edits. Outside that window, edit the files deliberately. This slice does not remap prerequisites to corresponding recurring occurrences or support arbitrary natural-language rules.

Repeat rules also accept the shorthand `2 days after completion` (the leading “every” is optional), mixed case and extra whitespace. Zero intervals are rejected. The editor shows examples and validates rules before sending a save request.

## Importance and urgency · 0.29.0

Importance is user-set: `high` or `normal`, independent of existing priority. Use the task editor, YAML `importance: high`, or the inline `⭐` marker. Normal inline importance has no marker. Promotion, recurrence, reviewed AI editing and Undo preserve this field.

Urgency is a read-time integer score clamped to 0–100. Closed tasks score zero. Priority contributes highest +30, high +20, medium +10, normal 0, low -5, lowest -10. Important adds 15. Deadline contributions are: overdue 40 plus two per overdue day capped at 70; today 40; tomorrow 30; within three days 20; within seven days 10; otherwise zero. Scheduled today adds 5. Each result explains its factors. Status/start/dependency availability does not alter the arithmetic: blocked or unavailable work is explicitly labeled rather than quietly treated as actionable. Invalid due dates contribute no deadline factor. Dates use the device-local calendar day, with UTC date arithmetic avoiding DST drift. Scores are recalculated when queried and never written to notes.

The Eisenhower matrix is independent of score thresholds. Urgent means a valid deadline no later than two days from today; overdue is urgent. High importance is important. Quadrants are `do` (important/urgent), `plan` (important/not urgent), `delegate` (normal/urgent), `consider` (normal/not urgent); closed records use `closed`. These names classify attention, not automated delegation. High priority alone does not make a task important or urgent.

**Open task matrix** opens a responsive wide dialog; Matrix is also available in Tasks. Editing a matrix item closes the matrix and opens the standard task editor. Fenced queries support `view matrix`; the compact sidebar stacks quadrants. Matrix results are paginated and show the number on the current page, not misleading whole-vault quadrant counts. All normal operations still use the task journal and existing review boundary. No drag/drop reassignment is included.

Queries: `important`, `not important`, `urgent`, `not urgent`, `quadrant is do|plan|delegate|consider|closed`, `sort by urgency` (descending by default), `sort by urgency reverse`, `sort by importance`, and `group by quadrant`/`group by importance`. Combine `actionable` with any of these to exclude blocked, held or future-start tasks. AI query/read tools return bounded derived fields; `read_task` includes score explanations. `create_task` and `update_task` can propose importance changes. Scores and quadrants cannot be set by the model.

Score explanations retain their expanded or collapsed state during refreshes within each open view. Inline task saves omit the default `🔗 clear;` recurrence policy, including removing older explicit default markers; `🔗 carry;` remains meaningful and is preserved.

## Saved views and task workspace · 0.30.0

Run **Open task workspace** from Cmd/Ctrl+Shift+P, or choose **Open workspace** in the right Tasks sidebar. The workspace is an ordinary main tab: split, move or pin it alongside notes. **Open Tasks** continues to open the right sidebar. Reissuing Open task workspace focuses the existing Tasks tab in the active group. Closing and reopening the workspace uses its last edited state.

Choose **View** for built-in Open tasks, Ready to work, Blocked and This week perspectives, or one of your named views. Expand **Filters** to combine status, priority, importance, prerequisite/actionability and due/scheduled/start dates. Each date supports before today, today, the next seven calendar days including today, this calendar week, no date, has date or an inclusive From/Through range. An empty endpoint is unbounded. This week is Monday through Sunday using the device-local day; it is not a rolling seven-day window. Dates remain relative in saved queries.

**Layout** switches List/Matrix while preserving the other query clauses. **Sort** offers due, urgency, priority, importance, scheduled, start, title, note and status, with default/reverse order. Urgency and importance default to descending; priority uses highest first; dates use earliest first. Advanced sorting indicates multiple sort clauses, which remain unchanged until you choose a replacement. The matrix displays the current bounded result page, with per-quadrant counts for that page and Next tasks for later pages.

**Advanced query** exposes the same text used by visual controls. Run query applies it. Controls marked Advanced filter preserve more complex clauses until you explicitly replace that dimension; changing layout never drops tags, grouping, limit, comments or other filters. Unsupported instructions show errors rather than being ignored. Queries are bounded to 4,096 characters.

Under **Save / manage views**, enter a name and choose **Save as new view**. Names are trimmed, case-insensitively unique and limited to 80 characters; a vault supports 50 custom views. **Update selected** saves the current query to your selected custom view. **Rename selected** changes its name; **Delete selected** removes its definition while retaining the open query. Built-in definitions cannot be changed or deleted; save your variation under a new name. A Modified view message distinguishes unsaved query changes from the saved definition.

View definitions are shared between this vault’s sidebar and main panes and survive switching to another vault and back. Each pane independently retains its selected view and query (including filters, sort and layout) on restart. Paging resets to the first page on reopening. No task results are stored in preferences, and creating/editing/deleting views does not edit task notes. Disabling the Tasks core plugin preserves its saved views and files.

New date-query instruction: `due this week`, also supported for `scheduled` and `start`. Inclusive forms `on or before` and `on or after` can be combined for ranges.
