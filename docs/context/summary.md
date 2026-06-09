# yarlson.dev

## What

Personal technical blog built with Hugo, served at yarlson.dev. Uses a custom
theme called "plaintech" with no external dependencies.

**Scope note:** Context docs cover site infrastructure and theme internals only.
Blog articles, tag content pages, and post-level markdown are out of scope and
must not be documented here.

## Architecture

- **Hugo static site generator** with a single custom theme (`themes/plaintech`)
- Content lives in `content/` (blog posts, about page, tag description pages)
- Theme provides all layouts and embedded CSS; there are no Hugo modules or npm
  packages
- Tiny embedded CSS, zero JavaScript, zero build tooling beyond `hugo`

## Core Flow

1. Markdown files in `content/blog/` render via `_default/single.html`
2. Homepage (`index.html`) shows latest posts filtered by type blog/post
3. List pages use Hugo pagination via `_default/list.html`
4. Tags use a content-file taxonomy: `content/tags/*.md` matched by filename
5. OG images are generated at build time via Hugo image filters in `opengraph.html`

## System State

- Hugo minimum version: 0.125.0

## Capabilities

- Plain black-on-white theme with native OS sans-serif text and blue links
- Dynamic OG image generation per page (text overlay on base PNG)
- Custom render hooks for images (relative path normalization) and code blocks
- Schema.org microdata/JSON-LD on articles and about page
- Plain HTML5 header/nav/main/footer structure
- Accessible: skip-link, semantic landmarks, browser default focus indicators

## Tech Stack

- Hugo (Go template engine)
- Vanilla CSS
- Native sans-serif body font (no web fonts)
