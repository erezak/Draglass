---
id: demo-briefing-format-task
fqn: demo.lumen.task.choose-briefing-format
name: Choose briefing format
type: Task
subtype: ACTION
status: todo
priority: normal
importance: normal
due: 2026-11-02
relationships:
- relation: waiting_on
  target: '[[People/Mara Chen]]'
  sources:
  - ref: '[[Tasks/Choose briefing format]]'
    locator: Fictional station message
    quote: Mara Chen will confirm the briefing order before I choose the delivery format.
- relation: resolves
  target: '[[Decisions/Choose briefing format]]'
  sources:
  - ref: '[[Tasks/Choose briefing format]]'
    locator: Fictional station message
    quote: I must choose the briefing delivery format after Mara confirms the order.
---
# Choose briefing format

An authored fictional example of a personal commitment. It is not a result
retrieved from an external assistant.

## Context

The daily briefing's delivery format needs a decision. I am waiting on
[[People/Mara Chen|Mara]] to confirm the order first. Fill in the outcome in
[[Decisions/Choose briefing format|the incomplete decision record]].

## Fictional station message

> Mara Chen will confirm the briefing order before I choose the delivery format.
> I must choose the briefing delivery format after Mara confirms the order.

Use [[Tours/15 Daily Briefing]] to try the clipboard workflow. This task appears
in `relationship is waiting_on` queries, and its two named edges carry provenance.
