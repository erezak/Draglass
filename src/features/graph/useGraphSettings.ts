import { useCallback, useEffect, useState } from 'react'

import {
  DEFAULT_GRAPH_SETTINGS,
} from './graphTypes'
import type {
  GraphDisplay,
  GraphFilters,
  GraphForces,
  GraphGroup,
  GraphScope,
  GraphSettings,
} from './graphTypes'

const SETTINGS_STORAGE_KEY = 'draglass.graph.settings.v1'

function loadSettings(): GraphSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_GRAPH_SETTINGS

    const parsed = JSON.parse(raw) as Partial<GraphSettings>

    // Merge with defaults to handle missing fields gracefully
    return {
      scope: parsed.scope === 'local' ? 'local' : 'global',
      localDepth: clampInt(parsed.localDepth, DEFAULT_GRAPH_SETTINGS.localDepth, 1, 5),
      forces: {
        centerStrength: clampFloat(
          parsed.forces?.centerStrength,
          DEFAULT_GRAPH_SETTINGS.forces.centerStrength,
          0,
          1,
        ),
        repelStrength: clampFloat(
          parsed.forces?.repelStrength,
          DEFAULT_GRAPH_SETTINGS.forces.repelStrength,
          -1000,
          0,
        ),
        linkStrength: clampFloat(
          parsed.forces?.linkStrength,
          DEFAULT_GRAPH_SETTINGS.forces.linkStrength,
          0,
          2,
        ),
        linkDistance: clampFloat(
          parsed.forces?.linkDistance,
          DEFAULT_GRAPH_SETTINGS.forces.linkDistance,
          20,
          500,
        ),
      },
      display: {
        showArrows: asBool(parsed.display?.showArrows, DEFAULT_GRAPH_SETTINGS.display.showArrows),
        textFadeThreshold: clampFloat(
          parsed.display?.textFadeThreshold,
          DEFAULT_GRAPH_SETTINGS.display.textFadeThreshold,
          0,
          2,
        ),
        nodeSize: clampFloat(
          parsed.display?.nodeSize,
          DEFAULT_GRAPH_SETTINGS.display.nodeSize,
          2,
          20,
        ),
        linkThickness: clampFloat(
          parsed.display?.linkThickness,
          DEFAULT_GRAPH_SETTINGS.display.linkThickness,
          0.5,
          5,
        ),
      },
      filters: {
        searchQuery: typeof parsed.filters?.searchQuery === 'string'
          ? parsed.filters.searchQuery
          : DEFAULT_GRAPH_SETTINGS.filters.searchQuery,
        showOrphans: asBool(
          parsed.filters?.showOrphans,
          DEFAULT_GRAPH_SETTINGS.filters.showOrphans,
        ),
      },
      groups: Array.isArray(parsed.groups) ? parsed.groups.filter(isValidGroup) : [],
    }
  } catch {
    return DEFAULT_GRAPH_SETTINGS
  }
}

function saveSettings(settings: GraphSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.round(value)))
}

function clampFloat(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, value))
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value !== 'boolean') return fallback
  return value
}

function isValidGroup(g: unknown): g is GraphGroup {
  if (typeof g !== 'object' || g === null) return false
  const group = g as Record<string, unknown>
  return (
    typeof group.id === 'string' &&
    typeof group.query === 'string' &&
    typeof group.color === 'string' &&
    typeof group.enabled === 'boolean'
  )
}

type UseGraphSettingsResult = {
  settings: GraphSettings
  setScope: (scope: GraphScope) => void
  setLocalDepth: (depth: number) => void
  setForces: (forces: Partial<GraphForces>) => void
  setDisplay: (display: Partial<GraphDisplay>) => void
  setFilters: (filters: Partial<GraphFilters>) => void
  setGroups: (groups: GraphGroup[]) => void
  addGroup: (group: Omit<GraphGroup, 'id'>) => void
  removeGroup: (id: string) => void
  updateGroup: (id: string, updates: Partial<GraphGroup>) => void
  resetSettings: () => void
}

export function useGraphSettings(): UseGraphSettingsResult {
  const [settings, setSettings] = useState<GraphSettings>(loadSettings)

  // Save to localStorage whenever settings change
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const setScope = useCallback((scope: GraphScope) => {
    setSettings((prev) => ({ ...prev, scope }))
  }, [])

  const setLocalDepth = useCallback((localDepth: number) => {
    setSettings((prev) => ({ ...prev, localDepth: Math.max(1, Math.min(5, localDepth)) }))
  }, [])

  const setForces = useCallback((forces: Partial<GraphForces>) => {
    setSettings((prev) => ({
      ...prev,
      forces: { ...prev.forces, ...forces },
    }))
  }, [])

  const setDisplay = useCallback((display: Partial<GraphDisplay>) => {
    setSettings((prev) => ({
      ...prev,
      display: { ...prev.display, ...display },
    }))
  }, [])

  const setFilters = useCallback((filters: Partial<GraphFilters>) => {
    setSettings((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
    }))
  }, [])

  const setGroups = useCallback((groups: GraphGroup[]) => {
    setSettings((prev) => ({ ...prev, groups }))
  }, [])

  const addGroup = useCallback((group: Omit<GraphGroup, 'id'>) => {
    setSettings((prev) => ({
      ...prev,
      groups: [...prev.groups, { ...group, id: crypto.randomUUID() }],
    }))
  }, [])

  const removeGroup = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g.id !== id),
    }))
  }, [])

  const updateGroup = useCallback((id: string, updates: Partial<GraphGroup>) => {
    setSettings((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_GRAPH_SETTINGS)
  }, [])

  return {
    settings,
    setScope,
    setLocalDepth,
    setForces,
    setDisplay,
    setFilters,
    setGroups,
    addGroup,
    removeGroup,
    updateGroup,
    resetSettings,
  }
}
