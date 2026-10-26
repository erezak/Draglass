# Note links

## Targets and display aliases

`[[target|display text]]` opens the target while showing the display text. It works in Live Preview, tables and reading view. In a Markdown table, escape the alias separator: `[[Note\|Label]]`. Autocomplete does this automatically.

Unaliased links render the filename without folder prefixes. The stored target and tooltip retain their destination. New links use the shortest unique target. Duplicate filenames keep a folder qualifier and clean display alias. Ambiguous hand-written shorthand offers a folder chooser; qualified missing paths do not fall back to unrelated basenames.

Plain click opens a rendered link. Alt-click reveals its source; arrow keys and Source mode also allow editing. Cmd/Ctrl-click opens another tab; adding Alt opens a group to the right.

## YAML aliases

Use a list in frontmatter, or edit the aliases list in Properties:

```yaml
aliases:
  - AI
  - Machine intelligence
```

Aliases are searchable names in wikilink autocomplete. Selecting AI inserts a canonical reference such as `[[Artificial intelligence|AI]]`; it does not create a link to a separate AI note. A manually typed alias alone is not a replacement for a real filename. Duplicate aliases show their note paths separately. Malformed YAML, scalar aliases and non-string alias entries are not used as alternative names.

The worker handles vault-wide suggestions without sending note bodies to the editor. Unsaved drafts and external changes are reflected. Suggestions are limited to 100 matches; type more to narrow them. No AI provider is needed.

## Heading and block references

| Syntax | Meaning |
| --- | --- |
| `[[Note#Heading]]` | Open a heading in another note |
| `[[#Heading]]` | Open a heading in this note |
| `[[Note#Parent#Child]]` | Identify a nested heading |
| `[[Note#Heading\|Label]]` | A heading link with a display alias |
| `[[Note#^block-id]]` | Open an identified block |
| `![[Note]]` | Embed the note body without its YAML frontmatter |
| `![[Note#Heading]]` | Embed the heading and its section |
| `![[Note#^block-id]]` | Embed the identified paragraph or structured block |

Type `[[Note#` for heading suggestions, `[[Note#^` for block suggestions, or `[[#` for this note. Alias names can be used to find a note before the hash; insertion still uses the actual target. Heading paths distinguish repeated headings under different parents. An otherwise identical repeated heading resolves to its first occurrence; use a unique block ID for a precise destination.

Append an ID to a paragraph or list item:

```md
A paragraph that may span several lines. ^summary

- Parent task ^parent-task
  - A child item remains part of the referenced parent.
```

For a whole list, quote or table, put the ID on a separate line after a blank line:

```md
- First item
- Second item

^checklist
```

Block IDs use Latin letters, digits and hyphens and must be unique within their note. Duplicate IDs fail explicitly and are excluded from autocomplete. IDs in YAML, code or HTML blocks are not indexed. Live Preview reveals an ID when its line is being edited; rendered notes hide it. Heading navigation accepts heading text, URL-encoded text and ordinary heading slugs. Offsets preserve CRLF and YAML preambles.

Links navigate in editing and reading views. Reading views use owned anchors so headings inside embedded notes do not redirect the containing note's heading links. Broken fragments report an error rather than silently selecting unrelated text. Embeds use the same index and update with source changes; recursion remains bounded.

## Images and PDF pages

`![[image.png|400]]` specifies width while preserving proportions. `![[image.png|400x240]]` specifies a display box; images retain their proportions within it. Dimensions are capped at 4096 pixels.

`![[document.pdf#page=3]]` requests page 3. `![[document.pdf#page=3&height=400]]` also sets the inline viewer height. Page numbers must be positive integers. PDF rendering and page handling depend on the desktop's built-in PDF viewer; renderer tests verify the URL and sizing, not native PDF behavior on every operating system.

## Detached files

The same reference parser, fragment index and navigation work in detached Markdown files. Their autocomplete context includes the current file and explicitly referenced local Markdown files, rather than treating the surrounding folder as a vault. Detached links remain relative to their file and do not search another open vault.

## Component boundaries

`core/note-links/` owns pure reference syntax, YAML alias interpretation, heading/block indexing, section extraction and suggestion descriptors. The existing shared path resolver supplies canonical file resolution. The knowledge worker caches per-note indexes and returns bounded suggestions. `core/navigation.cjs` formats completion descriptors; `ui/note-link-completion.js` supplies the active CodeMirror language tree for code/table handling. `ui/note-link-navigation.js` handles editor offsets and reading-view movement; renderers own DOM anchors and embeds. No provider transport, credentials, filesystem writes or AI action logic lives in the note-link component.
