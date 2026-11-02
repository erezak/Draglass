# Callouts

Callouts use ordinary Markdown blockquotes. They render in Live Preview, Reading view, note embeds, detached Markdown and PDF exports. Source mode always retains the exact text.

```md
> [!tip] A **helpful** title with [[A note|a link]]
> A paragraph, a list, a table, code, an image or another embed.
```

The title defaults to the identifier in title case. A callout can contain only its title. Identifiers are case-insensitive; an unknown identifier uses the note appearance until it has a custom definition.

## Types

| Type | Aliases |
| --- | --- |
| note | |
| abstract | summary, tldr |
| info | |
| todo | |
| tip | hint, important |
| success | check, done |
| question | help, faq |
| warning | caution, attention |
| failure | fail, missing |
| danger | error |
| bug | |
| example | |
| quote | cite |

## Folding and nesting

Append `+` immediately after the marker to start expanded or `-` to start collapsed. Without either marker, it is not foldable. The title supports mouse and keyboard folding. Presentation toggles do not edit the file; rerendering retains the current view's fold choices. PDF export expands every body without changing the note.

```md
> [!question]- Show the details
> This begins collapsed.
>
> > [!example]+ A nested callout
> > This begins expanded.
```

Nested callouts can contain Markdown, wiki and Markdown links, lists, tables, code, task queries, diagrams, images and embedded notes. Links keep their normal navigation behavior. Inactive Live Preview callouts can be edited with **Edit**, body-text double-click, the keyboard or Callout Navigator. Editing reveals the quoted Markdown; leaving the block restores its rendered card. Context-click the title, or focus it and press Shift+F10, to change its type. Titles, folding markers, optional metadata and bodies are preserved. Edits use normal autosave and editor Undo.

Task checkboxes in editable callouts use the existing semantic task operation and optional completion-details flow when Tasks is enabled. Otherwise they edit their ordinary checkbox marker. Reading-only surfaces display disabled checkboxes. Quoted Mermaid editing retains all container prefixes and diagram lines.

## Authoring

**Insert callout** in the command palette or File menu inserts a note callout and selects the type. With selected content, it wraps that content, including lists and fences. The command is also available in detached Markdown. Type `[!` after quote markers for type/alias/custom-type completion. The default palette shortcut remains Cmd/Ctrl+Shift+P.

## Appearance

**Settings → Callouts** defines custom types and overrides built-in types. Choose an ID, optional default title, light/default and optional dark color, a Lucide icon name or custom SVG, title visibility, border width/opacity and corner radius. Use **New type**, edit its fields, then **Apply settings**. Names such as `lucide-lightbulb` use the bundled offline Lucide 1.65.0 set; unsupported icon names fall back to the note icon. SVGs are restricted to vector shapes: scripts, event handlers, embedded images and external references are removed.

Definitions, Navigator enablement and its search are stored only in `.draglass/callouts.json` for this vault. No existing note content is rewritten. Themes can provide a `callouts` map in their JSON, using the same definition fields. Child theme fields merge with the parent's fields; vault fields override theme fields. For example:

```json
{
  "callouts": {
    "research": {
      "color": "#245f84",
      "darkColor": "#80bedf",
      "icon": "lucide-flask-conical",
      "title": "Research finding",
      "borderWidth": 2,
      "borderOpacity": 0.4,
      "radius": 8,
      "showTitle": true
    }
  }
}
```

Rendering exposes `.callout[data-callout="research"]`, `.callout-title`, `.callout-title-inner`, `.callout-icon` and `.callout-content`, plus `data-callout-metadata` for optional text after a pipe (`[!research|review]`). Metadata is styling data, never executable instructions.

**Advanced callout CSS** in the same Settings category accepts scoped callout style rules, optionally within media/supports rules. Use `.callout`, its title/content classes, and `.theme-light` / `.theme-dark` prefixes. Imports, external assets, app-chrome selectors and sibling selectors are rejected. This supports direct color/icon variables, hiding a title, and further presentation styling.

CSS hooks include `--callout-color`, `--callout-icon` (a Lucide name or quoted SVG), `--callout-border-width`, `--callout-border-opacity`, `--callout-radius`, `--callout-padding`, `--callout-title-color`, `--callout-title-padding`, `--callout-title-background`, `--callout-title-size`, `--callout-title-weight`, `--callout-content-padding`, `--callout-content-background`, `--callout-icon-size` and `--callout-blend-mode`. Use these with the existing app/theme styling architecture; this slice does not load arbitrary third-party scripts.

## Optional Callout Navigator

Enable **Callout Navigator** in **Settings → Core plugins**. Its icon and **Open Callout Navigator** command open the right sidebar immediately, leaving the note and its tabs in place. Search titles, identifiers and each callout's own content. Nested bodies are indexed separately rather than making every ancestor match the same text. Select a result to jump to its editable source. Draft edits and focused-note changes update the index. The Navigator is a vault workspace feature; detached files retain callout rendering and authoring.

Disabling the plugin removes its command and sidebar icon, safely falls back to Chat if necessary, and preserves its search, custom definitions and Markdown. Rendering and authoring do not depend on the Navigator plugin. The bundled demo includes a guided tour of both.
