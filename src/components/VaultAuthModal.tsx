/**
 * Vault Authentication Modal
 *
 * Modal for unlocking the vault or setting up the vault password.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export type VaultAuthModalMode = 'reveal' | 'set-password' | 'change-password'

export type VaultAuthModalProps = {
  open: boolean
  mode: VaultAuthModalMode
  busy?: boolean
  error?: string | null
  onSubmit: (password: string, confirmPassword?: string, currentPassword?: string) => void
  onClose: () => void
}

export function VaultAuthModal({
  open,
  mode,
  busy = false,
  error,
  onSubmit,
  onClose,
}: VaultAuthModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [open])

  // Handle form inputs
  const handleCurrentPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPassword(e.target.value)
  }, [])

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
  }, [])

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      if (busy) return
      if (mode === 'set-password') {
        onSubmit(password, confirmPassword)
      } else if (mode === 'change-password') {
        onSubmit(password, confirmPassword, currentPassword)
      } else {
        onSubmit(password)
      }
    },
    [busy, mode, password, confirmPassword, currentPassword, onSubmit],
  )

  const isFormValid = mode === 'set-password'
    ? password.length >= 4 && password === confirmPassword
    : mode === 'change-password'
      ? currentPassword.length > 0 && password.length >= 4 && password === confirmPassword
      : password.length > 0

  if (!open) return null

  const title = mode === 'set-password'
    ? 'Set Vault Password'
    : mode === 'change-password'
      ? 'Change Vault Password'
      : 'Reveal Private Sections'
  const submitLabel = mode === 'set-password'
    ? 'Set Password'
    : mode === 'change-password'
      ? 'Change Password'
      : 'Reveal'

  return (
    <div className="vaultAuthOverlay" role="presentation" onMouseDown={onClose}>
      <div
        className="vaultAuthModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="vaultAuthHeader">
          <svg className="vaultAuthIcon" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M11 5V4a3 3 0 0 0-6 0v1H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1ZM6 4a2 2 0 1 1 4 0v1H6V4Zm2 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
            />
          </svg>
          <div className="vaultAuthTitle" id="vault-auth-title">{title}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="vaultAuthBody">
            {mode === 'set-password' ? (
              <p className="vaultAuthHint">
                Set a password to protect locked sections in this vault.
                The password is stored locally as a hash.
              </p>
            ) : mode === 'change-password' ? (
              <p className="vaultAuthHint">
                Verify your current password, then enter a new one.
              </p>
            ) : null}

            {mode === 'change-password' ? (
              <label className="vaultAuthLabel">
                <span>Current Password</span>
                <input
                  ref={inputRef}
                  type="password"
                  className="vaultAuthInput"
                  value={currentPassword}
                  onChange={handleCurrentPasswordChange}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  disabled={busy}
                />
              </label>
            ) : null}

            <label className="vaultAuthLabel">
              <span>{mode === 'change-password' ? 'New Password' : 'Password'}</span>
              <input
                ref={mode === 'change-password' ? undefined : inputRef}
                type="password"
                className="vaultAuthInput"
                value={password}
                onChange={handlePasswordChange}
                placeholder={mode === 'change-password' ? 'Enter new password' : 'Enter password'}
                autoComplete={mode === 'change-password' ? 'new-password' : 'current-password'}
                disabled={busy}
              />
            </label>

            {(mode === 'set-password' || mode === 'change-password') ? (
              <label className="vaultAuthLabel">
                <span>Confirm {mode === 'change-password' ? 'New ' : ''}Password</span>
                <input
                  type="password"
                  className="vaultAuthInput"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder={mode === 'change-password' ? 'Confirm new password' : 'Confirm password'}
                  autoComplete="new-password"
                  disabled={busy}
                />
              </label>
            ) : null}

            {(mode === 'set-password' || mode === 'change-password') && password.length > 0 && password.length < 4 ? (
              <div className="vaultAuthHint">Password must be at least 4 characters</div>
            ) : null}

            {(mode === 'set-password' || mode === 'change-password') && confirmPassword.length > 0 && password !== confirmPassword ? (
              <div className="vaultAuthError">Passwords do not match</div>
            ) : null}

            {error ? <div className="vaultAuthError">{error}</div> : null}
          </div>

          <div className="vaultAuthFooter">
            <button
              type="button"
              className="vaultAuthCancel"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="vaultAuthSubmit"
              disabled={busy || !isFormValid}
            >
              {busy ? 'Please wait…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VaultAuthModal
