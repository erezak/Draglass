# Retro Futurism Style Guide

## Design Philosophy

**Retro Futurism** combines the nostalgic aesthetic of 1970s-1980s science fiction with modern user interface principles. This design language evokes the optimistic vision of the future from the past—think Tron, Blade Runner, and early computer terminals—while maintaining contemporary usability standards.

### Core Visual Principles

1. **Neon & Glow**: Electric cyan, magenta, and orange accents that glow against dark backgrounds
2. **Grid Patterns**: Wireframe grids reminiscent of early 3D computer graphics
3. **Terminal Aesthetics**: Monospace fonts and command-line inspired interfaces
4. **Geometric Forms**: Angular shapes, hexagons, and circuit board patterns
5. **Scanline Effects**: Subtle CRT monitor textures and phosphor bloom
6. **Dark Space**: Deep, void-like backgrounds that emphasize luminous elements
7. **Digital Precision**: Clean lines, exact angles, and technical diagrams

---

## Color System

### Primary Palette

```css
Primary (Cyan):     #00ffff  /* Main UI accent, interactive elements */
Secondary (Magenta): #ff00ff  /* Alternate accent, highlights */
Tertiary (Orange):   #ff9500  /* Warnings, attention-grabbing */
```

### Extended Neon Palette

```css
Neon Green:  #39ff14  /* Success states */
Neon Pink:   #ff10f0  /* Alternative accent */
Neon Blue:   #0080ff  /* Info states */
Neon Yellow: #ffff00  /* Warnings */
Error Red:   #ff0055  /* Destructive actions */
```

### Backgrounds

```css
Space Black:  #0a0e27  /* Main app background */
Deep Space:   #0f1419  /* Panel backgrounds */
Void:         #060a14  /* Darkest areas */
Panel Base:   rgba(15, 20, 35, 0.85)  /* Glass panels */
```

### Text Colors

```css
Primary Text:   #e0f7ff  /* Main content */
Secondary Text: #a8d5e2  /* Subtitles, labels */
Muted Text:     #6b8a9a  /* Hints, placeholders */
Disabled Text:  #3d4f5a  /* Inactive elements */
```

### Usage Guidelines

- **Primary Cyan**: Use for all primary actions, links, active states, and focus indicators
- **Secondary Magenta**: Use for secondary actions, hover states, and alternative highlights
- **Tertiary Orange**: Use sparingly for warnings and important notifications
- **Neon Green**: Success messages, confirmations, positive indicators
- **Error Red**: Only for destructive actions and critical errors

---

## Typography

### Font Stack

```css
Display/Headers: 'Orbitron', 'Share Tech Mono', monospace
Monospace/Code:  'Courier New', 'Courier', monospace
Body Text:       system-ui, -apple-system, sans-serif
```

### Type Scale

| Token | Size | Usage |
|-------|------|-------|
| `--retro-text-xs` | 11px | Tiny labels, metadata |
| `--retro-text-sm` | 13px | Secondary text, captions |
| `--retro-text-base` | 15px | Body text, paragraph content |
| `--retro-text-lg` | 18px | Emphasized content |
| `--retro-text-xl` | 22px | Section headings |
| `--retro-text-2xl` | 28px | Page headings |
| `--retro-text-3xl` | 36px | Display headings |

### Letter Spacing

- **Headers**: Use `--retro-tracking-wide` (0.05em) for display text
- **Monospace**: Use `--retro-tracking-normal` (0) for code/terminal
- **Body**: Use `--retro-tracking-normal` (0) for readability

### Text Effects

```css
/* Glowing text for emphasis */
.retro-glow-text {
  color: var(--retro-primary);
  text-shadow: var(--retro-glow-cyan);
}

/* Terminal-style text */
.retro-terminal-text {
  font-family: var(--retro-font-mono);
  letter-spacing: var(--retro-tracking-wide);
}
```

---

## Spacing & Layout

### Spacing Scale

Use the 4px base unit system:

```css
--retro-space-1:  4px   /* Tight spacing */
--retro-space-2:  8px   /* Small gaps */
--retro-space-3:  12px  /* Default spacing */
--retro-space-4:  16px  /* Medium spacing */
--retro-space-6:  24px  /* Large spacing */
--retro-space-8:  32px  /* XL spacing */
--retro-space-12: 48px  /* Section breaks */
```

### Grid System

- Use a **20px grid overlay** for visual reference: `var(--retro-grid-size)`
- Align major UI elements to grid intersections
- Add grid background to panels for retro computer aesthetic

---

## Components

### Buttons

**Primary Button**
```css
.retro-button-primary {
  background: transparent;
  border: 2px solid var(--retro-primary);
  color: var(--retro-primary);
  padding: var(--retro-button-padding-y) var(--retro-button-padding-x);
  font-family: var(--retro-font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  transition: all var(--retro-transition-base);
  position: relative;
}

.retro-button-primary:hover {
  background: var(--retro-surface-2);
  box-shadow: var(--retro-glow-cyan);
  transform: translateY(-1px);
}

.retro-button-primary:active {
  transform: translateY(0);
}

.retro-button-primary:focus-visible {
  outline: 2px solid var(--retro-primary);
  outline-offset: 4px;
}
```

**Secondary Button**
```css
.retro-button-secondary {
  /* Similar to primary but uses magenta accent */
  border-color: var(--retro-secondary);
  color: var(--retro-secondary);
}
```

**Ghost Button**
```css
.retro-button-ghost {
  background: transparent;
  border: 1px solid var(--retro-border-base);
  color: var(--retro-text-secondary);
}

.retro-button-ghost:hover {
  border-color: var(--retro-border-strong);
  color: var(--retro-text-primary);
}
```

### Inputs

**Text Input**
```css
.retro-input {
  background: var(--retro-surface-1);
  border: 2px solid var(--retro-border-base);
  color: var(--retro-text-primary);
  font-family: var(--retro-font-mono);
  padding: var(--retro-space-3) var(--retro-space-4);
  height: var(--retro-input-height);
  transition: all var(--retro-transition-base);
}

.retro-input:focus {
  border-color: var(--retro-primary);
  box-shadow: var(--retro-glow-subtle);
  outline: none;
}

.retro-input::placeholder {
  color: var(--retro-text-muted);
  opacity: 0.6;
}
```

### Panels & Cards

**Glass Panel**
```css
.retro-panel {
  background: var(--retro-panel-base);
  backdrop-filter: var(--retro-backdrop-blur);
  border: 1px solid var(--retro-border-base);
  border-radius: var(--retro-radius-md);
  padding: var(--retro-panel-padding);
  box-shadow: var(--retro-shadow-glow-sm);
}
```

**Grid Panel** (with background grid)
```css
.retro-panel-grid {
  background-image: 
    linear-gradient(var(--retro-grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--retro-grid-color) 1px, transparent 1px);
  background-size: var(--retro-grid-size) var(--retro-grid-size);
  position: relative;
}
```

**Elevated Panel**
```css
.retro-panel-elevated {
  background: var(--retro-panel-elevated);
  border: 2px solid var(--retro-border-strong);
  box-shadow: var(--retro-shadow-glow-md);
}
```

### Modals & Dialogs

```css
.retro-modal-overlay {
  background: rgba(6, 10, 20, 0.85);
  backdrop-filter: blur(4px);
}

.retro-modal {
  background: var(--retro-panel-elevated);
  border: 2px solid var(--retro-primary);
  box-shadow: var(--retro-shadow-glow-lg);
  max-width: 600px;
  position: relative;
}

.retro-modal::before {
  /* Corner brackets decoration */
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px solid var(--retro-primary);
  opacity: 0.3;
  pointer-events: none;
}
```

### Navigation

**Tab Bar**
```css
.retro-tabs {
  display: flex;
  gap: var(--retro-space-2);
  border-bottom: 1px solid var(--retro-border-base);
}

.retro-tab {
  padding: var(--retro-space-3) var(--retro-space-4);
  border: 1px solid transparent;
  border-bottom: none;
  color: var(--retro-text-secondary);
  font-family: var(--retro-font-mono);
  text-transform: uppercase;
  font-size: var(--retro-text-sm);
  letter-spacing: 0.05em;
  transition: all var(--retro-transition-base);
}

.retro-tab:hover {
  color: var(--retro-text-primary);
  background: var(--retro-surface-1);
}

.retro-tab--active {
  color: var(--retro-primary);
  border-color: var(--retro-primary);
  border-top-color: var(--retro-primary);
  border-left-color: var(--retro-primary);
  border-right-color: var(--retro-primary);
  background: var(--retro-surface-2);
  box-shadow: var(--retro-glow-subtle);
}
```

### Lists & Tables

```css
.retro-list-item {
  padding: var(--retro-space-3);
  border-bottom: 1px solid var(--retro-border-grid);
  transition: all var(--retro-transition-fast);
}

.retro-list-item:hover {
  background: var(--retro-surface-1);
  border-color: var(--retro-border-base);
}

.retro-list-item--active {
  background: var(--retro-surface-2);
  border-left: 2px solid var(--retro-primary);
  padding-left: calc(var(--retro-space-3) - 2px);
}
```

---

## Effects & Patterns

### Glow Effects

Use sparingly for emphasis:

```css
/* Subtle glow on hover */
.element:hover {
  box-shadow: var(--retro-glow-subtle);
}

/* Intense glow for active elements */
.element--active {
  box-shadow: var(--retro-glow-intense);
}

/* Pulsing glow animation */
.element--pulsing {
  animation: retro-pulse-glow 2s ease-in-out infinite;
}
```

### Scanline Overlay

Add retro CRT effect to panels:

```css
.panel-with-scanlines {
  position: relative;
}

.panel-with-scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    transparent 1px,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 3px
  );
  pointer-events: none;
  opacity: var(--retro-scanline-opacity);
}
```

### Grid Backgrounds

```css
.with-grid {
  background-image: 
    linear-gradient(var(--retro-grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--retro-grid-color) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

---

## Motion & Transitions

### Timing Functions

- **Fast**: 100ms - Micro-interactions, hover states
- **Base**: 200ms - Default transitions, state changes
- **Slow**: 300ms - Panel animations, complex transitions

### Interaction Patterns

**Hover States**
```css
.interactive:hover {
  transform: translateY(-1px);
  box-shadow: var(--retro-glow-cyan);
  transition: all var(--retro-transition-base);
}
```

**Active/Press States**
```css
.interactive:active {
  transform: translateY(0);
  transition: all var(--retro-transition-fast);
}
```

**Focus States**
```css
.interactive:focus-visible {
  outline: 2px solid var(--retro-primary);
  outline-offset: 4px;
  box-shadow: var(--retro-glow-subtle);
}
```

---

## Accessibility

### Color Contrast

- All text must meet WCAG AA standards (4.5:1 for normal text)
- Cyan (#00ffff) on dark background (#0a0e27): ✅ 12:1 ratio
- Always provide sufficient contrast for readability
- Don't rely solely on color to convey information

### Focus Indicators

- All interactive elements must have visible focus states
- Use 2px solid outlines in primary color with 4px offset
- Ensure focus indicators are visible against all backgrounds

### Keyboard Navigation

- All functionality must be keyboard accessible
- Provide clear focus indicators for tab navigation
- Support standard keyboard shortcuts (Tab, Enter, Escape)

### Screen Readers

- Use semantic HTML elements
- Provide proper ARIA labels where needed
- Don't hide interactive elements from screen readers

---

## Responsive Design

### Breakpoints

```css
/* Mobile */
@media (max-width: 360px) {
  /* Minimal mobile layout */
}

/* Tablet */
@media (min-width: 768px) {
  /* Two-column layouts */
}

/* Desktop */
@media (min-width: 1280px) {
  /* Full three-column layout */
}
```

### Mobile Considerations

- Increase touch target sizes to minimum 44x44px
- Reduce glow effects on mobile for performance
- Simplify grid patterns on smaller screens
- Stack panels vertically on mobile

---

## Implementation Notes

### Performance

- Use CSS transforms for animations (GPU-accelerated)
- Limit backdrop-filter usage (expensive)
- Use will-change sparingly for complex animations
- Debounce expensive effects like scanlines on scroll

### Browser Compatibility

- Backdrop-filter requires vendor prefixes: `-webkit-backdrop-filter`
- Test glow effects across browsers (can vary significantly)
- Provide fallbacks for older browsers without CSS filter support

### Dark/Light Theme

- Primary design is dark mode (matches retro aesthetic)
- Light mode optional but inverts key colors
- Maintain neon accent visibility in both modes

---

## Before/After Comparison

### Current Design
- Subtle blue accent (#646cff)
- Minimal borders (rgba grays)
- Standard border radius (8px, 12px)
- Simple hover states

### Retro Futurism Design
- Neon cyan/magenta/orange accents
- Glowing borders and effects
- Angular radius (2-6px)
- Grid patterns and scanlines
- Terminal-inspired typography
- Dramatic lighting effects

---

## Component Checklist

When implementing each component:

- [ ] Apply appropriate color palette
- [ ] Use monospace/display fonts where suitable
- [ ] Add border glow effects
- [ ] Include hover/active/focus states
- [ ] Ensure keyboard accessibility
- [ ] Test color contrast
- [ ] Add subtle animations
- [ ] Verify responsive behavior
- [ ] Test in both dark/light themes

---

## Resources

### Font Recommendations

1. **Orbitron** - Geometric, futuristic display font
2. **Share Tech Mono** - Technical monospace
3. **Courier New** - Universal fallback monospace

### Color Inspiration

- Tron (1982) - Neon grids and dark spaces
- Blade Runner (1982) - Cyberpunk aesthetics
- Early computer terminals - Green/cyan phosphor displays
- 1980s arcade games - Bold neon colors

### Design References

- Synthwave aesthetics
- Outrun visual style
- Vaporwave color palettes
- Early CGI wireframe graphics

---

**Last Updated**: 2026-02-18  
**Version**: 1.0  
**Status**: Ready for implementation
