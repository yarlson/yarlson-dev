# Practices

## Theme

- No external CSS/JS dependencies; everything is vanilla and self-contained
- CSS is embedded through `themes/plaintech/layouts/partials/style.html`
- Native sans-serif body font; no web fonts loaded
- Black text on white background
- Links use browser-default colors
- No JavaScript

## Content

- Blog posts use front matter `tags` array; tag values must match a filename in
  `content/tags/`
- Images in posts use relative paths; the render hook normalizes them to
  `/<section>/<path>`
- Code blocks render through a custom render hook with Chroma highlighting
- About page content and profile links are driven by front matter params

## Hugo Config

- Syntax highlighting uses Chroma's black-and-white style, configured in `hugo.toml`
- No Hugo taxonomies configuration; tags are implemented via content files and
  template queries

## Accessibility

- Skip-to-content link on every page
- Semantic landmarks through HTML5 elements
- Browser default focus indicators on interactive elements
- Schema.org `Article` and `ProfilePage` microdata
