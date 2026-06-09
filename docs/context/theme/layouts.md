# Theme Layouts

## Base (`baseof.html`)

Shell template providing `<html>`, `<head>`, `<body>` structure. Includes:

- Meta description cascade: page `.Params.description` > page
  `.Params.summary` > generated page summary > site param
- Canonical URL, overridable via `.Params.canonical`
- OpenGraph partial
- Schema.org JSON-LD partial
- Embedded CSS partial
- Skip-to-content link, header partial, `<main>` block, footer partial

## Page Types

- **`_default/single.html`** — blog post: Schema.org Article, post header
  with date/tags, content body, related posts
- **`_default/list.html`** — paginated list with optional `.Content` block
  above posts; uses Hugo's built-in pagination template
- **`index.html`** — homepage: latest posts filtered by type `blog` or
  `post`
- **`about/single.html`** — profile page: optional avatar, name, occupation,
  company, text social links, bio content, latest 5 posts
- **`tags/list.html`** — all tags index: queries `content/tags/` section
  pages, sorted by title, shows name and description
- **`tags/single.html`** — single tag page: renders tag `.Content`, then lists
  posts where `Params.tags` intersects the tag's filename

## Render Hooks

- **`render-image.html`** — rewrites relative image src to
  `/<section>/<path>` and wraps images in semantic `<figure>` markup
- **`render-codeblock.html`** — renders Chroma-highlighted output directly,
  with no wrapper or JavaScript

## Partials

- **`header.html`** — plain site header: homepage `h1`, otherwise a site
  title link, plus nav links (Writing, Topics, About)
- **`footer.html`** — copyright year, optional social links from
  `site.Params.social`
- **`style.html`** — tiny embedded stylesheet for the whole site
- **`opengraph.html`** — generates 1200x630 OG PNG per page using Hugo image
  filters: base image + title text overlay + optional thumbnail; outputs
  OG/Twitter meta tags
- **`schema.html`** — emits Schema.org JSON-LD for the blog, posts, and
  profile page
