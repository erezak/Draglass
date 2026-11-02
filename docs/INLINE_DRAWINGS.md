# Drawings inside Markdown

Use **Insert inline drawing** from the command palette to insert a new empty scene into the current note. Draglass uses an `excalidraw` fence containing ordinary Excalidraw JSON. The engine remains at 0.18.1, independently of the application version.

These are community Markdown conventions carrying the documented Excalidraw scene format, not a new binary file format. Plain JSON fences are the default for authoring; compatible containers and Drawing sections retain their original syntax when edited.

## Fence syntax

````markdown
```excalidraw
{"type":"excalidraw","version":2,"elements":[],"appState":{},"files":{}}
```
````

## Colon containers

````markdown
::: excalidraw
{"type":"excalidraw","version":2,"elements":[],"appState":{},"files":{}}
:::
````

Colon containers require a supporting Markdown renderer. They are not part of baseline Markdown syntax.

## Drawing-section compatibility

A `Drawing` heading directly before a `json` or `compressed-json` fence opts that section into drawing rendering. The compressed form uses LZ-String Base64, allowing whitespace-wrapped payloads. The dedicated `.excalidraw.md` drawing-file workflow remains available.

````markdown
## Drawing

```json
{"type":"excalidraw","version":2,"elements":[],"appState":{},"files":{}}
```
````

For compressed data, use the same section with `compressed-json` and a valid compressed scene payload. Never replace a compressed payload with plain JSON while keeping the compressed label. Ordinary `json` fences without a Drawing heading remain code. Closed backtick and tilde fences are supported; unfinished blocks remain editable source.

## Editing and viewing

Live Preview replaces inactive blocks with a drawing preview. Enter the block to edit source, or use **Edit source**. **Edit inline** opens the canvas in place; changes use the note's normal autosave and **Done** restores its preview. Wrappers, compression mode, surrounding prose and newline style are preserved. No separate drawing file is created. Pan/zoom alone does not save drawing content.

Reading view, note embeds, callouts and detached Markdown use the same rendering component. Read-only previews expose no canvas or source editing. PDF export renders static vectors. Invalid scenes show an error while retaining their source, with no automatic repair or deletion. External image URLs and unsupported scene data use the existing drawing validation rules. Sources and decoded payloads have size limits; compressed decoding also has a memory budget. Stale or ambiguous source matches refuse edits rather than replacing another scene.

Open **Demo Vault → Tours → Inline drawings** for working examples of all four forms.
