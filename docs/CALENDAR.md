# Calendar

Enable **Calendar** in Settings → Core plugins. Open it with **Open Calendar** in the command palette or the calendar icon in the right sidebar. Both entry points immediately reveal the compact right-sidebar calendar, preserving the editor and its tabs. The grid follows the pane width, including during resizing, and works with Tasks disabled. Calendar options and day details are collapsed below the grid. Use Previous/Next month or Today in the month header. Clicking a day with one dated note opens it; multiple notes appear in day details. A day without notes or matching tasks offers the existing New note dialog with an ISO-date filename prefilled; no file is created until confirmed.

Settings → Calendar:

- **Show writing statistics**: on by default.
- **First day of week**: Monday by default; any weekday can be chosen. This affects grid alignment, independently of task query calendar-week semantics.

A note belongs to a day through its YAML `date: YYYY-MM-DD`; if absent, an exact `YYYY-MM-DD.md` filename supplies the date. Explicit date wins. Unassigned notes do not produce invented historical totals. Drawings are excluded. Counts use current body words excluding YAML, fenced code and comments, including unsaved drafts. Existing external edits and renames are reflected. Dots represent up to 250 words each, capped at five; hover for the full count. These are current daily-note contents, not an edit-history/activity ledger. Turning statistics off hides the word indicators while retaining note navigation.

Settings → Tasks → **Show tasks on Calendar** is on by default and available when Calendar is enabled. Turn it off for a notes-only calendar. When enabled, the Tasks provider adds saved query/filter controls, date-basis selection, task chips and day details. Completion, recurrence, editing and Undo use the existing Tasks service. Calendar remains available when Tasks is disabled. Days with matching tasks due show a red dot, separate from the grey writing dots. The due indicator is independent of the selected task date basis, so scheduled/start views still show deadlines. Select a day for full task actions; additional due tasks appear under Also due. Calendar options contain the optional Task filters.

Calendar’s month and provider query state persist in the right sidebar. Former middle Calendar leaves are restored into that sidebar without replacing note leaves. Calendar disablement preserves state and notes; re-enabling restores the capability.
