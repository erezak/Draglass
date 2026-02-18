# Bauhaus Style Guide for Draglass

## Design Philosophy

The Bauhaus visual language in Draglass is inspired by the historic Bauhaus design movement (1919-1933), emphasizing **form follows function**, geometric simplicity, and bold use of primary colors.

### Core Principles

1. **Geometric Simplicity** - Use of basic geometric shapes (squares, circles, lines)
2. **Functional Aesthetics** - Every design element serves a purpose
3. **Primary Color Palette** - Bold use of red, blue, and yellow
4. **Typography** - Clean, sans-serif geometric fonts
5. **Grid-based Layouts** - Mathematical precision and order
6. **Asymmetric Balance** - Dynamic, non-centered compositions
7. **Minimal Ornamentation** - Clean, uncluttered interfaces

---

## Color Palette

### Primary Colors (Bauhaus Triad)

```css
--bauhaus-red: #E1261C      /* Primary accent - Red */
--bauhaus-blue: #0051BA     /* Primary accent - Blue */
--bauhaus-yellow: #FFD500   /* Primary accent - Yellow */
```

**Usage:**
- **Blue** - Primary interactive elements, focus states, links
- **Red** - Important actions, warnings, critical UI elements
- **Yellow** - Highlights, search results, selections

### Neutrals

#### Dark Theme (Default)
```css
--bauhaus-black: #0A0A0A
--bauhaus-dark-gray: #1A1A1A
--bauhaus-gray: #6B6B6B
--bauhaus-light-gray: #C4C4C4
--bauhaus-white: #F0F0F0
```

#### Light Theme
```css
--bauhaus-black: #0A0A0A
--bauhaus-dark-gray: #3A3A3A
--bauhaus-gray: #6B6B6B
--bauhaus-light-gray: #C4C4C4
--bauhaus-white: #F5F5F5
```

### Semantic Colors

```css
--accent-primary: var(--bauhaus-blue)
--accent-secondary: var(--bauhaus-yellow)
--accent-tertiary: var(--bauhaus-red)
```

---

## Typography

### Font Family
```css
font-family: 'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
```

**Bauhaus Typography Principles:**
- Use geometric sans-serif fonts
- Prefer bold weights (600-700) for emphasis
- Use uppercase sparingly for labels and headings
- Maintain clean, readable line-heights (1.4-1.5)

### Type Scale

| Element | Size | Weight | Use Case |
|---------|------|--------|----------|
| h1 | 2.5em (40px) | 700 | Page titles |
| h2 | 2em (32px) | 700 | Section headers |
| h3 | 1.5em (24px) | 600 | Subsection headers |
| h4 | 1.25em (20px) | 600 | Component headers |
| Body | 1em (16px) | 400-500 | Default text |
| Small | 0.875em (14px) | 500 | Secondary text |
| Label | 0.6875em (11px) | 700 UPPERCASE | UI labels, metadata |

### Letter Spacing

- **Headings:** -0.02em to -0.01em (tighter)
- **Body:** 0 (default)
- **Labels/Uppercase:** 0.05em to 0.08em (wider)

---

## Spacing System

Based on an **8px grid** for mathematical precision:

```css
--space-1: 4px   /* Tight spacing */
--space-2: 8px   /* Base unit */
--space-3: 12px  /* Small gaps */
--space-4: 16px  /* Medium gaps */
--space-5: 20px  /* Large gaps */
--space-6: 24px  /* Extra large gaps */
--space-8: 32px  /* Section spacing */
--space-10: 40px /* Major sections */
--space-12: 48px /* Layout spacing */
--space-16: 64px /* Page spacing */
```

**Usage Guidelines:**
- Use multiples of 4px for all spacing
- Component padding: `--space-3` to `--space-4`
- Section gaps: `--space-6` to `--space-8`
- Layout margins: `--space-8` to `--space-16`

---

## Border Radius

Bauhaus favors **minimal rounding** to maintain geometric clarity:

```css
--radius-none: 0px      /* Sharp corners */
--radius-sm: 2px        /* Subtle rounding (primary) */
--radius-md: 4px        /* Medium rounding */
--radius-lg: 6px        /* Larger rounding */
--radius-circle: 50%    /* Circular elements */
```

**Default:** Use `--radius-sm` (2px) for most UI elements

---

## Shadows

Bauhaus shadows are **sharp and defined**, not soft:

```css
--shadow-sm: 0 1px 3px rgba(10, 10, 10, 0.3)
--shadow-md: 0 2px 6px rgba(10, 10, 10, 0.4)
--shadow-lg: 0 4px 12px rgba(10, 10, 10, 0.5)
--shadow-xl: 0 8px 24px rgba(10, 10, 10, 0.6)
```

**Usage:**
- Cards/modals: `--shadow-lg` or `--shadow-xl`
- Elevated buttons: `--shadow-sm`
- Hover states: Increase shadow slightly

---

## Borders

Bauhaus uses **bold, defined borders**:

- Default border width: **2px**
- Important elements: **3px**
- Subtle dividers: **1px**

```css
border: 2px solid var(--panel-border);
border: 3px solid var(--bauhaus-blue); /* Accent borders */
```

---

## Motion & Transitions

Bauhaus transitions are **snappy and functional**:

```css
--transition-fast: 100ms ease-out   /* Quick interactions */
--transition-base: 200ms ease-out   /* Standard interactions */
--transition-slow: 300ms ease-out   /* Complex animations */
```

**Animation Principles:**
- Use `ease-out` for natural deceleration
- Keep animations short (100-200ms)
- Animate position, color, border, shadow
- Avoid excessive bounce or elastic effects

---

## Component Patterns

### Buttons

```css
.button {
  border-radius: var(--radius-sm);
  border: 2px solid var(--button-border);
  padding: var(--space-3) var(--space-6);
  font-weight: 600;
  background: var(--button-bg);
  transition: all var(--transition-base);
}

.button:hover {
  border-color: var(--bauhaus-blue);
  background: var(--button-hover-bg);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.button:active {
  transform: translateY(0);
  background: var(--bauhaus-blue);
  color: var(--bauhaus-white);
}

.button:focus-visible {
  outline: 2px solid var(--bauhaus-yellow);
  outline-offset: 2px;
}
```

### Input Fields

```css
.input {
  border-radius: var(--radius-sm);
  border: 2px solid var(--panel-border);
  padding: var(--space-3) var(--space-4);
  font-weight: 500;
  background: var(--button-bg);
  transition: border-color var(--transition-base);
}

.input:focus {
  border-color: var(--bauhaus-blue);
  outline: none;
}
```

### Cards/Panels

```css
.card {
  border-radius: var(--radius-sm);
  border: 2px solid var(--panel-border);
  background: var(--panel-bg);
  padding: var(--space-4);
}

.card--accent {
  border: 3px solid var(--bauhaus-blue);
  box-shadow: var(--shadow-lg);
}
```

### Modals/Overlays

```css
.modal {
  border-radius: var(--radius-sm);
  border: 3px solid var(--bauhaus-blue); /* or red/yellow */
  background: var(--panel-solid);
  box-shadow: var(--shadow-xl);
}

.overlay {
  background: var(--overlay-bg);
  backdrop-filter: blur(4px);
}
```

---

## Interaction States

### Hover States

```css
element:hover {
  border-color: var(--bauhaus-blue);
  background: var(--button-hover-bg);
  transform: translateY(-1px); /* Subtle lift */
}
```

### Active/Selected States

```css
element--active {
  border-color: var(--bauhaus-blue);
  background: var(--highlight);
  box-shadow: inset 0 0 0 2px var(--bauhaus-blue);
}
```

### Focus States

**Required for accessibility:**

```css
element:focus-visible {
  outline: 2px solid var(--bauhaus-yellow);
  outline-offset: 2px;
}
```

### Disabled States

```css
element:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}
```

---

## Accessibility

### Color Contrast

- **Dark theme:** Text on dark backgrounds meets WCAG AA (4.5:1)
- **Light theme:** Text on light backgrounds meets WCAG AA (4.5:1)
- **Accent colors:** High contrast for visibility

### Keyboard Navigation

- All interactive elements must have visible focus states
- Focus indicator: `2px solid var(--bauhaus-yellow)`
- Tab order follows visual hierarchy

### Semantic HTML

- Use proper heading hierarchy (h1 → h2 → h3)
- Use `<button>` for actions, `<a>` for navigation
- Include ARIA labels for icon-only buttons
- Use `role` attributes for custom components

---

## Layout Principles

### Grid System

- Base unit: **8px**
- Column gaps: `var(--space-4)` to `var(--space-6)`
- Use CSS Grid for complex layouts
- Use Flexbox for simple alignments

### Asymmetric Layouts

Bauhaus embraces **dynamic, off-center compositions**:

- Vary column widths (not always equal)
- Use geometric shapes as visual anchors
- Create visual hierarchy through size and position
- Balance elements through contrast, not symmetry

### Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 360px) { }

/* Tablet */
@media (max-width: 768px) { }

/* Desktop */
@media (min-width: 1280px) { }
```

---

## Special Features

### Bauhaus Accent Strip

The topbar features a tri-color accent strip representing the Bauhaus primary colors:

```css
.topbar::before {
  content: '';
  height: 3px;
  background: linear-gradient(90deg,
    var(--bauhaus-red) 0%,
    var(--bauhaus-red) 33.33%,
    var(--bauhaus-blue) 33.33%,
    var(--bauhaus-blue) 66.66%,
    var(--bauhaus-yellow) 66.66%,
    var(--bauhaus-yellow) 100%
  );
}
```

### Search Highlights

Yellow background with black text for maximum contrast:

```css
.highlight {
  background: var(--bauhaus-yellow);
  color: var(--bauhaus-black);
  font-weight: 700;
  border-radius: var(--radius-none);
}
```

---

## Implementation Examples

### Button Variants

```tsx
// Primary button
<button className="button button--primary">
  Create Note
</button>

// Icon button
<button className="iconButton">
  <SettingsIcon />
</button>

// Toolbox button (active state)
<button className="toolboxButton toolboxButton--active">
  <FileIcon />
</button>
```

### Form Inputs

```tsx
// Text input
<input
  type="text"
  className="searchInput"
  placeholder="Search notes..."
/>

// Checkbox
<input
  type="checkbox"
  className="checkbox"
/>

// Select dropdown
<select className="select">
  <option>Dark</option>
  <option>Light</option>
</select>
```

### Modal Components

```tsx
// Quick Switcher
<div className="qsOverlay">
  <div className="qsCard">
    <input className="qsInput" />
    <div className="qsMeta">Metadata</div>
    <div className="qsList">
      {/* items */}
    </div>
  </div>
</div>

// Settings
<div className="settingsOverlay">
  <div className="settingsCard">
    <div className="settingsHeader">
      <h2 className="settingsTitle">Settings</h2>
      <button className="settingsClose">Close</button>
    </div>
    {/* content */}
  </div>
</div>
```

---

## Design Tokens Reference

All design tokens are defined in `src/index.css`:

- **Colors:** `--bauhaus-*`, `--accent-*`, `--text-*`, `--button-*`
- **Spacing:** `--space-1` through `--space-16`
- **Borders:** `--radius-*`, `--panel-border*`
- **Shadows:** `--shadow-sm` through `--shadow-xl`
- **Motion:** `--transition-fast/base/slow`

---

## Visual Examples

### Color Usage

- **Blue borders** - Interactive elements, focus states
- **Red borders** - Important modals, warnings, destructive actions
- **Yellow accents** - Highlights, search results, focus indicators
- **Black/Gray** - Text, backgrounds, structural elements

### Geometric Patterns

- **Rectangles** - Cards, panels, buttons
- **Squares** - Icon buttons, toolbox items
- **Circles** - Rare, only for specific geometric accents
- **Lines** - Borders, dividers, accent strips

---

## Do's and Don'ts

### ✅ Do

- Use bold borders (2-3px)
- Apply geometric shapes consistently
- Use primary colors purposefully
- Maintain 8px grid alignment
- Create clear visual hierarchy
- Use uppercase sparingly for labels
- Ensure high contrast for accessibility

### ❌ Don't

- Use soft, blurred shadows
- Over-round corners (max 6px)
- Mix too many accent colors simultaneously
- Use decorative ornaments
- Create overly symmetrical layouts
- Use script or decorative fonts
- Animate excessively

---

## Maintenance

### When Adding New Components

1. Review existing component patterns
2. Apply Bauhaus design tokens
3. Ensure keyboard accessibility
4. Test in both dark and light themes
5. Validate color contrast ratios
6. Document new patterns in this guide

### When Updating Design Tokens

1. Update values in `src/index.css`
2. Test all affected components
3. Update this style guide
4. Check theme consistency (dark/light)
5. Run visual regression tests

---

## References

- **Original Bauhaus Movement:** 1919-1933, Weimar/Dessau/Berlin
- **Key Figures:** Walter Gropius, László Moholy-Nagy, Josef Albers
- **Design Principles:** "Form follows function," geometric abstraction
- **Color Theory:** Primary color triad (Kandinsky, Klee)
- **Typography:** Geometric sans-serif (Bayer's Universal typeface)

---

## Version History

- **v1.0** (2026-02-18) - Initial Bauhaus redesign implementation
  - Complete design token system
  - Core component library
  - Accessibility baseline
  - Responsive layouts

---

**Maintained by:** Draglass Development Team  
**Last Updated:** 2026-02-18
