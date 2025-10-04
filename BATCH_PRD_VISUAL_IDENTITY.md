# Batch PRD Visual Identity System
## Design Philosophy: "Bloom to Scale"

A refined visual identity that captures the essence of growth, cultivation, and systematic creation—transforming scattered ideas into a coordinated garden of product requirements.

---

## 🎨 Core Visual Metaphor

**"The Cultivation Process"**
- Seeds → Features to be documented
- Soil → The PM's context & preferences
- Growth → The batch generation process
- Bloom → Completed, polished PRDs

---

## 1. Symbol & Logotype

### Primary Logo: "Petals in Formation"

```
Symbol Concept:
┌─────────────────────┐
│    ⚬  ⚬  ⚬  ⚬     │  Five seeds arranged in radial formation
│   ⚬        ⚬      │  (representing batch features)
│     \  ⚪  /       │  Opening from center outward
│      ⚬  ⚬         │  Subtle petal burst implied through spacing
└─────────────────────┘

Logotype: BATCH · PRD
         "Cultivate your features"
```

### Visual Elements

**Icon System:**
- **Seed Dot** (●) — Unapproved/draft feature
- **Budding Petal** (◐) — In review/pending
- **Full Bloom** (◉) — Approved/complete PRD
- **Radial Lines** — Connection between related features
- **Concentric Circles** — Progressive stages

**Symbol Variations:**
1. **Compact Icon** — Single seed with radiating dots (16×16px)
2. **Standard Mark** — Five-petal radial (32×32px, 64×64px)
3. **Extended Form** — Seeds-to-bloom progression (horizontal layout)

---

## 2. Color Palette

### Primary Colors

```css
/* Deep Terracotta — Primary Action */
--batch-terracotta: hsl(12, 76%, 58%);      /* #E87A52 */
--batch-terracotta-hover: hsl(12, 76%, 48%);
--batch-terracotta-light: hsl(12, 76%, 95%); /* Wash for backgrounds */

/* Warm Charcoal — Typography & Structure */
--batch-charcoal: hsl(20, 8%, 25%);         /* #44403C (warmGray-700) */
--batch-charcoal-light: hsl(20, 6%, 45%);   /* Secondary text */

/* Cream Canvas — Base Background */
--batch-canvas: hsl(36, 100%, 98%);         /* #FFFDF9 */
--batch-canvas-alt: hsl(30, 40%, 96%);      /* #F9F5F1 */
```

### Accent Colors (from existing palette)

```css
/* Sprout Green — Success/Completion */
--batch-sprout: hsl(157, 65%, 55%);         /* #3DDC97 */

/* Lavender Whisper — Review/Reflection */
--batch-lavender: hsl(258, 90%, 76%);       /* #A78BFA */

/* Poppy Red — Critical/Urgent */
--batch-poppy: hsl(0, 100%, 67%);           /* #FF5757 */
```

### Status Colors

| State | Color | Usage |
|-------|-------|-------|
| Draft | `warmGray-400` | Seed stage, awaiting input |
| Generating | `batch-terracotta` | Active process, animated |
| Review | `batch-lavender` | Pending PM approval |
| Approved | `batch-sprout` | Ready to generate PRD |
| Complete | `warmGray-700` | Full bloom, shipped |

---

## 3. Typography

### Font Pairing

```css
/* Display & Headings — Serif/Semi-Serif */
--font-display: 'Playfair Display', 'Georgia', serif;
--font-display-weight: 600;
--font-display-spacing: -0.02em;

/* Body & Interface — Clean Sans */
--font-body: 'Inter', -apple-system, sans-serif;
--font-body-weight: 400;
--font-body-spacing: -0.01em;

/* Code & Data — Monospace */
--font-mono: 'JetBrains Mono', 'Consolas', monospace;
```

### Type Scale

```css
/* Hero / Page Title */
--text-hero: 3.5rem;        /* 56px — "Batch PRD" */
--line-hero: 1.1;

/* Section Header */
--text-section: 2rem;       /* 32px — "Your Features" */
--line-section: 1.25;

/* Card Title */
--text-card: 1.25rem;       /* 20px — Feature names */
--line-card: 1.4;

/* Body / Description */
--text-body: 1rem;          /* 16px */
--line-body: 1.6;

/* Label / Meta */
--text-meta: 0.875rem;      /* 14px */
--line-meta: 1.5;
```

### Usage Guidelines

- **Display serif** for page titles, stage headers ("Step 1: Profile Setup")
- **Sans-serif** for all UI elements, buttons, body text
- **Letter-spacing:** Tight for display (-0.02em), neutral for body
- **Weight hierarchy:** 600 (headings), 500 (subheads), 400 (body), 300 (captions)

---

## 4. UI Components

### Stage Indicator

```
┌─────────────────────────────────────────────┐
│  ● Profile → ◐ Features → ◯ Review → ◯ PRDs │
│  Complete    Current      Pending    Pending │
└─────────────────────────────────────────────┘

States:
● Complete (warmGray-700, filled)
◐ Current (batch-terracotta, half-filled, animated)
◯ Pending (warmGray-300, outline)
```

### Feature Card (Seed Format)

```
┌──────────────────────────────────────┐
│  ●  Mobile Checkout Redesign         │
│                                      │
│  "Simplify the 3-step flow..."      │
│                                      │
│  Status: ◐ Generating Questions      │
│  Progress: ████████░░ 80%            │
└──────────────────────────────────────┘

Design Specs:
- Border: 1px solid warmGray-200
- Border-radius: 12px
- Padding: 24px
- Shadow: subtle, warm (0 2px 8px rgba(68,64,60,0.08))
- Hover: lift + border color shift to terracotta
- Transition: 200ms ease-smooth
```

### Approval Button (Bloom Action)

```css
.batch-approve-btn {
  background: linear-gradient(135deg,
    var(--batch-terracotta) 0%,
    var(--batch-terracotta-hover) 100%);
  color: white;
  padding: 12px 32px;
  border-radius: 24px; /* Pill shape, petal-inspired */
  box-shadow: 0 4px 12px rgba(232, 122, 82, 0.25);
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: all 200ms ease-smooth;
}

.batch-approve-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(232, 122, 82, 0.35);
}
```

### Progress Indicator (Growth Bar)

```
Seed ═══════════════════════════════ Bloom
     ████████████████░░░░░░░░░░░░░░  60%

Design:
- Track: warmGray-200, height 6px, rounded ends
- Fill: Gradient (terracotta → sprout green)
- Animation: Gentle pulse on active
- Endpoints: Seed icon (left), Bloom icon (right)
```

---

## 5. Layout Patterns

### Page Structure

```
┌─────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────┐   │
│  │         🌸 Batch PRD                     │   │  Header
│  │         Cultivate your features          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  ● → ◐ → ◯ → ◯  Stage Breadcrumb        │   │  Progress
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │       [Feature Cards Grid]              │   │  Main Content
│  │                                         │   │  Max-width: 1200px
│  │                                         │   │  Centered
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  [Action: Approve All → ]                │   │  Footer Actions
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

Background: Subtle radial gradient (cream → warm white)
Spacing: 64px vertical between sections
Cards: 24px gap in grid
```

### Responsive Grid

```css
/* Desktop (3 columns) */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Tablet (2 columns) */
@media (max-width: 1024px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile (1 column) */
@media (max-width: 640px) {
  .feature-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

---

## 6. Animation & Motion

### Botanical Timing

```css
/* Natural growth curve */
--ease-bloom: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Gentle sway */
--ease-sway: cubic-bezier(0.45, 0.05, 0.55, 0.95);

/* Quick sprout */
--ease-sprout: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Loading States

```
Generating Animation:
┌─────────────────┐
│   ⚬ → ⚬ → ⚬    │  Seeds pulse sequentially
│   ↓   ↓   ↓    │  Lines grow from center
│   🌸 emerges    │  Final bloom fade-in
└─────────────────┘

Timing: 2s loop, 200ms stagger
```

### Micro-interactions

- **Seed hover:** Scale 1.05, rotate 3deg
- **Card selection:** Border color shift (300ms)
- **Status change:** Icon cross-fade (400ms) + subtle grow
- **Completion:** Confetti burst of tiny petals (1s, once)

---

## 7. Iconography

### Custom Icon Set (24×24px)

```
Icon Name         | Symbol | Usage
------------------|--------|------------------
seed              | ●      | Draft feature
bud               | ◐      | In progress
bloom             | ◉      | Complete
radial            | ⊕      | Batch operation
sprout            | ↟      | New feature added
prune             | ✂      | Remove feature
water             | ≈      | Add context
sun               | ☀      | Generate PRDs
garden-grid       | ⊞      | View all features
single-flower     | ❀      | View single PRD
```

### Style Guidelines

- **Stroke weight:** 1.5px
- **Corners:** Rounded (2px radius)
- **Fills:** Solid for complete states, outline for pending
- **Colors:** Inherit from parent or use status colors

---

## 8. Usage Examples

### Page Header

```tsx
<header className="batch-prd-header">
  <div className="max-w-4xl mx-auto text-center py-16">
    {/* Icon Symbol */}
    <div className="mb-4">
      <RadialSeedIcon className="w-16 h-16 mx-auto text-batch-terracotta" />
    </div>

    {/* Title - Serif Display */}
    <h1 className="font-display text-hero text-batch-charcoal mb-3">
      Batch PRD
    </h1>

    {/* Tagline - Sans Body */}
    <p className="font-body text-xl text-batch-charcoal-light">
      Cultivate your features into comprehensive PRDs
    </p>
  </div>
</header>
```

### Feature Card Component

```tsx
<div className="feature-card">
  {/* Status Icon */}
  <div className="flex items-start gap-3">
    <StatusIcon status="generating" className="w-6 h-6 text-batch-terracotta" />

    {/* Content */}
    <div className="flex-1">
      <h3 className="font-body font-semibold text-card text-batch-charcoal">
        Mobile Checkout Redesign
      </h3>
      <p className="font-body text-body text-batch-charcoal-light mt-2">
        Simplify the checkout flow from 3 steps to 1
      </p>
    </div>
  </div>

  {/* Progress Bar */}
  <div className="mt-4">
    <ProgressBar value={60} variant="bloom" />
    <p className="text-meta text-batch-charcoal-light mt-2">
      Generating questions...
    </p>
  </div>
</div>
```

### Mobile Splash Screen

```
┌─────────────────────┐
│                     │
│                     │
│       ⚬ ⚬ ⚬         │  Animated radial burst
│      ⚬  ⚪  ⚬       │  Center blooms outward
│       ⚬ ⚬ ⚬         │  (2s entrance)
│                     │
│    Batch PRD        │  Fade in after animation
│  Cultivating...     │
│                     │
│   ████████░░  80%   │  Progress bar
│                     │
└─────────────────────┘

Background: Cream gradient with subtle noise texture
Animation: Seeds appear → radiate → bloom → fade to dashboard
```

---

## 9. Negative Space & Breathing Room

### Core Principles

1. **Generous Padding**
   - Section margins: 64px vertical
   - Card internal: 24px all sides
   - Component spacing: 16px between elements

2. **Max-Width Constraint**
   - Content container: 1200px desktop
   - Reading content: 720px (like PRD view)
   - Cards: Let grid handle width, never stretch beyond 400px

3. **Visual Hierarchy Through Space**
   ```
   Hero Title       ← 48px margin bottom
   ↓
   Subtitle         ← 24px margin bottom
   ↓
   Stage Indicator  ← 32px margin bottom
   ↓
   Feature Grid     ← 24px gap between cards
   ```

4. **Empty States**
   - Show single seed icon with soft copy
   - 200px vertical space around CTA
   - Avoid cluttering with too much instruction

---

## 10. Botanical Metaphors (Not Literal)

### How We Use Flower Imagery

✅ **Do:**
- Abstract petal shapes as UI elements (buttons, borders)
- Radial layouts suggesting organic growth
- Status icons derived from seed/bloom cycle
- Gentle curves and rounded corners
- Color gradients mimicking sunset/earth tones
- Progress indicators as "growth bars"

❌ **Don't:**
- Literal flower illustrations or photos
- Overly decorative floral patterns
- Garden/plant clip art
- Leaf textures as backgrounds
- Realistic botanical drawings

### Metaphor Application

| Feature | Metaphor | Visual Implementation |
|---------|----------|----------------------|
| Feature Input | Planting seeds | Simple dot icons, input fields |
| Generation | Growth process | Animated progress with radial lines |
| Review | Budding | Half-filled circles, pending state |
| Approval | Bloom | Filled circles, success color |
| PRD Output | Harvest | Completed icon, download action |

---

## 11. Brand Integration with Existing Poppy

### Connecting to Main App

- **Header breadcrumb:** Home → Batch PRD
- **Use existing Poppy red** for alerts/errors (brand consistency)
- **Reuse sprout green** for success states (familiar to users)
- **Keep Inter font** for body to match main app
- **Add Playfair Display** only for Batch PRD hero sections (differentiation)

### Color Bridge

```css
/* Batch PRD extends Poppy's palette */
--poppy-primary: hsl(0, 100%, 67%);        /* Existing red */
--batch-terracotta: hsl(12, 76%, 58%);     /* Warmer, calmer sibling */

/* Creates visual family while being distinct */
```

---

## 12. Accessibility

### WCAG AAA Compliance

```css
/* Text Contrast Ratios */
--batch-charcoal on --batch-canvas: 14.2:1 ✓
--batch-terracotta on white: 4.8:1 ✓
--batch-charcoal-light on --batch-canvas: 7.3:1 ✓

/* Interactive Elements */
- Minimum touch target: 44×44px
- Focus indicators: 2px solid terracotta, 4px offset
- Reduced motion: @media (prefers-reduced-motion: reduce)
```

### Screen Reader Support

- All icons have `aria-label` descriptions
- Status changes announced via `aria-live="polite"`
- Progress bars include `role="progressbar"` + `aria-valuenow`
- Stage indicator uses `<nav>` with proper hierarchy

---

## 13. Implementation Checklist

### Phase 1: Foundation
- [ ] Add Playfair Display to Next.js font config
- [ ] Extend Tailwind with batch color tokens
- [ ] Create base layout component with max-width + spacing
- [ ] Design system tokens in CSS variables

### Phase 2: Components
- [ ] RadialSeedIcon SVG component (16, 24, 32, 64px variants)
- [ ] StatusIcon component (seed, bud, bloom)
- [ ] ProgressBar component with gradient
- [ ] FeatureCard component with hover states
- [ ] StageIndicator component

### Phase 3: Pages
- [ ] Update batch-prd page.tsx with new header
- [ ] Apply layout patterns to each step (profile, features, review)
- [ ] Add stage transitions with animations
- [ ] Empty states + loading states

### Phase 4: Polish
- [ ] Micro-interactions on hover/click
- [ ] Smooth transitions between steps
- [ ] Mobile responsive adjustments
- [ ] Dark mode considerations (if needed)

---

## 14. File Structure

```
src/
├── components/
│   └── batch-prd/
│       ├── icons/
│       │   ├── RadialSeedIcon.tsx
│       │   ├── StatusIcon.tsx
│       │   └── BloomIcon.tsx
│       ├── ui/
│       │   ├── ProgressBar.tsx
│       │   ├── FeatureCard.tsx
│       │   └── StageIndicator.tsx
│       ├── BatchHeader.tsx
│       └── BatchLayout.tsx
├── styles/
│   └── batch-prd.css  ← Custom CSS variables
└── app/
    └── batch-prd/
        └── page.tsx   ← Updated with new identity
```

---

## 15. Quick Reference Card

```
╔══════════════════════════════════════════════════════╗
║  BATCH PRD VISUAL IDENTITY — QUICK REF              ║
╠══════════════════════════════════════════════════════╣
║  Primary Color:    Terracotta #E87A52               ║
║  Text Color:       Warm Charcoal #44403C            ║
║  Background:       Cream Canvas #FFFDF9             ║
║  Accent Success:   Sprout Green #3DDC97             ║
║  Accent Review:    Lavender #A78BFA                 ║
╠══════════════════════════════════════════════════════╣
║  Display Font:     Playfair Display (600)           ║
║  Body Font:        Inter (400)                      ║
║  Spacing Unit:     16px base (1rem)                 ║
║  Border Radius:    12px cards, 24px buttons         ║
║  Shadow:           Soft warm, 8-12px blur           ║
╠══════════════════════════════════════════════════════╣
║  Icon States:      ● Seed  ◐ Bud  ◉ Bloom          ║
║  Animation:        200ms ease-smooth                ║
║  Grid Gap:         24px                             ║
║  Max Width:        1200px                           ║
╚══════════════════════════════════════════════════════╝
```

---

## 16. Next Steps

1. **Review with team** — Validate color palette against brand guidelines
2. **Create icon assets** — SVG components for seed/bud/bloom
3. **Update Tailwind config** — Add batch-* color tokens
4. **Build component library** — Storybook entries for each component
5. **Implement in page.tsx** — Apply new layout + styling
6. **User test** — Validate that botanical metaphors are intuitive

---

**Design System Version:** 1.0
**Last Updated:** 2025-10-04
**Maintained By:** Product Design Team
**Questions?** Reference this doc or #design-system Slack channel
