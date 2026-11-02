---
demonstrates: [writing, search-settings]
---
# Find within this document

Use **Cmd/Ctrl+F**, or **Find in document** in the command palette or Edit menu.
The search bar stays in this pane. It searches this document, independently of
vault search (**Cmd/Ctrl+Shift+F**).

## A real sample to search

Beacon checks one sample before accepting another sample. SAMPLE is written in
capitals here. A sampler is a different word. The readings below are fictional:

- Reading 12 is ready.
- Reading 34 needs review.
- Reading 56 is ready.

1. Find `sample`. Inspect the match count and highlighted results. **Enter** moves
   forward, **Shift+Enter** moves backward, and both wrap around at the ends.
2. Enable **Match case**, then **Whole word**. Compare `sample`, `SAMPLE` and
   `sampler`. Change options without changing the document.
3. Enable **Regex** and find `Reading (\d+)`. Disable Whole word if needed. Open
   **Replace**, enter `Observation $1`, and use **Replace all**. Use **Undo** once
   to restore the original lines. Replacements autosave normally. Literal mode
   treats replacement text such as `$1` literally.
4. Enter an invalid Regex such as `[` and inspect the message. Correct it to
   continue searching. A broad query shows at most 10,000 matches; Replace all
   requires a narrower query when more matches exist.
5. Switch to **Reading view** and find `another sample`. Find works on rendered
   text rather than Markdown markers or YAML. Replacement controls are hidden.
   Closed callouts and drawing controls are not searched as prose. Links such as
   [[Systems/Beacon service|Beacon service]] stay clickable after highlighting.
6. Open this note in a split pane. Find `sample` on one side and `Reading` on the
   other. Each pane keeps its own query and options, even with a shared note.
7. Press **Esc** to close search and return focus to the document. On macOS,
   **Cmd+Alt+F** opens Replace; on Windows/Linux use **Ctrl+H**. Reading view
   always stays find-only.
8. Open a practice Markdown file outside the vault in detached mode. Find and
   replace use the same controls; normal autosave and Undo still apply.

No external assistant or provider is needed. Return to [[Welcome]].
