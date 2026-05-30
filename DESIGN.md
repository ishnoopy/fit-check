# Design System

## Source Of Truth

The visual reference is the attached TUFF mobile dashboard: cream app canvas, heavy black type, rounded block panels, tomato hero surface, dark bottom navigation, yellow active controls, beige activity-grid cells, green completed-state markers, and a playful pixel mascot.

This is a product UI system. The design serves fast workout logging and progress scanning.

## Theme

The default scene is a phone used between sets in a bright gym. Use a light warm canvas for readability, dark high-contrast navigation for persistent controls, and saturated color only where it signals action, activity, or completion.

## Color Strategy

Use a restrained warm palette with committed accents on hero and active controls.

| Token | Role | Value |
| --- | --- | --- |
| `--background` | App canvas | `oklch(0.955 0.022 83)` |
| `--foreground` | Primary ink | `oklch(0.18 0.015 75)` |
| `--card` | Raised cream surface | `oklch(0.982 0.018 83)` |
| `--muted` | Quiet beige fill | `oklch(0.89 0.035 83)` |
| `--muted-foreground` | Secondary text | `oklch(0.49 0.02 75)` |
| `--primary` | TUFF yellow action | `oklch(0.84 0.16 86)` |
| `--secondary` | Bottom-nav ink | `oklch(0.18 0.015 75)` |
| `--accent` | Tomato hero/activity accent | `oklch(0.62 0.18 38)` |
| `--chart-3` | Rust inset panel | `oklch(0.43 0.12 36)` |
| `--chart-4` | Completed workout green | `oklch(0.58 0.13 146)` |

Do not introduce new accent hues casually. Add a semantic token first, then reuse it.

## Typography

Use one sturdy sans family through the product. The current Inter setup is acceptable, but it should be used with heavy weights and tight hierarchy:

- App titles: `text-5xl` to `text-6xl`, `font-black`, `leading-none`.
- Section headings: `text-3xl` to `text-4xl`, `font-black`.
- Card metrics: `text-4xl`, `font-black`, yellow when on dark panels.
- Labels and nav text: `text-sm`, `font-extrabold` or `font-black`.
- Body copy: `text-base`, `font-medium`, comfortable line height.
- Letter spacing stays normal except tiny uppercase kicker labels, which may use wide tracking.

## Shape And Radius

Use large rounded rectangles as a core visual language:

- App cards and large panels: `rounded-[28px]` to `rounded-[36px]`.
- Buttons and nav pills: `rounded-full`.
- Small badges: `rounded-full`.
- Calendar/activity cells: small rounded squares, not circles, except true calendar day buttons.
- Avoid nested cards. If a panel needs hierarchy, use an inset block with a stronger fill.

## Surfaces

- Main canvas: warm cream.
- Primary content panels: cream cards with subtle beige borders.
- Metric banners and bottom nav: near-black fill with cream text and yellow emphasis.
- Hero: tomato outer panel with a darker rust message inset.
- Activity grid: beige inactive cells, green completed cells, yellow or subtle accent for "today" when not logged.

## Components

### Bottom Navigation

Use a dark rounded pill dock. Active item is a yellow pill with ink text. Inactive items are cream text/icons. Center and utility items should use lucide icons unless a mascot avatar is explicitly part of the pattern.

### Hero

Use a compact full-width rounded tomato panel with the mascot overlapping the left edge and the message panel on the right. Reserve enough height so the mascot and message never cover the metric banners below.

### Metric Banners

Use two-column dark panels on mobile. Keep the pair equal height. Numbers are yellow, labels are cream. Rest-day metadata can expand one card, but sibling cards must stretch to match.

### Training Grid

Use a cream panel, heavy heading, beige cells, and a green completed marker. Keep cells regular and dense; this should feel like a progress artifact, not a charting library.

### Calendar

Workout days use a filled circular day button. Today, when not logged, uses a much softer circular tint with a thin ring.

### Recent Workouts

Use a cream panel with simple row dividers. Exercise names are heavy ink. Metadata is muted. Set counts use pale green pills.

## Motion

Motion should confirm state only:

- Press feedback: 95 to 98 percent scale, 120 to 180ms.
- Page or section reveal: subtle opacity/y translate, under 220ms.
- Avoid decorative loops, bounce, or elastic easing.

## Responsive Rules

Design mobile first. The 390px to 430px wide phone view is the primary canvas. Desktop can widen to a centered max-width app column rather than becoming a full dashboard unless the route explicitly benefits from wide layout.

## Implementation Notes

Prefer Tailwind classes backed by CSS variables from `frontend/app/globals.css`. Use lucide icons for UI symbols. New reusable pieces should align with existing `Button`, `Card`, `PageHeader`, `BottomNav`, and calendar conventions before introducing another component vocabulary.
