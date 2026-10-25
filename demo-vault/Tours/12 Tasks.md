---
demonstrates:
- tasks
tags:
- demo/tour
---
# Tasks: capture first, add detail when needed

Open **Tasks** using the checkbox icon in the left ribbon or **Open Tasks** in the command palette (Cmd/Ctrl+Shift+P). It collects ordinary checkboxes and notes whose YAML `type` is `Task`.

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

## AI and plugin controls

With a configured AI connection, ask it to find open tasks. The `query_tasks` tool retrieves small pages; it can then read relevant notes for details. Existing reviewed note tools can propose edits. No provider results are fabricated in this tour.

Turn **Tasks** off under **Settings → Core plugins**. Its commands, ribbon button and enhanced query rendering disappear. Task notes and checkbox text remain intact; existing Tasks tabs explain how to re-enable the plugin.

Return to [[Welcome]].
