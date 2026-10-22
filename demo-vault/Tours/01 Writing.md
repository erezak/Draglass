---
tags:
- demo/tour
demonstrates:
- writing
---

# Write, edit and keep your place

Edit this note directly. Live Preview formats Markdown while keeping it editable; move the caret into **bold**, *italic*, ~~struck text~~ or `inline code` to see its syntax. Use the note menu for **Source** and **Reading view**. Nothing here is a screenshot of an editor.

## A small checklist

- [ ] Try editing a table cell
- [ ] Open this note in Source mode
- [x] Start exploring the demo

## Editable table

| Reading | Status | Owner |
| --- | --- | --- |
| Harbor temperature | Accepted | Noam |
| Wind direction | Pending | Imani |

Click a rendered cell and edit it. Undo restores your change. A wider table or diagram scrolls inside its own area when you hover over it. Use the horizontal wheel over the element to try that behavior.

| Instrument | Recorded value | Units | Source identifier | Validation explanation | Follow-up | Owner | Location |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Harbor reference instrument | 18.5 | degrees Celsius | calibration-run-042 | Units and the original source are present | Compare after maintenance | Imani Okafor | North pier observation platform |

> This is an ordinary Markdown quotation. The demo only claims features that are currently available.

```js
const observation = { value: 18.5, source: 'calibration-run-042' };
```

## Autosave and external edits

Changes save automatically after a short pause. Open this file in another editor and change it there to see Draglass refresh it. The last completed load or save wins. Do not run that experiment on valuable text without keeping a copy. Recovery snapshots are stored in the vault's hidden application folder.

Open [[Tours/02 Linking and embeds]] next.

## Links inside tables

Click a link label to open its note. Click the blank space beside the label, inside the same cell, to edit the cell. Tab to a link and press Enter to follow it; Enter on the cell itself starts editing.

| Try | Open |
| --- | --- |
| Link label with room to edit | [[Tours/02 Linking and embeds\|Linking tour]] |
| Markdown note link | [Writing tour](01%20Writing.md) |
| Literal code stays text | `[[Not a link]]` |
