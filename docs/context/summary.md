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
- Theme provides all layouts, CSS, and JS — no Hugo modules or npm involved
- Single CSS file, single JS file, zero build tooling beyond `hugo`

## Core Flow

1. Markdown files in `content/blog/` render via `_default/single.html`
2. Homepage (`index.html`) shows latest 12 posts filtered by type blog/post
3. List pages use Hugo pagination via `_default/list.html`
4. Tags use a content-file taxonomy: `content/tags/*.md` matched by filename
5. OG images are generated at build time via Hugo image filters in `opengraph.html`

## System State

- Operational, clean working tree on `main`
- Hugo minimum version: 0.125.0

## Capabilities

- Automatic light/dark mode via `prefers-color-scheme` (no JS toggle)
- Dynamic OG image generation per page (text overlay on base PNG)
- Code block copy-to-clipboard (progressive enhancement, Clipboard API)
- Custom render hooks for images (relative path normalization) and code blocks
- Schema.org microdata on articles and about page
- Sticky header with backdrop blur
- Accessible: skip-link, ARIA landmarks, focus-visible outlines

## Tech Stack

- Hugo (Go template engine)
- Vanilla CSS with CSS custom properties, `color-mix()`, `clamp()`
- Vanilla JS (one IIFE for copy button)
- System font stack (no web fonts)
