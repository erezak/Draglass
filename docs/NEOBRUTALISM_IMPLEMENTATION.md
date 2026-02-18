# Neobrutalism UI Implementation Notes

## Overview
Draglass has been redesigned using the **Neobrutalism** visual language, characterized by bold borders, hard shadows, high contrast, and playful aesthetics.

## Design Principles Applied

### Visual Elements
- **Bold Borders**: 2-4px solid borders throughout (using `--border-thin`, `--border-medium`, `--border-thick`)
- **Hard Shadows**: Offset shadows with no blur (e.g., `3px 3px 0px`, `5px 5px 0px`)
- **Bright Accents**: Yellow (#FFE500) for primary actions, cyan (#00D9FF) for highlights
- **High Contrast**: Pure black/white borders and text on colored backgrounds
- **Flat Design**: No gradients, solid color fills
- **Geometric Shapes**: Sharp corners or minimal radius (4-8px max)

### Interaction States
- **Hover**: Transform + enhanced shadow (e.g., `translate(-1px, -1px)` with larger shadow)
- **Active**: Pressed effect with reduced shadow (e.g., `translate(2px, 2px)`)
- **Focus**: Bold outline with offset (3px solid with 3px offset)
- **Disabled**: Opacity reduction, no transform

## Components Updated

### Layout & Shell
- **Topbar**: Increased height (52px), thick bottom border (4px), bold brand typography
- **Toolbox**: Thick right border, button shadows and hover transforms
- **Sidebars**: Medium borders (3px), shadow-enhanced panels
- **Pane Resizers**: Thicker visual separator (3px)

### Buttons & Controls
- **Primary Buttons**: Yellow background, 3px borders, 5px shadows, transform on hover/active
- **Icon Buttons**: 36x36px, 3px borders, shadow transitions
- **Toggle Buttons**: Active state with highlight color and medium shadow
- **Tab Controls**: Transform on hover, bold active state with shadow

### Input Fields
- **Text Inputs**: 2px borders growing to 3px on focus, inset shadow
- **Select Dropdowns**: Consistent with text inputs, bold font weight
- **Checkboxes**: Scaled 1.3x, accent color theme
- **Search Bars**: Yellow background headers, prominent borders

### Modals & Overlays
- **Settings Modal**: Bright yellow header, 4px border, 12px offset shadow
- **Quick Switcher**: Yellow input area, bold typography, transform on hover
- **Vault Auth**: Similar modal treatment with accent header

### Lists & Trees
- **File Tree Items**: 2px borders, small shadows, transform on hover, bold selected state
- **Task List Items**: Consistent treatment with file items
- **Tag Items**: Badge-style counts with shadows
- **Calendar Days**: Individual day cells with borders and shadows

### Graph View
- **Header Controls**: Bold buttons with shadows and transforms
- **Scope Toggle**: Prominent active state
- **Search Input**: Inset shadow, border transitions

### Panels
- **Frontmatter**: Bold uppercase headers, row hover states with accent
- **Backlinks/Outgoing**: Consistent panel styling
- **Tasks Panel**: List items with shadows and transforms
- **Calendar**: Bold day indicators, shadow on today

## Design Tokens

### Colors
```css
/* Dark Theme */
--app-bg: #1A1A1A
--panel-bg: #252525
--panel-border: #FFFFFF
--accent: #FFE500 (yellow)
--accent-secondary: #00D9FF (cyan)
--highlight: #00D9FF
--success: #00FF85
--warning: #FF6B00
--error: #FF0055

/* Light Theme */
--app-bg: #FFFFFF
--panel-bg: #F5F5F5
--panel-border: #000000
(same accent colors)
```

### Spacing
```css
--space-xs: 4px
--space-sm: 8px
--space-md: 12px
--space-lg: 16px
--space-xl: 24px
--space-2xl: 32px
--space-3xl: 48px
```

### Borders
```css
--border-thin: 2px
--border-medium: 3px
--border-thick: 4px
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
```

### Shadows
```css
--shadow-sm: 3px 3px 0px #000000
--shadow-md: 5px 5px 0px #000000
--shadow-lg: 8px 8px 0px #000000
--shadow-xl: 12px 12px 0px #000000
```

### Transitions
```css
--transition-fast: 100ms ease-out
--transition-normal: 200ms ease-out
--transition-slow: 300ms ease-out
```

## Typography
- **Font Family**: Inter, system-ui, -apple-system, sans-serif
- **Weights**: 
  - Regular: 400
  - Medium: 500
  - Bold: 700
  - Extra Bold: 800
- **Usage**:
  - Headers: 800 weight, uppercase, tight letter-spacing
  - Buttons/Actions: 700 weight
  - Body/Input: 500 weight
  - Labels: 400 weight

## Responsive Considerations
- Component sizing scales naturally with viewport
- Touch targets maintained at minimum 36x36px
- Shadows reduced on small screens if needed
- Border widths remain consistent for brand identity

## Accessibility
- **Contrast**: All color combinations meet WCAG AA standards
- **Focus States**: 3px solid outlines with 3px offset for visibility
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Semantic Structure**: Maintained through redesign
- **Motion**: Respects `prefers-reduced-motion` where applicable

## Known Tradeoffs
1. **Shadow Performance**: Hard shadows are CSS-based and performant, but numerous animated shadows could impact older devices
2. **Border Width**: Thicker borders reduce content area slightly; layouts compensate with adjusted padding
3. **Color Limitations**: Yellow accent may need adjustment for light mode readability in some contexts
4. **Animation**: Transform-based animations are smooth but add complexity to hover states

## Future Enhancements
- [ ] Add custom illustrations in neobrutalist style
- [ ] Enhance error states with playful messaging
- [ ] Add loading states with bold geometric loaders
- [ ] Create custom icon set matching the aesthetic
- [ ] Expand color palette for additional semantic states
- [ ] Add dark/light theme toggle animation

## File Changes
- `src/index.css`: Design tokens and base styles
- `src/App.css`: Component-specific styles (~100+ component classes updated)
- `docs/DESIGN_SYSTEM.md`: Complete design system documentation

## Testing Notes
- Build passes successfully
- Visual testing completed across main UI flows
- No regressions in functionality
- Responsive behavior validated at common breakpoints
- Keyboard navigation tested on key components

## Migration from Previous Design
The redesign maintains all existing functionality while updating only the visual presentation. No component props or APIs were changed, ensuring backward compatibility with the existing codebase.
