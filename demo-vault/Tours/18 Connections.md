---
demonstrates: [connections]
---
# Connections in both directions

Open **Open outgoing connections** from the command palette. It uses the same right-sidebar icon and pane as **Backlinks**. Switch between **Backlinks** and **Outgoing** within that pane; your document remains in place.

## Follow outgoing links

Follow [[Systems/Beacon service|Beacon service]], then inspect its named ontology relationships and expand **Sources** to see the recorded provenance. Open a source note from there. Return here and try these ordinary Markdown links and embeds:

- [Navigation example heading](../Reference/Navigation%20example.md#Project%20overview)
- [[Reference/Navigation example#^first-step|A specific checklist step]]
- ![[Attachments/Station.svg|160]]
- [Project website](https://example.com)

## Missing and ambiguous references

The existing demo intentionally leaves [[Systems/Weather relay]] missing. Its outgoing entry shows a hollow marker and **Create note**; clicking offers the normal creation flow. Cancel if you want to keep the demo's missing-target example.

Add `[[Choose briefing format]]` to this note. The demo has a Task and a Decision with that filename in different folders. Its outgoing entry asks you to choose a note instead of silently picking one. Choosing does not rewrite the reference. Remove your test link afterward.

## Drafts and both directions

Add a wikilink here and watch the outgoing list update before autosave. Remove it again. Use **Backlinks** to see notes pointing here; these are separate from the references this note points to. Sources stay expanded across refreshes that do not change the outgoing list.

Return to [[Welcome]].
