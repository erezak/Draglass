# Glassmorphism Style Guide for Draglass

## Overview

This document describes the Glassmorphism design system implemented in Draglass. Glassmorphism is a modern UI design trend characterized by translucent, frosted-glass effects with background blur, subtle borders, and layered transparency.

## Design Principles

1. **Transparency & Layering**: Use semi-transparent backgrounds with backdrop blur to create depth
2. **Subtle Borders**: Light borders (10-15% opacity) to define component boundaries
3. **Soft Shadows**: Layered shadows to enhance depth and elevation
4. **Smooth Transitions**: All interactions should feel fluid with smooth animations
5. **Glassmorphic Hierarchy**: More important elements have stronger blur and shadow effects

## Design Tokens

### Color System

#### Dark Theme
- **Background Gradient**: `linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%)`
- **Glass Backgrounds**:
  - `--glass-bg`: `rgba(255, 255, 255, 0.06)` - Standard glass panels
  - `--glass-bg-strong`: `rgba(255, 255, 255, 0.1)` - Emphasized glass panels
  - `--panel-bg`: `rgba(255, 255, 255, 0.05)` - Light backgrounds
  - `--modal-bg`: `rgba(20, 25, 40, 0.92)` - Modal overlays

#### Light Theme
- **Background Gradient**: `linear-gradient(135deg, #e8ecf5 0%, #f5f7fc 100%)`
- **Glass Backgrounds**:
  - `--glass-bg`: `rgba(255, 255, 255, 0.55)` - Standard glass panels
  - `--glass-bg-strong`: `rgba(255, 255, 255, 0.75)` - Emphasized glass panels
  - `--panel-bg`: `rgba(255, 255, 255, 0.6)` - Light backgrounds
  - `--modal-bg`: `rgba(245, 247, 252, 0.95)` - Modal overlays

### Blur Effects

- `--blur-sm`: `blur(8px)` - Subtle blur for small components
- `--blur-md`: `blur(12px)` - Medium blur for panels
- `--blur-lg`: `blur(20px)` - Large blur for overlays
- `--blur-xl`: `blur(32px)` - Extra large blur for modals

### Shadows

- `--shadow-sm`: `0 2px 8px rgba(0, 0, 0, 0.15)` - Subtle elevation
- `--shadow-md`: `0 4px 16px rgba(0, 0, 0, 0.2)` - Medium elevation
- `--shadow-lg`: `0 8px 32px rgba(0, 0, 0, 0.3)` - High elevation
- `--shadow-xl`: `0 16px 48px rgba(0, 0, 0, 0.4)` - Maximum elevation

### Border Radius

- `--radius-sm`: `8px` - Small components (buttons, inputs)
- `--radius-md`: `12px` - Medium components (cards, panels)
- `--radius-lg`: `16px` - Large components (modals, containers)
- `--radius-xl`: `20px` - Extra large components
- `--radius-full`: `9999px` - Fully rounded (pills, badges)

### Transitions

- `--transition-fast`: `150ms cubic-bezier(0.4, 0, 0.2, 1)` - Quick interactions
- `--transition-base`: `250ms cubic-bezier(0.4, 0, 0.2, 1)` - Standard transitions
- `--transition-slow`: `350ms cubic-bezier(0.4, 0, 0.2, 1)` - Slow, emphasized transitions

### Accent Colors

#### Dark Theme
- `--accent-primary`: `rgba(120, 130, 255, 1)` - Primary accent
- `--accent-glass`: `rgba(120, 130, 255, 0.15)` - Glass tinted background
- `--accent-glass-hover`: `rgba(120, 130, 255, 0.25)` - Glass tinted hover state

#### Light Theme
- `--accent-primary`: `rgba(80, 95, 180, 1)` - Primary accent
- `--accent-glass`: `rgba(80, 95, 180, 0.15)` - Glass tinted background
- `--accent-glass-hover`: `rgba(80, 95, 180, 0.25)` - Glass tinted hover state

## Component Patterns

### Buttons

#### Icon Button
```css
.iconButton {
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.iconButton:hover {
  border-color: var(--button-hover-border);
  background: var(--accent-glass-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

**Usage**: Icon-only buttons in toolbars, headers, and action areas

#### Action Button
```css
.leftPaneActionButton {
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.leftPaneActionButton:hover {
  border-color: var(--button-hover-border);
  background: var(--accent-glass-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

**Usage**: Text buttons with icons for primary actions

### Inputs

```css
.input {
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  transition: all var(--transition-fast);
}

.input:focus {
  border-color: var(--button-hover-border);
  background: var(--glass-bg-strong);
  box-shadow: var(--shadow-md);
}
```

**Usage**: Text inputs, search bars, and form fields

### Cards and List Items

```css
.card {
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.card:hover {
  background: var(--accent-glass-hover);
  border-color: var(--button-hover-border);
  transform: translateX(2px); /* Or translateY(-1px) for vertical lists */
  box-shadow: var(--shadow-md);
}
```

**Usage**: File items, link items, tag items, task items, search results

### Modals and Overlays

```css
.modalOverlay {
  background: var(--overlay-bg);
  backdrop-filter: var(--blur-lg);
}

.modalCard {
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--modal-bg);
  backdrop-filter: var(--blur-xl);
  box-shadow: var(--shadow-xl);
}
```

**Usage**: Settings, quick switcher, vault auth, command palette

### Panels and Sidebars

```css
.panel {
  background: var(--glass-bg);
  backdrop-filter: var(--blur-md);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-sm);
}
```

**Usage**: Sidebars, toolbox, right pane, graph settings

## Interaction States

### Hover Effects

Standard hover pattern for interactive elements:
```css
element:hover {
  border-color: var(--button-hover-border);
  background: var(--accent-glass-hover);
  transform: translateY(-1px); /* Or translateX(2px) for horizontal lists */
  box-shadow: var(--shadow-md);
}
```

### Active/Selected States

```css
element.active,
element--active {
  border-color: var(--button-hover-border);
  background: var(--accent-glass);
  box-shadow: var(--shadow-md);
}
```

### Focus States

```css
element:focus,
element:focus-visible {
  outline: 2px solid var(--button-hover-border);
  outline-offset: 2px;
}
```

For inputs and form elements:
```css
input:focus {
  border-color: var(--button-hover-border);
  background: var(--glass-bg-strong);
  box-shadow: var(--shadow-md);
}
```

### Disabled States

```css
element:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## Best Practices

### DO

✅ Use backdrop-filter with -webkit-backdrop-filter for browser compatibility
✅ Layer multiple glass effects for depth (lighter overlays on darker backgrounds)
✅ Use subtle transforms on hover (1-2px) for micro-interactions
✅ Combine glass backgrounds with soft shadows for elevation
✅ Use transitions on all interactive elements for smooth feedback
✅ Keep borders subtle (10-15% opacity) to maintain glass effect

### DON'T

❌ Don't use solid backgrounds (breaks the glass illusion)
❌ Don't skip backdrop-filter (essential for the frosted-glass effect)
❌ Don't use harsh shadows (keep them soft and layered)
❌ Don't forget to add hover states with visual feedback
❌ Don't use high-contrast borders (they compete with the glass effect)
❌ Don't overcomplicate - glassmorphism works best with simple, clean layouts

## Accessibility

### Color Contrast

While glassmorphism uses transparency, ensure text maintains sufficient contrast:
- Primary text should use `--text-primary` (95% opacity in dark, solid in light)
- Secondary text should use `--text-secondary` (75% opacity)
- Muted text should use `--text-muted` (60% opacity)

### Focus Indicators

All interactive elements must have visible focus indicators:
```css
element:focus-visible {
  outline: 2px solid var(--button-hover-border);
  outline-offset: 2px;
}
```

### Motion Sensitivity

Respect user preferences for reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Implementation Notes

### Browser Support

- **backdrop-filter**: Supported in all modern browsers (Chrome 76+, Firefox 103+, Safari 9+)
- Always include `-webkit-backdrop-filter` for Safari compatibility
- Consider fallback for older browsers (solid backgrounds with opacity)

### Performance Considerations

- Backdrop blur can be GPU-intensive on low-end devices
- Use blur sparingly on elements that animate or scroll frequently
- Consider reducing blur complexity on mobile devices

### Dark/Light Theme Support

All glassmorphism tokens automatically adapt to theme changes via CSS custom properties. The system provides:
- Automatic contrast adjustment
- Appropriate opacity levels for each theme
- Consistent visual hierarchy across themes

## Migration from Previous Design

The glassmorphism redesign maintains all existing functionality while updating the visual language:

### Changed
- All backgrounds now use glass effects with blur
- Borders reduced to 10-15% opacity
- Added subtle shadows for depth
- Smooth transitions on all interactions
- Hover states include micro-animations

### Maintained
- All component functionality
- Keyboard navigation
- Information architecture
- Responsive breakpoints
- Accessibility features

## Examples

### Before/After Comparison

**Before** (Flat design):
```css
.button {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}
```

**After** (Glassmorphism):
```css
.button {
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  -webkit-backdrop-filter: var(--blur-sm);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.button:hover {
  background: var(--accent-glass-hover);
  border-color: var(--button-hover-border);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

## Resources

- [Glassmorphism.com](https://glassmorphism.com/) - Glassmorphism design generator
- [CSS Backdrop Filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) - MDN Documentation
- [Design System Tokens](./DESIGN_TOKENS.md) - Full token reference (if created)

---

**Last Updated**: 2026-02-18
**Version**: 1.0.0
