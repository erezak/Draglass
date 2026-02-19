# Skeuomorphic Revival Style Guide

## Design Philosophy

Skeuomorphic Revival is a modern interpretation of classic skeuomorphic design, bringing realistic materials, textures, and physical metaphors into digital interfaces. This approach emphasizes:

- **Material authenticity**: Leather, wood, metal, and paper surfaces with realistic textures
- **Tactile feedback**: Embossed buttons, debossed inputs, raised panels
- **Physical depth**: Multi-layered shadows, bevels, and lighting effects
- **Real-world metaphors**: Visual elements that mimic physical objects
- **Craftsmanship**: Attention to detail in every texture and surface

## Core Principles

### 1. Material Hierarchy
Different UI surfaces use different materials to establish visual hierarchy:
- **Primary surfaces**: Rich leather backgrounds
- **Secondary surfaces**: Warm wood panels
- **Interactive elements**: Bronze and brass metals
- **Content areas**: Clean paper and linen textures

### 2. Depth Through Light
Realistic lighting creates depth:
- **Top-down lighting**: Light source from above (embossed surfaces)
- **Highlight edges**: Top/left edges are lighter
- **Shadow edges**: Bottom/right edges are darker
- **Multi-layer shadows**: Combine inset, emboss, and float shadows

### 3. Tactile Interactions
Interactions should feel physical:
- **Buttons**: Raised when idle, pressed when active
- **Inputs**: Debossed (inset) to receive content
- **Toggles**: Physical switches with realistic motion
- **Sliders**: Grooved tracks with dimensional handles

## Design Tokens

All design values are defined as CSS custom properties in `src/skeuomorphic-tokens.css`.

### Material Colors

#### Leather Tones (Primary Surfaces)
```css
--skeuo-leather-dark: #3d2817
--skeuo-leather-medium: #5a3e2b
--skeuo-leather-light: #8b6f47
--skeuo-leather-tan: #c9a882
```

#### Wood Tones (Secondary Surfaces)
```css
--skeuo-wood-dark: #4a2511
--skeuo-wood-walnut: #6b3410
--skeuo-wood-oak: #8b5a3c
--skeuo-wood-maple: #c19a6b
```

#### Metal Tones (Interactive Elements)
```css
--skeuo-metal-bronze: #cd7f32
--skeuo-metal-brass: #b5a642
--skeuo-metal-silver: #c0c0c0
--skeuo-metal-steel: #71797e
```

#### Paper & Fabric (Content Areas)
```css
--skeuo-paper-cream: #f4f1e8
--skeuo-paper-white: #fafaf8
--skeuo-fabric-linen: #e8e4d0
--skeuo-fabric-canvas: #d4cdb4
```

### Shadow System

#### Embossed (Raised) Shadows
Create the appearance of elements raised above the surface:
```css
--skeuo-shadow-emboss-sm: Small raised element (2px lift)
--skeuo-shadow-emboss-md: Medium raised element (4px lift)
--skeuo-shadow-emboss-lg: Large raised element (8px lift)
--skeuo-shadow-emboss-xl: Extra large raised element (16px lift)
```

**Usage**: Buttons, cards, panels, toolbars

#### Inset (Debossed) Shadows
Create the appearance of elements pressed into the surface:
```css
--skeuo-shadow-inset-sm: Shallow inset (1-3px depth)
--skeuo-shadow-inset-md: Medium inset (2-5px depth)
--skeuo-shadow-inset-lg: Deep inset (3-8px depth)
```

**Usage**: Text inputs, search fields, content wells

#### Floating Shadows
Elevate elements above the base layer:
```css
--skeuo-shadow-float-sm: Subtle elevation (2px)
--skeuo-shadow-float-md: Medium elevation (4px)
--skeuo-shadow-float-lg: High elevation (8px)
--skeuo-shadow-float-xl: Maximum elevation (12px)
```

**Usage**: Modals, dropdowns, tooltips, popovers

### Typography

#### Font Stacks
```css
--skeuo-font-serif: Georgia, Times New Roman, serif
--skeuo-font-sans: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif
--skeuo-font-mono: SF Mono, Monaco, Courier New, monospace
```

#### Type Scale
```css
--skeuo-text-xs: 0.75rem   (12px)
--skeuo-text-sm: 0.875rem  (14px)
--skeuo-text-base: 1rem    (16px)
--skeuo-text-lg: 1.125rem  (18px)
--skeuo-text-xl: 1.25rem   (20px)
--skeuo-text-2xl: 1.5rem   (24px)
--skeuo-text-3xl: 1.875rem (30px)
```

#### Text Effects
```css
--skeuo-text-shadow-emboss: Raised text effect
--skeuo-text-shadow-engrave: Carved text effect
```

### Spacing
8px base grid:
```css
--skeuo-space-xs: 4px
--skeuo-space-sm: 8px
--skeuo-space-md: 12px
--skeuo-space-lg: 16px
--skeuo-space-xl: 24px
--skeuo-space-2xl: 32px
--skeuo-space-3xl: 48px
```

### Border Radius
Subtle curves maintain realism:
```css
--skeuo-radius-none: 0px
--skeuo-radius-sm: 3px
--skeuo-radius-md: 6px
--skeuo-radius-lg: 10px
--skeuo-radius-xl: 14px
--skeuo-radius-round: 999px
```

### Textures

#### Leather Grain
```css
--skeuo-texture-leather: Subtle grain pattern
--skeuo-texture-leather-size: 40px 40px, 30px 30px, 25px 25px
```

#### Wood Grain
```css
--skeuo-texture-wood: Vertical grain lines
--skeuo-texture-wood-size: 3px 100%, 100% 100%
```

#### Paper/Fabric
```css
--skeuo-texture-paper: Fine texture dots
--skeuo-texture-paper-size: 4px 4px
```

#### Brushed Metal
```css
--skeuo-texture-metal: Horizontal brushed lines
--skeuo-texture-metal-size: 100% 2px
```

## Component Patterns

### Button (Raised Metal)

**Idle State:**
```css
.button {
  background: var(--skeuo-surface-metal);
  border: 1px solid var(--skeuo-border-medium-strength);
  border-radius: var(--skeuo-radius-md);
  box-shadow: var(--skeuo-shadow-emboss-md);
  color: var(--skeuo-text-on-dark);
  padding: var(--skeuo-space-sm) var(--skeuo-space-lg);
  transition: all var(--skeuo-transition-base) var(--skeuo-ease-default);
}
```

**Hover State:**
```css
.button:hover {
  box-shadow: var(--skeuo-shadow-emboss-lg);
  transform: translateY(-1px);
  background: linear-gradient(135deg, #9aa2a9 0%, #8a9199 50%, #9aa2a9 100%);
}
```

**Active State:**
```css
.button:active {
  box-shadow: var(--skeuo-shadow-inset-sm);
  transform: translateY(0px);
}
```

**Focus State:**
```css
.button:focus-visible {
  outline: var(--skeuo-focus-ring);
  outline-offset: var(--skeuo-focus-offset);
  box-shadow: 
    var(--skeuo-shadow-emboss-md),
    var(--skeuo-focus-glow);
}
```

### Text Input (Debossed Paper)

```css
.input {
  background: var(--skeuo-surface-paper);
  background-image: var(--skeuo-texture-paper);
  background-size: var(--skeuo-texture-paper-size);
  border: 1px solid var(--skeuo-border-subtle);
  border-radius: var(--skeuo-radius-sm);
  box-shadow: var(--skeuo-shadow-inset-md);
  color: var(--skeuo-text-on-light);
  padding: var(--skeuo-space-sm) var(--skeuo-space-md);
}

.input:focus {
  outline: var(--skeuo-focus-ring);
  outline-offset: 2px;
  border-color: var(--skeuo-interactive-bronze);
}
```

### Card (Leather Panel)

```css
.card {
  background: var(--skeuo-surface-leather);
  background-image: var(--skeuo-texture-leather);
  background-size: var(--skeuo-texture-leather-size);
  border: 1px solid var(--skeuo-border-subtle);
  border-radius: var(--skeuo-radius-lg);
  box-shadow: var(--skeuo-shadow-emboss-lg);
  padding: var(--skeuo-space-xl);
}
```

### Modal (Floating Wood Panel)

```css
.modal {
  background: var(--skeuo-surface-wood);
  background-image: var(--skeuo-texture-wood);
  background-size: var(--skeuo-texture-wood-size);
  border: 2px solid var(--skeuo-border-strong);
  border-radius: var(--skeuo-radius-xl);
  box-shadow: var(--skeuo-shadow-float-xl);
  padding: var(--skeuo-space-2xl);
}
```

### Toggle Switch (Physical Switch)

```css
.toggle {
  position: relative;
  width: 48px;
  height: 24px;
  background: var(--skeuo-surface-metal);
  border: 1px solid var(--skeuo-border-medium-strength);
  border-radius: var(--skeuo-radius-round);
  box-shadow: var(--skeuo-shadow-inset-md);
  transition: background var(--skeuo-transition-base);
}

.toggle::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  top: 2px;
  left: 2px;
  background: var(--skeuo-surface-paper);
  border: 1px solid var(--skeuo-border-subtle);
  border-radius: 50%;
  box-shadow: var(--skeuo-shadow-emboss-sm);
  transition: transform var(--skeuo-transition-base) var(--skeuo-ease-bounce);
}

.toggle[aria-checked="true"]::after {
  transform: translateX(24px);
}
```

## Interaction States

### Hover
- Increase shadow intensity
- Subtle lift effect (translateY(-1px))
- Lighten gradient by 5-10%
- Transition duration: 250ms

### Active/Pressed
- Inset shadow (debossed appearance)
- Reset transform (translateY(0))
- Darken gradient slightly
- Transition duration: 150ms

### Focus
- Bronze outline ring (2px solid)
- Glow effect (box-shadow)
- Maintain base appearance
- Never remove focus indicators

### Disabled
- Reduce opacity to 0.5
- Grayscale filter
- Remove shadows
- Cursor: not-allowed

## Accessibility Guidelines

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Visible focus indicators on all focusable elements
- Logical tab order throughout the interface
- Escape key closes modals and dropdowns

### Focus Indicators
```css
:focus-visible {
  outline: var(--skeuo-focus-ring);
  outline-offset: var(--skeuo-focus-offset);
  box-shadow: var(--skeuo-focus-glow);
}
```

### Color Contrast
- Text on dark surfaces: Minimum 7:1 contrast ratio
- Text on light surfaces: Minimum 4.5:1 contrast ratio
- Interactive elements: Minimum 3:1 contrast with background
- Always test with actual color combinations

### Semantic HTML
- Use proper heading hierarchy (h1, h2, h3, etc.)
- Button elements for actions, links for navigation
- Form labels associated with inputs
- ARIA labels where visual context isn't sufficient

### Motion & Animation
Respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}
```

## Responsive Breakpoints

### Mobile (360px - 767px)
- Single column layouts
- Reduce spacing by 25%
- Smaller font sizes (-1 step)
- Touch-friendly tap targets (minimum 44px)
- Stack navigation vertically

### Tablet (768px - 1279px)
- Two column layouts where appropriate
- Standard spacing
- Standard font sizes
- Side navigation can collapse
- Modal widths capped at 600px

### Desktop (1280px+)
- Multi-column layouts
- Expanded spacing (optional +20%)
- Larger font sizes for headings
- Persistent side navigation
- Modal widths capped at 800px

## Performance Considerations

### Texture Optimization
- Use CSS gradients for textures when possible
- Limit texture layers to 3 per element
- Avoid animated textures

### Shadow Performance
- Limit to 2-3 box-shadows per element
- Avoid animating box-shadow directly
- Use transform and opacity for animations

### Paint Optimization
- Use `will-change` sparingly (button hover, modal transitions)
- Avoid backdrop-filter on large surfaces
- Minimize repaints during interactions

## Implementation Checklist

- [ ] Import `skeuomorphic-tokens.css` in main CSS
- [ ] Update base body/root styles
- [ ] Apply leather texture to primary surfaces
- [ ] Update all buttons with embossed metal style
- [ ] Update all inputs with inset paper style
- [ ] Apply wood texture to navigation panels
- [ ] Add realistic shadows to all elevated elements
- [ ] Implement focus states with bronze outline
- [ ] Test keyboard navigation throughout
- [ ] Validate color contrast ratios
- [ ] Test at all responsive breakpoints
- [ ] Verify reduced motion support
- [ ] Take before/after screenshots

## Examples & References

### Real-world Material Inspirations
- **Leather**: Designer wallets, briefcases, automotive interiors
- **Wood**: Fine furniture, musical instruments, executive desks
- **Metal**: Vintage audio equipment, mechanical watches, door hardware
- **Paper**: Premium stationery, embossed business cards, book covers

### Color Harmony
The palette is inspired by:
- Warm leather goods (browns, tans)
- Natural wood tones (walnut, oak, maple)
- Aged metals (bronze, brass)
- High-quality paper (cream, linen)

### Lighting Model
Consistent top-down lighting throughout:
- Light source at 45° from top-left
- Highlights on top and left edges
- Shadows on bottom and right edges
- Stronger shadows for higher elevation

## Known Limitations & Tradeoffs

### Visual Complexity
Skeuomorphic design is inherently more detailed than flat design:
- More CSS required for textures and shadows
- Longer initial load (offset by caching)
- More visual processing for users

### Cross-platform Consistency
Textures and shadows may render differently:
- Test on multiple browsers
- Provide fallbacks for older browsers
- Consider simplified version for low-end devices

### Maintenance
Detailed styling requires more maintenance:
- Document all custom patterns
- Create reusable component classes
- Keep token system organized

## Migration from Previous Styles

When converting from previous design systems:

1. **Replace color tokens**: Map old colors to new material colors
2. **Update shadows**: Convert flat shadows to embossed/inset/float
3. **Add textures**: Layer gradients and patterns on surfaces
4. **Enhance buttons**: Add depth with emboss effects
5. **Depress inputs**: Apply inset shadows to form fields
6. **Test accessibility**: Verify contrast and focus states
7. **Validate responsive**: Check all breakpoints
8. **Remove old assets**: Clean up unused CSS

## Version History

- **v1.0** (2026-02-19): Initial Skeuomorphic Revival design system
