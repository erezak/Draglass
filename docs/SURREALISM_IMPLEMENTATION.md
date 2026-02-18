# Surrealism Design System Implementation Guide

## Quick Start

### 1. Import Tokens
Add to your main CSS entry point (e.g., `src/index.css`):

```css
@import './surrealism-tokens.css';
```

### 2. Enable Surrealism
Add data attributes to the root HTML element:

```html
<!-- Enable with subtle intensity (default) -->
<html data-surreal-enabled="true" data-surreal-intensity="subtle">

<!-- Other intensity options -->
<html data-surreal-enabled="true" data-surreal-intensity="off">
<html data-surreal-enabled="true" data-surreal-intensity="full">
```

### 3. Apply Theme
Combine with existing theme attribute:

```html
<!-- Dream Reality (dark) -->
<html data-theme="dark" data-surreal-enabled="true" data-surreal-intensity="subtle">

<!-- Day Reality (light) -->
<html data-theme="light" data-surreal-enabled="true" data-surreal-intensity="subtle">
```

## Component Patterns

### Pattern 1: Melting Panel Edges

**Visual Effect**: Cards have soft downward drips when idle, snap to crisp on focus.

**CSS Implementation**:
```css
.card {
  background: var(--surreal-surface);
  border: 1px solid var(--surreal-border);
  border-radius: var(--shape-soft);
  padding: var(--space-lg);
  transition: all var(--duration-dream) var(--ease-float);
}

/* Melting effect (only when enabled) */
:root[data-surreal-enabled="true"] .card {
  mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M 0,0 L 200,0 L 200,180 Q 195,190 190,195 Q 180,200 170,198 Q 160,196 150,200 L 50,200 Q 40,196 30,198 Q 20,200 10,195 Q 5,190 0,180 Z" fill="black"/></svg>');
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
}

/* Crisp edges on focus */
:root[data-surreal-enabled="true"] .card:focus-within,
:root[data-surreal-enabled="true"] .card:hover {
  mask-image: none;
}

/* Disable melting when intensity is off */
:root[data-surreal-intensity="off"] .card {
  mask-image: none;
}
```

### Pattern 2: Levitation Physics

**Visual Effect**: Selected cards float upward with long shadow.

**CSS Implementation**:
```css
.card--selected {
  background: var(--surreal-surface);
  border: 1px solid var(--surreal-accent);
  transition: transform var(--duration-dream) var(--ease-float),
              box-shadow var(--duration-dream) var(--ease-float);
}

:root[data-surreal-enabled="true"] .card--selected {
  transform: translateY(calc(-4px * var(--intensity-float)));
  box-shadow: var(--shadow-levitate-md);
}

:root[data-surreal-intensity="full"] .card--selected {
  transform: translateY(-8px);
  box-shadow: var(--shadow-levitate-lg);
}

/* Static elevation in reduced motion */
@media (prefers-reduced-motion: reduce) {
  .card--selected {
    transform: none;
    box-shadow: var(--shadow-soft-sm);
  }
}
```

### Pattern 3: Metamorphic CTA Button

**Visual Effect**: Button morphs from oval to rectangle on hover.

**CSS Implementation**:
```css
.cta-button {
  background: var(--surreal-accent);
  color: var(--surreal-text-primary);
  padding: var(--space-md) var(--space-xl);
  border: 2px solid transparent;
  cursor: pointer;
  font-weight: var(--weight-semibold);
  transition: border-radius var(--morph-duration) var(--ease-dream),
              box-shadow var(--duration-quick) var(--ease-float);
}

:root[data-surreal-enabled="true"] .cta-button {
  border-radius: var(--morph-oval);
}

:root[data-surreal-enabled="true"] .cta-button:hover {
  border-radius: var(--morph-rect);
  box-shadow: var(--glow-warm-md);
}

/* Instant morph in reduced motion */
@media (prefers-reduced-motion: reduce) {
  .cta-button {
    border-radius: var(--morph-rect);
    transition: box-shadow var(--duration-instant);
  }
}
```

### Pattern 4: Symbolic Microinteraction Icons

**Visual Effect**: Icons animate to suggest their action.

**React Component Example**:
```tsx
interface IconButtonProps {
  action: 'save' | 'search' | 'archive' | 'time';
  label: string;
  onClick: () => void;
}

function SymbolicIconButton({ action, label, onClick }: IconButtonProps) {
  const iconMap = {
    save: <KeyIcon />,     // Brass key
    search: <EyeIcon />,   // Blue eye
    archive: <DrawerIcon />, // Wooden drawer
    time: <ClockIcon />    // Golden clock
  };

  return (
    <button
      className={`symbolic-button symbolic-button--${action}`}
      onClick={onClick}
      aria-label={label}
    >
      {iconMap[action]}
      <span className="symbolic-button__label">{label}</span>
    </button>
  );
}
```

**CSS for Symbolic Buttons**:
```css
.symbolic-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--surreal-border);
  background: var(--surreal-surface);
  border-radius: var(--shape-soft);
  cursor: pointer;
  transition: all var(--duration-quick) var(--ease-float);
}

.symbolic-button--save {
  color: var(--action-save);
}

.symbolic-button--search {
  color: var(--action-search);
}

.symbolic-button--archive {
  color: var(--action-archive);
}

.symbolic-button--time {
  color: var(--action-time);
}

/* Icon rotation on hover */
:root[data-surreal-enabled="true"] .symbolic-button--save:hover svg {
  transform: rotate(15deg);
  transition: transform var(--duration-dream) var(--ease-dream);
}

:root[data-surreal-enabled="true"] .symbolic-button--archive:hover svg {
  transform: translateX(-4px);
  transition: transform var(--duration-quick) var(--ease-float);
}

/* Disable animations in reduced motion */
@media (prefers-reduced-motion: reduce) {
  .symbolic-button svg {
    transform: none !important;
  }
}
```

### Pattern 5: Dislocated Tooltips

**Visual Effect**: Tooltip connected to source element by animated thread.

**React Component Example**:
```tsx
function DislocatedTooltip({ children, content, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef(null);

  return (
    <div className="dislocated-tooltip-container">
      <div
        ref={buttonRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      
      {isVisible && (
        <div className="dislocated-tooltip" data-position={position}>
          <svg className="dislocated-tooltip__thread">
            <line
              x1="50%"
              y1="100%"
              x2="50%"
              y2="0"
              stroke="var(--surreal-border)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          </svg>
          <div className="dislocated-tooltip__content">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
```

**CSS for Dislocated Tooltips**:
```css
.dislocated-tooltip-container {
  position: relative;
  display: inline-block;
}

.dislocated-tooltip {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  opacity: 0;
  animation: tooltip-appear var(--duration-dream) var(--ease-float) forwards;
}

@keyframes tooltip-appear {
  to {
    opacity: 1;
  }
}

.dislocated-tooltip__thread {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 12px;
}

:root[data-surreal-enabled="true"] .dislocated-tooltip__thread line {
  animation: thread-draw var(--duration-dream) var(--ease-float);
}

@keyframes thread-draw {
  from {
    stroke-dashoffset: 100;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.dislocated-tooltip__content {
  background: var(--surreal-surface);
  border: 1px solid var(--surreal-border);
  border-radius: var(--shape-soft);
  padding: var(--space-sm) var(--space-md);
  color: var(--surreal-text-primary);
  font-size: var(--text-sm);
  white-space: nowrap;
  box-shadow: var(--shadow-soft-md);
}

/* Remove thread in reduced motion */
@media (prefers-reduced-motion: reduce) {
  .dislocated-tooltip__thread {
    display: none;
  }
}

/* Hide thread when intensity is off */
:root[data-surreal-intensity="off"] .dislocated-tooltip__thread {
  display: none;
}
```

### Pattern 6: Temporal Distortion Hover

**Visual Effect**: Content briefly "ages" on hover to suggest version history.

**CSS Implementation**:
```css
.content-preview {
  transition: filter var(--duration-quick) var(--ease-float);
}

:root[data-surreal-enabled="true"] .content-preview:hover {
  filter: sepia(calc(0.3 * var(--intensity-temporal-distortion)))
          blur(calc(0.5px * var(--intensity-temporal-distortion)));
}

/* No distortion in reduced motion */
@media (prefers-reduced-motion: reduce) {
  .content-preview:hover {
    filter: none;
  }
}
```

### Pattern 7: Dreamlike Scene Transitions

**Visual Effect**: Page transitions with subtle parallax drift.

**React Example with Framer Motion**:
```tsx
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { 
    opacity: 0,
    y: 20 
  },
  enter: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.34, 1.56, 0.64, 1] // --ease-dream
    }
  },
  exit: { 
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: [0.87, 0, 0.13, 1] // --ease-warp
    }
  }
};

function PageTransition({ children }) {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  
  const intensity = document.documentElement.getAttribute(
    'data-surreal-intensity'
  );
  
  const shouldAnimate = !prefersReducedMotion && intensity !== 'off';

  return (
    <motion.div
      initial={shouldAnimate ? 'initial' : false}
      animate="enter"
      exit={shouldAnimate ? 'exit' : false}
      variants={pageVariants}
    >
      {children}
    </motion.div>
  );
}
```

## User Preference Controls

### Intensity Selector Component

**React Example**:
```tsx
type Intensity = 'off' | 'subtle' | 'full';

function SurrealismIntensityControl() {
  const [intensity, setIntensity] = useState<Intensity>('subtle');

  const handleChange = (newIntensity: Intensity) => {
    setIntensity(newIntensity);
    document.documentElement.setAttribute(
      'data-surreal-intensity',
      newIntensity
    );
    
    // Persist to local storage
    localStorage.setItem('surreal-intensity', newIntensity);
  };

  return (
    <fieldset className="intensity-control">
      <legend>Surrealism Intensity</legend>
      <div className="intensity-control__options">
        {(['off', 'subtle', 'full'] as const).map((option) => (
          <label key={option} className="intensity-control__option">
            <input
              type="radio"
              name="intensity"
              value={option}
              checked={intensity === option}
              onChange={() => handleChange(option)}
            />
            <span className="intensity-control__label">
              {option === 'off' && 'Classic Clarity'}
              {option === 'subtle' && 'Subtle Dream'}
              {option === 'full' && 'Full Surrealism'}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
```

### Theme + Intensity Toggle

**React Example**:
```tsx
function DualRealityToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const handleToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      className="dual-reality-toggle"
      onClick={handleToggle}
      aria-label={`Switch to ${theme === 'light' ? 'Dream' : 'Day'} Reality`}
    >
      <span className="dual-reality-toggle__label">
        {theme === 'light' ? '☀️ Day Reality' : '🌙 Dream Reality'}
      </span>
    </button>
  );
}
```

## Accessibility Testing

### Automated Tests

```typescript
describe('Surrealism Accessibility', () => {
  it('respects prefers-reduced-motion', () => {
    // Mock reduced motion preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }));

    render(<App />);
    
    // Verify no animations
    const card = screen.getByRole('article');
    expect(card).toHaveStyle({ transition: 'none' });
  });

  it('provides text labels for symbolic icons', () => {
    render(<SymbolicIconButton action="save" label="Save note" onClick={jest.fn()} />);
    
    const button = screen.getByRole('button', { name: 'Save note' });
    expect(button).toBeInTheDocument();
  });

  it('maintains focus indicators', () => {
    render(<Button />);
    
    const button = screen.getByRole('button');
    button.focus();
    
    expect(button).toHaveStyle({
      outline: '2px solid',
      outlineOffset: '2px'
    });
  });
});
```

### Manual Testing Checklist

- [ ] Tab through all interactive elements with keyboard
- [ ] Verify focus indicators visible on all elements
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify all animations stop when `prefers-reduced-motion: reduce`
- [ ] Check contrast ratios in DevTools (Lighthouse audit)
- [ ] Test with surrealism Off / Subtle / Full
- [ ] Test in Day Reality and Dream Reality themes
- [ ] Verify touch targets are at least 44×44px
- [ ] Test with browser zoom at 200%
- [ ] Verify no content reflow or horizontal scroll at 320px width

## Performance Monitoring

### Bundle Size Check

```bash
# Build and analyze bundle
npm run build
npx vite-bundle-visualizer

# Check surrealism layer size
ls -lh dist/assets/surrealism-tokens*.css
# Should be ≤10KB gzipped
```

### Runtime Performance

```typescript
// Measure animation frame rate
function measureAnimationPerformance() {
  let frameCount = 0;
  let lastTime = performance.now();
  
  function countFrame() {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= lastTime + 1000) {
      console.log(`FPS: ${frameCount}`);
      frameCount = 0;
      lastTime = currentTime;
    }
    
    requestAnimationFrame(countFrame);
  }
  
  requestAnimationFrame(countFrame);
}

// Target: consistent 60fps
measureAnimationPerformance();
```

### Lighthouse Audit

```bash
# Run Lighthouse performance audit
npx lighthouse http://localhost:5173 --view

# Key metrics to check:
# - First Contentful Paint: < 1.8s
# - Largest Contentful Paint: < 2.5s
# - Total Blocking Time: < 200ms
# - Cumulative Layout Shift: < 0.1
```

## Migration from Existing Styles

### Step 1: Audit Current Styles

```bash
# Find all custom CSS variables
grep -r "var(--" src/ | grep -o "var(--[a-z-]*)" | sort -u

# Identify components using old tokens
grep -r "var(--panel-bg)" src/
grep -r "var(--button-hover-border)" src/
```

### Step 2: Create Mapping

```css
/* Legacy fallbacks for gradual migration */
:root[data-surreal-enabled="true"] {
  --panel-bg: var(--surreal-surface);
  --text-primary: var(--surreal-text-primary);
  --text-muted: var(--surreal-text-muted);
  --button-hover-border: var(--surreal-accent);
}
```

### Step 3: Incremental Rollout

1. Add feature flag to enable surrealism per-user
2. A/B test with 10% of users
3. Monitor metrics (engagement, task completion, bounce rate)
4. Gradually increase rollout percentage
5. Collect user feedback via in-app survey

## Troubleshooting

### Issue: Animations not appearing

**Check**:
1. Is `data-surreal-enabled="true"` set on `:root`?
2. Is intensity set to `off`?
3. Does user have `prefers-reduced-motion: reduce`?
4. Are CSS transitions being overridden by other styles?

**Solution**:
```javascript
// Debug surrealism state
console.log({
  enabled: document.documentElement.getAttribute('data-surreal-enabled'),
  intensity: document.documentElement.getAttribute('data-surreal-intensity'),
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
});
```

### Issue: Poor performance / jank

**Check**:
1. Are you animating layout properties (width, height, top, left)?
2. Is `will-change` being used on too many elements?
3. Are there forced synchronous layouts?

**Solution**:
- Animate only `transform` and `opacity`
- Use `will-change` sparingly and remove after animation
- Batch DOM reads and writes

### Issue: Mask effects not working

**Check**:
1. Browser support for CSS masks (not supported in older browsers)
2. SVG data URL encoding

**Solution**:
```css
/* Provide fallback for unsupported browsers */
@supports not (mask-image: url('data:image/svg+xml,...')) {
  .card {
    /* Use border-radius fallback */
    border-radius: var(--shape-soft);
  }
}
```

## Resources

- [Surrealism Style Guide](./SURREALISM_STYLE_GUIDE.md)
- [Design Tokens Reference](../src/surrealism-tokens.css)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Mask Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/mask)
- [Performance Best Practices](https://web.dev/articles/animations-guide)
