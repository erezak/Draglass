# Draglass Design System: Neobrutalism

## Overview
Draglass uses a **Neobrutalism** visual language characterized by:
- **Bold, thick borders** (2-4px)
- **Hard shadows** (no blur, offset shadows)
- **High contrast** color combinations
- **Flat colors** (no gradients)
- **Strong geometric shapes**
- **Playful, energetic aesthetics**
- **Clear visual hierarchy**

## Design Tokens

### Colors

#### Light Theme
- **Primary**: `#000000` (black)
- **Background**: `#FFFFFF` (white)
- **Surface**: `#F5F5F5` (light gray)
- **Accent**: `#FFE500` (bright yellow)
- **Accent Secondary**: `#00D9FF` (cyan)
- **Success**: `#00FF85` (bright green)
- **Warning**: `#FF6B00` (orange)
- **Error**: `#FF0055` (hot pink)
- **Border**: `#000000` (black)
- **Text Primary**: `#000000` (black)
- **Text Secondary**: `#666666` (gray)

#### Dark Theme
- **Primary**: `#FFFFFF` (white)
- **Background**: `#1A1A1A` (dark gray)
- **Surface**: `#252525` (lighter dark)
- **Accent**: `#FFE500` (bright yellow)
- **Accent Secondary**: `#00D9FF` (cyan)
- **Success**: `#00FF85` (bright green)
- **Warning**: `#FF6B00` (orange)
- **Error**: `#FF0055` (hot pink)
- **Border**: `#FFFFFF` (white)
- **Text Primary**: `#FFFFFF` (white)
- **Text Secondary**: `#AAAAAA` (light gray)

### Typography

- **Font Family**: Inter, system-ui, -apple-system, sans-serif
- **Font Weight**: 
  - Regular: 400
  - Medium: 500
  - Bold: 700
  - Extra Bold: 800
- **Base Size**: 14px
- **Line Height**: 1.5

### Spacing Scale
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 24px
- `2xl`: 32px
- `3xl`: 48px

### Border Radius
- **None**: 0px
- **Small**: 4px
- **Medium**: 8px
- **Large**: 12px

### Borders
- **Thin**: 2px solid
- **Medium**: 3px solid
- **Thick**: 4px solid

### Shadows (Hard/Offset)
- **Small**: `3px 3px 0px`
- **Medium**: `5px 5px 0px`
- **Large**: `8px 8px 0px`
- **XLarge**: `12px 12px 0px`

### Transitions
- **Fast**: 100ms ease-out
- **Normal**: 200ms ease-out
- **Slow**: 300ms ease-out

## Component Patterns

### Buttons
- 3px solid border
- 5px hard shadow on primary
- Bold font weight
- Transforms on press (translate shadow)
- Clear hover states

### Input Fields
- 2px solid border
- Slight inset appearance
- Bold focus states (thicker border)
- No rounded corners or minimal radius

### Cards
- 3px solid border
- 5px hard shadow
- Clear header/content separation
- High contrast backgrounds

### Modals
- Heavy border (4px)
- Large shadow (8-12px offset)
- Centered or dramatic positioning
- Clear dismiss affordances

### Navigation
- Thick separators
- Active state indicators (color fills, bold borders)
- High contrast selection

## Accessibility
- Minimum contrast ratio: 4.5:1 for normal text
- Minimum contrast ratio: 3:1 for large text and UI components
- Clear focus indicators (3px offset ring)
- Keyboard navigation support
- Semantic HTML structure

## Responsive Breakpoints
- **Mobile**: 360px - 767px
- **Tablet**: 768px - 1279px
- **Desktop**: 1280px+

## Animation Principles
- Snappy, direct movements
- No easing curves (or minimal)
- Transform-based for performance
- Respect prefers-reduced-motion
