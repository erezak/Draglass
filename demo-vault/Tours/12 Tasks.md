---
demonstrates:
- tasks
tags:
- demo/tour
---
# Tasks: capture first, add detail when needed

Open **Tasks** using the checkbox icon in the left ribbon or **Open Tasks** in the command palette (Cmd/Ctrl+Shift+P). It opens in the right sidebar and collects ordinary checkboxes and notes whose YAML `type` is `Task`.

## Try an inline action

- [ ] Check the field kit 📅 2026-11-02 ⏫ 🆔 demo-field-kit
- [ ] Ask the research team about transport ⏳ 2026-10-30
- [x] Read the station welcome note ✅ 2026-10-25

Choose **Edit** beside an action in Tasks to set due, scheduled and start dates or priority. Inline tasks use readable structured metadata on the same Markdown line.

## Promote when the action needs its own context

Choose **Promote** beside “Check the field kit”, or place the caret on that checkbox and run **Promote checkbox to Task note**. Promotion preserves its ID, copies its planning fields and replaces the original line with a linked task reference. Nested items stay in their source note.

This reference already points to a Task note. It appears once in Tasks; completing it updates the note and its linked checkbox references:

- [ ] [[Tasks/Review field readiness]]

## Create a Task note directly

Run **New Task**. The current note can optionally be linked from the new task, and **Also insert a task reference** adds a checkbox here. Creating from an empty pane works too. The contextual link is not evidence for a deadline or claim.

## Live task query

```tasks
not done
sort by priority
sort by due
group by kind
explain
```

Move the caret into the block to edit its source. Results also render in reading view. Complete, edit, promote, or open the original task from a result. The list is paginated.

Try `due before tomorrow`, `status is on-hold`, `kind is note`, `path includes Tasks`, `priority is high`, `description includes field`, or `tag includes work`. One `group by` instruction is supported; multiple `sort by` instructions are applied in order. Use `limit 20` to restrict results. Unsupported instructions show an error. JavaScript is not executed.

Relative dates use the device-local day. Dates without times are calendar dates. Due is a deadline, scheduled is when you plan to work, and start is the earliest intended work date.

## Undo the whole operation

After editing, completing, creating or promoting a task, use **Undo** in the notice, **History / Undo** in Tasks, or **Task history / Undo** in the command palette. The 10-minute Undo window survives closing and reopening Draglass. Promotion Undo restores the inline task and removes the created task note together.

Try completing [[Tasks/Review field readiness]], then undo it from history. If you edit an affected file afterward, Undo blocks rather than replacing your later edits. Empty task folders may remain. Duplicate task IDs are reported; assign distinct IDs before semantic changes.

## AI and plugin controls

With a configured AI connection, ask it to find open tasks. The `query_tasks` tool retrieves small pages; `read_task` reads structured fields and provides a request-local handle. `create_task`, `update_task`, `complete_task` and `promote_task` stage grouped proposals; it can then read relevant notes for details. In **Propose changes** mode, dedicated task tools can prepare create, update, complete/reopen and promote operations. Try “Promote Check the field kit into a task note.” Review each affected file using the nested file buttons, then accept the entire task operation together. Nothing is changed before acceptance. No provider results are fabricated in this tour.

Turn **Tasks** off under **Settings → Core plugins**. Its commands, ribbon button and enhanced query rendering disappear. Task notes and checkbox text remain intact; existing Tasks tabs explain how to re-enable the plugin.

Return to [[Welcome]].

## Task sidebar and visible Undo

Run **Open Tasks**: the Tasks tab opens on the right while this note stays open. Use its query box, quick filters and **History / Undo**. Create a task with **Link to current note**, then inspect the task body: `Context: [[Tours/12 Tasks]]` is an ordinary navigable wikilink.

Promote the practice checkbox above. The floating **Undo** notice stays available for ten minutes; it also returns after restarting within that window. You can always find eligible operations with **Task history / Undo…** in the command palette. In light mode, the dialog’s primary action uses a filled accent color.

In AI **Discuss (read-only)** mode, ask about a task. To request an edit, use **Enable changes for this request**, then send the filled request in **Propose changes** mode. Review and accept the grouped operation before it changes files.

Task references use the same vault-wide wikilinks as every other note. Plain-click a rendered reference to open its note; Alt-click to edit it. A unique task can be linked as `[[Review field readiness]]`; folder-qualified links still display the note name. Explicit aliases override the display text.
