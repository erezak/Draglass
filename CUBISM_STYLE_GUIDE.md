# Cubism Style Guide

This document defines the Cubism visual language applied to Draglass, including design tokens, component patterns, and usage guidelines.

## Design Philosophy

Cubism in Draglass is characterized by:

- **Geometric Precision**: Sharp angles, no rounded corners, polygonal shapes
- **Bold Contrasts**: High-contrast color palette with vivid accents
- **Fragmented Aesthetics**: Layered elements with hard shadows
- **Angular Typography**: Bold weights, uppercase transforms, wide letter-spacing
- **Linear Gradients**: Multi-color accent borders and dividers

## Design Tokens

### Color Palette

#### Dark Theme (Default)
```css
--cubism-navy: #1a1a2e          /* Primary background */
--cubism-charcoal: #16213e      /* Secondary background */
--cubism-orange: #ff6b35         /* Primary accent */
--cubism-yellow: #ffd23f         /* Secondary accent */
--cubism-cyan: #00d4ff           /* Tertiary accent */
--cubism-purple: #9d4edd         /* Optional accent */
--cubism-red: #e63946            /* Error/warning */
--cubism-green: #06ffa5          /* Success */
--cubism-white: #ffffff          /* Text on dark */
--cubism-black: #0a0a0a          /* Text on light */
```

#### Light Theme
```css
--cubism-navy: #f5f5f0           /* Primary background */
--cubism-charcoal: #e8e8dc       /* Secondary background */
/* Accent colors remain the same for both themes */
```

### Typography Scale

```css
--cubism-text-xs: 11px
--cubism-text-sm: 13px
--cubism-text-base: 15px
--cubism-text-lg: 18px
--cubism-text-xl: 24px
--cubism-text-2xl: 32px
```

**Typography Rules:**
- Font weight: 700 (bold) minimum, 900 (black) for headings
- Text transform: `uppercase` for labels, headings, buttons
- Letter spacing: 0.5px-2px depending on context
- Font family: System fonts (Arial, Helvetica, Impact)

### Spacing Scale

```css
--cubism-space-1: 4px
--cubism-space-2: 8px
--cubism-space-3: 12px
--cubism-space-4: 16px
--cubism-space-5: 24px
--cubism-space-6: 32px
--cubism-space-8: 48px
```

### Border & Radius

```css
--cubism-border-width: 3px
--cubism-border-radius: 0px     /* No rounded corners! */
```

### Shadows

```css
--cubism-shadow: 6px 6px 0px rgba(0, 0, 0, 0.4)
--cubism-shadow-strong: 10px 10px 0px rgba(0, 0, 0, 0.6)
```

**Shadow Rules:**
- Always use hard-edged box-shadows (no blur)
- Offset values: 2px-10px in X and Y
- Colors: Semi-transparent black or accent colors

## Component Patterns

### Buttons

```css
button {
  border: 3px solid var(--button-border);
  border-radius: 0;
  background: var(--button-bg);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  clip-path: polygon(5% 0, 100% 0, 95% 100%, 0 100%);
  transition: all 0.15s ease-out;
}

button:hover {
  border-color: var(--cubism-accent-primary);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--cubism-accent-primary);
}

button:active {
  transform: translate(0, 0);
  box-shadow: 2px 2px 0 var(--cubism-accent-primary);
}
```

**Button Variants:**
- Primary: Orange background, white text
- Secondary: Transparent background, orange border
- Icon: Square with angled clip-path

### Inputs & Selects

```css
input, select {
  border: 3px solid var(--panel-border);
  border-radius: 0;
  padding: 8px 12px;
  font-weight: 600;
  transition: all 0.15s ease-out;
}

input:focus, select:focus {
  border-color: var(--cubism-accent-primary);
  outline: 3px solid var(--cubism-accent-tertiary);
  outline-offset: 2px;
}
```

### Cards & Panels

```css
.card {
  border: 3px solid var(--cubism-accent-primary);
  background: var(--panel-solid);
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
  clip-path: polygon(0 0, 100% 0, 98% 100%, 2% 100%);
  position: relative;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, 
    var(--cubism-accent-primary), 
    var(--cubism-accent-secondary), 
    var(--cubism-accent-tertiary)
  );
}
```

### Tabs

```css
.tab {
  border: 3px solid var(--panel-border);
  clip-path: polygon(15% 0, 100% 0, 85% 100%, 0 100%);
  transition: all 0.15s ease-out;
}

.tab:hover {
  transform: translate(0, -2px);
  box-shadow: 0 4px 0 var(--cubism-accent-secondary);
}

.tab--active {
  border-color: var(--cubism-accent-secondary);
  background: var(--cubism-accent-primary);
  color: white;
  box-shadow: 0 4px 0 var(--cubism-accent-primary);
}
```

### List Items

```css
.listItem {
  border: 3px solid var(--panel-border);
  clip-path: polygon(0 0, 98% 0, 100% 100%, 2% 100%);
  position: relative;
  transition: all 0.15s ease-out;
}

.listItem::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--cubism-accent-primary);
  opacity: 0;
  transition: opacity 0.15s ease-out;
}

.listItem:hover {
  transform: translateX(-3px);
  box-shadow: 4px 0 0 var(--cubism-accent-secondary);
}

.listItem:hover::before {
  opacity: 1;
}
```

## Clip-path Library

Common angular shapes using CSS clip-path:

```css
/* Slight angle - buttons */
clip-path: polygon(5% 0, 100% 0, 95% 100%, 0 100%);

/* Medium angle - cards */
clip-path: polygon(0 0, 100% 0, 98% 100%, 2% 100%);

/* Vertical angle - toolbox buttons */
clip-path: polygon(0 10%, 100% 0, 100% 90%, 0 100%);

/* Strong angle - icon buttons */
clip-path: polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%);

/* Horizontal slant - tabs */
clip-path: polygon(15% 0, 100% 0, 85% 100%, 0 100%);
```

## Gradient Patterns

### Horizontal Accent Gradient
```css
background: linear-gradient(90deg, 
  var(--cubism-accent-primary) 0%, 
  var(--cubism-accent-secondary) 50%, 
  var(--cubism-accent-tertiary) 100%
);
```

### Vertical Accent Gradient
```css
background: linear-gradient(180deg, 
  var(--cubism-accent-primary) 0%, 
  var(--cubism-accent-secondary) 33%,
  var(--cubism-accent-tertiary) 66%,
  var(--cubism-accent-primary) 100%
);
```

### Diagonal Overlay
```css
background: linear-gradient(135deg, 
  transparent 40%, 
  var(--cubism-accent-primary) 100%
);
opacity: 0.2;
```

## Animation & Transitions

### Standard Transition
```css
transition: all 0.15s ease-out;
```

### Hover Effects

**Lift and Shadow:**
```css
element:hover {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--cubism-accent-secondary);
}
```

**Slide Left:**
```css
element:hover {
  transform: translateX(-3px);
  box-shadow: 4px 0 0 var(--cubism-accent-secondary);
}
```

**Scale Up:**
```css
element:hover {
  transform: scale(1.05);
  box-shadow: 2px 2px 0 var(--cubism-accent-secondary);
}
```

## Accessibility

### Focus Indicators
All interactive elements must have visible focus states:

```css
element:focus-visible {
  outline: 3px solid var(--cubism-accent-tertiary);
  outline-offset: 3px;
}
```

### Color Contrast
- Text on dark backgrounds: Use `--cubism-white` or `--text-primary`
- Text on light backgrounds: Use `--cubism-black` or `--text-primary`
- Interactive elements: Maintain 4.5:1 contrast ratio minimum
- Accent colors are high-contrast by design

### Keyboard Navigation
- Tab order follows visual hierarchy
- All focusable elements have `:focus-visible` styles
- Skip links available for main content areas

## Layout Principles

### Grid Alignment
- Use the spacing scale for consistent gaps
- Align elements to a 4px grid
- Maintain visual rhythm through repetition

### Visual Hierarchy
1. **Headers**: 900 weight, uppercase, large size, accent underlines
2. **Subheaders**: 700 weight, uppercase, medium size
3. **Body**: 600 weight, normal case, base size
4. **Labels**: 700 weight, uppercase, small size

### Depth Layers
1. Background panels
2. Content cards (with shadows)
3. Interactive elements (hover lift)
4. Modals/overlays (strong shadows)
5. Tooltips/popups (top layer)

## Usage Guidelines

### Do's ✅
- Use sharp corners everywhere
- Apply uppercase to labels, buttons, and headings
- Use bold font weights (700+)
- Add angular clip-paths to containers
- Use hard-edged box-shadows
- Apply gradient borders as accents
- Maintain high color contrast

### Don'ts ❌
- Don't use rounded corners (`border-radius > 0`)
- Don't use light font weights (< 600)
- Don't use soft/blurred shadows
- Don't mix rounded and angular styles
- Don't use subtle, low-contrast colors
- Don't use cursive or decorative fonts

## Component Checklist

When creating new components:

- [ ] Border: 3px solid, no radius
- [ ] Typography: Bold (700+), uppercase labels
- [ ] Colors: Use design tokens
- [ ] Spacing: Use spacing scale
- [ ] Shadow: Hard-edged if elevated
- [ ] Clip-path: Angular shape if appropriate
- [ ] Hover: Transform + shadow effect
- [ ] Focus: Cyan outline visible
- [ ] Active: Reduced transform/shadow
- [ ] Disabled: Reduced opacity (0.3-0.4)

## Theming

Both light and dark themes follow the same Cubism principles:

**Switching themes:**
- Color values change
- Structure remains identical
- Shadows adjust opacity
- Accent colors stay the same

**Testing both themes:**
- Verify contrast ratios
- Check shadow visibility
- Ensure accent colors pop

## Examples

See the following components for reference implementations:

- **Buttons**: `.iconButton`, `.toolboxButton`, `.vaultButton`
- **Forms**: `.settingsRow input`, `.vaultAuthInput`
- **Cards**: `.settingsCard`, `.qsCard`, `.vaultAuthModal`
- **Lists**: `.fileItem`, `.taskItem`, `.tagItem`
- **Tabs**: `.rightPaneTab`, `.leftPaneToggleButton`
- **Calendar**: `.calendarDay`, `.calendarNavButton`
- **Panels**: `.leftPaneToolbar`, `.frontmatterPanel`

## Future Considerations

### Responsive Breakpoints
- Mobile: 360px - Reduce spacing, stack elements
- Tablet: 768px - Adaptive layouts
- Desktop: 1280px+ - Full feature layout

### Dark/Light Theme Variants
- Maintain same structure
- Adjust background/text colors
- Keep accent colors consistent
- Modify shadow opacity

### Animation Enhancements
- Page transitions with angular wipes
- Loading states with geometric patterns
- Micro-interactions on key actions

---

**Version:** 1.0  
**Last Updated:** February 2026  
**Maintainer:** Draglass Design Team
