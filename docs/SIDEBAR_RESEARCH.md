# Sidebar and ribbon research · 2026-10-06

## Adaptation in Draglass 0.5

Use a narrow persistent command ribbon, a separately collapsible file explorer, a central tabbed note workspace and an independently collapsible right panel for note chat/backlinks. Keep reopening controls available above the workspace. Replace prominent chrome buttons with SVG actions and place Source/Live Preview in a compact note menu. Save and Reload actions are removed; autosave and external loads use last-action-wins behavior.

Panel edges support pointer dragging, keyboard width adjustment and double-click reset. Remember preferred widths and visibility while fitting both panels around a usable editor at small window sizes. Save layout metadata with the existing workspace rather than introducing a separate settings system. Folder disclosure controls organize the existing vault index without altering filesystem contents. Search stays available through the ribbon and reopens the explorer automatically.

Icons have accessible names/tooltips, sidebar toggles expose expanded state, resize handles expose separator orientation/current bounds, and right-panel tabs support arrow/Home/End navigation. Hidden sidebars leave editor state and chat drafts intact.

Tab docking/reordering, stacked sidebar groups, sidebar pinning and ribbon customization remain outside this implementation.
