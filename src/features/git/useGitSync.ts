import { useEffect, useRef, useState } from 'react'

import type { DraglassSettings } from '../../settings'
import { gitCommit, gitPull, gitPush, gitStatus, isTauri } from '../../tauri'

export type GitSyncState = {
  isGitRepo: boolean
  gitAvailable: boolean
}

type UseGitSyncArgs = {
  vaultPath: string | null
  settings: DraglassSettings
  onError: (message: string) => void
}

export function useGitSync({ vaultPath, settings, onError }: UseGitSyncArgs): GitSyncState {
  const [state, setState] = useState<GitSyncState>({ isGitRepo: false, gitAvailable: false })
  const stateRef = useRef(state)
  stateRef.current = state
  // Shared lock to prevent concurrent git operations across both intervals
  const gitBusyRef = useRef(false)

  // Detect whether the vault is a git repo whenever the vault or the feature toggle changes
  useEffect(() => {
    if (!vaultPath || !settings.gitEnabled || !isTauri()) {
      setState({ isGitRepo: false, gitAvailable: false })
      return
    }

    let cancelled = false
    gitStatus(vaultPath)
      .then((s) => {
        if (!cancelled) setState({ isGitRepo: s.isGitRepo, gitAvailable: s.gitAvailable })
      })
      .catch(() => {
        if (!cancelled) setState({ isGitRepo: false, gitAvailable: false })
      })

    return () => {
      cancelled = true
    }
  }, [vaultPath, settings.gitEnabled])

  // Autocommit (and optional autopush) interval
  useEffect(() => {
    if (!vaultPath || !settings.gitEnabled || !settings.gitAutocommitEnabled || !isTauri()) return

    const intervalMs = settings.gitAutocommitIntervalMinutes * 60 * 1000

    const id = setInterval(async () => {
      if (!stateRef.current.isGitRepo) return
      if (gitBusyRef.current) return
      gitBusyRef.current = true
      try {
        const result = await gitCommit(vaultPath)
        if (result.committed && settings.gitAutopushEnabled) {
          await gitPush(vaultPath)
        }
      } catch (e) {
        onError(String(e))
      } finally {
        gitBusyRef.current = false
      }
    }, intervalMs)

    return () => clearInterval(id)
  }, [
    vaultPath,
    settings.gitEnabled,
    settings.gitAutocommitEnabled,
    settings.gitAutocommitIntervalMinutes,
    settings.gitAutopushEnabled,
    onError,
  ])

  // Autopull interval
  useEffect(() => {
    if (!vaultPath || !settings.gitEnabled || !settings.gitAutopullEnabled || !isTauri()) return

    const intervalMs = settings.gitAutopullIntervalMinutes * 60 * 1000

    const id = setInterval(async () => {
      if (!stateRef.current.isGitRepo) return
      if (gitBusyRef.current) return
      gitBusyRef.current = true
      try {
        await gitPull(vaultPath)
      } catch (e) {
        onError(String(e))
      } finally {
        gitBusyRef.current = false
      }
    }, intervalMs)

    return () => clearInterval(id)
  }, [
    vaultPath,
    settings.gitEnabled,
    settings.gitAutopullEnabled,
    settings.gitAutopullIntervalMinutes,
    onError,
  ])

  return state
}
