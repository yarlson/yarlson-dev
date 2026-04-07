# Practices

## Theme

- No external CSS/JS dependencies; everything is vanilla and self-contained
- System font stack only — no web fonts loaded
- Dark mode handled purely via CSS `prefers-color-scheme` media query
- All color tokens defined as CSS custom properties in `:root` and dark override
- JS is progressive enhancement only (copy button degrades gracefully)

## Content

- Blog posts use front matter `tags` array; tag values must match a filename in `content/tags/`
- Images in posts use relative paths; the render hook normalizes them to `/<section>/<path>`
- Code blocks rendered through a custom render hook that adds a copy button wrapper
- About page layout and social links driven entirely by front matter params

## Hugo Config

- Syntax highlighting uses Dracula style via Chroma, configured in `hugo.toml`
- No Hugo taxonomies configuration — tags are implemented via content files and template queries

## Accessibility

- Skip-to-content link on every page
- ARIA landmarks on header, main, footer
- `focus-visible` outlines on interactive elements
- Schema.org `Article` and `ProfilePage` microdata
