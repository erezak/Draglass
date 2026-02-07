import { invoke } from '@tauri-apps/api/core'

import type { NoteEntry, SearchHit } from './types'
import type { GraphData, GraphOptions } from './features/graph/graphTypes'

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
    return webListMarkdownFiles(vaultPath)
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
    return webReadVaultImage(vaultPath, relPath)
  }
}

async function tauriFindBacklinks(
  vaultPath: string,
  targetTitle: string,
  excludeLocked: boolean = false,
): Promise<string[]> {
  return invoke<string[]>('find_backlinks', { vaultPath, targetTitle, excludeLocked })
}

export async function findBacklinks(
  vaultPath: string,
  targetTitle: string,
  excludeLocked: boolean = false,
): Promise<string[]> {
  if (isTauri()) {
    return tauriFindBacklinks(vaultPath, targetTitle, excludeLocked)
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
  return invoke<GraphData>('build_graph', { vaultPath, options })
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
    return webHashVaultPassword(password, salt)
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
    return webVerifyVaultPassword(password, hash)
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
