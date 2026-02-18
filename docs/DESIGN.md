# Draglass Design Documentation

Welcome to the Draglass design documentation. This folder contains comprehensive guides for understanding and working with Draglass's visual design system.

## Current Design System

**Minimal Monochrome** (Active as of 2026-02-18)

A clean, distraction-free visual language that uses only black, white, and shades of gray.

### Key Documents

1. **[Minimal Monochrome Style Guide](MINIMAL_MONOCHROME_STYLE_GUIDE.md)**
   - Complete visual design specification
   - Color palette (15 grayscale shades)
   - Typography system
   - Spacing and layout
   - Component patterns
   - Best practices and guidelines
   - **Start here** for design decisions

2. **[Minimal Monochrome Implementation Notes](MINIMAL_MONOCHROME_IMPLEMENTATION.md)**
   - Technical implementation details
   - Migration strategy
   - Performance considerations
   - Accessibility compliance
   - Troubleshooting guide
   - **Start here** for technical implementation

## Design Principles

### Minimal Monochrome Philosophy

1. **Simplicity First**
   - Remove all unnecessary visual noise
   - Pure grayscale palette (no colors)
   - Clean, uncluttered interfaces

2. **Content Focus**
   - Design serves the content, not vice versa
   - Generous whitespace
   - Clear visual hierarchy

3. **Clarity & Precision**
   - Sharp, minimal borders
   - Consistent spacing rhythm
   - Predictable patterns

4. **Sophistication Through Restraint**
   - Subtle shadows and elevation
   - Minimal transitions
   - Thoughtful typography

5. **Accessibility Built-In**
   - High contrast ratios (7:1+ for primary text)
   - Always-visible focus states
   - Semantic HTML structure
   - Keyboard-first navigation

## Quick Reference

### Color Palette (Dark Theme)
```
Black:       #000000  (app background)
Gray 950:    #0a0a0a  (panels)
Gray 900:    #121212  (cards)
Gray 850:    #1a1a1a  (hover states)
Gray 800:    #262626  (borders)
Gray 700:    #404040  (strong borders)
Gray 600:    #525252  (hover borders)
Gray 500:    #737373  (muted text)
Gray 100:    #f5f5f5  (primary text)
White:       #ffffff  (focus outlines)
```

### Spacing Scale (4px-based)
```
space-1:  4px
space-2:  8px
space-3:  12px
space-4:  16px
space-6:  24px
space-8:  32px
```

### Typography Scale
```
text-xs:    12px
text-sm:    14px
text-base:  16px
text-lg:    18px
text-xl:    20px
text-2xl:   24px
```

### Border Radius
```
radius-none: 0px    (preferred)
radius-sm:   2px
radius-base: 4px    (standard)
radius-md:   6px
radius-lg:   8px
radius-xl:   12px
```

## Design Tokens

All design values are defined as CSS custom properties in `src/index.css`:

```css
/* Colors */
--mm-gray-*           /* Grayscale palette */
--text-primary        /* High contrast text */
--text-muted          /* De-emphasized text */
--panel-bg            /* Panel backgrounds */
--button-bg           /* Button backgrounds */
--focus-outline       /* Focus indicator color */

/* Spacing */
--space-*             /* Spacing scale */

/* Typography */
--text-*              /* Type scale */

/* Borders */
--radius-*            /* Border radius values */
--border-*            /* Border widths */

/* Shadows */
--shadow-*            /* Elevation shadows */

/* Transitions */
--transition-*        /* Animation durations */
```

## Component Patterns

### Button
```css
background: var(--button-bg);
border: var(--border-base) solid var(--button-border);
border-radius: var(--radius-base);
padding: var(--space-2) var(--space-4);
transition: all var(--transition-base);
```

### Input
```css
background: var(--panel-bg);
border: var(--border-base) solid var(--panel-border);
padding: var(--space-2) var(--space-3);
```

### Focus State (Required)
```css
:focus-visible {
  outline: var(--border-thick) solid var(--focus-outline);
  outline-offset: 2px;
}
```

## Usage Guidelines

### For Designers

1. **Use the Style Guide**: Reference [MINIMAL_MONOCHROME_STYLE_GUIDE.md](MINIMAL_MONOCHROME_STYLE_GUIDE.md)
2. **Stay Monochrome**: No colors, only grayscale
3. **Follow Spacing**: Use the 4px-based scale
4. **Maintain Hierarchy**: Use size, weight, spacing (not color)
5. **Test Accessibility**: Ensure 7:1 contrast for text

### For Developers

1. **Use Design Tokens**: Never hardcode values
2. **Reference Implementation**: See [MINIMAL_MONOCHROME_IMPLEMENTATION.md](MINIMAL_MONOCHROME_IMPLEMENTATION.md)
3. **Test Both Themes**: Light and dark
4. **Maintain Focus States**: Always visible for keyboard navigation
5. **Follow Patterns**: Use existing component patterns

### For Contributors

1. **Read Style Guide First**: Understand the design philosophy
2. **Use Existing Tokens**: Don't create new ones without discussion
3. **Test Accessibility**: Run contrast checkers, keyboard navigation
4. **Match Existing Patterns**: Consistency is key
5. **Document Changes**: Update style guide if needed

## Testing Checklist

When implementing new features:

- [ ] Uses design tokens (no hardcoded values)
- [ ] Works in both light and dark themes
- [ ] Has visible focus indicators
- [ ] Meets contrast requirements (7:1 for text)
- [ ] Uses 4px-based spacing
- [ ] Follows existing patterns
- [ ] Is keyboard accessible
- [ ] No color-only information
- [ ] Tested at mobile (360px), tablet (768px), desktop (1280px)

## File Structure

```
docs/
├── DESIGN.md (this file)
├── MINIMAL_MONOCHROME_STYLE_GUIDE.md
├── MINIMAL_MONOCHROME_IMPLEMENTATION.md
└── screenshots/ (visual examples)
```

## Migration History

### Previous Design Systems
Draglass has evolved through several design systems:
- **Material Design 3** (MD3)
- **Glassmorphism** 
- **Neobrutalism**
- **Cubism**
- **Minimal Monochrome** (Current)

Each iteration refined the visual language toward greater simplicity and focus.

## Future Considerations

### Potential Enhancements
While maintaining monochrome aesthetic:
- Warmer vs. cooler gray tones
- User-adjustable contrast levels
- Print-optimized theme variants
- High-contrast OS mode integration
- Accessibility-enhanced modes

### Theme Customization
Users may eventually be able to:
- Adjust contrast levels
- Choose warm/cool gray tones
- Customize spacing density
- Select preferred border styles

## Resources

### Internal
- [Style Guide](MINIMAL_MONOCHROME_STYLE_GUIDE.md) - Complete design spec
- [Implementation](MINIMAL_MONOCHROME_IMPLEMENTATION.md) - Technical details
- [Features](features.md) - Product features
- [Screenshots](screenshots.md) - Visual examples

### External
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [System Font Stack](https://systemfontstack.com/)
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)

## Support

### Questions?
- Check the [Style Guide](MINIMAL_MONOCHROME_STYLE_GUIDE.md) first
- Review [Implementation Notes](MINIMAL_MONOCHROME_IMPLEMENTATION.md)
- Search existing issues
- Ask in discussions

### Found an Inconsistency?
- Document the issue
- Note affected components
- Suggest a fix if possible
- Open an issue or PR

---

**Last Updated**: 2026-02-18  
**Design System**: Minimal Monochrome v1.0  
**Status**: Active
