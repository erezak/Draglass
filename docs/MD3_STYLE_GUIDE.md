# Material Design 3 Style Guide

This document describes the Material Design 3 implementation in Draglass, including design tokens, component usage, and implementation patterns.

## Overview

Draglass has been redesigned to follow Google's Material Design 3 (Material You) design language. This provides:

- **Modern Visual Language**: Clean, contemporary UI with refined shapes and elevation
- **Consistent Design System**: Standardized tokens for colors, typography, spacing, and motion
- **Enhanced Interactions**: Proper state layers (hover, focus, pressed) for all interactive elements
- **Accessibility**: Better focus indicators, color contrast, and semantic structure
- **Theme Support**: Unified dark and light themes using MD3 color roles

## Design Tokens

All design tokens are defined in `/src/md3-tokens.css` and organized into categories:

### Color System

MD3 uses semantic color roles instead of arbitrary color names:

#### Primary Colors
- `--md3-primary`: Main brand color, used for primary actions
- `--md3-on-primary`: Text/icons on primary color
- `--md3-primary-container`: Container/background for primary elements
- `--md3-on-primary-container`: Text/icons on primary container

#### Secondary Colors
- `--md3-secondary`: Supporting color for less prominent components
- `--md3-on-secondary`: Text/icons on secondary color
- `--md3-secondary-container`: Container for secondary elements (e.g., active tabs)
- `--md3-on-secondary-container`: Text/icons on secondary container

#### Tertiary Colors
- `--md3-tertiary`: Accent color for highlighting
- `--md3-on-tertiary`: Text/icons on tertiary color
- `--md3-tertiary-container`: Container for tertiary elements
- `--md3-on-tertiary-container`: Text/icons on tertiary container

#### Surface Colors
- `--md3-surface`: Default background surface
- `--md3-on-surface`: Default text/icons on surface
- `--md3-surface-variant`: Alternative surface with different emphasis
- `--md3-on-surface-variant`: Muted text/icons (labels, secondary text)

#### Surface Containers (Elevation Levels)
- `--md3-surface-container-lowest`: Level 0 (e.g., white in light theme)
- `--md3-surface-container-low`: Level 1 (panels, cards at rest)
- `--md3-surface-container`: Level 2 (default container background)
- `--md3-surface-container-high`: Level 3 (elevated cards, dialogs)
- `--md3-surface-container-highest`: Level 4 (inputs, high emphasis)

#### Error Colors
- `--md3-error`: Error state color
- `--md3-on-error`: Text/icons on error color
- `--md3-error-container`: Error background
- `--md3-on-error-container`: Text on error background

#### Outline & Borders
- `--md3-outline`: Standard border color for inputs, buttons
- `--md3-outline-variant`: Subtle dividers and separators

### Typography Scale

MD3 defines a complete type scale. Use these utility classes or CSS variables:

#### Display (Largest)
- `.md3-display-large` / `--md3-display-large-size` (57px)
- `.md3-display-medium` / `--md3-display-medium-size` (45px)
- `.md3-display-small` / `--md3-display-small-size` (36px)

#### Headline
- `.md3-headline-large` / `--md3-headline-large-size` (32px)
- `.md3-headline-medium` / `--md3-headline-medium-size` (28px)
- `.md3-headline-small` / `--md3-headline-small-size` (24px)

#### Title
- `.md3-title-large` / `--md3-title-large-size` (22px) - Section headers
- `.md3-title-medium` / `--md3-title-medium-size` (16px, weight 500) - Card titles
- `.md3-title-small` / `--md3-title-small-size` (14px, weight 500) - Small headers

#### Body (Default Text)
- `.md3-body-large` / `--md3-body-large-size` (16px) - Primary body text
- `.md3-body-medium` / `--md3-body-medium-size` (14px) - Secondary body text
- `.md3-body-small` / `--md3-body-small-size` (12px) - Captions, helper text

#### Label (UI Elements)
- `.md3-label-large` / `--md3-label-large-size` (14px, weight 500) - Buttons
- `.md3-label-medium` / `--md3-label-medium-size` (12px, weight 500) - Tabs, chips
- `.md3-label-small` / `--md3-label-small-size` (11px, weight 500) - Badges, dense UI

Each token includes `-size`, `-line-height`, `-weight`, and `-tracking` variables.

### Spacing Tokens

Based on a 4px grid system:

```css
--md3-spacing-1: 4px
--md3-spacing-2: 8px
--md3-spacing-3: 12px
--md3-spacing-4: 16px
--md3-spacing-5: 20px
--md3-spacing-6: 24px
--md3-spacing-8: 32px
--md3-spacing-10: 40px
--md3-spacing-12: 48px
--md3-spacing-16: 64px
--md3-spacing-20: 80px
--md3-spacing-24: 96px
```

**Guidelines:**
- Use spacing-1 (4px) for minimal gaps between tightly related items
- Use spacing-2 (8px) for tight spacing (e.g., icon-to-text)
- Use spacing-3 (12px) for default component padding
- Use spacing-4 (16px) for comfortable padding and larger gaps
- Use spacing-6+ for section spacing and layout

### Shape (Border Radius)

MD3 uses rounded corners throughout:

```css
--md3-shape-corner-none: 0px
--md3-shape-corner-extra-small: 4px
--md3-shape-corner-small: 8px       /* Inputs, small cards */
--md3-shape-corner-medium: 12px     /* Buttons, list items */
--md3-shape-corner-large: 16px      /* Cards, containers */
--md3-shape-corner-extra-large: 28px /* Dialogs, large surfaces */
--md3-shape-corner-full: 9999px     /* Pills, icon buttons */
```

### Elevation & Shadows

Five elevation levels with proper shadows:

```css
--md3-elevation-0: none              /* Flat surfaces */
--md3-elevation-1: /* subtle shadow */  /* Cards at rest */
--md3-elevation-2: /* light shadow */   /* Hover states */
--md3-elevation-3: /* medium shadow */  /* Dialogs, popovers */
--md3-elevation-4: /* strong shadow */  /* Modal dialogs */
--md3-elevation-5: /* strongest */      /* Floating action buttons */
```

Use utility classes: `.md3-elevation-1`, `.md3-elevation-2`, etc.

### Motion (Easing & Duration)

#### Easing Curves
- `--md3-easing-standard`: cubic-bezier(0.2, 0, 0, 1) - Most transitions
- `--md3-easing-emphasized`: Enhanced motion for important actions
- `--md3-easing-emphasized-decelerate`: Entering elements
- `--md3-easing-emphasized-accelerate`: Exiting elements

#### Duration
- `--md3-duration-short1` to `short4`: 50-200ms (micro-interactions)
- `--md3-duration-medium1` to `medium4`: 250-400ms (standard transitions)
- `--md3-duration-long1` to `long4`: 450-600ms (complex animations)
- `--md3-duration-extra-long1` to `extra-long4`: 700-1000ms (page transitions)

**Recommended:**
- Use `short2` (100ms) for instant feedback (button hover)
- Use `short4` (200ms) for standard component transitions
- Use `medium2` (300ms) for more complex state changes

### State Layers

MD3 uses semi-transparent overlays to indicate interaction states:

```css
--md3-state-hover-opacity: 0.08      /* Hover state */
--md3-state-focus-opacity: 0.12      /* Focus state */
--md3-state-pressed-opacity: 0.12    /* Active/pressed */
--md3-state-dragged-opacity: 0.16    /* Dragging */
```

**Implementation Pattern:**
```css
.my-button {
  position: relative;
}

.my-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--md3-on-surface);
  opacity: 0;
  transition: opacity var(--md3-duration-short2);
}

.my-button:hover::before {
  opacity: var(--md3-state-hover-opacity);
}
```

## Component Patterns

### Buttons

#### Icon Buttons
```css
.iconButton {
  width: 40px;
  height: 40px;
  border-radius: var(--md3-shape-corner-full);
  border: none;
  background: transparent;
  color: var(--md3-on-surface-variant);
}
```

**Features:**
- 40x40px size
- Full circle radius
- No border, transparent background
- State layer on hover/focus
- 2px primary-colored outline on focus

#### Filled Buttons
```css
button {
  padding: var(--md3-spacing-2) var(--md3-spacing-6);
  border-radius: var(--md3-shape-corner-full);
  background: var(--md3-primary);
  color: var(--md3-on-primary);
}
```

#### Outlined Buttons
```css
.outlinedButton {
  border: 1px solid var(--md3-outline);
  background: transparent;
  color: var(--md3-primary);
}
```

### Text Inputs

```css
input[type="text"] {
  padding: var(--md3-spacing-3) var(--md3-spacing-4);
  border: 1px solid var(--md3-outline);
  border-radius: var(--md3-shape-corner-small);
  background: var(--md3-surface-container-highest);
}

input:focus {
  border-color: var(--md3-primary);
  border-width: 2px;
  /* Adjust padding to prevent layout shift */
  padding: calc(var(--md3-spacing-3) - 1px) calc(var(--md3-spacing-4) - 1px);
}
```

**Focus State:**
- Border becomes 2px thick
- Border color changes to primary
- Padding reduced by 1px to prevent size change

### Lists & List Items

```css
.listItem {
  padding: var(--md3-spacing-3);
  border-radius: var(--md3-shape-corner-medium);
  background: transparent;
  position: relative;
}

.listItem::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--md3-on-surface);
  opacity: 0;
}

.listItem:hover::before {
  opacity: var(--md3-state-hover-opacity);
}

.listItem--active {
  background: var(--md3-secondary-container);
  color: var(--md3-on-secondary-container);
}
```

### Cards & Surfaces

```css
.card {
  border-radius: var(--md3-shape-corner-large);
  background: var(--md3-surface-container-high);
  box-shadow: var(--md3-elevation-1);
  padding: var(--md3-spacing-4);
}
```

### Modals & Dialogs

```css
.modalOverlay {
  background: color-mix(in srgb, var(--md3-scrim) 50%, transparent);
}

.modalCard {
  border-radius: var(--md3-shape-corner-extra-large);
  background: var(--md3-surface-container-high);
  box-shadow: var(--md3-elevation-3);
}
```

### Tabs

```css
.tab {
  width: 48px;
  height: 48px;
  border-radius: var(--md3-shape-corner-medium);
  background: transparent;
  color: var(--md3-on-surface-variant);
}

.tab--active {
  background: var(--md3-secondary-container);
  color: var(--md3-on-secondary-container);
}
```

## Accessibility Guidelines

### Focus Indicators
- All interactive elements MUST have visible focus states
- Use 2px outline in primary color with 2px offset
- Never remove outlines without providing alternative

### Color Contrast
- Text on surface: Minimum 4.5:1 ratio (WCAG AA)
- Large text (18pt+): Minimum 3:1 ratio
- Use `--md3-on-*` tokens for proper contrast

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Maintain logical tab order
- Provide keyboard shortcuts where appropriate

## Migration from Old Styles

### Color Variables
Old variables now map to MD3 tokens in `index.css`:

```css
--app-bg → var(--md3-background)
--panel-bg → var(--md3-surface-container)
--text-primary → var(--md3-on-surface)
--text-muted → var(--md3-on-surface-variant)
--button-bg → var(--md3-surface-container-highest)
--button-hover-border → var(--md3-primary)
```

### Button Changes
- Removed borders from icon buttons
- Increased touch targets (32px → 40-48px)
- Added state layer effects
- Changed from border highlights to container backgrounds

### Typography Updates
- Switched to MD3 type scale
- Added proper letter-spacing
- Consistent font weights (400 for body, 500 for labels/titles)

## Component Reference

### Updated Components

#### App Shell
- **Topbar**: Height 56px, surface-container with elevation-1
- **Toolbox**: 52px wide, icon buttons 48x48px with secondary-container active state
- **Sidebar**: surface background with outline-variant borders

#### Modals
- **Settings Dialog**: Extra-large corner radius, elevation-3
- **Quick Switcher**: Extra-large corner radius, elevation-3, scrim overlay
- **Command Palette**: Same as quick switcher

#### Lists
- **File Tree**: Medium corner radius items, state layers, secondary-container active
- **Search Results**: State layers on hover, primary color highlights
- **Tag List**: Count badges with outline-variant borders
- **Task List**: Transparent background with state layers

#### Forms
- **Settings Rows**: Medium corner radius, outline-variant borders, hover states
- **Frontmatter Panel**: State layers on rows, proper input focus states
- **Checkboxes**: accent-color: primary for native styling

#### Navigation
- **Left Pane Toggles**: Pill shape (full radius), secondary-container active
- **Right Pane Tabs**: 48x48px, medium radius, tab bar with container-low background

#### Graph View
- **Header**: surface-container background, outline-variant border
- **Search Input**: Proper focus state with 2px primary border
- **Scope Toggle**: primary-container when active

## Best Practices

### When to Use Each Surface Level
1. **surface-container-lowest**: Absolute white/black - rare, only for maximum contrast
2. **surface-container-low**: Panels, side navigation
3. **surface-container**: Default background for most containers
4. **surface-container-high**: Dialogs, elevated cards
5. **surface-container-highest**: Text inputs, dropdown menus

### Color Selection
- **Primary**: Main actions (save, submit, confirm)
- **Secondary**: Navigation, tabs, toggles
- **Tertiary**: Accents, badges (use sparingly)
- **Error**: Destructive actions, error messages
- **Surface variants**: Use for muted text and icons

### Spacing Consistency
- **Internal component spacing**: Use spacing-2 or spacing-3
- **Component padding**: Use spacing-3 or spacing-4
- **Section gaps**: Use spacing-4 or spacing-6
- **Layout margins**: Use spacing-6, spacing-8, or larger

### Animation Guidelines
- Keep most transitions under 200ms
- Use standard easing for predictability
- Avoid animating layout properties (width, height) when possible
- Prefer transform and opacity animations

## Dark/Light Theme

Both themes are fully supported via MD3 color tokens. The same component CSS works for both:

```css
.myComponent {
  background: var(--md3-surface-container);
  color: var(--md3-on-surface);
}
```

Toggle theme by changing the `data-theme` attribute:
```html
<html data-theme="light">
<!-- or -->
<html data-theme="dark">
```

## Resources

- [Material Design 3 Guidelines](https://m3.material.io/)
- [MD3 Color System](https://m3.material.io/styles/color/the-color-system/key-colors-tones)
- [MD3 Typography](https://m3.material.io/styles/typography/overview)
- [MD3 Motion](https://m3.material.io/styles/motion/overview)

---

*Last updated: 2026-02-18*
*Draglass Material Design 3 Implementation*
