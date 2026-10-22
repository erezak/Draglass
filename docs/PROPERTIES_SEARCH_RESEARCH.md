# Properties, tags and search research · 0.11

Primary sources consulted October 6–7, 2026:

- https://eemeli.org/yaml/

Draglass stores properties as YAML frontmatter and offers text, list, number, checkbox, date, date/time and tags controls. Property display can use the visual editor, hidden properties or YAML source. Unsupported objects remain available for source editing. The YAML Document API retains comments and supports typed values. Editing shared anchors/aliases is deliberately routed to source to avoid changing another property's value accidentally. Formatting can normalize when YAML is serialized, while the note body and newline style are retained.

Tags come from inline prose or the tags property. Nested tags form a hierarchy; parent searches include descendants. Tags are case-insensitive. Draglass combines YAML and inline tags, skips code and comments and counts each note once at each tree level. Clickable tag chips expose tags from both sources above the note. The type registry is per vault and uses property names; raw note values remain ordinary YAML. Unsupported typed values remain readable in source.

Search supports boolean grouping, phrases, regex, scoped content/path/file/tag/task operators and property predicates. Graph filtering and note search share the parser and YAML metadata model. Null checks distinguish unset values from empty strings or empty arrays. Numeric comparisons reject null and complex values. Plain searches preserve Draglass's filename matching. Results contain excerpts; line numbers are approximate context locations rather than a complete match engine.

Draglass additionally overlays current open editor documents onto the disk snapshot so drafts are searchable before autosave. Saved queries are reusable workspace metadata. Search runs locally in the renderer over the current snapshot; this is not a background worker or a claim of large-vault performance. The filesystem remains authoritative for unopened notes. Excluded-file settings, Bases, search query embeds and complete match highlighting/navigation are not part of this release.
