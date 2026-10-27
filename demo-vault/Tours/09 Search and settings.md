---
tags:
- demo/tour
demonstrates:
- search-settings
---

# Find information and shape the workspace

The left sidebar has Files, Tags and Search. Open Tags and browse nested `lumen` tags. The count represents notes; parent tags include descendants.

Try searches such as `path:Systems`, `tag:#lumen/identity`, `[type:Identity]`, `"source identifier"`, `task-todo:reference` or `path:People OR path:Teams`. Regex and grouped queries are supported. Save a useful search for reuse. Unsaved editor drafts participate in search before autosave. Results show snippets and approximate line labels; precise match jumping is future work.

## Settings

Settings has categories for editing, files, appearance, shortcuts, AI and core plugins. Try Light, Dark or System, readable line length, font size, line numbers, spellcheck or text direction. Change property visibility or explorer sorting. For a quick appearance change, run **Toggle light / dark theme** from the command palette. Graphs and other workspace views change with the app; the toggle keeps graph filters, zoom and pause state. Choosing the toggle while following the system makes the opposite visible theme your explicit preference.

Collapse either sidebar, resize it with its divider, or switch between chat and backlinks on the right. The layout and note tabs are remembered for the active workspace.

## Core plugin: entity templates

Open Settings → Core plugins → Entity templates. Disable it and its commands disappear; existing notes remain. Re-enable it, customize a type/subtype template, then use New entity note. You can preview a new note and optionally ask the configured AI to draft it for review. Generic executable templates are not part of this feature.

Open [[Tours/10 Your next steps]] next.

The About panel identifies the installed Draglass version and uses the Draglass icon.

## Four appearance identities

Open **Settings → Appearance** and compare Folio, Basalt, Tide and Prism. Folio is the default with a warm editorial document; its UI controls keep a sans-serif font. Switch between Light and Dark and check this note’s headings, properties, links, tables, completion popup, graph and right sidebar. The theme’s fonts and spacing stay consistent when switching modes.

Choose Folio and **Duplicate**, expand **Theme definition**, change its name and accent values, then **Save theme** and **Apply**. Custom definitions inherit omitted values from their parent. Try setting `"modes": ["dark"]`: switch Color mode to Light: the dark-only theme should disappear from the theme list, with Folio selected if needed. Switch back to Dark to select it again. Keep a readable accent/accentText pair.

Use **Export** and **Import** to move a JSON theme between machines. Importing an existing ID creates a separate theme. The source distribution includes `examples/themes/folio-night.json` and `examples/themes/tide-day.json` for dark-only and light-only practice. Theme changes should not edit any note or reset graph layout. Detached files opened afterward should use the last workspace's theme and respect compatibility.

## Theme font sizes

In Appearance, clear Document, Interface and Code overrides with **Reset to theme default**, then Apply. With a built-in theme these resolve to 18, 13 and 14 px. Set Document to 22 px and switch between Light and Dark: its size should remain 22 px. Reset it and Apply again to follow the theme. Duplicate Folio, add `"documentFontSize": 20` inside its `tokens`, save and Apply; an empty Document override should now resolve to 20 px. Source/code text uses the separate code-size token. Existing numeric sizes stay overrides until reset.
