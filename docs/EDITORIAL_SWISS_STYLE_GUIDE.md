# Editorial/Swiss Design System

**Typography-first, grid-based, minimalist design for maximum clarity**

## Philosophy

The Editorial/Swiss design language combines the clarity and precision of Swiss International Style with the hierarchy and readability of editorial design. This creates an interface that prioritizes content, uses typography as the primary design element, and maintains mathematical precision in all spacing and alignment.

### Core Principles

1. **Typography is the primary design element** - All visual hierarchy comes from type size, weight, and spacing
2. **Mathematical precision** - All spacing uses an 8px grid system with exact multiples
3. **Maximum clarity** - Every element serves a clear purpose, no decoration
4. **Functional minimalism** - Remove anything that doesn't aid comprehension
5. **High contrast** - Strong black and white with minimal color
6. **Asymmetric balance** - Dynamic layouts anchored by strong grid alignment
7. **Content-first** - The UI recedes, content takes center stage

## Color System

### Philosophy
Editorial/Swiss uses a monochromatic foundation with a single editorial accent. Color is functional, not decorative.

### Palette

#### Monochromatic Foundation (13 shades)
```css
--ed-black: #000000
--ed-gray-900: #1a1a1a
--ed-gray-800: #2b2b2b
--ed-gray-700: #404040
--ed-gray-600: #595959
--ed-gray-500: #737373
--ed-gray-400: #8c8c8c
--ed-gray-300: #a6a6a6
--ed-gray-200: #c0c0c0
--ed-gray-150: #d9d9d9
--ed-gray-100: #e6e6e6
--ed-gray-50: #f2f2f2
--ed-white: #ffffff
```

#### Editorial Accent (Classic newspaper red)
```css
--ed-accent: #cc0000        /* Primary accent */
--ed-accent-light: #e60000  /* Hover state */
--ed-accent-dark: #990000   /* Active/pressed state */
```

#### Semantic Colors (Minimal usage)
```css
--ed-link: #0051a5          /* Accessible blue for links */
--ed-success: #006600       /* Success states */
--ed-warning: #996600       /* Warnings */
--ed-error: #cc0000         /* Errors (same as accent) */
```

### Usage Guidelines

- **Use grayscale for 95% of the UI** - Let typography and whitespace create hierarchy
- **Reserve accent red for:** Important CTAs, critical alerts, selected states
- **Links use blue** - Traditional web convention for scannability
- **No gradients** - Flat colors only
- **No transparency** except for overlays - Solid colors for clarity
- **High contrast required** - Minimum 7:1 for text, 3:1 for UI elements

## Typography

### Philosophy
Typography is the soul of Editorial/Swiss design. We use serifs for content (editorial tradition) and sans-serif for UI (Swiss precision).

### Font Families

```css
--ed-font-serif: "Charter", "Iowan Old Style", "Georgia", "Palatino Linotype", serif
--ed-font-sans: "Helvetica Neue", "Helvetica", "Arial", sans-serif
--ed-font-mono: "Courier New", "Courier", monospace
```

**Serif (Charter/Georgia):** Note content, article bodies, headings in content areas
**Sans-serif (Helvetica):** UI labels, buttons, navigation, metadata, captions
**Monospace (Courier):** Code blocks, technical content, file paths

### Type Scale

Based on 1rem (16px) with 1.25 modular scale ratio:

```css
--ed-text-xs: 0.64rem      /* 10px - fine print */
--ed-text-sm: 0.8rem       /* 13px - metadata, captions */
--ed-text-base: 1rem       /* 16px - body text */
--ed-text-md: 1.25rem      /* 20px - subheadings */
--ed-text-lg: 1.563rem     /* 25px - section headings */
--ed-text-xl: 1.953rem     /* 31px - page headings */
--ed-text-2xl: 2.441rem    /* 39px - major headings */
--ed-text-3xl: 3.052rem    /* 49px - hero/display */
--ed-text-4xl: 3.815rem    /* 61px - large display */
```

### Line Heights

Optimized for readability at each scale:

```css
--ed-leading-none: 1        /* Large display type only */
--ed-leading-tight: 1.15    /* Headlines (text-xl and above) */
--ed-leading-snug: 1.3      /* Subheadings (text-md to text-lg) */
--ed-leading-normal: 1.5    /* Body text (text-base) */
--ed-leading-relaxed: 1.625 /* Long-form reading */
--ed-leading-loose: 1.75    /* Captions, metadata */
```

### Font Weights

Limited palette for clarity:

```css
--ed-weight-normal: 400     /* Body text */
--ed-weight-medium: 500     /* Slight emphasis */
--ed-weight-semibold: 600   /* Subheadings */
--ed-weight-bold: 700       /* Headings */
--ed-weight-black: 900      /* Strong emphasis (rare) */
```

### Letter Spacing

```css
--ed-tracking-tighter: -0.03em  /* Large headlines */
--ed-tracking-tight: -0.02em    /* Headings */
--ed-tracking-normal: 0         /* Body text */
--ed-tracking-wide: 0.025em     /* Small caps, labels */
--ed-tracking-wider: 0.05em     /* Uppercase UI text */
```

### Typography Usage Matrix

| Element | Family | Size | Weight | Leading | Tracking |
|---------|--------|------|--------|---------|----------|
| Page Title | Serif | 2xl-3xl | Bold | Tight | Tighter |
| Section Heading | Serif | xl | Bold | Tight | Tight |
| Subheading | Serif | md-lg | Semibold | Snug | Normal |
| Body Text | Serif | base | Normal | Normal | Normal |
| Long-form | Serif | base | Normal | Relaxed | Normal |
| UI Label | Sans | sm-base | Medium | Normal | Wide |
| Button | Sans | base | Semibold | Normal | Normal |
| Caption | Sans | sm | Normal | Loose | Wide |
| Metadata | Sans | xs-sm | Normal | Loose | Wide |
| Code | Mono | sm-base | Normal | Normal | Normal |

## Grid & Spacing

### Base Unit System

Everything is based on **8px units** for mathematical precision:

```css
--ed-unit: 8px

--ed-space-0: 0
--ed-space-1: 4px    /* 0.5 × unit */
--ed-space-2: 8px    /* 1 × unit */
--ed-space-3: 12px   /* 1.5 × unit */
--ed-space-4: 16px   /* 2 × unit */
--ed-space-5: 20px   /* 2.5 × unit */
--ed-space-6: 24px   /* 3 × unit */
--ed-space-8: 32px   /* 4 × unit */
--ed-space-10: 40px  /* 5 × unit */
--ed-space-12: 48px  /* 6 × unit */
--ed-space-16: 64px  /* 8 × unit */
--ed-space-20: 80px  /* 10 × unit */
--ed-space-24: 96px  /* 12 × unit */
```

### Spacing Guidelines

- **Component padding:** space-4 (16px) standard, space-6 (24px) generous
- **Element gaps:** space-2 (8px) tight, space-4 (16px) normal, space-6 (24px) loose
- **Section spacing:** space-8 (32px) minimum, space-12 (48px) comfortable
- **Page margins:** space-6 (24px) mobile, space-12 (48px) desktop
- **Content column max-width:** 45rem (~65-75 characters per line)

### Layout Patterns

**Newspaper Column Layout**
- Primary content: 60-65% width
- Sidebar/metadata: 35-40% width
- Clear vertical rhythm with consistent spacing

**Swiss Grid Alignment**
- All elements align to 8px grid
- Asymmetric balance (not centered)
- Strong horizontal and vertical lines
- Generous whitespace

## Components

### Buttons

**Primary Button**
```css
font-family: var(--ed-font-sans);
font-size: var(--ed-text-base);
font-weight: var(--ed-weight-semibold);
padding: var(--ed-space-3) var(--ed-space-6);
border: var(--ed-border-medium) solid var(--ed-black);
border-radius: var(--ed-radius-none); /* Sharp corners */
background: var(--ed-white);
color: var(--ed-black);
transition: all var(--ed-duration-fast) var(--ed-ease-out);
```

**Hover:** Background inverts (black bg, white text)
**Focus:** 3px offset ring
**Active:** Slight scale down (0.98)

**Accent Button** (Use sparingly)
- Same as primary but with red background
- White text
- Only for critical CTAs

**Ghost Button**
- Transparent background
- Border only
- Hover fills with subtle gray

### Inputs

**Text Input**
```css
font-family: var(--ed-font-sans);
font-size: var(--ed-text-base);
padding: var(--ed-space-3) var(--ed-space-4);
border: var(--ed-border-thin) solid var(--input-border);
border-radius: var(--ed-radius-sm); /* Minimal rounding */
background: var(--input-bg);
```

**Focus:** Border thickens to medium (2px), changes color
**Error:** Red border, red helper text below

### Cards

**Simple Card**
```css
border: var(--ed-border-thin) solid var(--panel-border);
border-radius: var(--ed-radius-none); /* Sharp corners */
background: var(--panel-bg);
padding: var(--ed-space-6);
```

**No shadows** - Separation comes from borders and whitespace
**No hover effects on non-interactive cards**
**Clear typography hierarchy inside**

### Modals/Dialogs

**Overlay:** 85% opacity black (dark mode) or 95% opacity white (light mode)
**Modal:** Sharp corners, strong border, generous padding
**Maximum width:** 60rem for readability
**Centered vertically and horizontally**
**Strong typographic hierarchy for title/body/actions**

### Navigation

**Top Bar**
- Height: 56px (7 × unit)
- Sharp bottom border
- Sans-serif labels
- Minimal icons (functional only)
- Left-aligned brand/title

**Sidebar**
- Width: 240px (30 × unit)
- Sharp right border
- List-based navigation
- Clear hover states (background change only)
- Consistent vertical spacing

## Interaction States

### Hover
- Background color change (lighten/darken one step)
- Border color change (one step stronger)
- No transform effects
- Duration: 100ms
- Easing: ease-out

### Focus
- **Keyboard focus only** (focus-visible)
- 3px solid ring, 1px offset
- High contrast (black in light mode, white in dark mode)
- Never remove focus indicators

### Active/Pressed
- Background darker
- Slight visual compression (scale 0.98) for buttons
- Immediate (no transition)

### Disabled
- 50% opacity
- Cursor not-allowed
- No hover effects

### Loading
- Minimal spinner (rotating line, not gradient)
- "Loading..." text for clarity
- Disabled state while loading

## Responsive Breakpoints

### Breakpoints
```css
--ed-breakpoint-mobile: 360px   /* Small phones */
--ed-breakpoint-tablet: 768px   /* Tablets */
--ed-breakpoint-desktop: 1280px /* Desktop */
--ed-breakpoint-wide: 1920px    /* Wide screens */
```

### Mobile-First Approach
- Start with mobile layout
- Add complexity at larger breakpoints
- Maintain content hierarchy at all sizes
- Single column → multi-column transition at tablet

### Content Width Constraints
```css
--ed-content-narrow: 45rem   /* ~65-75 chars/line */
--ed-content-medium: 60rem
--ed-content-wide: 75rem
--ed-content-full: 100%
```

**Never exceed 75 characters per line for readability**

### Mobile (< 768px)
- Single column layout
- Stack navigation
- Full-width components
- Larger touch targets (min 44px)
- Margins: space-4 (16px)

### Tablet (768px - 1279px)
- Two-column layouts possible
- Side navigation visible
- Margins: space-6 (24px)

### Desktop (1280px+)
- Full three-column layouts
- Maximum content width constraints
- Generous margins: space-12 (48px)
- Asymmetric layouts possible

## Accessibility

### Color Contrast
- **Text:** Minimum 7:1 contrast ratio (AAA)
- **UI Elements:** Minimum 3:1 contrast ratio
- **Links:** Underlined in body text, blue color for scannability

### Focus Indicators
- **Always visible** on focus-visible
- **3px ring** with 1px offset
- **High contrast** against all backgrounds
- **Never suppressed**

### Typography
- **Minimum 16px** for body text
- **Maximum 75 characters per line**
- **1.5 line-height** for body text
- **Clear hierarchy** through size and weight, not just color

### Keyboard Navigation
- Tab order follows visual order
- All interactive elements keyboard-accessible
- Skip links for main navigation
- Clear focus indicators

### Screen Readers
- Semantic HTML structure (headings, lists, landmarks)
- ARIA labels for icon-only buttons
- Status messages announced
- Form labels properly associated

### Motion
- **No decorative animations**
- **Functional transitions only** (100-150ms)
- **Respect prefers-reduced-motion**
- **No parallax or complex animations**

## Elevation & Shadows

### Philosophy
Shadows are functional, not decorative. Use minimally.

### Shadow Scale
```css
--ed-shadow-none: none                          /* Flat surfaces */
--ed-shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05)   /* Subtle lift */
--ed-shadow-base: 0 1px 3px 0 rgba(0,0,0,0.1)  /* Dropdown */
--ed-shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1) /* Card */
--ed-shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1) /* Modal */
--ed-shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1) /* High elevation */
```

### Usage
- **None:** Primary surfaces (use borders instead)
- **sm:** Hover states on interactive elements
- **base:** Dropdowns, tooltips
- **md:** Cards that need separation
- **lg:** Modals, overlays
- **xl:** Toast notifications, high-priority elements

**Prefer borders over shadows** for separation

## Motion & Transitions

### Philosophy
Motion is functional, not decorative. It guides attention and confirms actions.

### Duration
```css
--ed-duration-instant: 0ms    /* Disabled states */
--ed-duration-fast: 100ms     /* Hover, simple transitions */
--ed-duration-base: 150ms     /* Standard transitions */
--ed-duration-moderate: 200ms /* Complex transitions */
--ed-duration-slow: 300ms     /* Page transitions */
```

### Easing
```css
--ed-ease-linear: linear                    /* Progress indicators */
--ed-ease-in: cubic-bezier(0.4, 0, 1, 1)   /* Exits */
--ed-ease-out: cubic-bezier(0, 0, 0.2, 1)  /* Entrances */
--ed-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1) /* Both */
```

### Principles
- **Snappy, not smooth** - Quick transitions feel responsive
- **Ease-out for entrances** - Elements decelerate into place
- **Ease-in for exits** - Elements accelerate away
- **No spring or bounce** - Mechanical, not organic
- **Respect reduced motion** - Disable all non-essential motion

### What to Animate
✅ **Do animate:**
- Hover states (background, border)
- Focus indicators
- Modal/dropdown entrances
- Button presses
- Loading states

❌ **Don't animate:**
- Decorative effects
- Parallax scrolling
- Complex shape morphing
- Continuous animations
- Non-functional transitions

## Implementation Guidelines

### CSS Architecture
1. Import editorial-tokens.css first
2. Use CSS custom properties for all values
3. Never hardcode colors, spacing, or typography
4. Keep component styles modular
5. Use semantic class names

### Token Usage
```css
/* ✅ Good */
.button {
  padding: var(--ed-space-3) var(--ed-space-6);
  font-size: var(--ed-text-base);
  border: var(--ed-border-medium) solid var(--button-border);
}

/* ❌ Bad */
.button {
  padding: 12px 24px;
  font-size: 16px;
  border: 2px solid #595959;
}
```

### Component Checklist
For each component:
- [ ] Uses design tokens (no hardcoded values)
- [ ] Typography follows type scale and hierarchy
- [ ] Spacing uses 8px grid multiples
- [ ] Has clear hover/focus/active/disabled states
- [ ] Meets WCAG AAA contrast (7:1 for text)
- [ ] Keyboard accessible with visible focus
- [ ] Responsive at all breakpoints
- [ ] Respects prefers-reduced-motion
- [ ] No decorative elements

### Migration Strategy
1. **Phase 1:** Add editorial-tokens.css, update index.css
2. **Phase 2:** Update foundational components (Button, Input, Card)
3. **Phase 3:** Update layout shell (topbar, sidebar, main)
4. **Phase 4:** Update all screens and flows
5. **Phase 5:** Remove old design tokens and styles
6. **Phase 6:** Accessibility audit and fixes
7. **Phase 7:** Responsive testing at all breakpoints

## Dos and Don'ts

### ✅ Do
- Let typography create all hierarchy
- Use generous whitespace
- Align everything to 8px grid
- Keep borders sharp (no radius or minimal)
- Use high contrast
- Make focus indicators obvious
- Test at all breakpoints
- Prioritize readability over aesthetics

### ❌ Don't
- Add decorative elements
- Use rounded corners extensively
- Add shadows for style (only function)
- Use colors beyond the defined palette
- Center-align body text
- Remove focus indicators
- Use thin or light font weights for UI
- Exceed 75 characters per line
- Add animations without purpose
- Use gradients or textures

## Examples

### Before/After Comparisons
*(To be filled with screenshots during implementation)*

### Component Library
*(To be filled with live examples during implementation)*

## Validation Checklist

Before marking implementation complete:
- [ ] All components use editorial-tokens.css
- [ ] No hardcoded colors, spacing, or typography
- [ ] All text meets WCAG AAA contrast (7:1)
- [ ] All interactive elements have keyboard focus states
- [ ] Typography follows hierarchy and scale
- [ ] All spacing is 8px grid multiples
- [ ] Tested at 360px, 768px, 1280px breakpoints
- [ ] No visual regressions or mixed styles
- [ ] prefers-reduced-motion respected
- [ ] Documentation complete with examples

---

**Last Updated:** 2026-02-19
**Version:** 1.0
