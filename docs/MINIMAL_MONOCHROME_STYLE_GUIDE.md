# Minimal Monochrome Style Guide

## Design Philosophy

Minimal Monochrome is a clean, distraction-free visual language that emphasizes:
- **Simplicity**: Removing all unnecessary visual noise
- **Focus**: Pure black, white, and gray palette keeps attention on content
- **Clarity**: Clean typography and generous whitespace
- **Sophistication**: Restraint and precision in every element

## Color Palette

### Grayscale Foundation

The entire design uses a carefully calibrated 15-step grayscale:

#### Dark Theme
- `--mm-black: #000000` - Pure black, app background
- `--mm-gray-950: #0a0a0a` - Panel backgrounds
- `--mm-gray-900: #121212` - Solid panels, cards
- `--mm-gray-850: #1a1a1a` - Button hover states
- `--mm-gray-800: #262626` - Borders, highlights
- `--mm-gray-700: #404040` - Strong borders, disabled text
- `--mm-gray-600: #525252` - Hover borders
- `--mm-gray-500: #737373` - Muted text
- `--mm-gray-400: #a3a3a3` - (reserved)
- `--mm-gray-300: #d4d4d4` - Icons
- `--mm-gray-200: #e5e5e5` - (reserved)
- `--mm-gray-100: #f5f5f5` - Primary text
- `--mm-gray-50: #fafafa` - (reserved)
- `--mm-white: #ffffff` - Focus outlines, highlights

#### Light Theme
- Inverted hierarchy for light backgrounds
- White becomes the base, black for text
- Grays provide subtle differentiation

### Semantic Tokens

```css
/* Backgrounds */
--app-bg: Pure black/white base
--panel-bg: Subtle lift from base
--panel-solid: Solid panel color
--button-bg: Interactive element background

/* Borders */
--panel-border: Subtle separation
--panel-border-strong: Emphasized borders
--button-border: Default interactive borders
--button-hover-border: Hover state emphasis

/* Text */
--text-primary: High contrast, readable
--text-muted: De-emphasized content
--text-disabled: Inactive elements

/* Interaction */
--highlight: Selected/highlighted states
--overlay-bg: Modal/dialog overlays
--focus-outline: Keyboard focus indicator
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
```

System fonts ensure optimal rendering and native feel on each platform.

### Type Scale
- `--text-xs: 0.75rem` (12px) - Fine print, labels
- `--text-sm: 0.875rem` (14px) - Body text, UI elements
- `--text-base: 1rem` (16px) - Primary content
- `--text-lg: 1.125rem` (18px) - Emphasized content
- `--text-xl: 1.25rem` (20px) - Subheadings
- `--text-2xl: 1.5rem` (24px) - Section headings
- `--text-3xl: 1.875rem` (30px) - Page headings
- `--text-4xl: 2.25rem` (36px) - Hero elements

### Font Weights
- `400` - Regular text
- `500` - Medium (buttons, labels)
- `600` - Semibold (headings)
- `700` - Bold (emphasis)

## Spacing

Consistent 4px-based spacing scale:
- `--space-1: 0.25rem` (4px)
- `--space-2: 0.5rem` (8px)
- `--space-3: 0.75rem` (12px)
- `--space-4: 1rem` (16px)
- `--space-5: 1.25rem` (20px)
- `--space-6: 1.5rem` (24px)
- `--space-8: 2rem` (32px)
- `--space-10: 2.5rem` (40px)
- `--space-12: 3rem` (48px)
- `--space-16: 4rem` (64px)

## Border Radius

Minimal, sharp aesthetic:
- `--radius-none: 0` - Sharp corners (preferred)
- `--radius-sm: 2px` - Subtle softening
- `--radius-base: 4px` - Standard UI elements
- `--radius-md: 6px` - Larger components
- `--radius-lg: 8px` - Panels, cards
- `--radius-xl: 12px` - Dialogs, modals
- `--radius-full: 9999px` - Pills, badges

**Guideline**: Prefer sharp corners (`radius-none` or `radius-sm`) for most UI. Use larger radii sparingly for important containers.

## Shadows

Subtle depth without distraction:
- `--shadow-none: none` - Flat elements
- `--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5)` - Subtle lift
- `--shadow-base: 0 1px 3px rgba(0, 0, 0, 0.6)` - Standard elevation
- `--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.6)` - Popovers
- `--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.7)` - Dialogs
- `--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.8)` - Modal overlays

**Dark theme**: Heavier shadows for depth against dark backgrounds
**Light theme**: Lighter, more subtle shadows

## Transitions

Smooth, imperceptible motion:
- `--transition-fast: 100ms ease` - Micro-interactions
- `--transition-base: 150ms ease` - Standard transitions
- `--transition-slow: 200ms ease` - Emphasized changes

**Guideline**: All interactive elements should transition smoothly. Avoid jarring instant changes.

## Component Patterns

### Buttons

```css
.button {
  background: var(--button-bg);
  border: var(--border-base) solid var(--button-border);
  border-radius: var(--radius-base);
  padding: var(--space-2) var(--space-4);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  transition: all var(--transition-base);
}

.button:hover {
  background: var(--button-hover-bg);
  border-color: var(--button-hover-border);
}

.button:active {
  background: var(--button-active-bg);
}

.button:focus-visible {
  outline: var(--border-thick) solid var(--focus-outline);
  outline-offset: 2px;
}
```

### Icon Buttons

```css
.iconButton {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--button-bg);
  border: var(--border-base) solid var(--button-border);
  border-radius: var(--radius-base);
  color: var(--text-primary);
  transition: all var(--transition-base);
}
```

### Input Fields

```css
.input {
  background: var(--panel-bg);
  border: var(--border-base) solid var(--panel-border);
  border-radius: var(--radius-base);
  padding: var(--space-2) var(--space-3);
  color: var(--text-primary);
  font-size: var(--text-sm);
  transition: all var(--transition-base);
}

.input:hover {
  border-color: var(--panel-border-strong);
}

.input:focus {
  outline: var(--border-thick) solid var(--focus-outline);
  outline-offset: 2px;
  border-color: var(--panel-border-strong);
}

.input::placeholder {
  color: var(--text-muted);
}
```

### Cards/Panels

```css
.card {
  background: var(--panel-solid);
  border: var(--border-base) solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
}
```

### Modals/Dialogs

```css
.modalOverlay {
  background: var(--overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modalCard {
  background: var(--panel-solid);
  border: var(--border-base) solid var(--panel-border-strong);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-xl);
  max-width: 90vw;
}
```

## Interaction States

### Hover
- Background: Subtle shift to `--button-hover-bg`
- Border: Increase contrast to `--button-hover-border`
- Transition: `var(--transition-base)`
- **No** color changes, only grayscale shifts

### Active/Pressed
- Background: Darker `--button-active-bg`
- No border change
- Instant feedback (no transition)

### Focus (Keyboard)
- Outline: `2px solid var(--focus-outline)`
- Outline offset: `2px`
- High contrast for accessibility
- Only visible on `:focus-visible` (keyboard navigation)

### Disabled
- Opacity: `0.5`
- Cursor: `not-allowed`
- No hover/active states

### Selected/Active
- Background: `var(--highlight)`
- Border: `var(--panel-border-strong)`
- Subtle but clear differentiation

## Accessibility

### Contrast Ratios
- Primary text on backgrounds: Minimum 7:1 (AAA)
- Muted text: Minimum 4.5:1 (AA)
- Interactive elements: Clear boundaries and states

### Focus Indicators
- Always visible for keyboard navigation
- 2px solid outline in highest contrast color
- 2px offset from element
- Never remove focus indicators

### Semantic HTML
- Use proper heading hierarchy
- ARIA labels where needed
- Keyboard navigable interfaces

## Responsive Breakpoints

### Mobile First
- Base: 360px minimum width
- Small: 640px (landscape phones)
- Medium: 768px (tablets)
- Large: 1024px (small laptops)
- XL: 1280px (desktops)
- 2XL: 1536px (large screens)

### Layout Principles
- Fluid typography: Scale with viewport
- Flexible containers: Min/max widths
- Collapsible panes: Hide on mobile
- Touch targets: Minimum 44x44px

## Layout Patterns

### App Shell
```
┌─────────────────────────────────────┐
│           Top Bar (44px)            │
├──┬────────────────────────────────┬─┤
│  │                                │ │
│T │         Main Content           │R│
│o │                                │i│
│o │                                │g│
│l │                                │h│
│b │                                │t│
│o │                                │ │
│x │                                │P│
│  │                                │a│
│  │                                │n│
│  │                                │e│
└──┴────────────────────────────────┴─┘
```

### Spacing Rhythm
- Section padding: `var(--space-6)` or `var(--space-8)`
- Element gaps: `var(--space-3)` to `var(--space-4)`
- Inline gaps: `var(--space-2)`
- Generous whitespace: Don't be afraid of empty space

## Best Practices

### Do's
✓ Use pure grayscale - no tints, no colors
✓ Embrace negative space
✓ Keep typography clean and readable
✓ Use subtle shadows for depth
✓ Maintain consistent spacing
✓ Focus on content hierarchy
✓ Ensure high contrast
✓ Make interactions smooth

### Don'ts
✗ Add accent colors (breaks monochrome)
✗ Use heavy shadows (too dramatic)
✗ Mix rounded and sharp corners inconsistently
✗ Overcomplicate layouts
✗ Sacrifice accessibility for aesthetics
✗ Use decorative elements
✗ Create busy, cluttered interfaces

## Migration from Previous Styles

When updating components:
1. Replace all color tokens with monochrome equivalents
2. Simplify border radii (prefer smaller values)
3. Lighten shadows
4. Remove gradients, tints, accent colors
5. Ensure focus states use high-contrast outlines
6. Update transitions to use design tokens
7. Test in both light and dark themes

## Examples

### Before (Old Style)
```css
.button {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  color: white;
}
```

### After (Minimal Monochrome)
```css
.button {
  background: var(--button-bg);
  border: var(--border-base) solid var(--button-border);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-sm);
  color: var(--text-primary);
  transition: all var(--transition-base);
}
```

## Testing Checklist

- [ ] All text meets contrast requirements
- [ ] Focus states visible for all interactive elements
- [ ] No color-only information (use text/icons too)
- [ ] Touch targets minimum 44x44px on mobile
- [ ] Keyboard navigation works throughout
- [ ] Responsive at all breakpoints (360px, 768px, 1280px)
- [ ] Both light and dark themes work
- [ ] Smooth transitions on all interactions
- [ ] No mixed styling from old design system
- [ ] Print styles work (if applicable)

---

**Version**: 1.0  
**Last Updated**: 2026-02-18  
**Design System**: Minimal Monochrome
