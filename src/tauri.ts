import { invoke } from '@tauri-apps/api/core'

import type { NoteEntry } from './types'

export type VaultImageResponse = {
  bytes: number[]
  mime: string
  mtime_ms: number
}

async function invokeWithFallback<T>(
  primaryCommand: string,
  fallbackCommand: string,
  args: Record<string, unknown>,
  fallbackArgs: Record<string, unknown>,
): Promise<T> {
  try {
    return await invoke<T>(primaryCommand, args)
  } catch (e) {
    const message = String(e)
    const notFound = /command\s+.+\s+not\s+found/i.test(message)
    if (!notFound) throw e
    return invoke<T>(fallbackCommand, fallbackArgs)
  }
}

export async function listMarkdownFiles(vaultPath: string): Promise<NoteEntry[]> {
  return invokeWithFallback<NoteEntry[]>(
    'list-markdown-files',
    'list_markdown_files',
    { vault_path: vaultPath },
    { vaultPath },
  )
}

export async function readNote(vaultPath: string, relPath: string): Promise<string> {
  return invokeWithFallback<string>(
    'read-note',
    'read_note',
    { vault_path: vaultPath, rel_path: relPath },
    { vaultPath, relPath },
  )
}

export async function writeNote(
  vaultPath: string,
  relPath: string,
  contents: string,
): Promise<void> {
  return invokeWithFallback<void>(
    'write-note',
    'write_note',
    { vault_path: vaultPath, rel_path: relPath, contents },
    { vaultPath, relPath, contents },
  )
}

export async function createNote(
  vaultPath: string,
  relPath: string,
  contents: string,
): Promise<void> {
  return invokeWithFallback<void>(
    'create-note',
    'create_note',
    { vault_path: vaultPath, rel_path: relPath, contents },
    { vaultPath, relPath, contents },
  )
}

export async function readVaultImage(
  vaultPath: string,
  relPath: string,
): Promise<VaultImageResponse> {
  return invokeWithFallback<VaultImageResponse>(
    'read-vault-image',
    'read_vault_image',
    { vault_path: vaultPath, rel_path: relPath },
    { vaultPath, relPath },
  )
}

export async function findBacklinks(
  vaultPath: string,
  targetTitle: string,
): Promise<string[]> {
  return invokeWithFallback<string[]>(
    'find-backlinks',
    'find_backlinks',
    { vault_path: vaultPath, target_title: targetTitle },
    { vaultPath, targetTitle },
  )
}
