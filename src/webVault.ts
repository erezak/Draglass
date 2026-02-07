// Web-mode in-memory vault implementation
// This module provides a browser-compatible vault that stores notes in memory
// and persists them to localStorage

import type { NoteEntry, SearchHit } from './types'
import type { GraphData, GraphOptions } from './features/graph/graphTypes'
import type { VaultImageResponse } from './tauri'
import { parseWikilinks } from './wikilinks'

const STORAGE_PREFIX = 'draglass.web_vault.'
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

    // Try to load from localStorage first
    const hasStoredData = this.loadFromStorage()

    // If no stored data, load demo vault from public directory
    if (!hasStoredData) {
      await this.loadDemoVault()
    }

    this.initialized = true
  }

  private loadFromStorage(): boolean {
    try {
      const keys = Object.keys(localStorage)
      let count = 0
      for (const key of keys) {
        if (key.startsWith(STORAGE_PREFIX)) {
          const relPath = key.substring(STORAGE_PREFIX.length)
          const data = localStorage.getItem(key)
          if (data) {
            const stored: StoredNote = JSON.parse(data)
            this.notes.set(relPath, stored)
            count++
          }
        }
      }
      return count > 0
    } catch (e) {
      console.warn('Failed to load vault from localStorage:', e)
      return false
    }
  }

  private async loadDemoVault(): Promise<void> {
    // List of demo vault files
    const demoFiles = [
      'Welcome to Draglass.md',
      'Quick Start Guide.md',
      'Creating Notes.md',
      'Wikilinks.md',
      'Backlinks.md',
      'Organization Strategies.md',
      'Graph View.md',
      'Philosophy.md',
      'Science.md',
      'Technology.md',
      'Literature.md',
      'History.md',
      'Markdown Syntax.md',
      'Daily Notes.md',
      'Workflow.md',
      'Computer Science.md',
      'Mathematics.md',
      'Ancient Greece.md',
      'Enlightenment.md',
      'Critical Thinking.md',
      'Political Theory.md',
      'Education.md',
      'Innovation.md',
    ]

    const now = Date.now()

    for (const fileName of demoFiles) {
      try {
        const response = await fetch(`/demo-vault/${encodeURIComponent(fileName)}`)
        if (response.ok) {
          const content = await response.text()
          this.notes.set(fileName, { content, mtime_ms: now })
        }
      } catch (e) {
        console.warn(`Failed to load demo file ${fileName}:`, e)
      }
    }

    // Save to localStorage
    this.saveToStorage()
  }

  private saveToStorage(): void {
    try {
      for (const [relPath, note] of this.notes.entries()) {
        const key = STORAGE_PREFIX + relPath
        localStorage.setItem(key, JSON.stringify(note))
      }
    } catch (e) {
      console.warn('Failed to save vault to localStorage:', e)
    }
  }

  listFiles(): NoteEntry[] {
    const entries: NoteEntry[] = []
    for (const [relPath] of this.notes.entries()) {
      // Extract display name (filename without extension)
      const fileName = relPath.split('/').pop() || relPath
      const displayName = fileName.replace(/\.md$/, '')
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
    this.saveToStorage()
  }

  createNote(relPath: string, contents: string): void {
    if (this.notes.has(relPath)) {
      throw new Error(`Note already exists: ${relPath}`)
    }
    this.notes.set(relPath, { content: contents, mtime_ms: Date.now() })
    this.saveToStorage()
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
    
    // Clean up old storage entry and save new one
    try {
      localStorage.removeItem(STORAGE_PREFIX + fromRelPath)
    } catch (e) {
      // ignore
    }
    this.saveToStorage()
  }

  deleteNote(relPath: string): void {
    if (!this.notes.has(relPath)) {
      throw new Error(`Note not found: ${relPath}`)
    }
    this.notes.delete(relPath)
    try {
      localStorage.removeItem(STORAGE_PREFIX + relPath)
    } catch (e) {
      // ignore
    }
  }

  findBacklinks(targetTitle: string, excludeLocked: boolean): string[] {
    const backlinks: string[] = []
    const targetLower = targetTitle.toLowerCase()

    for (const [relPath, note] of this.notes.entries()) {
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

  readVaultImage(_relPath: string): VaultImageResponse {
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
export async function webListMarkdownFiles(_vaultPath: string): Promise<NoteEntry[]> {
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

export async function webReadVaultImage(
  _vaultPath: string,
  relPath: string,
): Promise<VaultImageResponse> {
  const vault = await getWebVault()
  return vault.readVaultImage(relPath)
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

export async function webHashVaultPassword(
  _password: string,
  _salt: string | null,
): Promise<{ hash: string; salt: string }> {
  // Password hashing not supported in web mode
  throw new Error('Vault passwords not supported in web mode')
}

export async function webVerifyVaultPassword(
  _password: string,
  _hash: string,
): Promise<boolean> {
  // Password verification not supported in web mode
  throw new Error('Vault passwords not supported in web mode')
}

export async function webGetDemoVaultPath(): Promise<string> {
  return getWebVaultPath()
}
