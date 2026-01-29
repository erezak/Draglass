type ToolboxProps = {
  quickSwitcherActive: boolean
  graphViewActive: boolean
  commandPaletteActive: boolean
  onOpenQuickSwitcher: () => void
  onToggleGraphView: () => void
  onOpenCommandPalette: () => void
}

export function Toolbox({
  quickSwitcherActive,
  graphViewActive,
  commandPaletteActive,
  onOpenQuickSwitcher,
  onToggleGraphView,
  onOpenCommandPalette,
}: ToolboxProps) {
  return (
    <div className="toolbox" aria-label="Toolbox">
      <button
        type="button"
        className={quickSwitcherActive ? 'toolboxButton toolboxButton--active' : 'toolboxButton'}
        onClick={onOpenQuickSwitcher}
        aria-label="Quick Switcher"
        title="Quick Switcher"
        aria-pressed={quickSwitcherActive}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="toolboxIcon" focusable="false">
          <circle cx="10" cy="10" r="6" fill="currentColor" />
          <rect
            x="14.5"
            y="14.5"
            width="6"
            height="2.6"
            rx="1.3"
            transform="rotate(45 14.5 14.5)"
            fill="currentColor"
          />
        </svg>
      </button>

      <button
        type="button"
        className={graphViewActive ? 'toolboxButton toolboxButton--active' : 'toolboxButton'}
        onClick={onToggleGraphView}
        aria-label="Graph View"
        title="Graph View"
        aria-pressed={graphViewActive}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="toolboxIcon" focusable="false">
          <circle cx="6" cy="6" r="2.5" fill="currentColor" />
          <circle cx="18" cy="7" r="2.5" fill="currentColor" />
          <circle cx="12" cy="18" r="2.5" fill="currentColor" />
          <rect x="8" y="6" width="8" height="2" rx="1" fill="currentColor" />
          <rect
            x="10.5"
            y="10.5"
            width="2"
            height="6"
            rx="1"
            transform="rotate(20 10.5 10.5)"
            fill="currentColor"
          />
        </svg>
      </button>

      <button
        type="button"
        className={commandPaletteActive ? 'toolboxButton toolboxButton--active' : 'toolboxButton'}
        onClick={onOpenCommandPalette}
        aria-label="Command Palette"
        title="Command Palette"
        aria-pressed={commandPaletteActive}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="toolboxIcon" focusable="false">
          <rect x="5" y="6" width="14" height="2.6" rx="1.3" fill="currentColor" />
          <rect x="5" y="10.7" width="14" height="2.6" rx="1.3" fill="currentColor" />
          <rect x="5" y="15.4" width="14" height="2.6" rx="1.3" fill="currentColor" />
        </svg>
      </button>
    </div>
  )
}

export default Toolbox