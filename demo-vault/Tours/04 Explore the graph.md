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
5. Search with `type:Identity`, `subtype:PERSON`, or `path:People`. Any YAML field can be queried with `[field:value]`; `{field:value}` is equivalent.
6. Add color groups such as `{type:Task}`, `type:System` and `[operations.readiness:green]`. Reorder groups to change their priority. Filters, excluded files and groups use the same syntax.
7. Explore tags, attachments, existing-only and orphan filters; try arrows, text fade, node size and link thickness.
8. Adjust forces and link distance; drag a node or pan the background. Use Fit, zoom and the minimap.
9. Pause/resume layout, try chronology animation and export a PNG.

Global and local controls are remembered separately. Named property relationships can carry evidence; plain wiki links intentionally have no predicate name. Every graph follows the app theme. Run **Toggle light / dark theme** from the command palette and compare the canvas, labels, controls, inspector and minimap. Paused graphs repaint too; graph filters and camera positions stay in place. Settings → Appearance → Follow system keeps graphs aligned with the system theme.

Open [[Tours/05 AI conversations]] next.

## Query any YAML property

Try `[operations.tier:<=1]` or `[operations.readiness:green]` to find Beacon service. Use `[type:=System]` for an exact value, `[field]` for presence, or `-[field]` for absence. `[active:false]` and `[empty:null]` match actual YAML boolean/null values where present. Comparison operators work on numbers and ISO dates.

Relationship collections can be searched with `relation:owned_by`, `[relationships.relation:owned_by]`, `[relationships.target:"Platform team"]`, and `[relationships.sources.ref:"Design review"]`. Array paths test their entries; separate predicates can match different entries. A predicate selects notes that declare matching YAML, rather than automatically including the relationship target or inverse edge.

For custom names, quote a path segment: `["service.name":Beacon]` searches a literal key containing a dot; `[profile."Display Name":"Ada Lovelace"]` searches a nested key with spaces. Nested objects and arrays are supported, including numeric indexes and `*` path segments. Existing `path:`, `file:`, `tag:`, content, regex and Boolean expressions remain available.
