export type NoteEntry = {
  rel_path: string
  display_name: string
}

export type SearchHit = {
  rel_path: string
  line_number: number
  offset: number
  snippet: string
}
