---
tags:
- demo/tour
demonstrates:
- workspaces
---

# Tabs belong to their pane

Keep [[Systems/Beacon service]] beside [[Sources/Design review]] while you write. Each pane has its own tabs and toolbar. Views of the same file share one buffer and autosave.

## Open a reference where you want it

1. Open Beacon service. In the explorer, right-click Design review and select **Open to the right**. Beacon stays visible on the left.
2. Focus the right pane. Right-click [[Sources/Design review]] in the explorer and choose **Open in new tab**. Switch between the two tabs in that group; the left pane is unaffected.
3. Right-click another note and choose **Open below**. This creates a row beneath the focused group, leaving the other column intact.
4. Use **Focus next tab group** from the palette. Note tools, properties, backlinks and AI context follow the focused pane. Each view keeps its own reading mode and scrolling.
5. Drag a divider, or focus it and use arrow keys. Home resets that split to half. **Close tab group** closes the focused group and collapses the layout, keeping its notes available in another group.

## Navigate, pin and move

Ordinary explorer and reading/table link clicks navigate within the current tab. Use Back and Forward above the note to retrace that tab's history. Cmd/Ctrl-click opens another tab; add Alt to open to the right. Inline links in Live Preview also open with a plain click. Alt-click reveals their source for editing; Cmd/Ctrl-click opens a new tab.

Run **Pin / unpin current tab** to keep a reference: navigating to another note opens a separate tab. Drag tabs between groups, drop onto another tab to reorder, or drop at a pane's right/bottom edge to make a split. You can also use **Move current tab to next group**. Closing one view does not close another view of the same file or delete its note.

## Graph beside notes

Focus one pane and run **Open local graph**. Other groups stay visible. Return to the note with the graph close button. Each graph tab has its own viewport and settings.

## Save the arrangement

1. Run **Save workspace…**, enter `Beacon research`, and save.
2. Change the notes, close a group or collapse a sidebar.
3. Run **Open saved workspaces…** and restore Beacon research. The tree, each group's tabs and selection, pins, reading modes, scroll positions, navigation history, sidebars and graph settings return.
4. Update replaces a saved arrangement. Delete removes its layout without deleting notes. Layout names belong to the current vault.

Restoring saves drafts first and reads current files. If a draft cannot be saved, cancel the discard question to keep it. This release supports up to 16 groups, 64 distinct open files and 32 saved layouts per vault. Detached file windows remain separate.

Open [[Tours/01 Writing]] for editing examples, or return to [[Welcome]].

## Views beside your notes

1. Open [[Systems/Beacon service]] in the left pane. Run **Open linked outline tab**, then **Split editor right**. Select the Beacon note tab in the left pane. The outline on the right keeps following the left pane.
2. Open [[Sources/Design review]] in the left pane. The linked outline changes to that note. Add a temporary heading and see it appear before autosave; select the heading in the outline to jump there.
3. In the outline's source selector, choose **Fixed note: Systems/Beacon service.md**. Navigating elsewhere no longer changes it. Choose **Follow pane** again to resume following. Closing that source pane leaves the view fixed to its last file.
4. With a note selected, run **Open linked backlinks tab**. Inspect its ordinary links, named relationships and source records. Split or move that tab beside the note.
5. Run **Open local graph**, split it, and select different filters in the two graph views. Their filters, physics, zoom, pause and control-panel state are independent. A local graph's source selector can follow a pane or stay fixed; a global graph covers the vault.
6. Run **Open search tab**, search for `tag:#demo`, and split the search view. Change only one query to `file:Beacon`. Each view retains its own query and sorting. Results include unsaved edits; selecting a result opens its note at the matching line.
7. Save this arrangement as `Beacon views`. Close a tool tab, then restore the saved workspace. The view types, selected tabs, queries, source bindings and graph settings return using current note files.

Tools can remain open without any note tab. Missing source notes display an explanation; tool tabs are kept so you can choose another source. Hidden graphs pause their animation, and closing a tool releases its runtime.
