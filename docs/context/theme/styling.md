# Theme Styling

## Architecture

Single CSS file (`plaintech.css`) with no preprocessor. All theming via CSS custom properties.

## Color System

Two token sets in `:root` — light (default) and dark (`prefers-color-scheme: dark`):

- `--bg`, `--fg` — page background/foreground
- `--muted` — secondary text
- `--link`, `--link-visited` — link colors
- `--card`, `--border` — card surface and borders
- `--accent` — focus rings, active states
- `--code-bg` — code block background

Dark mode uses `color-mix(in oklab, ...)` for semi-transparent overlays.

## Typography

- System font stack via `--font-sans` and `--font-mono`
- Fluid sizing with `clamp()` on body, h1-h3, site title, about name
- Body line-height: 1.7; headings: 1.25
- `text-wrap: pretty` on post content paragraphs
- Content column: `max-width: 70ch`

## Key Components

- **`.post-card`** — card with bg, border, rounded corners, flex column layout
- **`.code-block`** — relative wrapper; copy button absolutely positioned, hidden until hover/focus
- **`.about-hero`** — CSS grid: sidebar (avatar + identity) / main (bio), collapses on narrow viewports
- **`.site-header`** — sticky, backdrop-filter blur, semi-transparent background
- **`.tag`** — pill-shaped inline element with border

## Accessibility

- `.skip-link` visually hidden, revealed on focus
- `focus-visible` outlines using `--accent` on links and copy button
- Touch devices: copy button always visible (`@media (hover: none)`)
