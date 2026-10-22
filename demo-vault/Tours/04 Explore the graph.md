---
tags:
- demo/tour
demonstrates:
- graph
---

# Explore the Lumen knowledge network

Open **Open global graph** from the command palette or press Cmd/Ctrl+G. The graph connects people, teams, a company, goals, capabilities, systems, components, decisions and evidence.

Try these steps:

1. Inspect [[Systems/Beacon service]] and its incoming/outgoing connections.
2. Use Cmd/Ctrl-click on a node to pin the inspector, then interact with its evidence.
3. Open the local graph and increase depth; selecting an existing note there moves the local neighborhood to that note.
4. Find the hollow Weather relay node and click it to create a missing entity.
5. Search with `path:People`, `type:Identity` is **not** a query operator; use `[type:Identity]` for the property predicate.
6. Add color groups such as `path:People` and `path:Systems`. Reorder groups to change their priority.
7. Explore tags, attachments, existing-only and orphan filters; try arrows, text fade, node size and link thickness.
8. Adjust forces and link distance; drag a node or pan the background. Use Fit, zoom and the minimap.
9. Pause/resume layout, try chronology animation and export a PNG.

Global and local controls are remembered separately. Named property relationships can carry evidence; plain wiki links intentionally have no predicate name. The graph retains its own dark palette even when the editor is light.

Open [[Tours/05 AI conversations]] next.
