---
name: TUFF
description: A warm, gritty strength-training log built for the gym floor.
colors:
  champion-gold: "oklch(0.84 0.16 86)"
  espresso-ink: "oklch(0.18 0.015 75)"
  chalk-cream: "oklch(0.955 0.022 83)"
  bone: "oklch(0.982 0.018 83)"
  ember-orange: "oklch(0.62 0.18 38)"
  sand: "oklch(0.89 0.035 83)"
  stone: "oklch(0.49 0.02 75)"
  dust-border: "oklch(0.85 0.035 82)"
  brick-red: "oklch(0.48 0.16 32)"
  rep-green: "oklch(0.58 0.13 146)"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 5vw, 2.25rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "normal"
  numeric:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  pill: "9999px"
  card: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.champion-gold}"
    textColor: "{colors.espresso-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.espresso-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.stone}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card-exercise:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.espresso-ink}"
    rounded: "{rounded.card}"
    padding: "12px"
  pill-timer:
    backgroundColor: "{colors.espresso-ink}"
    textColor: "{colors.champion-gold}"
    typography: "{typography.numeric}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  chip-set-done:
    backgroundColor: "{colors.rep-green}"
    textColor: "{colors.bone}"
    rounded: "{rounded.pill}"
    size: "24px"
---

# Design System: TUFF

## 1. Overview

**Creative North Star: "The Gym Chalk Notebook"**

TUFF looks like a well-worn training log left open on a chalk-dusted bench, not a
fitness app. The surface is warm cream paper; ink is dark espresso; the one color that
shines is a champion gold, the color of a medal and of effort under good light. It is
unapologetically physical and warm. Every screen should read at a glance with tired eyes
in bad gym lighting, then reward a finished set with a real jolt of pride: a mascot
cheers, progress climbs, the gold appears.

The system rejects the three traps strength apps fall into. It is **not** a neon
dark-mode tactical-LED app (no black grounds, no electric glow, no glassmorphism). It is
**not** a cold corporate SaaS dashboard (no gray KPI grids, no Material chrome). It is
**not** a clinical white-and-teal health product (no sterile seriousness, no personality
scrubbed out to look trustworthy). Warmth is the whole point; remove it and TUFF becomes
one of the things it refuses to be.

Density is tuned for the thumb mid-set: compact rows, generous tap targets, hierarchy
carried by weight and space rather than borders and boxes. Type is heavy. Inter at black
weight (900) does the shouting; IBM Plex Mono handles every number that has to be read
fast, like reps, weight, and the rest clock.

**Key Characteristics:**
- Warm cream + espresso ground, champion gold as the rare reward color.
- Heavy Inter (900) for labels and headings; IBM Plex Mono for all live numerics.
- Soft, warm, downward shadows that lift cards gently off the paper, never hard edges.
- Generous one-handed tap targets; compact vertical rhythm.
- Motion and color are earned by real effort, gated behind `prefers-reduced-motion`.

## 2. Colors

A warm earth palette: cream paper, espresso ink, one gold that carries all the energy,
with an ember orange for live focus and a single green reserved for "done".

### Primary
- **Champion Gold** (`oklch(0.84 0.16 86)`): The reward color. Active exercise name,
  primary buttons, progress fill, focus ring, the timer's digits on espresso. It means
  "this is the thing, and you earned it." Used sparingly so it stays loud.

### Secondary
- **Ember Orange** (`oklch(0.62 0.18 38)`): Live focus and links. The accent for the
  currently-active exercise label and inline links. Warmer and more urgent than gold,
  used for "happening now".

### Tertiary
- **Rep Green** (`oklch(0.58 0.13 146)`): Success only. The set-done checkmark, the
  "Done" badge, completed-set ticks. Never decorative; green in TUFF always means a rep
  is in the bank. Always paired with a check icon so it never reads on color alone.

### Neutral
- **Espresso Ink** (`oklch(0.18 0.015 75)`): Foreground text, the dark `secondary`
  surface (timer pill, nav), high-contrast grounds.
- **Chalk Cream** (`oklch(0.955 0.022 83)`): App background, the paper everything sits on.
- **Bone** (`oklch(0.982 0.018 83)`): Card and popover surface, one step lighter than the
  background so cards lift without a heavy border.
- **Sand** (`oklch(0.89 0.035 83)`): Muted fills, set-row backgrounds, index chips.
- **Stone** (`oklch(0.49 0.02 75)`): Muted text, secondary labels, ghost-button text.
- **Dust** (`oklch(0.85 0.035 82)`): Borders, inputs, dividers.
- **Brick Red** (`oklch(0.48 0.16 32)`): Destructive actions only (reset, delete hover).

### Named Rules
**The Gold-Is-Earned Rule.** Champion gold never decorates. It marks the active thing or
a primary action and stays under ~10% of any screen. If gold is everywhere, it means
nothing.

**The Green-Means-Done Rule.** Rep green is reserved exclusively for completion. It is
forbidden as a generic accent, and it always travels with a check icon or shape so the
state survives color blindness.

**The No-True-Black Rule.** The darkest value is Espresso Ink (`L 0.18`, tinted warm),
never `#000`. Every neutral is tinted toward the warm hue (75–86), so cream, sand, and
ink read as one family.

## 3. Typography

**Display Font:** Inter (with system-ui, sans-serif)
**Body Font:** Inter (with system-ui, sans-serif)
**Numeric / Mono Font:** IBM Plex Mono (with monospace)

**Character:** One workhorse sans doing everything from a whisper to a shout through
weight, paired with a monospace that exists for one job: numbers you read in a hurry.
Inter at 900 (`font-black`) is the signature; the heaviness is the grit. Plex Mono with
`tabular-nums` keeps reps, weight, and the rest clock from jittering as they change.

### Hierarchy
- **Display** (900, `clamp(1.75rem, 5vw, 2.25rem)`, 1.05): Page titles and empty-state
  headlines ("No active plan"). Black weight, tight leading.
- **Title** (900, 0.875rem, 1.2): Exercise names, section labels, button text. The most
  common heavy element; carries hierarchy at small sizes.
- **Body** (500, 0.875rem, 1.5): Notes, descriptions, supporting copy. Cap measure at
  65–75ch.
- **Label** (900, 0.625rem–0.6875rem, 1.2): Tiny badges, set index chips, "Done" pills.
  Black weight so they stay legible at 10–11px.
- **Numeric** (IBM Plex Mono, 600, 0.75rem, `tabular-nums`): Rest timer, rep/weight
  readouts, any value that updates live.

### Named Rules
**The Black-Weight Rule.** Structural and motivational text is `font-black` (900), not
semibold. Hierarchy comes from weight and size contrast (≥1.25 steps), not from color.

**The Mono-For-Numbers Rule.** Every live or comparative number uses IBM Plex Mono with
`tabular-nums`. Numbers must never reflow or shift width as they tick.

## 4. Elevation

TUFF lifts cards gently off the cream paper with soft, warm, downward shadows; it never
uses hard borders or dark drop shadows for depth. The shadow color is espresso
(`rgb(29 26 20)`) at low opacity with a large blur and negative spread, so a card looks
like it is resting a few millimeters above the page, catching warm overhead light. Depth
is ambient, not structural; it says "this is a surface", not "this is a wall".

### Shadow Vocabulary
- **Lift (rest)** (`box-shadow: 0 10px 24px -18px rgb(29 26 20 / 0.24)`): Default card
  rest state (`shadow-sm`). Barely there, just enough to separate from the paper.
- **Raised** (`box-shadow: 0 16px 36px -24px rgb(29 26 20 / 0.28)`): Popovers, the cheer
  speech bubble, mild emphasis (`shadow`).
- **Floating** (`box-shadow: 0 28px 64px -32px rgb(29 26 20 / 0.36)`): Dialogs, sheets,
  anything that sits clearly above the page (`shadow-lg`).

### Named Rules
**The Warm-Light Rule.** Shadows are espresso-tinted (`29 26 20`) and always cast
downward and soft. A hard, gray, or upward shadow is forbidden; it reads cold and breaks
the gym-light warmth.

## 5. Components

### Buttons
- **Shape:** Gently rounded (`10px`, `rounded-md`); full pills (`9999px`) for chips and
  the rest timer.
- **Primary:** Champion gold fill, espresso text, `font-black`, padding `8px 16px`
  (`h-8` in dense rows). Used for the one main action on a surface.
- **Outline:** Bone surface, dust border, espresso text. The dashed-border variant
  ("Add Set") signals an additive, optional action.
- **Ghost:** Transparent, stone text, used for low-stakes or destructive-adjacent actions
  (Reset hovers to brick red, never sits red at rest).
- **Hover / Focus:** Background deepens slightly, no lift on tap; focus ring is champion
  gold. Transitions are color only.

### Chips
- **Set index chip:** Sand circle, stone label, `font-black` 10px. Marks set order.
- **Done check:** A 24px circle that fills rep green with a bone check when a set is
  marked done; unfilled it is a dust ring. Disabled (reps still 0) it dims to 40% with a
  not-allowed cursor. State is carried by fill **and** the check icon together.
- **"Done" badge:** Rep-green-tinted pill (`bg-chart-4/15`), green label, on a completed
  exercise's header.

### Cards / Containers
- **Corner Style:** Exercise cards use a pronounced `24px` radius; smaller surfaces use
  `10–12px`.
- **Background:** Bone on a chalk-cream page.
- **Shadow Strategy:** `shadow-sm` (Lift) at rest; see Elevation.
- **Border:** A 2px dust border on exercise cards is structural, not a colored accent.
  Side-stripe accent borders are forbidden.
- **Internal Padding:** Compact, `12px` (`px-3`), with `8px` (`space-y-2`) vertical
  rhythm. Density is intentional for one-handed scanning.

### Inputs / Fields
- **Style:** Dust border, bone or sand background, `10px` radius. Inputs force `16px`
  font on mobile to defeat iOS zoom-on-focus.
- **Drum Picker (signature):** Reps and weight are set with a vertical scroll-snap drum,
  not a text field. Collapsed it shows the value `font-black`; active it expands to a
  3-row masked wheel with a center selection band. Built for thumb-flicking a number
  while holding a bar.
- **Focus:** Champion gold ring. **Disabled:** 40% opacity, not-allowed cursor.

### Navigation
- Bottom nav and the dark `secondary` (espresso) sidebar surfaces; active items pick up
  champion gold. Mobile-first: the bottom bar is the primary nav, history/actions sit as
  ghost icon buttons in the page header.

### Signature: The Celebration
When an exercise is finished, a mascot rises in from the bottom-left with a speech bubble
("You chose strength today"), bobs, and holds for 6 seconds before exiting. Progress
fills with champion gold per set. This is the emotional core; it is large and proud on
purpose, and it is fully suppressed under `prefers-reduced-motion` (cross-fade only).

## 6. Do's and Don'ts

### Do:
- **Do** keep champion gold under ~10% of the screen, on the active thing or the one
  primary action (the Gold-Is-Earned Rule).
- **Do** reserve rep green for completion only, always paired with a check icon.
- **Do** set all live numbers in IBM Plex Mono with `tabular-nums`.
- **Do** use `font-black` (900) Inter for structure and labels; let weight and space carry
  hierarchy.
- **Do** cast soft, warm, downward espresso-tinted shadows for depth.
- **Do** keep tap targets ≥44px where the thumb lands, and gate every animation behind
  `prefers-reduced-motion`.
- **Do** celebrate a finished exercise loudly. The win is the point.

### Don't:
- **Don't** ship a neon dark-mode gym look: no black grounds, electric green/blue glow,
  or glowing cards.
- **Don't** drift into a corporate SaaS dashboard: no cold gray KPI grids or Material
  chrome.
- **Don't** go clinical white-and-teal or strip out warmth to look "trustworthy".
- **Don't** use `#000` or `#fff`; the darkest is Espresso Ink, every neutral tinted warm.
- **Don't** use a `border-left`/`border-right` over 1px as a colored accent stripe on
  cards or rows.
- **Don't** use gradient text (`background-clip: text`) or decorative glassmorphism.
- **Don't** rely on color alone for the done state, and never let a live number reflow as
  it changes.
