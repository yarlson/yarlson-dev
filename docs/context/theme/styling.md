# Theme Styling

## Architecture

Tiny embedded stylesheet in `partials/style.html`, with no preprocessor and
almost no theming.

## Color System

- White page background
- Black text
- Browser-default link colors
- No dark mode and no color tokens

## Typography

- Native OS sans-serif body font
- Browser-default monospace code font
- Body line-height: 1.6
- Content column: `max-width: 42rem`

## Rules Kept

- `body` centers the reading column and sets the measure
- `nav ul`, `.post-list`, `.latest-list`, `.pagination`, `.social`, and
  `.links` remove list markers
- `.page-link` keeps pagination touch targets at 48px; redundant first/last and
  disabled pagination controls are hidden
- `pre` scrolls horizontally instead of breaking the layout and uses a light
  background with a thin black border
- `img` scales down responsively
- `table`, `th`, and `td` get basic borders
- `blockquote` gets a simple left rule
- `.skip-link` is hidden until focused

## Accessibility

- Browser default focus indicators are preserved
- The skip link is available on every page
