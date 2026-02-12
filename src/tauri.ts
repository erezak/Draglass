import { invoke } from '@tauri-apps/api/core'

import type { NoteEntry, SearchHit } from './types'
import type { GraphData, GraphOptions } from './features/graph/graphTypes'

export type SearchFlags = {
  caseSensitive?: boolean
  includeHidden?: boolean
  includeLocked?: boolean
}

export type SearchHighlightRange = {
  start: number
  end: number
}

export type SearchV2Hit = {
  relPath: string
  title: string
  snippet: string
  highlights: SearchHighlightRange[]
  score: number
  lineNumber: number | null
}

export type SearchV2Response = {
  results: SearchV2Hit[]
  total: number
  tookMs: number
  nextOffset: number | null
  canceled: boolean
}

export type IndexStatus = {
  state: 'idle' | 'indexing' | 'rebuilding' | 'error' | string
  lastIndexed: number | null
  queueDepth: number
  rebuilding: boolean
  indexedNotes: number
  totalNotes: number
}

export type RebuildIndexOptions = {
  includeHidden?: boolean
  force?: boolean
  reason?: string
  requestToken?: string
}

export type RebuildIndexResult = {
  accepted: boolean
  jobId: string
}

export type TaskIndexItem = {
  relPath: string
  noteTitle: string
  lineNumber: number
  text: string
  state: string
}

export type WatcherResult = {
  started: boolean
  alreadyRunning: boolean
}

export type WatcherStopResult = {
  stopped: boolean
}

export type VaultFileChangedEvent = {
  vaultPath: string
  relPath: string
  kind: 'changed' | 'removed' | string
}

export type VaultImageResponse = {
  bytes: number[]
  mime: string
  mtime_ms: number
}

// Detect if we're running in Tauri or plain web browser
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

// Tauri v2 IPC: command names = Rust fn names (snake_case),
// arg keys = Rust param names auto-converted to camelCase.

async function tauriListMarkdownFiles(vaultPath: string): Promise<NoteEntry[]> {
  return invoke<NoteEntry[]>('list_markdown_files', { vaultPath })
}

export async function listMarkdownFiles(vaultPath: string): Promise<NoteEntry[]> {
  if (isTauri()) {
    return tauriListMarkdownFiles(vaultPath)
  } else {
    const { webListMarkdownFiles } = await import('./webVault')
    return webListMarkdownFiles()
  }
}

async function tauriReadNote(vaultPath: string, relPath: string): Promise<string> {
  return invoke<string>('read_note', { vaultPath, relPath })
}

export async function readNote(vaultPath: string, relPath: string): Promise<string> {
  if (isTauri()) {
    return tauriReadNote(vaultPath, relPath)
  } else {
    const { webReadNote } = await import('./webVault')
    return webReadNote(vaultPath, relPath)
  }
}

async function tauriWriteNote(
  vaultPath: string,
  relPath: string,
  contents: string,
): Promise<void> {
  return invoke<void>('write_note', { vaultPath, relPath, contents })
}

export async function writeNote(
  vaultPath: string,
  relPath: string,
  contents: string,
): Promise<void> {
  if (isTauri()) {
    return tauriWriteNote(vaultPath, relPath, contents)
  } else {
    const { webWriteNote } = await import('./webVault')
    return webWriteNote(vaultPath, relPath, contents)
  }
}

async function tauriCreateNote(
  vaultPath: string,
  relPath: string,
  contents: string,
): Promise<void> {
  return invoke<void>('create_note', { vaultPath, relPath, contents })
}

export async function createNote(
  vaultPath: string,
  relPath: string,
  contents: string,
): Promise<void> {
  if (isTauri()) {
    return tauriCreateNote(vaultPath, relPath, contents)
  } else {
    const { webCreateNote } = await import('./webVault')
    return webCreateNote(vaultPath, relPath, contents)
  }
}

async function tauriCreateDir(vaultPath: string, relPath: string): Promise<void> {
  return invoke<void>('create_dir', { vaultPath, relPath })
}

export async function createDir(vaultPath: string, relPath: string): Promise<void> {
  if (isTauri()) {
    return tauriCreateDir(vaultPath, relPath)
  } else {
    const { webCreateDir } = await import('./webVault')
    return webCreateDir(vaultPath, relPath)
  }
}

async function tauriRenameNote(
  vaultPath: string,
  fromRelPath: string,
  toRelPath: string,
): Promise<void> {
  return invoke<void>('rename_note', { vaultPath, fromRelPath, toRelPath })
}

export async function renameNote(
  vaultPath: string,
  fromRelPath: string,
  toRelPath: string,
): Promise<void> {
  if (isTauri()) {
    return tauriRenameNote(vaultPath, fromRelPath, toRelPath)
  } else {
    const { webRenameNote } = await import('./webVault')
    return webRenameNote(vaultPath, fromRelPath, toRelPath)
  }
}

async function tauriDeleteNote(vaultPath: string, relPath: string): Promise<void> {
  return invoke<void>('delete_note', { vaultPath, relPath })
}

export async function deleteNote(vaultPath: string, relPath: string): Promise<void> {
  if (isTauri()) {
    return tauriDeleteNote(vaultPath, relPath)
  } else {
    const { webDeleteNote } = await import('./webVault')
    return webDeleteNote(vaultPath, relPath)
  }
}

async function tauriReadVaultImage(
  vaultPath: string,
  relPath: string,
): Promise<VaultImageResponse> {
  return invoke<VaultImageResponse>('read_vault_image', { vaultPath, relPath })
}

export async function readVaultImage(
  vaultPath: string,
  relPath: string,
): Promise<VaultImageResponse> {
  if (isTauri()) {
    return tauriReadVaultImage(vaultPath, relPath)
  } else {
    const { webReadVaultImage } = await import('./webVault')
    return webReadVaultImage()
  }
}

async function tauriFindBacklinks(
  vaultPath: string,
  targetTitle: string,
  excludeLocked: boolean = false,
  showHidden: boolean = false,
): Promise<string[]> {
  return invoke<string[]>('find_backlinks_v2', {
    vaultPath,
    targetTitle,
    includeLocked: !excludeLocked,
    showHidden,
  })
}

export async function findBacklinks(
  vaultPath: string,
  targetTitle: string,
  excludeLocked: boolean = false,
  showHidden: boolean = false,
): Promise<string[]> {
  if (isTauri()) {
    return tauriFindBacklinks(vaultPath, targetTitle, excludeLocked, showHidden)
  } else {
    const { webFindBacklinks } = await import('./webVault')
    return webFindBacklinks(vaultPath, targetTitle, excludeLocked)
  }
}

async function tauriSearchVault(
  vaultPath: string,
  query: string,
  caseSensitive: boolean,
  excludeLocked: boolean,
  showHidden: boolean,
): Promise<SearchHit[]> {
  return invoke<SearchHit[]>('search_vault', {
    vaultPath,
    query,
    caseSensitive,
    excludeLocked,
    showHidden,
  })
}

export async function searchVault(
  vaultPath: string,
  query: string,
  caseSensitive: boolean,
  excludeLocked: boolean,
  showHidden: boolean,
): Promise<SearchHit[]> {
  if (isTauri()) {
    return tauriSearchVault(vaultPath, query, caseSensitive, excludeLocked, showHidden)
  } else {
    const { webSearchVault } = await import('./webVault')
    return webSearchVault(vaultPath, query, caseSensitive, excludeLocked, showHidden)
  }
}

async function tauriBuildGraph(
  vaultPath: string,
  options: GraphOptions,
): Promise<GraphData> {
  return invoke<GraphData>('build_graph_v2', { vaultPath, options })
}

export async function buildGraph(
  vaultPath: string,
  options: GraphOptions,
): Promise<GraphData> {
  if (isTauri()) {
    return tauriBuildGraph(vaultPath, options)
  } else {
    const { webBuildGraph } = await import('./webVault')
    return webBuildGraph(vaultPath, options)
  }
}

async function tauriSearchV2(
  vaultPath: string,
  query: string,
  flags: SearchFlags,
  limit: number,
  offset: number,
  requestToken?: string,
): Promise<SearchV2Response> {
  return invoke<SearchV2Response>('search_v2', {
    vaultPath,
    query,
    flags,
    limit,
    offset,
    requestToken,
  })
}

export async function searchV2(
  vaultPath: string,
  query: string,
  flags: SearchFlags,
  limit: number,
  offset: number,
  requestToken?: string,
): Promise<SearchV2Response> {
  if (isTauri()) {
    return tauriSearchV2(vaultPath, query, flags, limit, offset, requestToken)
  }

  const { webSearchVault } = await import('./webVault')
  const hits = await webSearchVault(
    vaultPath,
    query,
    !!flags.caseSensitive,
    !flags.includeLocked,
    !!flags.includeHidden,
  )

  const mapped: SearchV2Hit[] = hits.slice(offset, offset + limit).map((hit) => ({
    relPath: hit.rel_path,
    title: hit.rel_path.split('/').pop()?.replace(/\.(md|markdown)$/i, '') ?? hit.rel_path,
    snippet: hit.snippet,
    highlights: [],
    score: 0,
    lineNumber: hit.line_number,
  }))

  const nextOffset = offset + mapped.length < hits.length ? offset + mapped.length : null
  return {
    results: mapped,
    total: hits.length,
    tookMs: 0,
    nextOffset,
    canceled: false,
  }
}

async function tauriCancelRequest(requestToken: string): Promise<boolean> {
  const result = await invoke<{ canceled: boolean }>('cancel_request', { requestToken })
  return result.canceled
}

export async function cancelRequest(requestToken: string): Promise<boolean> {
  if (!isTauri()) return true
  return tauriCancelRequest(requestToken)
}

async function tauriIndexStatus(vaultPath: string): Promise<IndexStatus> {
  return invoke<IndexStatus>('index_status', { vaultPath })
}

export async function indexStatus(vaultPath: string): Promise<IndexStatus> {
  if (!isTauri()) {
    return {
      state: 'idle',
      lastIndexed: null,
      queueDepth: 0,
      rebuilding: false,
      indexedNotes: 0,
      totalNotes: 0,
    }
  }
  return tauriIndexStatus(vaultPath)
}

async function tauriRebuildIndex(
  vaultPath: string,
  options: RebuildIndexOptions,
): Promise<RebuildIndexResult> {
  return invoke<RebuildIndexResult>('rebuild_index', { vaultPath, options })
}

export async function rebuildIndex(
  vaultPath: string,
  options: RebuildIndexOptions,
): Promise<RebuildIndexResult> {
  if (!isTauri()) {
    return { accepted: true, jobId: 'web-noop' }
  }
  return tauriRebuildIndex(vaultPath, options)
}

async function tauriListTasksV2(
  vaultPath: string,
  showHidden: boolean,
  includeLocked: boolean,
): Promise<TaskIndexItem[]> {
  return invoke<TaskIndexItem[]>('list_tasks_v2', {
    vaultPath,
    showHidden,
    includeLocked,
  })
}

export async function listTasksV2(
  vaultPath: string,
  showHidden: boolean,
  includeLocked: boolean,
): Promise<TaskIndexItem[]> {
  if (isTauri()) {
    return tauriListTasksV2(vaultPath, showHidden, includeLocked)
  }

  const { webListMarkdownFiles, webReadNote } = await import('./webVault')
  const files = await webListMarkdownFiles()
  const results: TaskIndexItem[] = []
  const taskRe = /^(\s*)([-+*])\s+\[( |x|X|-)\]\s*(.*)$/

  for (const file of files) {
    const text = await webReadNote(vaultPath, file.rel_path)
    const lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? ''
      const match = taskRe.exec(line)
      if (!match) continue
      const state = (match[3] ?? ' ').toLowerCase()
      if (state === 'x') continue
      results.push({
        relPath: file.rel_path,
        noteTitle: file.display_name,
        lineNumber: i + 1,
        text: (match[4] ?? '').trim(),
        state,
      })
    }
  }

  return results
}

async function tauriStartIndexWatcher(vaultPath: string): Promise<WatcherResult> {
  return invoke<WatcherResult>('start_index_watcher', { vaultPath })
}

export async function startIndexWatcher(vaultPath: string): Promise<WatcherResult> {
  if (!isTauri()) {
    return { started: true, alreadyRunning: false }
  }
  return tauriStartIndexWatcher(vaultPath)
}

async function tauriStopIndexWatcher(vaultPath: string): Promise<WatcherStopResult> {
  return invoke<WatcherStopResult>('stop_index_watcher', { vaultPath })
}

export async function stopIndexWatcher(vaultPath: string): Promise<WatcherStopResult> {
  if (!isTauri()) {
    return { stopped: true }
  }
  return tauriStopIndexWatcher(vaultPath)
}

export async function onVaultFileChanged(
  handler: (payload: VaultFileChangedEvent) => void,
): Promise<() => void> {
  if (!isTauri()) {
    return () => {}
  }

  const { listen } = await import('@tauri-apps/api/event')
  const unlisten = await listen<VaultFileChangedEvent>('vault-file-changed', (event) => {
    handler(event.payload)
  })

  let called = false
  return () => {
    if (called) return
    called = true
    if (typeof unlisten !== 'function') return
    void Promise.resolve()
      .then(() => unlisten())
      .catch(() => {
        // no-op: listener may already be unregistered by runtime teardown/HMR
      })
  }
}

export type HashResult = {
  hash: string
  salt: string
}

async function tauriHashVaultPassword(
  password: string,
  salt: string | null,
): Promise<HashResult> {
  return invoke<HashResult>('hash_vault_password', { password, salt })
}

export async function hashVaultPassword(
  password: string,
  salt: string | null,
): Promise<HashResult> {
  if (isTauri()) {
    return tauriHashVaultPassword(password, salt)
  } else {
    const { webHashVaultPassword } = await import('./webVault')
    return webHashVaultPassword()
  }
}

async function tauriVerifyVaultPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return invoke<boolean>('verify_vault_password', { password, hash })
}

export async function verifyVaultPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (isTauri()) {
    return tauriVerifyVaultPassword(password, hash)
  } else {
    const { webVerifyVaultPassword } = await import('./webVault')
    return webVerifyVaultPassword()
  }
}

async function tauriGetDemoVaultPath(): Promise<string> {
  return invoke<string>('get_demo_vault_path')
}

export async function getDemoVaultPath(): Promise<string> {
  if (isTauri()) {
    return tauriGetDemoVaultPath()
  } else {
    const { webGetDemoVaultPath } = await import('./webVault')
    return webGetDemoVaultPath()
  }
}
