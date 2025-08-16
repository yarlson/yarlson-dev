# Yar Kravtsov's Blog

A Hugo-based technical blog with the custom **Plain Tech** theme, featuring minimal design, automatic dark/light mode, and semantic HTML5.

## Configuration

### Site Configuration (`hugo.toml`)

```toml
baseURL = 'https://yarlson.dev/'
languageCode = 'en-us'
title = "Yar Kravtsov's Blog"
theme = 'plaintech'

[markup]
  [markup.highlight]
    style = 'dracula'
    guessSyntax = true
    lineNos = false
    noClasses = true
    tabWidth = 2
```

### Theme Configuration

The Plain Tech theme supports the following configuration parameters:

#### Site Parameters

- `avatar`: Path to avatar image (can be overridden per page)
- `description`: Site meta description
- `author`: Site author name

#### Page Parameters

- `avatar`: Override site avatar for specific pages
- `description`: Page-specific meta description
- `canonical`: Custom canonical URL
- `thumbnail`: Page thumbnail for OpenGraph images
- `tags`: Array of tags for the page

## Theme Development

### Directory Structure

```
themes/plaintech/
├── layouts/
│   ├── _default/
│   │   ├── _markup/
│   │   │   ├── render-codeblock.html  # Custom code block rendering
│   │   │   └── render-image.html      # Image path normalization
│   │   ├── baseof.html               # Base template
│   │   ├── list.html                 # List page template
│   │   └── single.html               # Single page template
│   ├── about/
│   │   └── single.html               # About page template
│   ├── index.html                    # Homepage template
│   ├── partials/
│   │   ├── footer.html
│   │   ├── header.html
│   │   └── opengraph.html            # Dynamic OpenGraph image generation
│   └── tags/
│       ├── list.html                 # Tags listing page
│       └── single.html               # Individual tag page
├── static/
│   ├── css/
│   │   └── plaintech.css             # Main stylesheet
│   └── js/
│       └── copycode.js               # Code block copy functionality
└── theme.toml                        # Theme metadata
```

### Key Theme Features

#### 1. CSS Custom Properties

The theme uses CSS custom properties for theming with automatic dark/light mode:

```css
:root {
  --bg: #ffffff;
  --fg: #0b0c0d;
  --muted: #4b5563;
  --link: #0b5fff;
  --card: #f3f4f6;
  --border: #d1d5db;
  --accent: #0077ff;
  --code-bg: #f1f5f9;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b0c10;
    --fg: #e7eaf0;
    /* ... other dark mode colors */
  }
}
```

#### 2. System Font Stack

Uses system fonts for optimal performance:

```css
--font-sans:
  -apple-system, system-ui, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans",
  "Helvetica Neue", Arial, sans-serif;
--font-mono:
  ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
  "DejaVu Sans Mono", monospace;
```

#### 3. Dynamic OpenGraph Image Generation

The theme generates OpenGraph images dynamically using Hugo's image processing:

- Base image: `assets/og_base.png` (1200x630)
- Overlays page title and site title
- Optional thumbnail overlay from `thumbnail` parameter
- Automatic generation for all pages

#### 4. Code Block Enhancement

Custom render hooks provide enhanced code blocks:

- Copy-to-clipboard functionality
- Syntax highlighting with Chroma
- Language detection
- Responsive design

#### 5. Image Path Normalization

Custom image render hook normalizes relative paths:

```go
// Converts ./images/foo.jpg to /blog/images/foo.jpg
// Based on page section
```

### Layout Templates

#### Base Template (`baseof.html`)

- Semantic HTML5 structure
- Meta tag generation
- Accessibility features (skip links, ARIA labels)
- Progressive enhancement approach

#### Header Partial (`header.html`)

- Avatar resolution (page > site params)
- Sticky navigation
- Responsive design

#### Homepage (`index.html`)

- Latest 12 posts from blog/post sections
- Card-based layout
- Tag integration

#### Single Page (`single.html`)

- Schema.org microdata
- Reading time estimation
- Tag navigation

### CSS Architecture

#### Layout System

- Container-based layout (70ch max-width)
- CSS Grid for complex layouts (about page)
- Flexbox for navigation and cards

#### Typography

- Fluid typography using `clamp()`
- Optimized line-height (1.7)
- Text rendering optimizations

#### Component Patterns

- `.post-card`: Reusable card component
- `.code-block`: Enhanced code blocks
- `.tag`: Inline tag styling
- `.muted`: Secondary text styling

### JavaScript Enhancement

#### Progressive Enhancement

- Clipboard API feature detection
- Graceful fallbacks
- No JavaScript dependencies
- Minimal bundle size

#### Copy Code Functionality

- Event delegation
- Accessibility improvements
- Visual feedback
- Error handling

### Content Organization

#### Content Types

- `blog/`: Blog posts
- `tags/`: Tag pages with descriptions
- `about.md`: About page with special layout

#### Front Matter Schema

```yaml
# Standard post
title: "Post Title"
date: 2025-01-01
tags: ["go", "docker"]
description: "Optional meta description"
thumbnail: "images/thumb.jpg"  # Optional OG thumbnail

# About page
title: "About"
type: "about"
name: "Full Name"
avatar: "/assets/avatar.jpg"
occupation: "Job Title"
company: "Company Name"
email: "email@domain.com"
twitter: "https://x.com/username"
linkedin: "https://linkedin.com/in/username"
github: "https://github.com/username"
```

### Performance Optimizations

- System fonts (no web font loading)
- Minimal CSS (no framework dependencies)
- Progressive image loading (`loading="lazy"`)
- Optimized image processing
- Zero JavaScript for core functionality

### Accessibility Features

- Semantic HTML5 elements
- ARIA labels and roles
- Skip navigation links
- Keyboard navigation support
- Screen reader optimizations
- Color contrast compliance

### Development Commands

```bash
# Local development
hugo server -D

# Build for production
hugo

# Theme development
hugo server --themesDir themes --theme plaintech
```
