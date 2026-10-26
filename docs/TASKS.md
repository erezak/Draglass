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

Task note properties include `type: Task`, `subtype: ACTION`, stable `id`, `fqn`, `name`, `status`, `priority`, `due`, `scheduled`, `start` and optional `completed`. Supported note statuses are `todo`, `in-progress`, `on-hold`, `done` and `cancelled`. Existing graph/property/relationship editing supports the Task type with ACTION and MILESTONE suggestions. Named relationships retain optional evidence sources. Task-to-task dependency execution is not implemented yet.

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

The agreed direction combines richer task views and workflows with task notes and inline capture. Planned capabilities include dependency-aware actionability, robust per-task recurrence and date-offset preservation, calculated urgency, an Eisenhower matrix, boards/calendar/tree views, reusable/context-aware queries and an optional daily workflow plugin. JavaScript execution is excluded.
