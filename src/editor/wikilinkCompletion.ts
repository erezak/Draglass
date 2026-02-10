import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete'
import type { NoteEntry } from '../types'

/**
 * Creates a CodeMirror autocomplete extension for wikilinks.
 * Triggers when user types [[ followed by at least one character.
 */
export function createWikilinkCompletionExtension(files: NoteEntry[]) {
  const completions = (context: CompletionContext): CompletionResult | null => {
    const { pos, state } = context
    const doc = state.doc
    const line = doc.lineAt(pos)
    const lineText = line.text
    const lineOffset = pos - line.from

    // Find [[ before cursor on current line
    let wikilinkStart = -1
    for (let i = lineOffset - 1; i >= 0; i--) {
      if (lineText[i] === '[' && i > 0 && lineText[i - 1] === '[') {
        wikilinkStart = i - 1
        break
      }
    }

    // No [[ found before cursor
    if (wikilinkStart === -1) {
      return null
    }

    // Get the text between [[ and cursor
    const prefix = lineText.slice(wikilinkStart + 2, lineOffset)

    // Only show completions if there's at least one character after [[
    if (prefix.length === 0) {
      return null
    }

    // Check if we're inside a wikilink that hasn't been closed yet
    // Look for ]] after the cursor
    const afterCursor = lineText.slice(lineOffset)
    
    // If there are closing brackets immediately after cursor, don't autocomplete
    if (afterCursor.startsWith(']]')) {
      return null
    }

    // Filter notes based on the prefix (case-insensitive)
    const lowerPrefix = prefix.toLowerCase()
    const matchingNotes = files
      .filter((note) => {
        const displayName = note.display_name.toLowerCase()
        const relPath = note.rel_path.toLowerCase()
        return displayName.includes(lowerPrefix) || relPath.includes(lowerPrefix)
      })
      .slice(0, 50) // Limit to 50 results for performance

    if (matchingNotes.length === 0) {
      return null
    }

    // Calculate the position to replace (from [[ to cursor)
    const from = line.from + wikilinkStart + 2
    const to = pos

    return {
      from,
      to,
      options: matchingNotes.map((note) => ({
        label: note.display_name,
        detail: note.rel_path,
        apply: (view, _completion, from, to) => {
          // Insert the note name and closing brackets
          const text = note.display_name + ']]'
          view.dispatch({
            changes: { from, to, insert: text },
            selection: { anchor: from + text.length },
          })
        },
      })),
      filter: false, // We already filtered the results
    }
  }

  return autocompletion({
    override: [completions],
    activateOnTyping: true,
    maxRenderedOptions: 10,
  })
}
