# Bauhaus Component Usage Patterns

## Overview

This document provides practical guidance for using and extending Bauhaus UI components in Draglass.

---

## Core Components

### Buttons

#### Standard Button

```tsx
<button className="button">
  Create Note
</button>
```

**CSS**:
```css
/* Applied automatically to all <button> elements */
border: 2px solid var(--button-border);
border-radius: var(--radius-sm);
padding: var(--space-3) var(--space-6);
font-weight: 600;
```

**States**:
- Hover: Blue border, lift effect
- Active: Blue background, white text
- Focus: Yellow outline
- Disabled: 40% opacity

#### Icon Button

```tsx
<button className="iconButton" aria-label="Settings">
  <SettingsIcon />
</button>
```

**CSS**:
```css
.iconButton {
  width: 32px;
  height: 32px;
  border: 2px solid var(--panel-border-strong);
  border-radius: var(--radius-sm);
}
```

**Usage**:
- Always include `aria-label` for accessibility
- Use for single-icon actions
- 32×32px default size (44×44px on touch devices)

#### Toolbox Button

```tsx
<button 
  className={active ? 'toolboxButton toolboxButton--active' : 'toolboxButton'}
  aria-label="Files"
>
  <FileIcon className="toolboxIcon" />
</button>
```

**CSS**:
```css
.toolboxButton {
  width: 36px;
  height: 36px;
  border: 2px solid var(--panel-border-strong);
}

.toolboxButton--active {
  border-color: var(--bauhaus-blue);
  background: var(--highlight);
  box-shadow: inset 0 0 0 2px var(--bauhaus-blue);
}
```

---

## Form Controls

### Text Input

```tsx
<input
  type="text"
  className="searchStubInput"
  placeholder="Search notes..."
/>
```

**CSS**:
```css
.searchStubInput {
  border: 2px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  font-weight: 500;
}

.searchStubInput:focus {
  border-color: var(--bauhaus-blue);
  outline: none;
}
```

**Pattern**: Always use blue border on focus, no browser outline

### Checkbox

```tsx
<input
  type="checkbox"
  className="checkbox"
  checked={value}
  onChange={handleChange}
/>
```

**CSS**:
```css
input[type='checkbox'] {
  width: 20px;
  height: 20px;
  accent-color: var(--bauhaus-blue);
  cursor: pointer;
}
```

### Select Dropdown

```tsx
<select className="select">
  <option value="dark">Dark</option>
  <option value="light">Light</option>
</select>
```

**CSS**:
```css
select {
  border: 2px solid var(--button-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  font-weight: 600;
}

select:focus {
  border-color: var(--bauhaus-blue);
  outline: none;
}
```

---

## Modals

### QuickSwitcher Pattern

```tsx
<div className="qsOverlay" onClick={handleClose}>
  <div className="qsCard" onClick={(e) => e.stopPropagation()}>
    <input className="qsInput" placeholder="Search..." />
    <div className="qsMeta">
      <span>Files</span>
      {loading && <span className="qsBusy">Loading…</span>}
    </div>
    <div className="qsList">
      {items.map((item) => (
        <button 
          key={item.id}
          className={selected === item.id ? 'qsItem qsItem--selected' : 'qsItem'}
        >
          <div className="qsItemPrimary">{item.name}</div>
          <div className="qsItemSecondary">{item.path}</div>
        </button>
      ))}
    </div>
  </div>
</div>
```

**Accent Colors**:
- QuickSwitcher: Blue border (`3px solid var(--bauhaus-blue)`)
- CommandPalette: Blue border
- TemplatePicker: Blue border
- Settings: Red border (`3px solid var(--bauhaus-red)`)
- VaultAuth: Yellow border (`3px solid var(--bauhaus-yellow)`)

### Settings Modal Pattern

```tsx
<div className="settingsOverlay" onClick={handleClose}>
  <div className="settingsCard" onClick={(e) => e.stopPropagation()}>
    <div className="settingsHeader">
      <div>
        <h2 className="settingsTitle">Settings</h2>
        <p className="settingsSubtitle">Configure Draglass</p>
      </div>
      <button className="settingsClose" onClick={handleClose}>
        Close
      </button>
    </div>
    <div className="settingsBody">
      {/* Settings content */}
    </div>
    <div className="settingsFooter">
      <button className="settingsReset">Reset</button>
    </div>
  </div>
</div>
```

---

## Lists & Navigation

### File Tree Item

```tsx
<button 
  className={isActive ? 'fileItem active' : 'fileItem'}
  onClick={handleClick}
>
  {fileName}
</button>
```

**CSS**:
```css
.fileItem {
  border: 2px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  font-weight: 500;
}

.fileItem:hover {
  border-color: var(--bauhaus-blue);
  background: var(--button-hover-bg);
  transform: translateX(2px);
}

.fileItem.active {
  border-color: var(--bauhaus-blue);
  background: var(--highlight);
  box-shadow: inset 2px 0 0 var(--bauhaus-blue);
}
```

**Pattern**: Use left accent bar for active state

### Folder Item

```tsx
<button 
  className={isSelected ? 'folderItem folderItem--selected' : 'folderItem'}
>
  <span className="caret">▶</span>
  <span className="label">{folderName}</span>
</button>
```

### Tag Item

```tsx
<button 
  className={isActive ? 'tagItem tagItem--active' : 'tagItem'}
>
  <span className="tagItemLabel">{tagName}</span>
  <span className="tagItemCount">{count}</span>
</button>
```

**Pattern**: Tags use yellow accent when active

---

## Panels & Containers

### Standard Panel

```tsx
<div className="sidebar">
  <div className="sidebarBody">
    <div className="sidebarScroll">
      {/* Scrollable content */}
    </div>
  </div>
  <div className="sidebarFooter">
    {/* Footer content */}
  </div>
</div>
```

**CSS**:
```css
.sidebar {
  padding: var(--space-3);
  border-right: 2px solid var(--panel-border);
  background: var(--panel-bg);
}
```

### Frontmatter Panel

```tsx
<div className={collapsed ? 'frontmatterPanel frontmatterPanel--collapsed' : 'frontmatterPanel'}>
  <button className="frontmatterHeaderRow" onClick={toggleCollapsed}>
    <div className="frontmatterToggle">
      <ChevronDownIcon />
    </div>
    <h2 className="frontmatterHeader">Frontmatter</h2>
  </button>
  <div className="frontmatterList">
    {/* Frontmatter items */}
  </div>
</div>
```

---

## Search Components

### Search Bar

```tsx
<div className="searchBar">
  <input 
    className="searchInput" 
    placeholder="Search in all notes..."
  />
  <button className="searchExtraToggle searchExtraToggle--active">
    REGEX
  </button>
</div>
```

**CSS**:
```css
.searchBar {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--panel-border-strong);
  border-radius: var(--radius-sm);
}

.searchBar:focus-within {
  border-color: var(--bauhaus-blue);
}
```

### Search Result

```tsx
<button className="searchHit" onClick={handleClick}>
  <div className="searchHitLineNumber">{lineNumber}</div>
  <div className="searchHitSnippet">
    Text with <span className="searchHighlight">highlighted</span> match
  </div>
</button>
```

**Highlight Pattern**:
```css
.searchHighlight {
  background: var(--bauhaus-yellow);
  color: var(--bauhaus-black);
  padding: 0 2px;
  font-weight: 700;
}
```

---

## Graph View

### Graph Header

```tsx
<div className="graphHeader">
  <div className="graphHeaderSearch">
    <input className="graphSearchInput" placeholder="Filter nodes..." />
  </div>
  <div className="graphHeaderActions">
    <button className={isLocal ? 'graphScopeToggle graphScopeToggle--local' : 'graphScopeToggle'}>
      LOCAL
    </button>
    <button className="graphRefreshButton" onClick={handleRefresh}>
      <RefreshIcon className="graphRefreshIcon" />
    </button>
    <button className="graphSettingsButton" onClick={handleSettings}>
      <SettingsIcon className="graphSettingsIcon" />
    </button>
  </div>
</div>
```

---

## Typography Patterns

### Section Headers

```tsx
<h3 style={{
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)'
}}>
  RECENT FILES
</h3>
```

**Pattern**: Small, uppercase, wide letter-spacing for section labels

### Item Labels

```tsx
<div style={{
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-primary)'
}}>
  Note Title
</div>
```

### Metadata

```tsx
<div style={{
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)'
}}>
  PATH/TO/FILE
</div>
```

---

## Color Usage Guidelines

### When to Use Each Color

**Blue (#0051BA)**:
- Interactive element borders (hover, focus, active)
- Primary action buttons
- Navigation indicators
- Modal borders (QuickSwitcher, CommandPalette)
- Link underlines (on hover)

**Red (#E1261C)**:
- Error messages
- Destructive actions
- Important warnings
- Settings modal border
- Delete confirmations

**Yellow (#FFD500)**:
- Focus outlines (accessibility)
- Search highlights
- VaultAuth modal border
- Active tags
- Attention indicators

**Neutrals**:
- Text: White/Light gray on dark, Black/Dark gray on light
- Borders: Gray scale (#3A3A3A to #4A4A4A)
- Backgrounds: Dark gray scale (#1A1A1A to #242424)

---

## Spacing Guidelines

### Component Padding

```css
/* Small components (buttons, inputs) */
padding: var(--space-2) var(--space-3);  /* 8px 12px */

/* Medium components (panels, cards) */
padding: var(--space-3) var(--space-4);  /* 12px 16px */

/* Large components (modals, containers) */
padding: var(--space-5) var(--space-6);  /* 20px 24px */
```

### Gap Spacing

```css
/* Tight items (list items) */
gap: var(--space-1);  /* 4px */

/* Normal items (form fields) */
gap: var(--space-3);  /* 12px */

/* Sections */
gap: var(--space-6);  /* 24px */
```

---

## Interaction State Checklist

When creating a new interactive component:

- [ ] Default state with 2px border
- [ ] Hover state with blue border + lift/slide effect
- [ ] Active state with blue background (if button)
- [ ] Focus state with yellow outline (2px solid, 2px offset)
- [ ] Disabled state with 40% opacity
- [ ] Cursor changes (pointer for clickable, not-allowed for disabled)
- [ ] Transition duration (100-200ms)
- [ ] Transform respects `prefers-reduced-motion`

---

## Responsive Patterns

### Mobile Adjustments

```tsx
// Reduce padding on mobile
<div className="panel" style={{
  padding: 'clamp(var(--space-2), 2vw, var(--space-3))'
}}>
```

### Touch Targets

```tsx
// Ensure 44×44px minimum on touch devices
<button 
  className="iconButton"
  style={{
    minHeight: '44px',
    minWidth: '44px'
  }}
>
```

### Responsive Text

```tsx
// Scale font sizes on mobile
<h1 style={{
  fontSize: 'clamp(1.75rem, 5vw, 2.5rem)'
}}>
```

---

## Common Patterns

### Loading State

```tsx
{loading && <span className="qsBusy">Loading…</span>}
```

### Empty State

```tsx
<div className="qsEmpty">No matches.</div>
```

### Error State

```tsx
<div className="vaultAuthError">
  Incorrect password. Please try again.
</div>
```

### Active/Selected State

```tsx
className={isActive ? 'component component--active' : 'component'}
```

### Hover with Transform

```tsx
.component:hover {
  border-color: var(--bauhaus-blue);
  background: var(--button-hover-bg);
  transform: translateX(2px);  /* or translateY(-1px) for buttons */
}
```

---

## Anti-Patterns (Avoid)

❌ **Don't** use rounded corners > 2px:
```css
/* BAD */
border-radius: 8px;

/* GOOD */
border-radius: var(--radius-sm);  /* 2px */
```

❌ **Don't** use thin borders:
```css
/* BAD */
border: 1px solid;

/* GOOD */
border: 2px solid var(--panel-border);
```

❌ **Don't** mix accent colors:
```css
/* BAD - multiple accent colors on same element */
border-color: var(--bauhaus-blue);
background: var(--bauhaus-yellow);

/* GOOD - single accent color */
border-color: var(--bauhaus-blue);
background: var(--highlight);
```

❌ **Don't** use soft shadows:
```css
/* BAD */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

/* GOOD */
box-shadow: var(--shadow-md);  /* Sharp, defined */
```

❌ **Don't** hardcode colors:
```css
/* BAD */
color: #0051BA;

/* GOOD */
color: var(--bauhaus-blue);
```

---

## Checklist for New Components

Before adding a new component:

- [ ] Uses design tokens (no hardcoded values)
- [ ] Follows 8px grid spacing
- [ ] Uses 2px borders (3px for accents)
- [ ] Uses var(--radius-sm) for border-radius
- [ ] Has all interaction states (hover, active, focus, disabled)
- [ ] Focus state uses yellow outline
- [ ] Includes aria-label if icon-only
- [ ] Respects prefers-reduced-motion
- [ ] Works at mobile/tablet/desktop breakpoints
- [ ] Matches Bauhaus visual language

---

**Maintained by**: Draglass Development Team  
**Last Updated**: 2026-02-19  
**Version**: 1.0.0
