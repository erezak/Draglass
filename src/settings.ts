import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_TEMPLATES_FOLDER, normalizeTemplatesFolder } from './templates'
import {
  DEFAULT_DAILY_NOTES_DATE_FORMAT,
  DEFAULT_DAILY_NOTES_FOLDER,
  normalizeDailyNoteDateFormat,
  normalizeDailyNotesFolder,
} from './dailyNotes'

export type DraglassSettings = {
  editorWrap: boolean
  editorLivePreview: boolean
  editorRenderDiagrams: boolean
  editorRenderImages: boolean
  editorRenderCallouts: boolean
  editorTheme: 'dark' | 'light'
  filesShowHidden: boolean
  filesRememberExpandedFolders: boolean
  vaultRememberLast: boolean

  leftPaneOpen: boolean
  rightPaneOpen: boolean
  leftPaneWidth: number
  rightPaneWidth: number

  autosaveEnabled: boolean
  autosaveDebounceMs: number

  backlinksEnabled: boolean
  backlinksDebounceMs: number

  quickSwitcherDebounceMs: number
  quickSwitcherMaxResults: number
  quickSwitcherMaxRecents: number

  templatesFolder: string
  tasksEnabled: boolean
  tagsEnabled: boolean
  calendarEnabled: boolean
  dailyNotesEnabled: boolean
  dailyNotesFolder: string
  dailyNotesDateFormat: string
  dailyNotesTemplatePath: string
  rightPaneTab: 'links' | 'tasks' | 'tags' | 'calendar'
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
  editorRenderCallouts: true,
  editorTheme: 'dark',
  filesShowHidden: false,
  filesRememberExpandedFolders: true,
  vaultRememberLast: true,

  leftPaneOpen: true,
  rightPaneOpen: true,
  leftPaneWidth: 240,
  rightPaneWidth: 260,

  autosaveEnabled: true,
  autosaveDebounceMs: 750,

  backlinksEnabled: true,
  backlinksDebounceMs: 250,

  quickSwitcherDebounceMs: 60,
  quickSwitcherMaxResults: 50,
  quickSwitcherMaxRecents: 20,

  templatesFolder: DEFAULT_TEMPLATES_FOLDER,
  tasksEnabled: true,
  tagsEnabled: true,
  calendarEnabled: true,
  dailyNotesEnabled: true,
  dailyNotesFolder: DEFAULT_DAILY_NOTES_FOLDER,
  dailyNotesDateFormat: DEFAULT_DAILY_NOTES_DATE_FORMAT,
  dailyNotesTemplatePath: '',
  rightPaneTab: 'links',
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
    editorRenderCallouts: asBool(r.editorRenderCallouts, DEFAULT_SETTINGS.editorRenderCallouts),
    editorTheme: editorTheme ?? DEFAULT_SETTINGS.editorTheme,
    filesShowHidden: asBool(r.filesShowHidden, DEFAULT_SETTINGS.filesShowHidden),
    filesRememberExpandedFolders: asBool(
      r.filesRememberExpandedFolders,
      DEFAULT_SETTINGS.filesRememberExpandedFolders,
    ),
    vaultRememberLast: asBool(r.vaultRememberLast, DEFAULT_SETTINGS.vaultRememberLast),

    leftPaneOpen: asBool(r.leftPaneOpen, DEFAULT_SETTINGS.leftPaneOpen),
    rightPaneOpen: asBool(r.rightPaneOpen, DEFAULT_SETTINGS.rightPaneOpen),
    leftPaneWidth: clampInt(r.leftPaneWidth, DEFAULT_SETTINGS.leftPaneWidth, 80, 1400),
    rightPaneWidth: clampInt(r.rightPaneWidth, DEFAULT_SETTINGS.rightPaneWidth, 80, 1400),

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
    templatesFolder: normalizeTemplatesFolder(
      typeof r.templatesFolder === 'string' ? r.templatesFolder : DEFAULT_SETTINGS.templatesFolder,
    ),
    tasksEnabled: asBool(r.tasksEnabled, DEFAULT_SETTINGS.tasksEnabled),
    tagsEnabled: asBool(r.tagsEnabled, DEFAULT_SETTINGS.tagsEnabled),
    calendarEnabled: asBool(r.calendarEnabled, DEFAULT_SETTINGS.calendarEnabled),
    dailyNotesEnabled: asBool(r.dailyNotesEnabled, DEFAULT_SETTINGS.dailyNotesEnabled),
    dailyNotesFolder: normalizeDailyNotesFolder(
      typeof r.dailyNotesFolder === 'string' ? r.dailyNotesFolder : DEFAULT_SETTINGS.dailyNotesFolder,
    ),
    dailyNotesDateFormat: normalizeDailyNoteDateFormat(
      typeof r.dailyNotesDateFormat === 'string'
        ? r.dailyNotesDateFormat
        : DEFAULT_SETTINGS.dailyNotesDateFormat,
    ),
    dailyNotesTemplatePath:
      typeof r.dailyNotesTemplatePath === 'string'
        ? r.dailyNotesTemplatePath.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
        : DEFAULT_SETTINGS.dailyNotesTemplatePath,
    rightPaneTab:
      r.rightPaneTab === 'tasks' ||
      r.rightPaneTab === 'links' ||
      r.rightPaneTab === 'tags' ||
      r.rightPaneTab === 'calendar'
        ? r.rightPaneTab
        : DEFAULT_SETTINGS.rightPaneTab,
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
