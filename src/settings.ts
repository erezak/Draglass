import { useCallback, useEffect, useState } from 'react'

export type DraglassSettings = {
  editorWrap: boolean
  editorLivePreview: boolean
  editorRenderDiagrams: boolean
  editorRenderImages: boolean
  editorTheme: 'dark' | 'light'
  filesShowHidden: boolean
  filesRememberExpandedFolders: boolean
  vaultRememberLast: boolean

  autosaveEnabled: boolean
  autosaveDebounceMs: number

  backlinksEnabled: boolean
  backlinksDebounceMs: number

  quickSwitcherDebounceMs: number
  quickSwitcherMaxResults: number
  quickSwitcherMaxRecents: number
}

type SettingsUpdate =
  | Partial<DraglassSettings>
  | ((prev: DraglassSettings) => DraglassSettings)

const SETTINGS_STORAGE_KEY = 'draglass.settings.v1'

// Legacy keys (pre-settings screen)
const LEGACY_WRAP_STORAGE_KEY = 'draglass.editor.wrap.v1'
const LEGACY_SHOW_HIDDEN_STORAGE_KEY = 'draglass.nav.showHidden.v1'

export const DEFAULT_SETTINGS: DraglassSettings = {
  editorWrap: true,
  editorLivePreview: true,
  editorRenderDiagrams: true,
  editorRenderImages: true,
  editorTheme: 'dark',
  filesShowHidden: false,
  filesRememberExpandedFolders: true,
  vaultRememberLast: true,

  autosaveEnabled: true,
  autosaveDebounceMs: 750,

  backlinksEnabled: true,
  backlinksDebounceMs: 250,

  quickSwitcherDebounceMs: 60,
  quickSwitcherMaxResults: 50,
  quickSwitcherMaxRecents: 20,
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const n = Math.trunc(value)
  return Math.max(min, Math.min(max, n))
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeSettings(raw: unknown): DraglassSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS
  const r = raw as Record<string, unknown>
  const editorTheme = r.editorTheme === 'light' || r.editorTheme === 'dark' ? r.editorTheme : null

  return {
    editorWrap: asBool(r.editorWrap, DEFAULT_SETTINGS.editorWrap),
    editorLivePreview: asBool(r.editorLivePreview, DEFAULT_SETTINGS.editorLivePreview),
    editorRenderDiagrams: asBool(r.editorRenderDiagrams, DEFAULT_SETTINGS.editorRenderDiagrams),
    editorRenderImages: asBool(r.editorRenderImages, DEFAULT_SETTINGS.editorRenderImages),
    editorTheme: editorTheme ?? DEFAULT_SETTINGS.editorTheme,
    filesShowHidden: asBool(r.filesShowHidden, DEFAULT_SETTINGS.filesShowHidden),
    filesRememberExpandedFolders: asBool(
      r.filesRememberExpandedFolders,
      DEFAULT_SETTINGS.filesRememberExpandedFolders,
    ),
    vaultRememberLast: asBool(r.vaultRememberLast, DEFAULT_SETTINGS.vaultRememberLast),

    autosaveEnabled: asBool(r.autosaveEnabled, DEFAULT_SETTINGS.autosaveEnabled),
    autosaveDebounceMs: clampInt(
      r.autosaveDebounceMs,
      DEFAULT_SETTINGS.autosaveDebounceMs,
      0,
      10000,
    ),

    backlinksEnabled: asBool(r.backlinksEnabled, DEFAULT_SETTINGS.backlinksEnabled),
    backlinksDebounceMs: clampInt(
      r.backlinksDebounceMs,
      DEFAULT_SETTINGS.backlinksDebounceMs,
      0,
      10000,
    ),

    quickSwitcherDebounceMs: clampInt(
      r.quickSwitcherDebounceMs,
      DEFAULT_SETTINGS.quickSwitcherDebounceMs,
      0,
      2000,
    ),
    quickSwitcherMaxResults: clampInt(
      r.quickSwitcherMaxResults,
      DEFAULT_SETTINGS.quickSwitcherMaxResults,
      1,
      500,
    ),
    quickSwitcherMaxRecents: clampInt(
      r.quickSwitcherMaxRecents,
      DEFAULT_SETTINGS.quickSwitcherMaxRecents,
      1,
      200,
    ),
  }
}

function readLegacyBool(storageKey: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw == null) return fallback
    if (raw === 'true') return true
    if (raw === 'false') return false
    return fallback
  } catch {
    return fallback
  }
}

function loadSettingsFromStorage(): DraglassSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) {
      // First run after introducing the settings screen: migrate legacy toggles.
      return {
        ...DEFAULT_SETTINGS,
        editorWrap: readLegacyBool(LEGACY_WRAP_STORAGE_KEY, DEFAULT_SETTINGS.editorWrap),
        filesShowHidden: readLegacyBool(
          LEGACY_SHOW_HIDDEN_STORAGE_KEY,
          DEFAULT_SETTINGS.filesShowHidden,
        ),
      }
    }

    return normalizeSettings(JSON.parse(raw))
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettingsToStorage(settings: DraglassSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export function useSettings(): {
  settings: DraglassSettings
  updateSettings: (update: SettingsUpdate) => void
  resetSettings: () => void
} {
  const [settings, setSettings] = useState<DraglassSettings>(() => loadSettingsFromStorage())

  useEffect(() => {
    saveSettingsToStorage(settings)
  }, [settings])

  const updateSettings = useCallback((update: SettingsUpdate) => {
    setSettings((prev) => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update }
      return normalizeSettings(next)
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  return { settings, updateSettings, resetSettings }
}
