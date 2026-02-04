/**
 * Vault Authentication State
 *
 * Manages vault-level password authentication for locked sections.
 *
 * Security model:
 * - Password is never stored; only a salted hash is persisted.
 * - Hash and salt are stored in localStorage keyed by vault path.
 * - Unlocking authenticates the vault for the current session only.
 * - On app restart, vault locks again (no auto-unlock).
 *
 * The actual KDF (key derivation function) is implemented in Rust.
 * This module handles the frontend auth state and UI flows.
 */

import { useCallback, useState } from 'react'
import { hashVaultPassword, verifyVaultPassword } from '../../tauri'

export type VaultAuthState = 'locked' | 'unlocked' | 'no-password'

type StoredVaultAuth = {
  hash: string
  salt: string
}

type VaultAuthStore = Record<string, StoredVaultAuth>

const VAULT_AUTH_STORAGE_KEY = 'draglass.vaultAuth.v1'

/**
 * Load the vault auth store from localStorage.
 */
function loadVaultAuthStore(): VaultAuthStore {
  try {
    const raw = localStorage.getItem(VAULT_AUTH_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as VaultAuthStore
  } catch {
    return {}
  }
}

/**
 * Save the vault auth store to localStorage.
 */
function saveVaultAuthStore(store: VaultAuthStore) {
  try {
    localStorage.setItem(VAULT_AUTH_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore
  }
}

/**
 * Get stored auth for a specific vault.
 */
function getVaultAuth(vaultPath: string): StoredVaultAuth | null {
  const store = loadVaultAuthStore()
  const auth = store[vaultPath]
  if (!auth || typeof auth.hash !== 'string' || typeof auth.salt !== 'string') {
    return null
  }
  return auth
}

/**
 * Store auth for a specific vault.
 */
function setVaultAuth(vaultPath: string, auth: StoredVaultAuth) {
  const store = loadVaultAuthStore()
  store[vaultPath] = auth
  saveVaultAuthStore(store)
}

/**
 * Check if a vault has a password set.
 */
export function hasVaultPassword(vaultPath: string): boolean {
  return getVaultAuth(vaultPath) !== null
}

/**
 * Hash a password using the Rust KDF implementation.
 */
async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  try {
    const result = await hashVaultPassword(password, salt ?? null)
    return result
  } catch (err) {
    throw new Error(`Failed to hash password: ${err}`)
  }
}

/**
 * Verify a password against stored hash.
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const result = await verifyVaultPassword(password, storedHash)
    return result
  } catch (err) {
    throw new Error(`Failed to verify password: ${err}`)
  }
}

/**
 * Set the vault password (first-time setup).
 */
export async function setVaultPassword(vaultPath: string, password: string): Promise<void> {
  const { hash, salt } = await hashPassword(password)
  setVaultAuth(vaultPath, { hash, salt })
}

/**
 * Verify vault password for unlock.
 */
export async function checkVaultPassword(vaultPath: string, password: string): Promise<boolean> {
  const auth = getVaultAuth(vaultPath)
  if (!auth) return false
  return verifyPassword(password, auth.hash)
}

export type UseVaultAuthResult = {
  /** Current auth state for the vault */
  authState: VaultAuthState
  /** Whether an auth operation is in progress */
  authBusy: boolean
  /** Error message from last operation, if any */
  authError: string | null
  /** Attempt to unlock the vault with password */
  unlock: (password: string) => Promise<boolean>
  /** Lock the vault (clear session auth) */
  lock: () => void
  /** Set a new password for the vault (first-time setup) */
  setPassword: (password: string) => Promise<boolean>
  /** Check if vault has any locked sections (for UI hints) */
  hasLockedContent: boolean
  /** Set whether the current note has locked content */
  setHasLockedContent: (value: boolean) => void
}

export type UseVaultAuthOptions = {
  vaultPath: string | null
  onError?: (message: string) => void
}

/**
 * Hook to manage vault authentication state.
 */
export function useVaultAuth(options: UseVaultAuthOptions): UseVaultAuthResult {
  const { vaultPath, onError } = options

  const [sessionUnlocked, setSessionUnlocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLockedContent, setHasLockedContent] = useState(false)

  const getAuthState = useCallback((): VaultAuthState => {
    if (!vaultPath) return 'locked'
    if (sessionUnlocked) return 'unlocked'
    if (!hasVaultPassword(vaultPath)) return 'no-password'
    return 'locked'
  }, [vaultPath, sessionUnlocked])

  const unlock = useCallback(
    async (password: string): Promise<boolean> => {
      if (!vaultPath) return false

      setBusy(true)
      setError(null)

      try {
        const valid = await checkVaultPassword(vaultPath, password)
        if (valid) {
          setSessionUnlocked(true)
          return true
        } else {
          const msg = 'Incorrect password'
          setError(msg)
          onError?.(msg)
          return false
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to verify password'
        setError(msg)
        onError?.(msg)
        return false
      } finally {
        setBusy(false)
      }
    },
    [vaultPath, onError],
  )

  const lock = useCallback(() => {
    setSessionUnlocked(false)
    setError(null)
  }, [])

  const setPassword = useCallback(
    async (password: string): Promise<boolean> => {
      if (!vaultPath) return false

      setBusy(true)
      setError(null)

      try {
        await setVaultPassword(vaultPath, password)
        setSessionUnlocked(true)
        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to set password'
        setError(msg)
        onError?.(msg)
        return false
      } finally {
        setBusy(false)
      }
    },
    [vaultPath, onError],
  )

  return {
    authState: getAuthState(),
    authBusy: busy,
    authError: error,
    unlock,
    lock,
    setPassword,
    hasLockedContent,
    setHasLockedContent,
  }
}
