# Tasks and Checklists

Any Markdown checkbox in your vault is a task Draglass can track. The right sidebar has a **Tasks** panel that collects every open task from every note so you can see what needs doing without opening each file.

## Writing tasks

Use standard Markdown checkbox syntax inside a list:

```markdown
- [ ] An open task
- [x] A completed task
- [-] A cancelled task
```

Here are some real tasks you can interact with right now:

- [ ] Open the right sidebar and look for this task in the panel
- [ ] Try checking this box — edit the `[ ]` to `[x]`
- [ ] Follow a [[Wikilinks|wikilink]] to see how notes connect
- [ ] Open the [[Graph View]] and find this note as a node

Completed (`[x]`) and cancelled (`[-]`) tasks are hidden from the panel so the list stays focused on what is still open.

## Clickable checkboxes in Live Preview

In [[Live Preview]] mode, every `- [ ]` item shows a real checkbox widget. Click it to cycle through three states:

1. **Open** `[ ]` — unchecked
2. **Done** `[x]` — checked
3. **Cancelled** `[-]` — struck through / indeterminate

The underlying Markdown updates instantly, so the change is saved automatically.

## How the scanner works

Draglass scans every Markdown file in the vault for lines matching `- [ ]`, `- [x]`, or `- [-]`. It runs automatically when you open a vault and re-scans after each save. The scan is debounced so it does not slow down typing.

Lines inside fenced code blocks and blockquotes are ignored — the scanner only finds real task items.

> [!note] Locked content
> When the vault is locked, tasks inside [[Privacy and Security|locked sections]] are excluded from the panel. Unlock the vault to see them.

## Clicking a task

Click any task in the right-sidebar panel to open the note that contains it and jump to the exact line. The line flashes briefly so you can find it in context.

## Tasks in daily practice

A common pattern is to keep a running list in your [[Daily Notes]]:

```markdown
## Today

- [ ] Review notes on [[Philosophy]]
- [ ] Write summary of [[Ancient Greece]] reading
- [x] Push commit for the new feature
```

Because the task panel aggregates across files, you can spread tasks across project notes, daily notes, and topic notes and still see them all in one place.

## Related

- [[Daily Notes]] — a natural home for daily tasks
- [[Markdown Syntax]] — the full formatting reference
- [[Workflow]] — building a capture-and-review habit
- [[Privacy and Security]] — how locked sections affect task visibility
