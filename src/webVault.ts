// Web-mode in-memory vault implementation
// This module provides a browser-compatible vault that stores notes in memory

import type { NoteEntry, SearchHit } from './types'
import type { GraphData, GraphOptions } from './features/graph/graphTypes'
import type { TagNoteItem, TagSummary, VaultImageResponse } from './tauri'
import { parseWikilinks } from './wikilinks'
import { extractTagsFromTextWithLockFilter, findFirstInlineTagLine, normalizeTag } from './tags'
import { fileStem } from './path'
import { isIgnoredPath, isMarkdownNotePath } from './ignore'

// Import all demo vault markdown files at build time (like Rust's include_str!).
// Vite bundles the raw file contents directly into the JS — no runtime fetch needed.
const demoVaultRaw = import.meta.glob(['./demo-vault/*.md', './demo-vault/*.excalidraw'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const WEB_VAULT_PATH = '/web-demo-vault'

interface StoredNote {
  content: string
  mtime_ms: number
}

class InMemoryVault {
  private notes: Map<string, StoredNote> = new Map()
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    this.loadDemoVault()

    this.initialized = true
  }

  private loadDemoVault(): void {
    const now = Date.now()

    for (const [path, content] of Object.entries(demoVaultRaw)) {
      // path looks like "../public/demo-vault/Live Preview.md"
      // Extract just the filename
      const fileName = path.split('/').pop()
      if (!fileName) continue
      this.notes.set(fileName, { content, mtime_ms: now })
    }
  }

  listFiles(): NoteEntry[] {
    const entries: NoteEntry[] = []
    for (const [relPath] of this.notes.entries()) {
      // Extract display name (filename without extension)
      const fileName = relPath.split('/').pop() || relPath
      // Handle compound extensions like .excalidraw.md
      const displayName = fileName
        .replace(/\.excalidraw\.md$/i, '')
        .replace(/\.(md|excalidraw)$/, '')
      entries.push({
        rel_path: relPath,
        display_name: displayName,
      })
    }
    // Sort by path for consistent ordering
    entries.sort((a, b) => a.rel_path.localeCompare(b.rel_path))
    return entries
  }

  readNote(relPath: string): string {
    const note = this.notes.get(relPath)
    if (!note) {
      throw new Error(`Note not found: ${relPath}`)
    }
    return note.content
  }

  writeNote(relPath: string, contents: string): void {
    const existing = this.notes.get(relPath)
    if (!existing) {
      throw new Error(`Note not found: ${relPath}`)
    }
    this.notes.set(relPath, { content: contents, mtime_ms: Date.now() })
  }

  createNote(relPath: string, contents: string): void {
    if (this.notes.has(relPath)) {
      throw new Error(`Note already exists: ${relPath}`)
    }
    this.notes.set(relPath, { content: contents, mtime_ms: Date.now() })
  }

  createDir(relPath: string): void {
    // In flat structure, we just validate the path
    if (!relPath || relPath.includes('..')) {
      throw new Error(`Invalid directory path: ${relPath}`)
    }
    // Directory creation is a no-op in flat structure
  }

  renameNote(fromRelPath: string, toRelPath: string): void {
    const note = this.notes.get(fromRelPath)
    if (!note) {
      throw new Error(`Note not found: ${fromRelPath}`)
    }
    if (this.notes.has(toRelPath)) {
      throw new Error(`Note already exists: ${toRelPath}`)
    }
    this.notes.delete(fromRelPath)
    this.notes.set(toRelPath, { ...note, mtime_ms: Date.now() })
  }

  deleteNote(relPath: string): void {
    if (!this.notes.has(relPath)) {
      throw new Error(`Note not found: ${relPath}`)
    }
    this.notes.delete(relPath)
  }

  findBacklinks(targetTitle: string, excludeLocked: boolean): string[] {
    const backlinks: string[] = []
    const targetLower = targetTitle.toLowerCase()

    for (const [relPath, note] of this.notes.entries()) {
      // Only process Markdown files for backlinks (skip Excalidraw files)
      const lower = relPath.toLowerCase()
      if (lower.endsWith('.excalidraw') || lower.endsWith('.excalidraw.md')) {
        continue
      }
      if (!lower.endsWith('.md') && !lower.endsWith('.markdown')) {
        continue
      }
      // Skip locked notes if requested
      if (excludeLocked && note.content.includes('<!--LOCK-->')) {
        continue
      }

      // Parse wikilinks in the note
      const links = parseWikilinks(note.content)
      for (const link of links) {
        // Use normalized target for comparison
        if (link.normalized.toLowerCase() === targetLower.toLowerCase()) {
          backlinks.push(relPath)
          break
        }
      }
    }

    return backlinks
  }

  searchVault(
    query: string,
    caseSensitive: boolean,
    excludeLocked: boolean,
    showHidden: boolean,
  ): SearchHit[] {
    const hits: SearchHit[] = []
    const searchStr = caseSensitive ? query : query.toLowerCase()

    for (const [relPath, note] of this.notes.entries()) {
      // Only search Markdown files (skip Excalidraw files)
      const lower = relPath.toLowerCase()
      if (lower.endsWith('.excalidraw') || lower.endsWith('.excalidraw.md')) {
        continue
      }
      if (!lower.endsWith('.md') && !lower.endsWith('.markdown')) {
        continue
      }
      // Skip locked notes if requested
      if (excludeLocked && note.content.includes('<!--LOCK-->')) {
        continue
      }

      // Skip hidden files (starting with .) if not showing hidden
      if (!showHidden && relPath.startsWith('.')) {
        continue
      }

      const lines = note.content.split('\n')

      // Search in content
      lines.forEach((line, lineNum) => {
        const searchLine = caseSensitive ? line : line.toLowerCase()
        const index = searchLine.indexOf(searchStr)
        if (index !== -1) {
          // Create a snippet around the match
          const snippetStart = Math.max(0, index - 20)
          const snippetEnd = Math.min(line.length, index + query.length + 20)
          const snippet = line.substring(snippetStart, snippetEnd).trim()
          
          hits.push({
            rel_path: relPath,
            line_number: lineNum + 1,
            offset: index,
            snippet: snippet,
          })
        }
      })
    }

    return hits
  }

  buildGraph(options: GraphOptions): GraphData {
    const nodes: GraphData['nodes'] = []
    const edges: GraphData['edges'] = []
    const nodeMap = new Map<string, string>() // Maps normalized title to node id

    // Create nodes for all notes
    for (const [relPath, note] of this.notes.entries()) {
      // Only include Markdown files in graph (skip Excalidraw files)
      const lower = relPath.toLowerCase()
      if (lower.endsWith('.excalidraw') || lower.endsWith('.excalidraw.md')) {
        continue
      }
      if (!lower.endsWith('.md') && !lower.endsWith('.markdown')) {
        continue
      }
      // Skip hidden/locked if requested
      if (options.excludeLocked && note.content.includes('<!--LOCK-->')) {
        continue
      }
      if (!options.showHidden && relPath.startsWith('.')) {
        continue
      }

      const fileName = relPath.split('/').pop() || relPath
      const title = fileName.replace(/\.md$/, '')
      const normalized = relPath.replace(/\.md$/, '')
      const isHidden = relPath.startsWith('.')

      nodeMap.set(normalized.toLowerCase(), normalized)
      nodes.push({
        id: normalized,
        title: title,
        relPath: relPath,
        isHidden: isHidden,
        degreeIn: 0,
        degreeOut: 0,
        createdAt: null,
        modifiedAt: note.mtime_ms,
      })
    }

    // Create edges for all wikilinks
    const edgeMap = new Map<string, number>() // Maps "sourceId->targetId" to count

    for (const [relPath, note] of this.notes.entries()) {
      // Only process Markdown files for links (skip Excalidraw)
      const lower2 = relPath.toLowerCase()
      if (lower2.endsWith('.excalidraw') || lower2.endsWith('.excalidraw.md')) {
        continue
      }
      if (!lower2.endsWith('.md') && !lower2.endsWith('.markdown')) {
        continue
      }
      const sourceNormalized = relPath.replace(/\.md$/, '')
      const sourceId = nodeMap.get(sourceNormalized.toLowerCase())
      if (!sourceId) continue

      const links = parseWikilinks(note.content)
      for (const link of links) {
        // Try to find target by normalized name
        const targetId = nodeMap.get(link.normalized.toLowerCase())
        if (targetId) {
          const edgeKey = `${sourceId}->${targetId}`
          edgeMap.set(edgeKey, (edgeMap.get(edgeKey) || 0) + 1)
        }
      }
    }

    // Convert edge map to edge array
    for (const [edgeKey, count] of edgeMap.entries()) {
      const [sourceId, targetId] = edgeKey.split('->')
      edges.push({
        sourceId: sourceId,
        targetId: targetId,
        count: count,
      })
    }

    // Update degree counts
    const degreeInMap = new Map<string, number>()
    const degreeOutMap = new Map<string, number>()
    
    for (const edge of edges) {
      degreeOutMap.set(edge.sourceId, (degreeOutMap.get(edge.sourceId) || 0) + edge.count)
      degreeInMap.set(edge.targetId, (degreeInMap.get(edge.targetId) || 0) + edge.count)
    }

    for (const node of nodes) {
      node.degreeIn = degreeInMap.get(node.id) || 0
      node.degreeOut = degreeOutMap.get(node.id) || 0
    }

    return { nodes, edges }
  }

  listTags(showHidden: boolean, includeLocked: boolean): TagSummary[] {
    const counts = new Map<string, number>()

    for (const [relPath, note] of this.notes.entries()) {
      if (!isMarkdownNotePath(relPath)) continue
      if (!showHidden && isIgnoredPath(relPath)) continue

      const tags = extractTagsFromTextWithLockFilter(note.content, !includeLocked)
      for (const tag of tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1)
      }
    }

    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' }))
  }

  notesForTag(tag: string, showHidden: boolean, includeLocked: boolean): TagNoteItem[] {
    const normalized = normalizeTag(tag)
    if (!normalized) return []

    const results: TagNoteItem[] = []
    for (const [relPath, note] of this.notes.entries()) {
      if (!isMarkdownNotePath(relPath)) continue
      if (!showHidden && isIgnoredPath(relPath)) continue

      const tags = extractTagsFromTextWithLockFilter(note.content, !includeLocked)
      if (!tags.includes(normalized)) continue

      results.push({
        relPath,
        title: fileStem(relPath),
        mtime: note.mtime_ms,
        lineNumber: findFirstInlineTagLine(note.content, normalized, !includeLocked),
      })
    }

    return results.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  }

  readVaultImage(): VaultImageResponse {
    // Images not supported in web mode
    throw new Error('Image reading not supported in web mode')
  }
}

// Singleton instance
let vaultInstance: InMemoryVault | null = null

export async function getWebVault(): Promise<InMemoryVault> {
  if (!vaultInstance) {
    vaultInstance = new InMemoryVault()
    await vaultInstance.initialize()
  }
  return vaultInstance
}

export function getWebVaultPath(): string {
  return WEB_VAULT_PATH
}

// Mock implementations of Tauri commands for web mode
export async function webListMarkdownFiles(): Promise<NoteEntry[]> {
  const vault = await getWebVault()
  return vault.listFiles()
}

export async function webReadNote(_vaultPath: string, relPath: string): Promise<string> {
  const vault = await getWebVault()
  return vault.readNote(relPath)
}

export async function webWriteNote(
  _vaultPath: string,
  relPath: string,
  contents: string,
): Promise<void> {
  const vault = await getWebVault()
  vault.writeNote(relPath, contents)
}

export async function webCreateNote(
  _vaultPath: string,
  relPath: string,
  contents: string,
): Promise<void> {
  const vault = await getWebVault()
  vault.createNote(relPath, contents)
}

export async function webCreateDir(_vaultPath: string, relPath: string): Promise<void> {
  const vault = await getWebVault()
  vault.createDir(relPath)
}

export async function webRenameNote(
  _vaultPath: string,
  fromRelPath: string,
  toRelPath: string,
): Promise<void> {
  const vault = await getWebVault()
  vault.renameNote(fromRelPath, toRelPath)
}

export async function webDeleteNote(_vaultPath: string, relPath: string): Promise<void> {
  const vault = await getWebVault()
  vault.deleteNote(relPath)
}

export async function webReadVaultImage(): Promise<VaultImageResponse> {
  const vault = await getWebVault()
  return vault.readVaultImage()
}

export async function webFindBacklinks(
  _vaultPath: string,
  targetTitle: string,
  excludeLocked: boolean = false,
): Promise<string[]> {
  const vault = await getWebVault()
  return vault.findBacklinks(targetTitle, excludeLocked)
}

export async function webSearchVault(
  _vaultPath: string,
  query: string,
  caseSensitive: boolean,
  excludeLocked: boolean,
  showHidden: boolean,
): Promise<SearchHit[]> {
  const vault = await getWebVault()
  return vault.searchVault(query, caseSensitive, excludeLocked, showHidden)
}

export async function webBuildGraph(
  _vaultPath: string,
  options: GraphOptions,
): Promise<GraphData> {
  const vault = await getWebVault()
  return vault.buildGraph(options)
}

export async function webListTags(
  _vaultPath: string,
  showHidden: boolean,
  includeLocked: boolean,
): Promise<TagSummary[]> {
  const vault = await getWebVault()
  return vault.listTags(showHidden, includeLocked)
}

export async function webNotesForTag(
  _vaultPath: string,
  tag: string,
  showHidden: boolean,
  includeLocked: boolean,
): Promise<TagNoteItem[]> {
  const vault = await getWebVault()
  return vault.notesForTag(tag, showHidden, includeLocked)
}

export async function webHashVaultPassword(): Promise<{ hash: string; salt: string }> {
  // Password hashing not supported in web mode
  throw new Error('Vault passwords not supported in web mode')
}

export async function webVerifyVaultPassword(): Promise<boolean> {
  // Password verification not supported in web mode
  throw new Error('Vault passwords not supported in web mode')
}

export async function webGetDemoVaultPath(): Promise<string> {
  return getWebVaultPath()
}
