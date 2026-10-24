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

Ordinary explorer and reading/table link clicks navigate within the current tab. Use Back and Forward above the note to retrace that tab's history. Cmd/Ctrl-click opens another tab; add Alt to open to the right. Inline links in Live Preview still use a normal click to reveal editable source and Cmd/Ctrl-click to follow.

Run **Pin / unpin current tab** to keep a reference: navigating to another note opens a separate tab. Drag tabs between groups, drop onto another tab to reorder, or drop at a pane's right/bottom edge to make a split. You can also use **Move current tab to next group**. Closing one view does not close another view of the same file or delete its note.

## Graph beside notes

Focus one pane and run **Open local graph**. Other groups stay visible. Return to the note with the graph close button. The graph currently uses one shared viewport.

## Save the arrangement

1. Run **Save workspace…**, enter `Beacon research`, and save.
2. Change the notes, close a group or collapse a sidebar.
3. Run **Open saved workspaces…** and restore Beacon research. The tree, each group's tabs and selection, pins, reading modes, scroll positions, navigation history, sidebars and graph settings return.
4. Update replaces a saved arrangement. Delete removes its layout without deleting notes. Layout names belong to the current vault.

Restoring saves drafts first and reads current files. If a draft cannot be saved, cancel the discard question to keep it. This release supports up to 16 groups, 64 distinct open files and 32 saved layouts per vault. Detached file windows remain separate.

Open [[Tours/01 Writing]] for editing examples, or return to [[Welcome]].
