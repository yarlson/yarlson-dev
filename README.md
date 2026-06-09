# Yar Kravtsov's Blog

A Hugo-based technical blog with the custom **Plain Tech** theme, plain HTML5,
minimal CSS, and SEO metadata.

## Configuration

### Site Configuration (`hugo.toml`)

```toml
baseURL = 'https://yarlson.dev/'
languageCode = 'en-us'
title = "Yar Kravtsov"
theme = 'plaintech'

[markup]
  [markup.highlight]
    style = 'bw'
    guessSyntax = true
    lineNos = false
    noClasses = true
    tabWidth = 2
```

### Theme Parameters

- `description`: Site meta description
- `author`: Site author name
- `keywords`: Site-level SEO keywords
- `github`, `linkedin`, `twitter`: Profile links for structured data

Page parameters:

- `description`: Page-specific meta description
- `canonical`: Custom canonical URL
- `thumbnail`: Page thumbnail for OpenGraph images
- `tags`: Array of tags for the page

## Theme Development

### Directory Structure

```text
themes/plaintech/
├── layouts/
│   ├── _default/
│   │   ├── _markup/
│   │   │   ├── render-codeblock.html
│   │   │   └── render-image.html
│   │   ├── baseof.html
│   │   ├── list.html
│   │   └── single.html
│   ├── about/
│   │   └── single.html
│   ├── index.html
│   ├── partials/
│   │   ├── footer.html
│   │   ├── header.html
│   │   ├── opengraph.html
│   │   ├── schema.html
│   │   └── style.html
│   └── tags/
│       ├── list.html
│       └── single.html
└── theme.toml
```

### Design

- Black text on white background
- Browser-default blue links
- Native sans-serif body font from the user's OS/browser
- Centered `42rem` reading column
- CSS only for readable layout, responsive images, code overflow, tables,
  blockquotes, and the skip link
- CSS is embedded in the document head
- No JavaScript

### SEO

The base template preserves:

- Meta description cascade: page `description` > page `summary` > generated
  page summary > site description
- Canonical URL, overridable with page `canonical`
- RSS link
- OpenGraph and Twitter card tags
- Generated OpenGraph images from `assets/og_base.png`
- Schema.org JSON-LD for the blog, posts, and profile page

### Render Hooks

- `render-codeblock.html`: renders Hugo/Chroma-highlighted fenced code blocks
  directly, without wrappers or copy buttons
- `render-image.html`: normalizes relative Markdown image paths to the current
  content section and emits semantic `<figure>` markup

## Content

- `content/blog/`: Blog posts
- `content/tags/`: Tag pages with descriptions
- `content/about.md`: About page

Standard post front matter:

```yaml
title: "Post Title"
date: 2025-01-01
tags: ["go", "docker"]
description: "Optional meta description"
thumbnail: "images/thumb.jpg"
```
