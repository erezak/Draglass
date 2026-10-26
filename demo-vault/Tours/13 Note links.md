---
demonstrates: [links-embeds]
tags: [demo, links]
---
# Note links and reusable content

Back to [[Welcome]]. These examples work with ordinary Markdown notes.

## Try these links

- [[Reference/Navigation example|Open the example note]] demonstrates target first, display alias second.
- [[Reference/Navigation example#Project overview|Open one heading]].
- [[Reference/Navigation example#Project overview#Checklist|Open a nested heading]].
- [[#Reusable paragraph|Jump within this note]].
- [[Reference/Navigation example#^first-step|Jump to a paragraph]].
- [[Reference/Navigation example#^readiness-list|Jump to a whole list]].

Plain click opens a rendered link; Alt-click reveals its source. Cmd/Ctrl-click opens a new tab. Source mode and arrow keys also allow editing.

## YAML aliases and autocomplete

Open the example note and expand Properties: `aliases` is a list with Navigation demo and ND. Add another alias on its own line, then return here and type `[[` followed by the alias. Select the suggestion: it inserts the real file target and the chosen display alias, preserving graph and backlink identity.

Type `[[Navigation example#` to suggest headings; `[[Navigation example#^` suggests block IDs with a short excerpt. Type `[[#` for headings in the current note. Folder names in suggestions distinguish notes with duplicate filenames.

## Embed a note

![[Reference/Navigation example]]

## Embed a section, paragraph, list, quote or table

![[Reference/Navigation example#Project overview]]

![[Reference/Navigation example#^first-step]]

![[Reference/Navigation example#^readiness-list]]

![[Reference/Navigation example#^evidence-quote]]

![[Reference/Navigation example#^signals]]

Embedded content reflects its source. The YAML metadata and block identifiers stay out of rendered content.

## Image dimensions and PDF pages

![[Attachments/Station.svg|240]]

![[Attachments/Station.svg|160x100]]

![[Attachments/Field card.pdf#page=1&height=400]]

A width alone preserves image proportions. A width and height specifies the display box. PDF page numbering begins at 1 and is passed to the desktop PDF viewer.

## Reusable paragraph

This reusable paragraph has a stable block ID. ^tour-paragraph

![[#^tour-paragraph]]

For exact ranges, give each block a unique ID such as `^first-step`. Put a list/quote/table ID on its own line after a blank line. Code blocks are literal: identifiers typed inside them are not indexed as real blocks.
