---
demonstrates: [large-files]
---
# Large files without whole-file loading

This is a guided exercise. No enormous file is bundled in the demo vault.

Create a fictional field log outside the vault using a terminal in a practice folder:

```python
from pathlib import Path
with Path("Large field log.md").open("w", encoding="utf-8") as output:
    output.write("# Lumen field observations\n\nA **fictional** field log.\n\n| Station | Status |\n| --- | --- |\n| Lumen | Ready |\n\n")
    for number in range(150000):
        output.write(f"Observation {number}: the station recorded a fictional sample, with no private data.\n")
```

1. Open the resulting Markdown file with Draglass. Check its filename and compact Detached badge; hover the filename for its full path.
2. Check the rendered heading, bold text and table in Live Preview. Click into text to edit its Markdown, then move away to restore rendering. Scroll down and back up normally. Drag the scrollbar to reach distant text. Text should fill the available width and wrap; there are no section controls or loading notices.
3. Edit a sentence and wait for autosave. Verify that the caret stays in place and Undo still works.
4. Close and reopen it, then verify your edit and unedited text near the end. Recovery snapshots remain available through the app-data recovery folder.
5. Put a copy inside this demo vault. It appears in the explorer and opens through the same editor without the Detached badge.
6. Make an external change while the file is clean, then repeat with an unsaved draft. Clean text refreshes; dirty drafts are retained. Reload appears only when needed and asks before discarding edits.

Large Markdown files open in Live Preview. Complete Mermaid and inline drawing blocks use their normal preview components; code spanning loaded ranges stays code. Large standalone drawing files remain source-only. PDF export and whole-document search remain normal-buffer features. See [[Tours/01 Writing]] and [[Tours/06 Diagrams and drawings]].
