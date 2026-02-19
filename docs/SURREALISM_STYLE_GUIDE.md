# Draglass Surrealism Design System

## Vision

Draglass reimagines knowledge management as a **dream-logic interface** — precise enough for real workflows, but visually and behaviorally inspired by Dalí-era Surrealism. This is not random weirdness, but a coherent design language where impossible forms, temporal ambiguity, and symbolic objects create a memorable product identity while preserving clarity and speed.

## Three-Layer Architecture

### Base Layer: Reliable Foundation
- Conventional information architecture
- WCAG AA accessibility compliance
- Keyboard navigation and screen reader support
- Stable grid and component hierarchy

### Expression Layer: Surreal Motifs
- Desert dusk color palette (golden hour to twilight)
- Melting edges, impossible geometries, temporal distortion
- Symbolic microinteractions (key, eye, drawer, clock)
- Long shadows and luminous glows

### Control Layer: User Preferences
- **Intensity Settings**: Off / Subtle / Full
- **prefers-reduced-motion** support
- Fallback to "Classic Clarity" mode
- Performance budgets enforced

## Core Principles

### 1. Rational Core, Surreal Skin
Keep information architecture and component hierarchy conventional. Apply surrealism via surface styling and motion layers only.

**Example**: Navigation remains left-side vertical, but may appear as a Penrose-like impossible loop while hitboxes stay orthogonal.

### 2. One Impossible Move Per Screen
Limit surreal gestures to one dominant motif per viewport to avoid visual noise.

**Example**: If cards have melting edges, don't also add impossible geometry to buttons on the same screen.

### 3. Metamorphic Continuity
If an element morphs, anchor at least one invariant (position, label, or silhouette).

**Example**: Button morphs from oval to rectangle on hover, but stays in the same position and shows the same label.

### 4. Symbol + Text Pairing
Symbolic visuals must always ship with explicit text labels (via aria-label, tooltips, or visible text).

**Example**: Save action uses a brass key icon, but button text reads "Save" and aria-label="Save note".

### 5. Temporal Elasticity
Reserve slowed/smeared time effects for transitions, never for direct manipulation latency.

**Example**: Scene transitions may take 350ms with parallax drift. Button clicks respond instantly (<100ms).

### 6. Controlled Juxtaposition
Pair one familiar component with one uncanny treatment.

**Example**: Standard card layout with soft downward "drip" mask on bottom edge.

### 7. Depth as Meaning
- **Foreground** = actionable elements (buttons, inputs)
- **Midground** = contextual information (labels, metadata)
- **Background** = atmospheric effects (gradients, generative patterns)

### 8. Accessibility First Overrides
All surreal effects must degrade to clean static states when:
- User sets intensity to "Off"
- User has `prefers-reduced-motion: reduce`
- Device/browser lacks support for effects

## Color Palette: Desert Dusk

Inspired by Dalí's Catalan landscapes — the golden hour transitioning to twilight over desert sands.

### Sky Gradients
```css
--surreal-sky-gold: #ffa947      /* Golden hour warmth */
--surreal-sky-amber: #ff8c42     /* Sunset peak */
--surreal-sky-peach: #ffb366     /* Soft glow */
--surreal-sky-dusk: #8b5a8d      /* Twilight purple */
--surreal-sky-twilight: #4a3c5e  /* Deep evening */
--surreal-sky-night: #2a1f3d     /* Dark dream state */
```

### Earth Tones
```css
--surreal-sand-light: #e8d4b8    /* Sunlit sand */
--surreal-sand-warm: #d4b896     /* Warm desert */
--surreal-sand-deep: #a68a6a     /* Shadow sand */
--surreal-rock-warm: #6b5d52     /* Rocky outcrops */
--surreal-rock-cool: #4a4240     /* Cool shadows */
--surreal-shadow-purple: #3d2c47 /* Violet shadows */
```

### Symbolic Accents
```css
--surreal-key-brass: #c9a961     /* Save action (key) */
--surreal-eye-iris: #7ba3d0      /* Search action (eye) */
--surreal-clock-gold: #d4af37    /* Time actions (clock) */
--surreal-drawer-wood: #8b6f47   /* Archive action (drawer) */
```

### Contrast Requirements
- Text on backgrounds: minimum 4.5:1 (WCAG AA)
- Large text (18pt+): minimum 3:1
- UI component borders: minimum 3:1
- All ratios tested in both Day Reality (light) and Dream Reality (dark) themes

## 12+ Surreal UI Concepts

### 1. Melting Panel Edges ✓
Cards and panels have soft downward "drip" SVG masks when idle. On focus, they snap to crisp edges.

**Implementation**: CSS `mask-image` with inline SVG. Disabled in reduced motion.

```css
.card {
  mask-image: url('data:image/svg+xml,...'); /* drip shape */
  transition: mask-image var(--duration-dream);
}
.card:focus-within {
  mask-image: none; /* crisp edges */
}
```

### 2. Elastic Clock Loader ✓
Loading indicator deforms like a melting watch (à la *Persistence of Memory*), then resolves to exact progress marks.

**Implementation**: SVG path animation with morphing d attribute. Degrades to standard spinner.

### 3. Impossible Geometry Navigation ✓
Navigation rail appears as a Penrose-like loop while hitboxes remain orthogonal.

**Implementation**: CSS transform and perspective for visual effect. Real DOM structure is standard vertical list.

### 4. Dreamlike Scene Transitions ✓
Page/view transitions use crossfades with subtle parallax horizon drift (max 350ms).

**Implementation**: CSS transitions with layered translateY offsets. Disabled in reduced motion.

### 5. Symbolic Microinteractions ✓
- **Save** = brass key turning in lock
- **Archive** = wooden drawer sliding shut
- **Search** = blue eye opening
- **Time actions** = golden clock hands moving

**Implementation**: Icon animations with semantic aria-labels. Static icons in reduced motion.

### 6. Temporal Distortion Peek ✓
Hover over content briefly "ages" or "rewinds" styling to hint at version history.

**Implementation**: CSS filter adjustments (sepia, blur) on hover. Disabled in reduced motion.

```css
.content-preview:hover {
  filter: sepia(0.3) blur(0.5px);
  transition: filter var(--duration-quick);
}
```

### 7. Metamorphic CTA ✓
Primary action button morphs from oval (50% border-radius) to rectangle (8px) on hover.

**Implementation**: CSS border-radius transition. Immediate in reduced motion.

```css
.cta-button {
  border-radius: var(--morph-oval);
  transition: border-radius var(--morph-duration) var(--ease-dream);
}
.cta-button:hover {
  border-radius: var(--morph-rect);
}
```

### 8. Levitation Physics ✓
Selected cards subtly float on z-axis with long shadow projection.

**Implementation**: `transform: translateY()` with matched shadow offset. Static elevation in reduced motion.

```css
.card--selected {
  transform: translateY(-4px);
  box-shadow: var(--shadow-levitate-md);
}
```

### 9. Dislocated Tooltips ✓
Tooltips tethered by animated thread/line from source element.

**Implementation**: SVG line with animated stroke-dashoffset. Thread removed in reduced motion, tooltip stays.

### 10. Dual-Reality Theme Toggle ✓
"Day Reality / Dream Reality" toggle controls both light/dark theme and surreal intensity.

**Implementation**: Combined `data-theme` and `data-surreal-intensity` attributes.

### 11. Automatism Background Generator ✓
Workspace-specific low-contrast organic linework generated via seeded algorithm. Cached as static snapshot.

**Implementation**: Canvas API or SVG with seeded randomness. Fallback to solid color gradient.

### 12. Paranoiac-Double Image States ✓
Ambiguous hero illustrations that reveal a second interpretation on focus/zoom.

**Implementation**: SVG with layered paths; opacity/visibility changes on interaction.

### 13. Ant-Path Activity Indicator ✓
Tiny symbolic path animation for background tasks (marching ants border).

**Implementation**: Animated `border-image` or `stroke-dashoffset`. Replaced by static badge in reduced motion.

### 14. Soft-Shadow Time Scrubber ✓
Timeline scrubber handle stretches slightly while dragging, returns to precise form on release.

**Implementation**: `scaleX()` transform during drag. Disabled in reduced motion.

## Motion & Timing

### Dreamlike Easing Curves
```css
--ease-dream: cubic-bezier(0.34, 1.56, 0.64, 1);  /* Overshoot bounce */
--ease-melt: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Elastic melt */
--ease-float: cubic-bezier(0.25, 0.46, 0.45, 0.94);  /* Gentle float */
--ease-warp: cubic-bezier(0.87, 0, 0.13, 1);     /* Fast-slow warp */
```

### Duration Guidelines
- **Instant feedback**: ≤100ms (clicks, key presses)
- **Quick transitions**: 200ms (hover states, focus changes)
- **Dream sequences**: 350ms (scene transitions, morphs)
- **Slow reveals**: 600ms (complex animations)
- **Temporal dilation**: 1000ms (special narrative moments)

### Reduced Motion
All durations set to 0ms when `prefers-reduced-motion: reduce`.

## Typography

### Font Families
- **Body**: Inter (high legibility, modern sans-serif)
- **Display**: Playfair Display (expressive serif for headlines)
- **Code**: JetBrains Mono (monospace for technical content)

### Hierarchy
```css
--text-sm: 0.875rem    /* 14px - metadata */
--text-base: 1rem      /* 16px - body text */
--text-lg: 1.125rem    /* 18px - subheadings */
--text-xl: 1.25rem     /* 20px - headings */
--text-2xl: 1.5rem     /* 24px - page titles */
--text-3xl: 2rem       /* 32px - hero text */
```

### Line Heights
- Tight (1.25): Display text, headings
- Base (1.5): Body paragraphs
- Loose (1.75): Long-form reading

### Warping Effects (Display Only)
Display headlines may use subtle CSS warp masks on hover — but only for decorative large text, never for body content.

## Shadows & Depth

### Long Shadows (Temporal Distortion)
Inspired by elongated shadows in Dalí paintings, suggesting time's fluidity.

```css
--shadow-levitate-sm: 0 4px 12px -2px rgba(42, 31, 61, 0.3);
--shadow-levitate-md: 0 8px 24px -4px rgba(42, 31, 61, 0.4);
--shadow-levitate-lg: 0 16px 48px -8px rgba(42, 31, 61, 0.5);
```

### Soft Diffused Shadows
```css
--shadow-soft-sm: 0 2px 16px rgba(139, 90, 141, 0.2);
--shadow-soft-md: 0 4px 32px rgba(139, 90, 141, 0.25);
--shadow-soft-lg: 0 8px 64px rgba(139, 90, 141, 0.3);
```

### Luminous Glows (Focal Points)
Use sparingly to guide attention, not as decoration.

```css
--glow-warm-md: 0 0 16px rgba(255, 228, 179, 0.5);  /* Save, important actions */
--glow-cool-md: 0 0 16px rgba(179, 212, 255, 0.5);  /* Search, discovery */
```

## Accessibility Checklist

- [ ] All text meets WCAG AA contrast minimums (4.5:1)
- [ ] Large text and UI borders meet 3:1 minimum
- [ ] Focus indicators are 2px solid with 2px offset, high contrast
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Symbolic icons paired with text labels or aria-labels
- [ ] Keyboard navigation works with surreal effects off or on
- [ ] Screen readers announce state changes clearly
- [ ] No essential information conveyed by motion alone
- [ ] No continuous ambient motion in reading zones
- [ ] User can disable all surreal effects via settings

## Performance Budgets

### Animation Constraints
- Animate only `transform` and `opacity` (avoid layout thrashing)
- Use `will-change` hints sparingly and temporarily
- Remove `will-change` after animation completes

### Bundle Size
- Surreal layer CSS: ≤10KB gzipped
- Surreal layer JS (if needed): ≤25KB gzipped
- Total added bundle: ≤35KB gzipped

### Runtime Performance
- Main-thread animation work: ≤4ms per frame (60fps)
- Interaction animations: complete in ≤350ms (standard), ≤200ms (reduced)
- No forced reflows during animations

### Progressive Enhancement
Core UX must work with:
- Surreal layer disabled
- CSS masks/filters unsupported
- JavaScript disabled (static fallback)

## Implementation Strategy

### Phase 1: Tokens & Foundation
1. Import `surrealism-tokens.css` in main stylesheet
2. Add `data-surreal-enabled` and `data-surreal-intensity` attributes to `:root`
3. Implement theme toggle UI (Day Reality / Dream Reality)
4. Test token values in browser DevTools

### Phase 2: Core Components
1. Apply desert dusk palette to shell (topbar, sidebar, main canvas)
2. Add melting panel edges to cards
3. Implement symbolic microinteraction icons (save, search, archive)
4. Add levitation physics to selected/active states
5. Test with intensity Off / Subtle / Full

### Phase 3: Advanced Effects
1. Implement elastic clock loader
2. Add impossible geometry to navigation rail
3. Create dreamlike scene transitions
4. Add temporal distortion hover previews
5. Implement dislocated tooltips with animated threads
6. Generate workspace-specific automatism backgrounds

### Phase 4: Polish & Validation
1. Add metamorphic CTA buttons
2. Implement paranoiac-double image states
3. Add ant-path activity indicators
4. Create soft-shadow time scrubbers
5. Accessibility audit (contrast, focus, semantics, motion)
6. Performance profiling (bundle size, frame rate, interaction latency)
7. Visual regression tests for all intensity levels
8. User testing with reduced-motion users

## Anti-Patterns (Do Not Do)

❌ **Ornament without purpose**: Don't add surreal effects just for novelty. Every effect must serve a functional or narrative purpose.

❌ **Motion overload**: No more than one surreal animation per viewport. Too many competing effects cause cognitive overload.

❌ **Illegible typography**: Body text must always be crisp and high-contrast. Warping effects only for display headlines.

❌ **Symbolic ambiguity**: Never rely on symbolic imagery alone. Always pair with text labels.

❌ **Performance regressions**: If an effect causes jank, simplify or remove it. 60fps is non-negotiable.

❌ **Accessibility shortcuts**: Surreal effects are nice-to-have. Accessibility is mandatory. When in conflict, accessibility wins.

❌ **Cultural assumptions**: Test symbolic meanings across cultures. Key = save may not be universal.

❌ **Continuous ambient motion**: No persistent animations in reading/editing zones. Reserve motion for transitions and interactions.

## Testing Matrix

| Intensity | Motion Pref | Expected Behavior |
|-----------|-------------|-------------------|
| Off | Default | No surreal effects, standard modern UI |
| Off | Reduce | Same as above |
| Subtle | Default | Moderate surreal styling, smooth animations |
| Subtle | Reduce | Surreal styling, no animations (static) |
| Full | Default | Maximum surreal effects, full animations |
| Full | Reduce | Maximum surreal styling, no animations |

Test each combination for:
- Visual correctness
- Accessibility (keyboard, screen reader, contrast)
- Performance (no jank, meets budgets)
- Functionality (all features work regardless of settings)

## References

### Art & Design History
- [The Art Story — Surrealism Movement](https://www.theartstory.org/movement/surrealism/)
- [The Met — Surrealism](https://www.metmuseum.org/essays/surrealism)
- [MoMA — Dalí, The Persistence of Memory](https://www.moma.org/audio/playlist/296/67)
- [99designs — Surrealism in graphic design](https://99designs.com/blog/design-history-movements/surreal-graphic-design/)

### Web Standards
- [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [WCAG 2.1 Understanding SC 1.4.3 Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [web.dev — High-performance CSS animations](https://web.dev/articles/animations-guide)

---

**Remember**: Surrealism in Draglass is not chaos — it's a disciplined design language that makes the familiar unfamiliar in service of delight and memorability, while never compromising on usability or accessibility.
