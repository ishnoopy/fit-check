# Product

## Register

product

## Users

Lifters mid-workout, on their phone, on the gym floor. They open TUFF between sets:
one hand free, the other holding a bar or a phone, often sweaty, tired, and counting
down a rest timer. The job to be done is simple and time-pressured: record the set I
just did and get back to training with the fewest taps possible. The primary surface
is `/log`. Secondary surfaces (`/dashboard`, `/stats`, `/logs`, `/plans`, `/coach`)
are reviewed later, at rest or at home, but the log screen is the one that has to work
under fatigue and bad lighting.

## Product Purpose

TUFF is a strength-training log. It exists to make recording a workout effortless in
the moment and rewarding afterward: pick the exercise, dial in reps and weight, mark
each set done, and feel a small jolt of pride when the exercise is finished. Success
is a lifter who logs every working set without it feeling like data entry, because the
flow is fast, the progress is visible, and finishing something is celebrated. Around
that core it carries plans, history, stats, and an AI coach, but the log is the
heartbeat.

## Brand Personality

Warm, motivating, gritty. The voice is a training partner who has your back, not a drill
sergeant and not a wellness app. It celebrates real effort ("You chose strength today",
"Champion energy") without going soft or corporate. Earthy and physical: gold and
espresso, not neon and chrome. Encouraging, plainspoken, a little proud of you.

- Three words: **warm, motivating, gritty**.
- Emotional goal: every finished exercise should feel like a small win worth a fist-bump.

## Anti-references

- **Neon dark-mode gym apps.** No black backgrounds, electric green/blue glow, or
  glowing cards. TUFF is warm and lit, the opposite of the tactical-LED aesthetic.
- **Corporate SaaS dashboards.** No cold gray analytics shells, dense KPI grids, or
  generic Material/Bootstrap chrome.
- **Clinical health/medical apps.** No sterile white-and-teal, hospital seriousness, or
  personality stripped out for the sake of looking "trustworthy".
- **Cluttered tracker spreadsheets.** No tiny dense tables that show everything at once
  with no hierarchy.

## Design Principles

- **Thumb-first, mid-set.** Every primary action is reachable one-handed and survives a
  sweaty, hurried tap. Tap targets stay generous; the important control is never buried.
- **Show the win.** Finishing work is the emotional payoff. Progress moves with every
  set, and completing an exercise earns a real celebration, not a silent toast.
- **Least taps to a logged set.** Friction is the enemy. Prefill from last time, sane
  defaults, no modal or button that the flow can imply on its own.
- **Earned warmth, not decoration.** Color, motion, and the mascot are rewards tied to
  real effort, never ambient flair. If it doesn't help the lifter or honor their work,
  it's noise.
- **Calm under fatigue.** The screen reads at a glance with tired eyes in bad gym
  lighting: clear hierarchy, honest contrast, no clutter.

## Accessibility & Inclusion

Target WCAG AA contrast across the warm palette. Honor `prefers-reduced-motion`
(already wired through the celebration, rise, and timer-pulse animations). Keep tap
targets large (≥44px where the hand lands) because users are mid-workout with poor grip
and precision. The "done" state leans on green; pair it with an explicit check icon and
shape so it never depends on color alone.
