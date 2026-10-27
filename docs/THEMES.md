# Appearance themes

Folio is the default identity and Light is the first-launch mode. Basalt, Tide and Prism are also included. Select a theme under **Settings → Appearance**, alongside Light, Dark or Follow system. Color mode comes first and filters the theme list to compatible choices. Theme selection and color mode are remembered with each vault; existing color-mode preferences survive the update. Detached files use the last workspace's theme on opening, with a local Light/Dark switch.

A theme supports Light, Dark, or both. Mode compatibility changes palettes only. Font families, document width, line height, corner radius and component structure remain consistent between modes. Changing color mode filters out incompatible themes and selects Folio when the previous choice cannot support that mode. Restoring an unsupported combination or changing system mode uses Folio in the requested effective mode. The palette mode command respects compatibility.

## Customize and share

1. Choose a built-in and click **Duplicate**. Built-ins are read-only.
2. Expand **Theme definition**. Edit the readable JSON overrides, then **Save theme**.
3. Choose **Apply** to select the theme for the current vault. Closing Settings without Apply leaves selection unchanged. Saving a definition is a separate persistent operation.
4. Use **Export** for a standalone JSON definition with inheritance resolved. Import accepts a theme JSON file. An imported ID collision receives a fresh ID rather than overwriting an installed theme.

The application stores custom JSON definitions in `draglass/themes` under Electron's application user-data directory. They are independent of note files and travel between machines through import/export. Theme files must be ordinary files; symlinks and invalid definitions are reported and ignored. Built-in themes remain available when a custom file is invalid. Reload/reopen Settings to discover files edited outside the app. Existing detached windows refresh their theme when reopened.

See `examples/themes/folio-night.json` and `examples/themes/tide-day.json` for dark-only and light-only examples. Import these to exercise compatibility.

```json
{
  "schema": 1,
  "id": "my-folio",
  "name": "My Folio",
  "extends": "folio",
  "modes": ["light", "dark"],
  "tokens": {"radius": 6, "documentFont": "Georgia, serif"},
  "light": {"accent": "#704050", "accentText": "#ffffff"},
  "dark": {"accent": "#e0abb6", "accentText": "#28191f"}
}
```

A child inherits its parent's supported modes if `modes` is omitted and may narrow them explicitly. It cannot enable a mode its parent does not support. Inheritance cycles, missing parents and chains over sixteen definitions are rejected. A standalone theme declares its modes; omitted palette values and metrics use Folio's safe defaults. Prefer inheritance to express an intentional starting point. Export produces a standalone theme with all values resolved.

## Schema 1

Required: `schema: 1`, portable lowercase `id` (letters, digits and hyphens, starting with a letter, maximum 64 characters), and `name` (up to 80 characters). Optional `description` is at most 500 characters; `extends` names a theme ID. `modes` is a nonempty unique list of `light`, `dark`. Unknown fields are rejected to catch typos.

Shared `tokens`:

- `uiFont`, `documentFont`, `headingFont`: installed font-family lists. Source and code retain a monospace stack. Font URLs, scripts and arbitrary CSS are not supported. Fonts themselves are not bundled by import/export; install named fonts separately or include fallback families.
- `documentFontSize`: 12–28 px, default 18.
- `uiFontSize`: 10–20 px, default 13; UI hierarchy scales proportionally.
- `codeFontSize`: 10–28 px, default 14.
- `radius`: 0–16 pixels.
- `lineHeight`: 1.3–2.2 for documents.
- `documentWidth`: 600–1200 pixels; turning off readable line length still expands the document.

Each palette accepts six-digit hex colors for `bg`, `panel`, `text`, `muted`, `border`, `accent`, `accentText`, `hover`, `code`, `danger`, and `success`. Graph canvas colors are derived from the same palette. Keep text/background and accent/accentText pairs readable; built-ins are checked for contrast. A custom theme can deliberately change contrast, so authors must check their own palettes.

The resolver supplies semantic CSS variables to the editor, properties, sidebars, tasks, chat, dialogs, completion popup and graph. Mermaid and Excalidraw use the effective light/dark mode through their existing appearance adapters; their internal rendering palettes remain engine-owned.

## Architecture

`core/themes/index.cjs` and `builtins.json` contain pure validation, inheritance, compatibility and token resolution. `core/themes/store.cjs` owns bounded atomic persistence and export. `electron/themes.cjs` owns trusted IPC and native file pickers. `ui/themes/appearance.js` adapts resolved tokens to the DOM; `ui/themes/settings.js` owns theme editing controls. Components consume semantic variables instead of maintaining separate theme definitions. No note/index/AI service needs a theme dependency.

## Font-size overrides

Document, Interface and Code size controls live alongside the theme in Appearance. Empty controls follow the active theme, with its resolved default shown as the placeholder. Entering a number creates a per-vault override; **Reset to theme default** clears that override when Apply is pressed. Cancelling Settings preserves the existing values. Overrides survive theme and color-mode changes; resetting follows future parent/theme changes too.

Existing saved numeric document sizes, including 16px, remain explicit overrides because old files do not record whether a value was chosen by the user. Reset Document size once to adopt the new theme default. New workspaces follow the default 18px document, 13px UI, and 14px code sizes. Detached windows use the same effective font sizes on opening.

Font-size defaults are shared theme tokens, inherited and exported just like font families. They cannot differ between light and dark palettes. For example, add `"tokens": {"documentFontSize": 20, "uiFontSize": 14, "codeFontSize": 15}` to a custom theme. The pure theme resolver combines those defaults with nullable user overrides before the DOM adapter applies CSS variables. Engine-owned drawing labels retain their own sizing.
