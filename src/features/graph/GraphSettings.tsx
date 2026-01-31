import { useCallback } from 'react'

import type {
  GraphDisplay,
  GraphFilters,
  GraphForces,
  GraphGroup,
  GraphScope,
} from './graphTypes'

type GraphSettingsProps = {
  open: boolean
  scope: GraphScope
  localDepth: number
  forces: GraphForces
  display: GraphDisplay
  filters: GraphFilters
  groups: GraphGroup[]
  animating: boolean
  onLocalDepthChange: (depth: number) => void
  onForcesChange: (forces: Partial<GraphForces>) => void
  onDisplayChange: (display: Partial<GraphDisplay>) => void
  onFiltersChange: (filters: Partial<GraphFilters>) => void
  onAddGroup: (group: Omit<GraphGroup, 'id'>) => void
  onRemoveGroup: (id: string) => void
  onUpdateGroup: (id: string, updates: Partial<GraphGroup>) => void
  onToggleAnimation: () => void
  onClose: () => void
}

const GROUP_COLORS = [
  '#7aa2ff',
  '#ff7a7a',
  '#7aff8e',
  '#ffca7a',
  '#c47aff',
  '#7affeb',
]

export function GraphSettings({
  open,
  scope,
  localDepth,
  forces,
  display,
  filters,
  groups,
  animating,
  onLocalDepthChange,
  onForcesChange,
  onDisplayChange,
  onFiltersChange,
  onAddGroup,
  onRemoveGroup,
  onUpdateGroup,
  onToggleAnimation,
  onClose,
}: GraphSettingsProps) {
  const handleAddGroup = useCallback(() => {
    const color = GROUP_COLORS[groups.length % GROUP_COLORS.length]
    onAddGroup({ query: '', color, enabled: true })
  }, [groups.length, onAddGroup])

  if (!open) return null

  return (
    <div className="graphSettingsPanel">
      <div className="graphSettingsHeader">
        <span className="graphSettingsTitle">Settings</span>
        <button
          type="button"
          className="graphSettingsCloseBtn"
          onClick={onClose}
          aria-label="Close settings"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="graphCloseIcon">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              d="M6 6l12 12M18 6L6 18"
            />
          </svg>
        </button>
      </div>

      <div className="graphSettingsBody">
        {/* Local graph depth */}
        {scope === 'local' && (
          <section className="graphSettingsSection">
            <h4>Local Graph</h4>
            <label className="graphSettingRow">
              <span>Depth</span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={localDepth}
                onChange={(e) => onLocalDepthChange(Number(e.target.value))}
              />
              <span className="graphSettingValue">{localDepth}</span>
            </label>
          </section>
        )}

        {/* Filters */}
        <section className="graphSettingsSection">
          <h4>Filters</h4>
          <label className="graphSettingRow">
            <span>Show orphans</span>
            <input
              type="checkbox"
              checked={filters.showOrphans}
              onChange={(e) => onFiltersChange({ showOrphans: e.target.checked })}
            />
          </label>
        </section>

        {/* Groups */}
        <section className="graphSettingsSection">
          <h4>Groups</h4>
          <div className="graphGroupsList">
            {groups.map((group) => (
              <div key={group.id} className="graphGroupItem">
                <input
                  type="checkbox"
                  checked={group.enabled}
                  onChange={(e) => onUpdateGroup(group.id, { enabled: e.target.checked })}
                  title="Enable group"
                />
                <input
                  type="color"
                  value={group.color}
                  onChange={(e) => onUpdateGroup(group.id, { color: e.target.value })}
                  title="Group color"
                  className="graphGroupColor"
                />
                <input
                  type="text"
                  value={group.query}
                  onChange={(e) => onUpdateGroup(group.id, { query: e.target.value })}
                  placeholder="Query..."
                  className="graphGroupQuery"
                />
                <button
                  type="button"
                  className="graphGroupRemove"
                  onClick={() => onRemoveGroup(group.id)}
                  title="Remove group"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="graphAddGroupBtn" onClick={handleAddGroup}>
            + Add group
          </button>
        </section>

        {/* Display */}
        <section className="graphSettingsSection">
          <h4>Display</h4>
          <label className="graphSettingRow">
            <span>Arrows</span>
            <input
              type="checkbox"
              checked={display.showArrows}
              onChange={(e) => onDisplayChange({ showArrows: e.target.checked })}
            />
          </label>
          <label className="graphSettingRow">
            <span>Text fade threshold</span>
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.1}
              value={display.textFadeThreshold}
              onChange={(e) => onDisplayChange({ textFadeThreshold: Number(e.target.value) })}
            />
            <span className="graphSettingValue">{display.textFadeThreshold.toFixed(1)}</span>
          </label>
          <label className="graphSettingRow">
            <span>Node size</span>
            <input
              type="range"
              min={2}
              max={20}
              step={1}
              value={display.nodeSize}
              onChange={(e) => onDisplayChange({ nodeSize: Number(e.target.value) })}
            />
            <span className="graphSettingValue">{display.nodeSize}</span>
          </label>
          <label className="graphSettingRow">
            <span>Link thickness</span>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={display.linkThickness}
              onChange={(e) => onDisplayChange({ linkThickness: Number(e.target.value) })}
            />
            <span className="graphSettingValue">{display.linkThickness.toFixed(1)}</span>
          </label>
          <label className="graphSettingRow">
            <span>Animate</span>
            <button
              type="button"
              className={`graphAnimateBtn ${animating ? 'graphAnimateBtn--active' : ''}`}
              onClick={onToggleAnimation}
            >
              {animating ? 'Stop' : 'Play'}
            </button>
          </label>
        </section>

        {/* Forces */}
        <section className="graphSettingsSection">
          <h4>Forces</h4>
          <label className="graphSettingRow">
            <span>Center force</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={forces.centerStrength}
              onChange={(e) => onForcesChange({ centerStrength: Number(e.target.value) })}
            />
            <span className="graphSettingValue">{forces.centerStrength.toFixed(2)}</span>
          </label>
          <label className="graphSettingRow">
            <span>Repel force</span>
            <input
              type="range"
              min={-1000}
              max={0}
              step={10}
              value={forces.repelStrength}
              onChange={(e) => onForcesChange({ repelStrength: Number(e.target.value) })}
            />
            <span className="graphSettingValue">{forces.repelStrength}</span>
          </label>
          <label className="graphSettingRow">
            <span>Link force</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={forces.linkStrength}
              onChange={(e) => onForcesChange({ linkStrength: Number(e.target.value) })}
            />
            <span className="graphSettingValue">{forces.linkStrength.toFixed(2)}</span>
          </label>
          <label className="graphSettingRow">
            <span>Link distance</span>
            <input
              type="range"
              min={20}
              max={500}
              step={10}
              value={forces.linkDistance}
              onChange={(e) => onForcesChange({ linkDistance: Number(e.target.value) })}
            />
            <span className="graphSettingValue">{forces.linkDistance}</span>
          </label>
        </section>
      </div>
    </div>
  )
}
