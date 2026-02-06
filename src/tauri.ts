import { invoke } from '@tauri-apps/api/core'

import type { NoteEntry, SearchHit } from './types'
import type { GraphData, GraphOptions } from './features/graph/graphTypes'

export type VaultImageResponse = {
  bytes: number[]
  mime: string
  mtime_ms: number
}

// Tauri v2 IPC: command names = Rust fn names (snake_case),
// arg keys = Rust param names auto-converted to camelCase.

export async function listMarkdownFiles(vaultPath: string): Promise<NoteEntry[]> {
  return invoke<NoteEntry[]>('list_markdown_files', { vaultPath })
}

export async function readNote(vaultPath: string, relPath: string): Promise<string> {
  return invoke<string>('read_note', { vaultPath, relPath })
}

export async function writeNote(
  vaultPath: string,
  relPath: string,
  contents: string,
): Promise<void> {
  return invoke<void>('write_note', { vaultPath, relPath, contents })
}

export async function createNote(
  vaultPath: string,
  relPath: string,
  contents: string,
): Promise<void> {
  return invoke<void>('create_note', { vaultPath, relPath, contents })
}

export async function createDir(vaultPath: string, relPath: string): Promise<void> {
  return invoke<void>('create_dir', { vaultPath, relPath })
}

export async function renameNote(
  vaultPath: string,
  fromRelPath: string,
  toRelPath: string,
): Promise<void> {
  return invoke<void>('rename_note', { vaultPath, fromRelPath, toRelPath })
}

export async function deleteNote(vaultPath: string, relPath: string): Promise<void> {
  return invoke<void>('delete_note', { vaultPath, relPath })
}

export async function readVaultImage(
  vaultPath: string,
  relPath: string,
): Promise<VaultImageResponse> {
  return invoke<VaultImageResponse>('read_vault_image', { vaultPath, relPath })
}

export async function findBacklinks(
  vaultPath: string,
  targetTitle: string,
  excludeLocked: boolean = false,
): Promise<string[]> {
  return invoke<string[]>('find_backlinks', { vaultPath, targetTitle, excludeLocked })
}

export async function searchVault(
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

export async function buildGraph(
  vaultPath: string,
  options: GraphOptions,
): Promise<GraphData> {
  return invoke<GraphData>('build_graph', { vaultPath, options })
}

export type HashResult = {
  hash: string
  salt: string
}

export async function hashVaultPassword(
  password: string,
  salt: string | null,
): Promise<HashResult> {
  return invoke<HashResult>('hash_vault_password', { password, salt })
}

export async function verifyVaultPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return invoke<boolean>('verify_vault_password', { password, hash })
}
