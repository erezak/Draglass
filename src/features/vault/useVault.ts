import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { open } from '@tauri-apps/plugin-dialog'

import { listMarkdownFiles, isTauri, startIndexWatcher, stopIndexWatcher } from '../../tauri'
import type { NoteEntry } from '../../types'
import { isVisibleNoteForNavigation } from '../../ignore'

const LAST_VAULT_STORAGE_KEY = 'draglass.vault.last.v1'

type UseVaultArgs = {
  rememberLast: boolean
  showHidden: boolean
  openDemoOnEmpty: boolean
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

export function useVault({ rememberLast, showHidden, openDemoOnEmpty, onBusy, onError }: UseVaultArgs): {
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
  const previousVaultPathRef = useRef<string | null>(null)

  const loadRequestIdRef = useRef(0)
  const hadPreviousVaultRef = useRef(false)
  const hasAttemptedLastVaultLoadRef = useRef(false)
  const isLoadingLastVaultRef = useRef(false)

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
        const previousVault = previousVaultPathRef.current
        if (previousVault && previousVault !== vault) {
          void stopIndexWatcher(previousVault)
        }

        await refreshFileList(vault)
        void startIndexWatcher(vault)
        previousVaultPathRef.current = vault
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
    
    // In web mode, we can't pick a vault - inform the user
    if (!isTauri()) {
      onError('Vault selection is only available in the desktop app. The web version uses an in-memory demo vault.')
      return null
    }
    
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
    if (!rememberLast) {
      hasAttemptedLastVaultLoadRef.current = true
      return
    }
    if (vaultPath) return
    const last = loadLastVaultPath()
    if (last) {
      hadPreviousVaultRef.current = true
      isLoadingLastVaultRef.current = true
    }
    hasAttemptedLastVaultLoadRef.current = true
    if (!last) return
    void loadVault(last).then(() => {
      isLoadingLastVaultRef.current = false
    })
  }, [loadVault, rememberLast, vaultPath])

  useEffect(() => {
    // Auto-open demo vault if no vault is loaded and openDemoOnEmpty is true
    if (!openDemoOnEmpty) return
    if (vaultPath) return
    // Wait until we've attempted to load the last vault
    if (!hasAttemptedLastVaultLoadRef.current) return
    // Wait until we've finished loading the last vault (if there was one)
    if (isLoadingLastVaultRef.current) return
    // Double-check: if there was a previous vault, never auto-open demo
    if (hadPreviousVaultRef.current) return
    if (rememberLast && loadLastVaultPath()) return // Don't open demo if there's a remembered vault

    void (async () => {
      try {
        const { getDemoVaultPath } = await import('../../tauri')
        const demoPath = await getDemoVaultPath()
        await loadVault(demoPath)
      } catch (e) {
        // Silently fail - user can open vault manually
        console.warn('Failed to auto-open demo vault:', e)
      }
    })()
  }, [loadVault, openDemoOnEmpty, rememberLast, vaultPath])

  useEffect(() => {
    if (!rememberLast) {
      saveLastVaultPath(null)
      return
    }
    
    // Check if current vault is the demo vault by checking if path ends with 'demo-vault'
    const isDemoVault = vaultPath && (
      vaultPath.endsWith('/demo-vault') || 
      vaultPath.endsWith('\\demo-vault') ||
      vaultPath.endsWith('/demo-vault/') ||
      vaultPath.endsWith('\\demo-vault\\')
    )
    
    // Don't save demo vault as last vault if there was a previous vault at startup
    if (isDemoVault && hadPreviousVaultRef.current) {
      return
    }
    
    saveLastVaultPath(vaultPath)
  }, [rememberLast, vaultPath])

  useEffect(() => {
    return () => {
      if (previousVaultPathRef.current) {
        void stopIndexWatcher(previousVaultPathRef.current)
      }
    }
  }, [])

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
