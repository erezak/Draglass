---
tags: [demo/tour]
demonstrates: [callouts]
---
# Callouts: context without losing the thread

Callouts are ordinary quoted Markdown. Use **Insert callout** in the command palette to wrap a selection or create a new one. The type is selected so you can replace it immediately; typing `[!` after a quote marker offers type completion.

Open **Callout Navigator** from the right icon rail or command palette. Search for `nested` below and select a result to jump to its editable source. It follows unsaved edits, works beside a note, and can be disabled in **Settings → Core plugins** without disabling callout rendering.

> [!note] Notes, **formatting** and [[Systems/Beacon service|a system link]]
> Keep supporting information beside your prose. Click **Edit**, double-click body text, or enter the block with the keyboard to edit its Markdown. Right-click its title in Live Preview to change the type without losing the body.

> [!tip] Title-only callout

> [!faq]- A collapsed answer
> Open the title to reveal this answer. Folding does not edit the file. The `-` sets its initial state; `+` starts expanded. PDF export includes all folded content.

> [!question]+ Expanded and nested
> A callout can contain another callout.
>
> > [!todo] A nested checklist
> > - [ ] Try a scratch edit and undo it.
> > - [x] Read the callout example.
> >
> > > [!example]- A deeper nested example
> > > Look for this title in Callout Navigator.

> [!abstract] A concise summary
> The field station connects [[Teams/Field team]], [[Systems/Beacon service]] and the evidence in [[Sources/Design review]].

> [!info] Rich content
> | Signal | Meaning |
> | --- | --- |
> | Green | Ready to review |
> | Amber | Needs a decision |
>
> ![[Attachments/Station.svg|240]]

> [!success] Keep the evidence
> An outcome can link to the note that records it.

> [!warning] Check the conditions
> Color and icon communicate the category, while the title makes it accessible.

> [!failure] Record what did not work
> Preserve the finding instead of silently discarding it.

> [!danger] A significant risk
> Clearly state the risk and the evidence supporting it.

> [!bug] A reproducible defect
> Record the trigger, actual behavior and expected behavior.

> [!example] A diagram inside a callout
> ```mermaid
> flowchart LR
>     Capture[Capture evidence] --> Review[Review finding]
>     Review --> Decide[Record decision]
> ```
>
> Editing this diagram keeps the quote prefixes intact.

> [!quote] A useful distinction
> Notes record what we know. Links let us ask how we know it.

## Aliases and custom types

Identifiers are case-insensitive. Aliases are `summary` and `tldr` (abstract); `hint` and `important` (tip); `check` and `done` (success); `help` and `faq` (question); `caution` and `attention` (warning); `fail` and `missing` (failure); `error` (danger); and `cite` (quote).

An unknown identifier uses the note appearance until customized. In **Settings → Callouts**, create a `research` type, choose a color and a Lucide icon such as `lucide-flask-conical`, then Apply. Custom SVG icons, dark-mode colors, default titles, title visibility, borders and corner radius are supported. Theme JSON can define the same options. This vault's definitions live in `.draglass/callouts.json`.

> [!research|review] Custom research finding
> This block intentionally begins with the note appearance. Customizing its type changes the presentation while leaving this text untouched. Optional metadata after `|` is preserved for styling hooks.

In Reading view and embeds, titles and bodies retain Markdown and note links. In Live Preview, entering a callout reveals editable source; leaving restores the formatted card. Source mode always shows the original Markdown.

Return to [[Welcome]] or explore [[Tours/03 Properties and evidence]].
