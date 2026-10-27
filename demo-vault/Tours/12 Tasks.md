---
demonstrates:
- tasks
tags:
- demo/tour
---
# Tasks: capture first, add detail when needed

Open **Tasks** using the checkbox icon in the right ribbon or **Open Tasks** in the command palette (Cmd/Ctrl+Shift+P). It opens in the right sidebar and collects ordinary checkboxes and notes whose YAML `type` is `Task`.

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

## Dependencies and actionable work

- [ ] Pack the spare sensor ⛔ demo-field-kit 🆔 demo-pack-sensor
- [ ] Dispatch the kit ⛔ demo-pack-sensor 🆔 demo-dispatch-kit

Open Tasks and choose **Blocked**. Packing waits for the field-kit check; dispatch waits for packing. Complete each prerequisite to see its successor become **Actionable**. Undo completion to restore the blocker. Click a prerequisite in a task result to visit its source.

Use **Edit → Depends on** to search task titles/IDs, add prerequisites and remove them. Inline prerequisites without IDs can be given one using **Edit → Task ID**. Existing IDs are read-only because references rely on them. Promote packing and verify dispatch still points to the same task ID. Rename the promoted note and verify its dependency still resolves.

```tasks
actionable
sort by priority
```

```tasks
not done
blocked
```

Task notes store `depends_on` as a YAML list of task IDs; checkboxes use `⛔ id1,id2`. Completed prerequisites satisfy dependencies; cancelled ones do not. Tasks on hold, completed/cancelled tasks, and tasks with future start dates are not actionable. Scheduled and due dates do not prevent actionability.

For a diagnostic exercise, temporarily type `⛔ missing-demo-id` on an inline task. It remains visible as a missing blocker. The task editor rejects new missing targets, self-dependencies and cycles; direct Markdown imports retain them with diagnostics so you can repair them. Remove the temporary marker afterward.

With a configured AI connection, ask for actionable tasks and their blockers. In Propose changes mode, ask it to add an existing prerequisite. Task tools return bounded dependency summaries and stage changes for review, never write automatically.

## See prerequisites in the graph

Open the local graph of [[Tasks/Review field readiness]]. A named **Depends on** edge connects it to this tour, which contains its dispatch prerequisite. Open this tour’s local graph: a labeled loop represents its inline tasks depending on other inline tasks in the same note. Pin the note’s graph details and expand Recorded declarations to see the exact task IDs, titles, source lines and prerequisite states. Complete a prerequisite, promote it, or rename its note and check that the relationship still resolves. Graphs show note-level relationships; several task dependencies between the same notes share an edge with multiple declarations.

The Tasks pane displays a Dependencies section for every result. You can also add a `depends_on` relationship from a Task note to another Task note using Properties: the pane will show the same prerequisite and blocked state. Keep any supporting sources on that relationship; retaining it through task editing preserves those sources. Tasks is available from the right ribbon, without a duplicate left-ribbon button.

## Recurring tasks

- [ ] Inspect the spare kit 📅 2026-11-01 🔁 every 1 month; 🆔 demo-recurring-kit

Use Edit → Repeat to enter `every 1 week`, `every monday`, or `2 days after completion`. Choose whether new occurrences clear or carry prerequisite IDs. Complete this example: the completed occurrence remains and a new occurrence receives its own ID and dates. Use Undo to restore both together. A future start date controls actionability, not the recurrence rule.

```tasks
is recurring
not done
```

Fixed schedules skip missed dates and create one future occurrence. Planning dates retain their spacing. Month-end schedules retain their original day where possible (January 31 → February 28 → March 31). To reopen a completed occurrence that already has a successor, use grouped Undo within its ten-minute window.

## Importance, urgency and the matrix

- [ ] Protect the long-term research direction ⭐ 🆔 demo-important-plan
- [ ] Review the next release window 📅 2026-10-29 🆔 demo-urgent-window

Choose **Edit → Importance → Important**, or add `⭐` to an inline checkbox. Importance is separate from priority and survives promotion and repeating occurrences. Task notes store `importance: high` or `normal`.

Run **Open task matrix** from the palette, or use Matrix in the right Tasks pane. It opens a wide four-quadrant view; the sidebar remains available for list queries. Urgent means overdue or due within two calendar days of today. Blocked and future-start tasks remain labeled; an urgent task is not necessarily actionable. The view does not assign or delegate work. Dates in this demo are fixed examples; adjust a due date to today to explore the urgent quadrants.

```tasks
not done
sort by urgency
view matrix
```

Use **Why this score?** to inspect the calculated urgency factors. Try `important`, `not important`, `urgent`, `not urgent`, `quadrant is plan`, `group by quadrant`, and `sort by urgency reverse`. Highest urgency sorts first by default. With a configured AI connection, ask for important actionable tasks and request a reviewed importance change. No note bodies are preloaded for this view.

## Keep score explanations open

Expand **Why this score?** on a task, then wait at least 15 seconds for the periodic refresh. The explanation stays expanded in Tasks, the matrix, and embedded query results. Collapse it yourself and it stays collapsed on refresh.

Edit “Ask the research team about transport” and mark it Important. Its line gains `⭐`; the default clear-dependencies recurrence policy does not add a `🔗 clear;` marker. Saving an older task with that default marker removes it. Explicit carry policies remain intact.

## Build a task workspace

1. Run **Open task workspace**. Keep this tour next to it using Split editor right if helpful. The right Tasks sidebar remains available independently.
2. Select **Ready to work** in View. Expand **Filters** and choose Important, then choose Matrix under Layout. Inspect the remaining blockers and explanations.
3. Expand **Save / manage views**, enter “Station focus”, and select **Save as new view**. Return to the sidebar and choose Station focus there too; changing one pane’s filter does not change the other pane.
4. Change the sort to Urgency and toggle List/Matrix. The filters survive. Use **Update selected** to replace your custom definition; try renaming it to “Field priorities”.
5. Try Due → Date range, with inclusive From/Through dates. Try the built-in **This week** view: its calendar range is Monday–Sunday and changes with the local date, so it can be empty for this fictional scenario.
6. Restart Draglass with the task workspace open. Its selected view, filters, sort and layout should return. Deleting a saved view retains the current query; it does not remove any tasks.

An embedded calendar-relative query uses the same service:

```tasks
not done
due this week
sort by urgency
```

Use Advanced query to add `tag includes demo` or `group by path`, then change Layout: the additional clauses remain in the query.
