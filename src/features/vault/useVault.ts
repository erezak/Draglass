import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { open } from '@tauri-apps/plugin-dialog'

import { listMarkdownFiles } from '../../tauri'
import type { NoteEntry } from '../../types'
import { isVisibleNoteForNavigation } from '../../ignore'

const LAST_VAULT_STORAGE_KEY = 'draglass.vault.last.v1'

type UseVaultArgs = {
  rememberLast: boolean
  showHidden: boolean
  onBusy: (message: string | null) => void
  onError: (message: string | null) => void
}

function loadLastVaultPath(): string | null {
  try {
    const raw = localStorage.getItem(LAST_VAULT_STORAGE_KEY)
    if (!raw) return null
    return raw
  } catch {
    return null
  }
}

function saveLastVaultPath(path: string | null) {
  try {
    if (!path) {
      localStorage.removeItem(LAST_VAULT_STORAGE_KEY)
      return
    }
    localStorage.setItem(LAST_VAULT_STORAGE_KEY, path)
  } catch {
    // ignore
  }
}

export function useVault({ rememberLast, showHidden, onBusy, onError }: UseVaultArgs): {
  vaultPath: string | null
  files: NoteEntry[]
  navFiles: NoteEntry[]
  vaultName: string | null
  refreshFileList: (vault: string) => Promise<NoteEntry[]>
  loadVault: (vault: string) => Promise<void>
  pickVault: () => Promise<string | null>
} {
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [files, setFiles] = useState<NoteEntry[]>([])

  const loadRequestIdRef = useRef(0)

  const vaultName = useMemo(() => {
    if (!vaultPath) return null
    const normalized = vaultPath.replace(/\\/g, '/').replace(/\/+$/, '')
    const parts = normalized.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? normalized
  }, [vaultPath])

  const navFiles = useMemo(() => {
    return files.filter((f) => isVisibleNoteForNavigation(f.rel_path, showHidden))
  }, [files, showHidden])

  const refreshFileList = useCallback(async (vault: string) => {
    const nextFiles = await listMarkdownFiles(vault)
    setFiles(nextFiles)
    return nextFiles
  }, [])

  const loadVault = useCallback(
    async (vault: string) => {
      const requestId = ++loadRequestIdRef.current
      setVaultPath(vault)
      onError(null)
      onBusy('Loading files…')
      try {
        await refreshFileList(vault)
      } catch (e) {
        if (loadRequestIdRef.current === requestId) {
          onError(String(e))
          setVaultPath(null)
          saveLastVaultPath(null)
        }
      } finally {
        if (loadRequestIdRef.current === requestId) {
          onBusy(null)
        }
      }
    },
    [onBusy, onError, refreshFileList],
  )

  const pickVault = useCallback(async () => {
    onError(null)
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Vault Folder',
    })

    if (!selected || Array.isArray(selected)) return null

    await loadVault(selected)
    return selected
  }, [loadVault, onError])

  useEffect(() => {
    if (!rememberLast) return
    if (vaultPath) return
    const last = loadLastVaultPath()
    if (!last) return
    void loadVault(last)
  }, [loadVault, rememberLast, vaultPath])

  useEffect(() => {
    if (!rememberLast) {
      saveLastVaultPath(null)
      return
    }
    saveLastVaultPath(vaultPath)
  }, [rememberLast, vaultPath])

  return {
    vaultPath,
    files,
    navFiles,
    vaultName,
    refreshFileList,
    loadVault,
    pickVault,
  }
}
