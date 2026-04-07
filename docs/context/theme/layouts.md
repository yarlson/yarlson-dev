# Theme Layouts

## Base (`baseof.html`)

Shell template providing `<html>`, `<head>`, `<body>` structure. Includes:

- Meta description cascade: page `.Params.description` > page `.Summary` > site param
- Canonical URL (overridable via `.Params.canonical`)
- OpenGraph partial
- Single CSS link, single deferred JS script
- Skip-to-content link, header partial, `<main>` block, footer partial

## Page Types

- **`_default/single.html`** — blog post: Schema.org Article, post header with date/tags, content body
- **`_default/list.html`** — paginated list with optional `.Content` block above posts; uses Hugo's built-in pagination template
- **`index.html`** — homepage: latest 12 posts filtered by type `blog` or `post`
- **`about/single.html`** — profile page: avatar, name, occupation, company, social links (email/GitHub/LinkedIn/X via SVG icons), bio content, latest 5 posts
- **`tags/list.html`** — all tags index: queries `content/tags/` section pages, sorted by title, shows name and description
- **`tags/single.html`** — single tag page: renders tag `.Content`, then lists posts where `Params.tags` intersects the tag's filename

## Render Hooks

- **`render-image.html`** — rewrites relative image src to `/<section>/<path>`, wraps in `<figure class="md-image">` with optional `<figcaption>` from title
- **`render-codeblock.html`** — wraps Chroma-highlighted output in `.code-block` div with a copy button

## Partials

- **`header.html`** — sticky site header: avatar (resolved from about page or site params via assets pipeline), site title, nav links (Blog, Tags, About)
- **`footer.html`** — copyright year, optional social links from `site.Params.social`
- **`opengraph.html`** — generates 1200x630 OG PNG per page using Hugo image filters: base image + title text overlay + optional thumbnail; outputs og/twitter meta tags
