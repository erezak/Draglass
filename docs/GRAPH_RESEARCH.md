# Graph view research and implementation · 0.6

## Documented graph controls

| Control or interaction | Draglass implementation |
| --- | --- |
| Global graph | Ribbon, native View menu, Cmd/Ctrl+G |
| Local graph and depth | Local toggle, note menu, Cmd/Ctrl+Shift+G; depth 1–10 |
| Search files | Boolean query field with file/path/content/tag, phrases, negation, OR, grouping, regex, scopes/tasks and basic properties |
| Tags | Toggle; Unicode/nested inline tags and basic frontmatter tag lists |
| Attachments | Toggle; existing file metadata and local wiki/Markdown attachment edges |
| Existing files only | Hide unresolved note/attachment targets |
| Orphans | Include/exclude nodes with no visible connections |
| Excluded files | Shared per-vault list of graph search queries, one per line |
| Color groups | Add, query, pick color, reorder, remove; first matching group wins |
| Arrows | Direction markers on links |
| Text fade threshold | Zoom-dependent label opacity, with collision avoidance |
| Node size | Size multiplier; inbound references also influence size |
| Link thickness | Stroke-width slider |
| Animate | Creation-time reveal, stop and timeline scrubber |
| Center force | Layout compactness slider |
| Repel force | Spatial-tree repulsion slider |
| Link force | Spring-strength slider |
| Link distance | Spring rest-length slider |
| Restore defaults | Reset selected scope; shared exclusions are also cleared |
| Hover connections | Neighbor emphasis, unrelated-node/edge dimming, path tooltip and inspector |
| Click a note | Open note while preserving other tabs and drafts |
| Context menu | Open note, local graph, copy path; tag filtering |
| Scroll / +/- zoom | Cursor-anchored wheel zoom and keyboard zoom |
| Drag / arrow-key pan | Background drag; arrows, Shift accelerates |
| Drag node | Temporarily constrain a node while moving it |

Additional local controls: incoming links, outgoing links and neighbor links. Additional Draglass controls: folder colors, soft halos, curved edges, minimap, fit, layout pause/resume, expanded graph workspace, accessible node selector/inspector and PNG export. No graph runtime dependency was added.

## Visual choices

A charcoal/violet background and faint spatial grid give the graph depth without a photographic asset. Folder hues differentiate neighborhoods; user groups override them. Round notes, rounded tags, diamond attachments and hollow unresolved targets distinguish kinds. Curved links and subtle halos soften dense views. Labels fade with zoom and avoid overlapping already placed labels, with hovered/selected nodes prioritized. The active note receives an outer ring. The minimap shows graph extent and approximate camera position.

## Data, persistence and boundaries

Global and local settings are stored independently with workspace metadata. Exclusions apply to both scopes. The graph is rebuilt when its data changes, retaining existing node positions; it reads open editor documents as context. Opening or closing the graph does not rewrite note contents. Attachment bytes are never loaded for graph indexing; hidden paths and symlinks are skipped by the vault scan.

The query language supports boolean operators, scoped terms and property predicates. Block and section matching uses Markdown text boundaries. Graph bookmarks, imported filesystem exclusion patterns and plugin actions are outside this implementation. Existing attachment nodes can be inspected and their paths copied. Graph exclusions use search queries.

Creation-time animation falls back to modification time when the filesystem supplies no birth time. Copying files may change their apparent chronology. Tags and missing targets appear with referring files. The vault's existing 8 MiB Markdown limit remains. Force calculations use a Barnes–Hut style spatial tree, but indexing and canvas rendering remain on their current processes; very large production vaults require native profiling before performance claims. Reduced label density is deliberate at low zoom. This package contains source, not a signed installer.
