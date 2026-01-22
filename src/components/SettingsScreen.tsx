import { useEffect, type ChangeEvent } from 'react'

import type { DraglassSettings } from '../settings'

type SettingsScreenProps = {
  open: boolean
  settings: DraglassSettings
  onChange: (update: Partial<DraglassSettings>) => void
  onClose: () => void
  onReset: () => void
}

export function SettingsScreen({ open, settings, onChange, onClose, onReset }: SettingsScreenProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose, open])

  if (!open) return null

  const onNumberChange = (key: keyof DraglassSettings) => (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const parsed = raw === '' ? Number.NaN : Number(raw)
    onChange({ [key]: parsed } as Partial<DraglassSettings>)
  }

  const onToggle = (key: keyof DraglassSettings) => (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ [key]: e.target.checked } as Partial<DraglassSettings>)
  }

  return (
    <div className="settingsOverlay" role="presentation" onMouseDown={onClose}>
      <div
        className="settingsCard"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="settingsHeader">
          <div>
            <div className="settingsTitle">Settings</div>
            <div className="settingsSubtitle">Draglass preferences stored locally</div>
          </div>
          <button type="button" className="settingsClose" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="settingsBody">
          <section className="settingsSection">
            <h3>Editor</h3>
            <label className="settingsRow">
              <span>Soft wrap</span>
              <input type="checkbox" checked={settings.editorWrap} onChange={onToggle('editorWrap')} />
            </label>
            <label className="settingsRow">
              <span>Render diagrams</span>
              <input
                type="checkbox"
                checked={settings.editorRenderDiagrams}
                onChange={onToggle('editorRenderDiagrams')}
              />
            </label>
            <label className="settingsRow settingsRow--select">
              <span>Theme</span>
              <select
                value={settings.editorTheme}
                onChange={(e) => onChange({ editorTheme: e.target.value as DraglassSettings['editorTheme'] })}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
          </section>

          <section className="settingsSection">
            <h3>Files</h3>
            <label className="settingsRow">
              <span>Remember last vault on startup</span>
              <input
                type="checkbox"
                checked={settings.vaultRememberLast}
                onChange={onToggle('vaultRememberLast')}
              />
            </label>
            <label className="settingsRow">
              <span>Show hidden/ignored paths</span>
              <input
                type="checkbox"
                checked={settings.filesShowHidden}
                onChange={onToggle('filesShowHidden')}
              />
            </label>
            <label className="settingsRow">
              <span>Remember expanded folders</span>
              <input
                type="checkbox"
                checked={settings.filesRememberExpandedFolders}
                onChange={onToggle('filesRememberExpandedFolders')}
              />
            </label>
          </section>

          <section className="settingsSection">
            <h3>Autosave</h3>
            <label className="settingsRow">
              <span>Enable autosave</span>
              <input
                type="checkbox"
                checked={settings.autosaveEnabled}
                onChange={onToggle('autosaveEnabled')}
              />
            </label>
            <label className="settingsRow settingsRow--number">
              <span>Autosave debounce (ms)</span>
              <input
                type="number"
                min={0}
                max={10000}
                value={settings.autosaveDebounceMs}
                onChange={onNumberChange('autosaveDebounceMs')}
              />
            </label>
          </section>

          <section className="settingsSection">
            <h3>Backlinks</h3>
            <label className="settingsRow">
              <span>Enable backlinks scan</span>
              <input
                type="checkbox"
                checked={settings.backlinksEnabled}
                onChange={onToggle('backlinksEnabled')}
              />
            </label>
            <label className="settingsRow settingsRow--number">
              <span>Backlinks debounce (ms)</span>
              <input
                type="number"
                min={0}
                max={10000}
                value={settings.backlinksDebounceMs}
                onChange={onNumberChange('backlinksDebounceMs')}
              />
            </label>
          </section>

          <section className="settingsSection">
            <h3>Quick Switcher</h3>
            <label className="settingsRow settingsRow--number">
              <span>Search debounce (ms)</span>
              <input
                type="number"
                min={0}
                max={2000}
                value={settings.quickSwitcherDebounceMs}
                onChange={onNumberChange('quickSwitcherDebounceMs')}
              />
            </label>
            <label className="settingsRow settingsRow--number">
              <span>Max search results</span>
              <input
                type="number"
                min={1}
                max={500}
                value={settings.quickSwitcherMaxResults}
                onChange={onNumberChange('quickSwitcherMaxResults')}
              />
            </label>
            <label className="settingsRow settingsRow--number">
              <span>Max recent notes</span>
              <input
                type="number"
                min={1}
                max={200}
                value={settings.quickSwitcherMaxRecents}
                onChange={onNumberChange('quickSwitcherMaxRecents')}
              />
            </label>
          </section>
        </div>

        <div className="settingsFooter">
          <button type="button" className="settingsReset" onClick={onReset}>
            Reset to defaults
          </button>
          <div className="settingsHint">Settings are stored locally in your browser profile.</div>
        </div>
      </div>
    </div>
  )
}

export default SettingsScreen
